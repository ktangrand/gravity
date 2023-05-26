"use strict"
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;


// =================================================================
// Generate map
// =================================================================

function createWorld() {
  const WIDTH = 10_000;
  const HEIGHT = 10_000;
  return {
    WIDTH,
    HEIGHT,
    G_CONSTANT: 0.002,
    projectiles: [],
    spaceObjects: Array.from({ length: 100 }, () => createRandomSpaceObject(WIDTH, HEIGHT)),
  }
}


function newSpaceObject(x, y, mass, id = null) {
  return {
    id, x, y, mass,
    radius: Math.sqrt(mass) / 20
  };
}


function newProjectile(id, x, y, velocityX, velocityY) {
  return {
    id, x, y, velocityX, velocityY,
    mass: 1,
    radius: 5,
    firedAt: Date.now()
  }
}


function createRandomSpaceObject(width, height) {
  const x = Math.random() * width;
  const y = Math.random() * height;
  const mass = (Math.random() ** 4 * 20 + 1) * 800_000;
  return newSpaceObject(x, y, mass);
}


function findSafeSpawnLocation(world) {
  const safeDistance = 100; // Adjust this to change how far away new players must spawn from space objects
  let safe = false;
  let x, y;
  while (!safe) {
    x = Math.random() * world.WIDTH;
    y = Math.random() * world.HEIGHT;
    safe = true;
    for (const spaceObject of world.spaceObjects) {
      const distance = Math.sqrt((spaceObject.x - x) ** 2 + (spaceObject.y - y) ** 2);
      if (distance < safeDistance) {
        safe = false;
        break;
      }
    }
  }

  return { x, y };
}


// =================================================================
// Handle new Player
// =================================================================

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  const spawnLocation = findSafeSpawnLocation(world);
  const newPlayer = newSpaceObject(spawnLocation.x, spawnLocation.y, 1_000_000, socket.id);
  players[socket.id] = newPlayer;

  socket.emit("playerConnected", {
    currentPlayer: newPlayer,
    spaceObjects: world.spaceObjects,
    worldDimensions: { WORLD_WIDTH: world.WIDTH, WORLD_HEIGHT: world.HEIGHT }
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

function fireProjectile(id, angle, projSpeed) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const planet = players[id];
  world.projectiles.push(newProjectile(
    id,
    planet.x + cosA * planet.radius,
    planet.y + sinA * planet.radius,
    cosA * projSpeed,
    sinA * projSpeed
  ));
}


function cancelProjectile(id) {
  world.projectiles = world.projectiles.filter(p => p.id !== id);
}


// =================================================================
// Update game
// =================================================================

function pushGameState() {
  const now = Date.now();
  io.emit("gameStateUpdate", {
    projectiles: world.projectiles.filter(p => now - p.firedAt > 1000)
      .map(p => { return { id: p.id, x: p.x, y: p.y } })
  });
}


function projectileHit(p, planet) {
  if (!planet.id) {
    // spaceObject
  } else {
    // other player
  }
}


function gravity(spaceObject, projectile) {
  const distanceX = spaceObject.x - projectile.x;
  const distanceY = spaceObject.y - projectile.y;
  const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
  if (distance < spaceObject.radius + projectile.radius) {
    projectileHit(projectile, spaceObject);
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
  world.projectiles = world.projectiles.map(updateProjectile).filter(Boolean);
  pushGameState();
}


// =================================================================
// Start
// =================================================================

let world = createWorld();
const players = {};

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

setInterval(gameLoop, 1000 / 60);