'use strict';
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

function sendWorld (socket) {
  const p = gameMap.findAHome(world);
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
    players[socket.id].populated = null;
    delete players[socket.id];
    console.log('a user disconnected:', socket.id);
  });

  socket.on('launchProbe', data => {
    socket.broadcast.emit('launchProbe', data);
  });

  socket.on('probeHit', data => probeHit(socket.id, data));

  socket.on('generateWorld', data => {
    const size = parseFloat(data.size) || 1;
    const planetCount = parseInt(data.planetCount) || 100;
    const gravityScale = parseFloat(data.gravityScale) || 1;
    const planetRadius = parseFloat(data.planetRadius);
    const planetMass = parseFloat(data.planetMass);
    regenerateWorld(size, planetCount, gravityScale, planetRadius, planetMass);
  });
}


// =================================================================
// Player actions
// =================================================================

function probeHit (id, data) {

}


// =================================================================
// Update game
// =================================================================

function pushGameState () {
  io.emit('gameStateUpdate', {
  });
}

function regenerateWorld (size, planetCount, gravityScale, planetRadius, planetMass) {
  worldSize = size;
  world = gameMap.createWorld(worldSize, { planetCount, gravityScale, planetRadius, planetMass });
  for (const id of Object.keys(players)) {
    const socket = io.sockets.sockets.get(id);
    if (socket) {
      sendWorld(socket);
    }
  }
}


// =================================================================
// Start
// =================================================================

let worldSize = 1;
let world = gameMap.createWorld(worldSize, { planetCount: 100, gravityScale: 1, planetRadius: 0.02, planetMass: 5 });
const players = {};

io.on('connection', newPlayer);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
