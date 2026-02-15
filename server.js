'use strict';
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const gameMap = require('./game-map.js');

const app = express();
const staticDir = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
app.use(express.static(staticDir));
// Fallback: serve public/ if dist/ doesn't have the file (e.g. build step not run)
if (staticDir === 'dist') {
  app.use(express.static('public'));
}
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

const PROBE_COST = 50; // titanium per probe
const MINING_FRACTION = 0.1; // fraction of target resources gained when mining
const ATTACK_DAMAGE = 500; // flat resource damage per hit
const ATTACK_LOOT = 100; // resources gained per attack hit
const WIN_THRESHOLD = 10000; // accumulate this much of each resource to win
const PROBE_RATE_LIMIT = 500; // min ms between probe launches per player
const GENERATE_COOLDOWN = 10000; // min ms between world regenerations


// =================================================================
// Health check
// =================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    ready: world !== null,
    players: Object.keys(players).length,
    uptime: process.uptime()
  });
});


// =================================================================
// Rate limiting
// =================================================================

const lastProbeTime = {}; // socket.id -> timestamp
let lastGenerateTime = 0;


// =================================================================
// Handle new Player
// =================================================================

function sendWorld (socket) {
  if (!world) {
    socket.emit('serverFull', { message: 'Server is starting up, please try again' });
    return;
  }
  const p = gameMap.findAHome(world);
  if (!p) {
    socket.emit('serverFull', { message: 'No available planets' });
    return;
  }
  p.populated = socket.id;
  players[socket.id] = p;
  socket.emit('playerConnected', {
    currentPlayer: p,
    world
  });
}

function newPlayer (socket) {
  console.log('a user connected:', socket.id);
  sendWorld(socket);

  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
      player.populated = null;
      delete players[socket.id];
      io.emit('playerLeft', { planetNr: player.nr });
    }
    delete lastProbeTime[socket.id];
    console.log('a user disconnected:', socket.id);
  });

  socket.on('launchProbe', data => {
    try {
      const player = players[socket.id];
      if (!player) return;

      // Rate limit
      const now = Date.now();
      if (now - (lastProbeTime[socket.id] || 0) < PROBE_RATE_LIMIT) return;
      lastProbeTime[socket.id] = now;

      // Validate and deduct probe cost
      if ((player.resources.titanium || 0) < PROBE_COST) {
        socket.emit('probeBlocked', { reason: 'Insufficient titanium' });
        return;
      }
      player.resources.titanium -= PROBE_COST;
      socket.emit('res', player.resources);

      // Broadcast to other players
      socket.broadcast.emit('launchProbe', data);
    } catch (err) {
      console.error('Error in launchProbe handler:', err);
    }
  });

  socket.on('probeHit', data => {
    try {
      probeHit(socket.id, data);
    } catch (err) {
      console.error('Error in probeHit handler:', err);
    }
  });

  socket.on('generateWorld', data => {
    try {
      // Rate limit world generation
      const now = Date.now();
      if (now - lastGenerateTime < GENERATE_COOLDOWN) return;
      lastGenerateTime = now;

      const size = parseFloat(data.size) || 1;
      const planetCount = parseInt(data.planetCount) || 100;
      const gravityScale = parseFloat(data.gravityScale) || 1;
      regenerateWorld(size, planetCount, gravityScale);
    } catch (err) {
      console.error('Error in generateWorld handler:', err);
    }
  });
}


// =================================================================
// Player actions
// =================================================================

function probeHit (id, data) {
  const sender = players[id];
  if (!sender) return;

  const target = world.planets.find(p => p.nr === data.targetPlanetNr);
  if (!target) return;

  // Self-hit: no effect
  if (target.nr === sender.nr) return;

  if (target.populated && target.populated !== id) {
    // Attack: damage target, small loot to attacker
    for (const res of Object.keys(target.resources)) {
      const lost = Math.min(target.resources[res], ATTACK_DAMAGE);
      target.resources[res] -= lost;
      if (sender.resources[res] !== undefined) {
        sender.resources[res] += Math.min(ATTACK_LOOT, lost);
      }
    }
  } else if (!target.populated) {
    // Mining: transfer fraction of target's resources
    for (const res of Object.keys(target.resources)) {
      const mined = Math.floor(target.resources[res] * MINING_FRACTION);
      target.resources[res] -= mined;
      if (sender.resources[res] !== undefined) {
        sender.resources[res] += mined;
      } else {
        sender.resources[res] = mined;
      }
    }
  }

  // Notify all clients of the impact
  io.emit('probeImpact', {
    targetPlanetNr: target.nr,
    targetResources: { ...target.resources },
    attackerId: id,
    hitX: data.hitX,
    hitY: data.hitY
  });

  // Update attacker's resource display
  const attackerSocket = io.sockets.sockets.get(id);
  if (attackerSocket) {
    attackerSocket.emit('res', { ...sender.resources });
  }

  // Check win/lose conditions
  checkGameEnd();
}


// =================================================================
// Win/Lose
// =================================================================

function checkGameEnd () {
  const activePlayers = Object.entries(players);

  // Check for elimination (home planet total resources <= 0)
  for (const [id, planet] of activePlayers) {
    const total = Object.values(planet.resources).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      const sock = io.sockets.sockets.get(id);
      if (sock) {
        sock.emit('eliminated', { reason: 'Your planet has been depleted' });
      }
      io.emit('playerEliminated', { planetNr: planet.nr, playerId: id });
      planet.populated = null;
      delete players[id];
    }
  }

  // Check for resource victory
  for (const [id, planet] of Object.entries(players)) {
    const res = planet.resources;
    if ((res.titanium || 0) >= WIN_THRESHOLD &&
        (res.antimatter || 0) >= WIN_THRESHOLD &&
        (res.metamaterials || 0) >= WIN_THRESHOLD) {
      const sock = io.sockets.sockets.get(id);
      if (sock) {
        sock.emit('victory', { reason: 'Resource dominance achieved' });
      }
      io.emit('playerWon', { planetNr: planet.nr, playerId: id });
    }
  }

  // Check for last-player-standing
  const remaining = Object.keys(players);
  if (remaining.length === 1 && activePlayers.length > 1) {
    const sock = io.sockets.sockets.get(remaining[0]);
    if (sock) {
      sock.emit('victory', { reason: 'Last player standing' });
    }
    io.emit('playerWon', { planetNr: players[remaining[0]].nr, playerId: remaining[0] });
  }
}


// =================================================================
// Update game
// =================================================================

function pushGameState () {
  const state = {
    planets: world.planets.map(p => ({
      nr: p.nr,
      resources: { ...p.resources },
      populated: p.populated
    })),
    players: Object.entries(players).map(([id, p]) => ({
      id,
      planetNr: p.nr,
      resources: { ...p.resources }
    }))
  };
  io.emit('gameStateUpdate', state);
}

function regenerateWorld (size, planetCount, gravityScale) {
  worldSize = size;
  world = gameMap.createWorld(worldSize, { planetCount, gravityScale });
  for (const id of Object.keys(players)) {
    const socket = io.sockets.sockets.get(id);
    if (socket) {
      sendWorld(socket);
    }
  }
}


// =================================================================
// Error handling
// =================================================================

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});


// =================================================================
// Start
// =================================================================

let worldSize = 1;
let world = null;
const players = {};

io.on('connection', newPlayer);

// Start listening FIRST so the health check responds during world generation
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Generate world after server is up (heavy computation)
  world = gameMap.createWorld(worldSize, { planetCount: 100, gravityScale: 1 });
  console.log('World generated');
  // Sync game state periodically
  setInterval(pushGameState, 5000);
});
