const socket = io();

let currentPlayer;
let cameraX = 0;
let cameraY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let isMouseDown = false;
let killCam = false;
let projectiles = {};

let zoom = 1;
var projSpeed = 2.0;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


socket.on("playerConnected", (data) => {
  const playerData = data.currentPlayer;

  currentPlayer = new Player(playerData.id, playerData.x, playerData.y);

  spaceObjects = data.spaceObjects.map((spaceObjectData) => new SpaceObject(spaceObjectData.x, spaceObjectData.y, spaceObjectData.mass));
  WORLD_WIDTH = data.worldDimensions.WORLD_WIDTH;
  WORLD_HEIGHT = data.worldDimensions.WORLD_HEIGHT;

  cameraX = currentPlayer.x;
  cameraY = currentPlayer.y;
});


socket.on("gameStateUpdate", (data) => {
  for (const playerId in data.projectiles) {
    const projectileData = data.projectiles[playerId];
    projectiles[playerId] = new Projectile(
      projectileData.x,
      projectileData.y,
      projectileData.velocityX,
      projectileData.velocityY
    );
  }
  render();
});

// Event listeners for user input
window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "a"].includes(event.key)) {
    currentPlayer.angle -= 0.02;
  } else if (["ArrowRight", "d"].includes(event.key)) {
    currentPlayer.angle += 0.02;
  } else if (["ArrowUp", "w"].includes(event.key)) {
    projSpeed += 0.2;
  } else if (["ArrowDown", "s"].includes(event.key)) {
    projSpeed -= 0.2;
  } else if (["f"].includes(event.key)) {
    socket.emit("fireProjectile", { angle: currentPlayer.angle, projSpeed: projSpeed });
  } else if (["c"].includes(event.key)) {
    socket.emit("cancelProjectile");
  } else if (["Home", "h"].includes(event.key)) {
    cameraX = currentPlayer.x;
    cameraY = currentPlayer.y;
    killCam = false;
  } else if (["q"].includes(event.key)) {
 //  killCam = projectiles?.[currentPlayer.id]?.isFired;
    killCam = !killCam;
  }
});

canvas.addEventListener("mousedown", (event) => {
  isMouseDown = true;
  killCam = false;
  prevMouseX = event.clientX;
  prevMouseY = event.clientY;
});

canvas.addEventListener("mousemove", (event) => {
  if (isMouseDown) {
    const deltaX = (event.clientX - prevMouseX) / zoom;
    const deltaY = (event.clientY - prevMouseY) / zoom;

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
  const scaleFactor = 0.05;
  if (event.deltaY != 0) {
    zoom -= scaleFactor * Math.sign(event.deltaY);
    zoom = Math.min(Math.max(zoom, 0.1), 3);
    render();
  }
});


function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.mx = canvas.width / 2;
  canvas.my = canvas.height / 2;
  render();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function w2c(x, y) {
  return [(cameraX - x) * zoom + canvas.mx, (cameraY - y) * zoom + canvas.my];
}

function draw({x, y, radius}, color) {
  ctx.beginPath();
  ctx.arc(...w2c(x, y) , zoom * radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();

  //if(killCam &&= projectiles?.[currentPlayer.id]?.isFired) { // OBS: assignment
  if(killCam) {
    cameraX = projectiles[currentPlayer.id].x;
    cameraY = projectiles[currentPlayer.id].y;
  }

  // Draw space objects
  spaceObjects.forEach((spaceObject) => {
    draw(spaceObject, 'gray');
  });

  draw(currentPlayer.homePlanet, 'blue'); 
  ctx.beginPath();
  ctx.moveTo(...w2c(currentPlayer.x, currentPlayer.y));
  ctx.lineTo(...w2c(currentPlayer.x + projSpeed * 10 * Math.cos(currentPlayer.angle),
                    currentPlayer.y + projSpeed * 10 * Math.sin(currentPlayer.angle)));
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw projectiles
  for (const playerId in projectiles) {
    draw(projectiles[playerId], playerId === currentPlayer.id ? "red" : "green");
  }

  ctx.restore();
  drawHUD();
}


function drawHUD() {
  ctx.save();

  ctx.font = "20px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Initial Thrust: ${projSpeed.toFixed(1)}`, 10, 10);

  ctx.restore();
}