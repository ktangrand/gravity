const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { createNoise2D } = require('simplex-noise');
const noise2D = createNoise2D();
const { findSafeSpawnLocation } = require('./public/util');

const WORLD_WIDTH = 10_000;
const WORLD_HEIGHT = 10_000;
const GRAVITATIONAL_CONSTANT = 0.002

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;


class SpaceObject {
  constructor(x, y, mass, id=null) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.radius = Math.sqrt(mass) / 20;
  }
}


class Projectile {
  constructor(id, x, y, velocityX, velocityY) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.mass = 1;
    this.radius = 5;
    this.firedAt = Date.now();
  }
}


const players = {};
let projectiles = [];
const spaceObjects = Array.from({ length: 100 }, () => createRandomSpaceObject());


function createRandomSpaceObject() {
  const gridSize = 100; // Adjust this to change the number of potential object locations
  const scale = 0.1; // Adjust this to change the scale of the noise

  // Create a grid of potential locations
  const xGrid = Math.floor(Math.random() * gridSize);
  const yGrid = Math.floor(Math.random() * gridSize);

  // Use the Simplex Noise function to add some randomness to these locations
  const xNoise = noise2D(xGrid * scale, yGrid * scale);
  const yNoise = noise2D(yGrid * scale, xGrid * scale);

  // Scale the noise output to the world size
  const x = Math.floor((xNoise * 0.5 + 0.5) * WORLD_WIDTH / gridSize) + xGrid * WORLD_WIDTH / gridSize;
  const y = Math.floor((yNoise * 0.5 + 0.5) * WORLD_HEIGHT / gridSize) + yGrid * WORLD_HEIGHT / gridSize;

  const mass = (Math.random() ** 4 * 20 + 1) * 800_000; 
  return new SpaceObject(x, y, mass);
}


io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  const spawnLocation = findSafeSpawnLocation(spaceObjects, WORLD_WIDTH, WORLD_HEIGHT);

  const newPlayer = new SpaceObject(spawnLocation.x, spawnLocation.y, 1_000_000, socket.id);
  players[socket.id] = newPlayer;

  socket.emit("playerConnected", {
    currentPlayer: newPlayer,
    spaceObjects: spaceObjects,
    worldDimensions: { WORLD_WIDTH, WORLD_HEIGHT }
  });

  socket.on("fireProjectile", (data) => {
    const cosA = Math.cos(data.angle);
    const sinA = Math.sin(data.angle);
    const planet = players[socket.id];
    projectiles.push(new Projectile(
      socket.id,
      planet.x + cosA * planet.radius,
      planet.y + sinA * planet.radius,
      cosA * data.projSpeed,
      sinA * data.projSpeed
    ));
  });

  socket.on("cancelProjectile", () => {
    projectiles = projectiles.filter((e) => e.id !== socket.id);
  });

  // Remove the player from the list when they disconnect
  socket.on("disconnect", () => {
    // todo: cancelProjectiles
    delete players[socket.id];
    console.log("a user disconnected:", socket.id);
  });
});


function gravity(spaceObject, projectile) {
  // Calculate the distance between the two objects
  const distanceX = spaceObject.x - projectile.x;
  const distanceY = spaceObject.y - projectile.y;
  const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
  if(distance < spaceObject.radius + projectile.radius) { // collision
    return null;
  }
  // Calculate the force of gravity
  const force = GRAVITATIONAL_CONSTANT * projectile.mass * spaceObject.mass / distance ** 2;
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
  for(const planet of [...spaceObjects, ...Object.values(players)]) {
    if(planet.id === p.id) continue; // No gravity for own planet
    p = gravity(planet, p);
    if(!p) {
      // todo: handle Projectile from player[p.id] hit planet
      return null;
    }
  }
  return p;
}


function pushGameState() {
  const now = Date.now();
  io.emit("gameStateUpdate", { 
    projectiles: projectiles.filter(p => now - p.firedAt > 1000)
                            .map(p => {return {id: p.id, x: p.x, y: p.y}})
  });  
}


function gameLoop() {
  // Update projectiles (remove when null)
  projectiles = projectiles.map(updateProjectile).filter(Boolean);
  pushGameState();
}


setInterval(gameLoop, 1000 / 60);


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});