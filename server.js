const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { createNoise2D } = require('simplex-noise');
const noise2D = createNoise2D();
const { SpaceObject, Projectile, Player } = require('./public/shared');
const { distance, findSafeSpawnLocation } = require('./public/util');
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

const GRAVITATIONAL_CONSTANT = 0.0005
const PROJECTILE_SPEED = 2

const app = express();

const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));


const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Create a list of players
const players = {};


function createRandomSpaceObject() {
  const gridSize = 40; // Adjust this to change the number of potential object locations
  const scale = 0.5; // Adjust this to change the scale of the noise
  
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
  if (type < 0.6) {
    // 60% chance to create a medium asteroid
    mass = Math.floor(Math.random() * (1000000 - 100000)) + 100000;
  } else if (type < 0.9) {
    // 30% chance to create a large planet
    mass = Math.floor(Math.random() * (2000000 - 1000000)) + 1000000;
  } else {
    // 10% chance to create a massive star
    mass = Math.floor(Math.random() * (3000000 - 2000000)) + 2000000;
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

const spaceObjects = Array.from({ length: 10 }, () => createRandomSpaceObject());

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  const spawnLocation = findSafeSpawnLocation(spaceObjects, WORLD_WIDTH, WORLD_HEIGHT);
  
  const newPlayer = new Player(socket.id, spawnLocation.x, spawnLocation.y);
  players[socket.id] = newPlayer;

  socket.emit("playerConnected", { currentPlayer: newPlayer, spaceObjects: spaceObjects, worldDimensions: { WORLD_WIDTH, WORLD_HEIGHT }});

  socket.on("fireProjectile", (data) => {
    const player = players[socket.id]
    if (!player) {
      console.error(`Player with ID ${socket.id} not found`);
      return;
    }
    
    player.projectile.isFired = true;
    player.projectile.firedAt = Date.now();

    player.projectile.velocityX = data.projSpeed * Math.cos(data.angle);
    player.projectile.velocityY = data.projSpeed * Math.sin(data.angle);

  });

  socket.on("cancelProjectile", () => {
    const player = players[socket.id]
    if (!player) {
      console.error(`Player with ID ${socket.id} not found`);
      return;
    }

    player.projectile.isFired = false;
    player.resetProjectile();
  });

  // Remove the player from the list when they disconnect
  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log("a user disconnected:", socket.id);
  });
});

function updateProjectile(player,playerId) {
  if (player.projectile.isFired) {
    // Update the projectile's position, velocity, and apply gravity influences
    spaceObjects.forEach((spaceObject) => {
      const force = calculateForce(player.projectile, spaceObject);
      player.projectile.velocityX += force.forceX / player.projectile.mass;
      player.projectile.velocityY += force.forceY / player.projectile.mass;
    });

    for (const otherPlayerId in players) {
      if (otherPlayerId !== playerId && player.projectile.isFired) {
        otherPlayer = players[otherPlayerId]
        const force = calculateForce(player.projectile, otherPlayer.homePlanet);
        player.projectile.velocityX += force.forceX / player.projectile.mass;
        player.projectile.velocityY += force.forceY / player.projectile.mass;
      }
    }

    // Check if the projectile goes out of bounds and reset it
    // if (
    //   player.projectile.x < -WORLD_WIDTH ||
    //   player.projectile.x > WORLD_WIDTH ||
    //   player.projectile.y < -WORLD_HEIGHT ||
    //   player.projectile.y > WORLD_HEIGHT
    // ) {
    //   player.projectile.isFired = false;
    //   player.resetProjectile();
    // }
  }
}

function checkCollisionsAndHandleEliminations() {
  for (const playerId in players) {
    const player = players[playerId];

    for (const spaceObject of spaceObjects) {
      if (player.projectile.isFired) {
        if (spaceObject.contains(player.projectile.x,player.projectile.y)){

          player.projectile.isFired = false;
          player.resetProjectile();
        }
      }
    }

    for (const otherPlayerId in players) {
      if (otherPlayerId !== playerId && player.projectile.isFired) {
        otherPlayer = players[otherPlayerId]
        if (otherPlayer.homePlanet.contains(player.projectile.x, player.projectile.y)) {
          // delete players[otherPlayerId]; // Remove the player from the game state
          player.projectile.isFired = false;
          player.resetProjectile();

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
  for (const playerId in players) {
    const player = players[playerId];
    player.update();
    updateProjectile(player,playerId);
  }

  checkCollisionsAndHandleEliminations();

  const projectilesForClients = {};

  for (const playerId in players) {
    const player = players[playerId];

    // Delay sending projectile information for 1 second
    if (player.projectile.isFired && Date.now() - player.projectile.firedAt > 1000) {
      projectilesForClients[playerId] = {
        x: player.projectile.x,
        y: player.projectile.y,
      };
    }
  }

  // Send the updated game state to all clients
  io.emit("gameStateUpdate", { projectiles: projectilesForClients });
}, 1000 / 60);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


