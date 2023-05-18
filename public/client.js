const socket = io();

let currentPlayer;
let cameraX = 0;
let cameraY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let isMouseDown = false;

let zoom = 1;
var projSpeed = 2.0;

socket.on("playerConnected", (data) => {
  const playerData = data.currentPlayer;
  
  currentPlayer = new Player(playerData.id,playerData.x,playerData.y);

  spaceObjects = data.spaceObjects.map((spaceObjectData) => new SpaceObject(spaceObjectData.x, spaceObjectData.y, spaceObjectData.mass));
  WORLD_WIDTH = data.worldDimensions.WORLD_WIDTH;
  WORLD_HEIGHT = data.worldDimensions.WORLD_HEIGHT;
});

socket.on("gameStateUpdate", (data) => {
  let projectiles = {};

  for (const playerId in data.projectiles) {
    const projectileData = data.projectiles[playerId];
    projectiles[playerId] = new Projectile(
      projectileData.x,
      projectileData.y,
      projectileData.velocityX,
      projectileData.velocityY
    );
  }

  render(projectiles);
});

// Event listeners for user input
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    currentPlayer.angle -= 0.02;
  } else if (event.key === "ArrowRight") {
    currentPlayer.angle += 0.02;
  } else if (event.key === "ArrowUp") {
    projSpeed += 0.2;
  } else if (event.key === "ArrowDown") {
    projSpeed -= 0.2;
  } else if (event.key === "f") {
    socket.emit("fireProjectile", { angle: currentPlayer.angle, projSpeed: projSpeed });
  } else if (event.key == "c") {
    socket.emit("cancelProjectile")
  }
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function render(projectiles) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(zoom, zoom);

  // Calculate the offsets for the player's position
  const offsetX = currentPlayer.x - canvas.width / 2 - cameraX;
  const offsetY = currentPlayer.y - canvas.height / 2 - cameraY;

  // Draw space objects
  spaceObjects.forEach((spaceObject) => {
    spaceObject.draw(ctx, offsetX, offsetY, 'grey');
  });

  currentPlayer.projectile.draw(ctx, offsetX, offsetY, 'green');
  currentPlayer.homePlanet.draw(ctx, offsetX, offsetY, 'blue');

  const endX = currentPlayer.projectile.x - offsetX + projSpeed*1/zoom*10 * Math.cos(currentPlayer.angle);
  const endY = currentPlayer.projectile.y - offsetY + projSpeed*1/zoom*10 * Math.sin(currentPlayer.angle);
  ctx.beginPath();
  ctx.moveTo(currentPlayer.projectile.x - offsetX, currentPlayer.projectile.y - offsetY);
  ctx.lineTo(endX, endY );
  ctx.strokeStyle = "lime";
  ctx.stroke();

  // delete projectiles[currentPlayer.id];

  // Draw other players' projectiles
  for (const playerId in projectiles) {
    const projectile = projectiles[playerId];
    ctx.beginPath();
    ctx.arc(projectile.x - offsetX, projectile.y - offsetY, 5, 0, 2 * Math.PI, false);
    ctx.fillStyle = "red";
    ctx.fill();
  }

  ctx.restore();

  drawHUD();
}


canvas.addEventListener("mousedown", (event) => {
  isMouseDown = true;
  prevMouseX = event.clientX;
  prevMouseY = event.clientY;
});

canvas.addEventListener("mousemove", (event) => {
  if (isMouseDown) {
    const deltaX = (event.clientX - prevMouseX) / zoom; // Scale by zoom
    const deltaY = (event.clientY - prevMouseY) / zoom; // Scale by zoom

    cameraX += deltaX;
    cameraY += deltaY;

    prevMouseX = event.clientX;
    prevMouseY = event.clientY;

    render();
  }
});

canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();

  const scaleFactor = 0.1;
  
  if (event.deltaY > 0) {
    // Zoom in
    zoom -= scaleFactor;
  } else {
    // Zoom out
    zoom += scaleFactor;
  }

  // Clamp the zoom level to a minimum and maximum value
  zoom = Math.min(Math.max(zoom, 0.1), 3);

  render();
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Redraw the game state with the new canvas size
  render();
});


function resizeCanvas() {
  // Set the internal size to match the display size
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Redraw the game state with the new canvas size
  render();
}

// Initial canvas size
resizeCanvas();

// Update the canvas size when the window is resized
window.addEventListener("resize", resizeCanvas);

function drawHUD() {
  ctx.save();

  // Set the styles for the HUD
  ctx.font = "20px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Draw the score
  ctx.fillText("Initial Thrust: " + projSpeed, 10, 10);

  ctx.restore();
}