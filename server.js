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

function newPlayer(socket) {
  console.log("a user connected:", socket.id);
  const newPlayer = gameMap.findAHome(world);
  newPlayer.populated = socket.id
  players[socket.id] = newPlayer;

  socket.emit("playerConnected", {
    currentPlayer: newPlayer,
    world: world,
  });

  socket.on("disconnect", () => {
    cancelProjectile(socket.id);
    players[socket.id].populated = null;
    delete players[socket.id];
    console.log("a user disconnected:", socket.id);
  });

  socket.on("fireProjectile", data => fireProjectile(socket.id, data.angle, data.projSpeed));
  socket.on("cancelProjectile", () => cancelProjectile(socket.id));
};


// =================================================================
// Player actions
// =================================================================

function fireProjectile(id, angle, projSpeed) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const planet = players[id];
  projectiles.push({ 
    id,
    x: planet.x + cosA * planet.radius,
    y: planet.y + sinA * planet.radius,
    velocityX: cosA * projSpeed,
    velocityY: sinA * projSpeed,
    mass: 1,
    radius: 5,
    firedAt: Date.now()
  });
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
}


function handleCollision(p, planet) {
  
  if(planet.pupulated) {
    if(p.id === planet.populated) {
      // awkward
    } else {
      // hit player[planet.populated]
    }
  } else {
    io.to(p.id).emit("probe", planet);
    planetProbes.push({playerid: p.id, planetnr: planet.nr});
    console.log(planetProbes);
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

let world = gameMap.createWorld(20000);

let planetProbes = [];
let projectiles = [];
const players = {};

io.on("connection", newPlayer);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

setInterval(gameLoop, 1000 / 60);