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

function newPlayer (socket) {
  console.log('a user connected:', socket.id);
  const newPlayer = gameMap.findAHome(world);
  newPlayer.populated = socket.id;
  players[socket.id] = newPlayer;

  socket.emit('playerConnected', {
    currentPlayer: newPlayer,
    world
  });

  socket.on('disconnect', () => {
    players[socket.id].populated = null;
    delete players[socket.id];
    console.log('a user disconnected:', socket.id);
  });

  socket.on('launchProbe', data => {
    socket.broadcast.emit('launchProbe', data);
  });

  socket.on('probeHit', data => probeHit(socket.id, data));
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


// =================================================================
// Start
// =================================================================

const world = gameMap.createWorld();
const players = {};

io.on('connection', newPlayer);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
