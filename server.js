"use strict"
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const gameMap = require('./game-map.js');

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;


// =================================================================
// Handle new Player
// =================================================================


io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  const spawnLocation = gameMap.findSafeSpawnLocation(world);
  const newPlayer = {
    x: spawnLocation.x,
    y: spawnLocation.y,
    mass: 1000000,
    color: 'white',
    radius: 100,
    resources: baseResources,
    id: socket.id
  };
  players[socket.id] = newPlayer;

  socket.emit("playerConnected", {
    currentPlayer: newPlayer,
    world: world,
  });

  socket.on("disconnect", () => {
    cancelProjectile(socket.id);
    delete players[socket.id];
    console.log("a user disconnected:", socket.id);
  });

  socket.on("fireProjectile", data => fireProjectile(socket.id, data.angle, data.projSpeed));
  socket.on("cancelProjectile", () => cancelProjectile(socket.id));
});


// =================================================================
// Player actions
// =================================================================

function newProjectile(id, x, y, velocityX, velocityY) {
  return {
    id, x, y, velocityX, velocityY,
    mass: 1,
    radius: 5,
    firedAt: Date.now()
  }
}


function fireProjectile(id, angle, projSpeed) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const planet = players[id];
  projectiles.push(newProjectile(
    id,
    planet.x + cosA * planet.radius,
    planet.y + sinA * planet.radius,
    cosA * projSpeed,
    sinA * projSpeed
  ));
}


function cancelProjectile(id) {
  projectiles = projectiles.filter(p => p.id !== id);
}


// =================================================================
// Update game
// =================================================================

function pushGameState() {
  const now = Date.now();
  io.emit("gameStateUpdate", {
    projectiles: projectiles.filter(p => now - p.firedAt > 1000)
      .map(p => { return { id: p.id, x: p.x, y: p.y } })
  });
  if (world.changed) {
    io.emit("world", world);
    world.changed = false;
  }
}


function handleCollision(p, planet) {
  if (true) { // Todo check if we hit other player
    io.to(p.id).emit("probe", planet);
    planetProbes.push({playerid: p.id, planetid: planet.id});
    console.log(planetProbes);
  } else {
    // other player
  }
}


function updateProjectile(p) {
  p.x += p.velocityX;
  p.y += p.velocityY;
  const planetCollided = gameMap.checkCollision(world, p);
  if(planetCollided) {
    handleCollision(p, planetCollided);
    return null;
  } else {
    let [fx, fy] = gameMap.gravity(world, p.x, p.y);
    p.velocityX += fx / p.mass;
    p.velocityY += fy / p.mass;
  }
  return p;
}


function gameLoop() {
  // Update projectiles (remove when null)
  projectiles = projectiles.map(updateProjectile).filter(Boolean);
  pushGameState();
}


// =================================================================
// Start
// =================================================================
const baseResources = {
  'titanium': 1000,
  'antimatter': 200,
  'metamaterials': 100
};

let world = new gameMap.createWorld();
world.changed = false;

let planetProbes = [];
let projectiles = [];
const players = {};

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

setInterval(gameLoop, 1000 / 60);