const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { createNoise2D } = require('simplex-noise');
const noise2D = createNoise2D();
const { distance, findSafeSpawnLocation } = require('./public/util');
const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;

const GRAVITATIONAL_CONSTANT = 0.002
const PROJECTILE_SPEED = 2

const app = express();

const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));


const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Create a list of players
const players = new Map();
const projectiles = [];

class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.homePlanet = new SpaceObject(this.x, this.y, 1000000);
    this.angle = 0;
    this.projectile = null;
  }

  update() {
    this.projectile?.update();
  }
}


class SpaceObject {
  constructor(x, y, mass) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.radius = mass / 50000;
  }

  contains(x, y) {
    return (x - this.x) ** 2 + (y - this.y) ** 2 < this.radius ** 2;
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

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
  }
}

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

  let mass;
  const type = Math.random();
  if (type < 0.3) {
    // 60% chance to create a medium asteroid
    mass = Math.floor(Math.random() * (1000000 - 100000)) + 100000;
  } else if (type < 0.8) {
    // 30% chance to create a large planet
    mass = Math.floor(Math.random() * (4000000 - 1000000)) + 1000000;
  } else {
    // 10% chance to create a massive star
    mass = Math.floor(Math.random() * (8000000 - 2000000)) + 2000000;
  }

  return new SpaceObject(x, y, mass);
}


function calculateForce(object1, object2) {
  // Calculate the distance between the two objects
  const distanceX = object2.x - object1.x;
  const distanceY = object2.y - object1.y;
  const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

  // Calculate the force of gravity
  const force = GRAVITATIONAL_CONSTANT * object1.mass * object2.mass / distance ** 2;

  // Calculate the direction of the force
  const forceX = force * distanceX / distance;
  const forceY = force * distanceY / distance;

  return { forceX, forceY };
}

const spaceObjects = Array.from({ length: 100 }, () => createRandomSpaceObject());

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  const spawnLocation = findSafeSpawnLocation(spaceObjects, WORLD_WIDTH, WORLD_HEIGHT);

  const newPlayer = new Player(socket.id, spawnLocation.x, spawnLocation.y);
  players.set(socket.id, newPlayer);

  socket.emit("playerConnected", { currentPlayer: newPlayer, spaceObjects: spaceObjects, worldDimensions: { WORLD_WIDTH, WORLD_HEIGHT } });

  socket.on("fireProjectile", (data) => {
    projectiles.push(new Projectile(
      socket.id,
      newPlayer.x,
      newPlayer.y,
      data.projSpeed * Math.cos(data.angle),
      data.projSpeed * Math.sin(data.angle)
    ));
  });

  socket.on("cancelProjectile", () => {
    projectiles = projectiles.filter((e) => e.id !== socket.id);
  });

  // Remove the player from the list when they disconnect
  socket.on("disconnect", () => {
    players.delete(socket.id);
    console.log("a user disconnected:", socket.id);
  });
});

function updateProjectile(p) {
  const playerPlanets = players.values().map((p) => p.homePlanet);
  spaceObjects.concat(playerPlanets).forEach((spaceObject) => {
    const force = calculateForce(p, spaceObject);
    p.velocityX += force.forceX / p.mass;
    p.velocityY += force.forceY / p.mass;
  });
}

function checkCollisionsAndHandleEliminations() {
  for (const [id, player] of players) {

    for (const spaceObject of spaceObjects) {
      if (player.projectile) {
        if (spaceObject.contains(player.projectile.x, player.projectile.y)) {
          player.projectile = null;
        }
      }
    }

    for (const otherPlayerId in players) {
      if ((otherPlayerId !== id) && player.projectile) {
        otherPlayer = players[otherPlayerId]
        if (otherPlayer.homePlanet.contains(player.projectile.x, player.projectile.y)) {
          // delete players[otherPlayerId]; // Remove the player from the game state
          player.projectile = null;

          // Send an event to all clients to notify them of the player's elimination
          // io.emit("playerEliminated", { playerId: otherPlayerId });
          console.log("Player ", otherPlayerId, " was destroyed ")
        }
      }
    }
  }
}

// Update game state and send it to clients periodically
setInterval(() => {
  // Update the game state (e.g., update projectiles, check for collisions)
  Object.values(players).forEach((p) => {
    p.update();
    if (p.projectile) {
      updateProjectile(p.projectile);
    }
  })

  checkCollisionsAndHandleEliminations();

  projectilesForClients = [];
  for (const p in projectiles) {
    //if (Date.now() - p.firedAt < 1000) continue;
    projectilesForClients.push = {id: p.id, x: p.x, y: p.y };
  }
  // Send the updated game state to all clients
  io.emit("gameStateUpdate", { projectiles: projectilesForClients });

}, 1000 / 60);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


