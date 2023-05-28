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
const { 
  ResourceTypeDensities 
} = require('./game-map.js');

// =================================================================
// Handle new Player
// =================================================================

const baseResources = {
  'titanium': 1000,
  'antimatter': 200,
  'metamaterials': 100
};

let planetProbes = [];

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  const spawnLocation = gameMap.findSafeSpawnLocation(world);
  const newPlayer = gameMap.newSpaceObject(spawnLocation.x, spawnLocation.y, 1000000, 'white', 100, baseResources, socket.id);
  // setRadius(newPlayer);
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


function setRadius(planet) {
  planet.radius = Math.sqrt(planet.mass) / 20;
}


function projectileHit(p, planet) {
  if (!planet.id) { // spaceObject
    players[p.id].mass += planet.mass;
    planet.mass = 0;
    setRadius(players[p.id]);

    for (const res in planet.resources) {
      players[p.id].resources[res] += planet.resources[res]
    };

    io.to(p.id).emit("res", players[p.id].resources)

    io.to(p.id).emit("score", players[p.id].radius);
    world.spaceObjects = world.spaceObjects.filter(planet => planet.mass);
    world.changed = true;
  } else {
    // other player
  }
}


function gravity(spaceObject, projectile) {
  const distanceX = spaceObject.x - projectile.x;
  const distanceY = spaceObject.y - projectile.y;
  const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
  if (distance < spaceObject.radius + projectile.radius) {
    // projectileHit(projectile, spaceObject);
    io.to(projectile.id).emit("probe", spaceObject);
    planetProbes.push({playerid: projectile.id, planetid: spaceObject.id})
    console.log(planetProbes)
    return null;
  }
  // Calculate the force of gravity
  const force = world.G_CONSTANT * projectile.mass * spaceObject.mass / distance ** 2;
  // Calculate the direction of the force
  const forceX = force * distanceX / distance;
  const forceY = force * distanceY / distance;

  projectile.velocityX += forceX / projectile.mass;
  projectile.velocityY += forceY / projectile.mass;

  return projectile;
}


function updateProjectile(p) {
  p.x += p.velocityX;
  p.y += p.velocityY;
  for (const planet of [...world.spaceObjects, ...Object.values(players)]) {
    if (planet.id === p.id) continue; // No gravity for own planet
    p = gravity(planet, p);
    if (!p) break;
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

let world = gameMap.createWorld();
// world.spaceObjects.forEach(p => setRadius(p));
world.changed = false;

let projectiles = [];
const players = {};

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

setInterval(gameLoop, 1000 / 60);