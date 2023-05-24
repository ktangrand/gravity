const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


let currentPlayer = {id: null, x: 0, y: 0, radius: 0, angle: 0};
let cameraX = 0;
let cameraY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let isMouseDown = false;
let projectiles = [];
let spaceObjects = [];
let zoom = 1;
let projSpeed = 10.0;


// Socket events:

socket.on("playerConnected", (data) => initGame(data));

socket.on("gameStateUpdate", (data) => {
  projectiles = data.projectiles;
});


// User events:

function keyDownEvent({key}) {
  if (["ArrowLeft", "a"].includes(key)) {
    currentPlayer.angle -= 0.02;
  } else if (["ArrowRight", "d"].includes(key)) {
    currentPlayer.angle += 0.02;
  } else if (["ArrowUp", "w"].includes(key)) {
    projSpeed += 0.2;
  } else if (["ArrowDown", "s"].includes(key)) {
    projSpeed -= 0.2;
  } else if (["f"].includes(key)) {
    socket.emit("fireProjectile", { angle: currentPlayer.angle, projSpeed: projSpeed });
  } else if (["c"].includes(key)) {
    socket.emit("cancelProjectile");
  } else if (["Home", "h"].includes(key)) {
    cameraX = currentPlayer.x;
    cameraY = currentPlayer.y;
  }
};

function mouseDownEvent({clientX, clientY}) {
  isMouseDown = true;
  prevMouseX = clientX;
  prevMouseY = clientY;
};

function mouseUpEvent() {
  isMouseDown = false;
};

function mouseMoveEvent({clientX, clientY}) {
  if (isMouseDown) {
    const deltaX = (clientX - prevMouseX) / zoom;
    const deltaY = (clientY - prevMouseY) / zoom;
    cameraX -= deltaX;
    cameraY -= deltaY;
    prevMouseX = clientX;
    prevMouseY = clientY;
  }
};

function mouseWheelEvent(event) {
  event.preventDefault();
  const scaleFactor = 0.05;
  if (event.deltaY != 0) {
    let zoom0 = zoom;
    zoom -= scaleFactor * Math.sign(event.deltaY);
    zoom = Math.min(Math.max(zoom, 0.1), 3);
  }
};


// GFX:

function w2c(x, y) {
  return [(x - cameraX) * zoom + canvas.mx, (y - cameraY) * zoom + canvas.my];
}

function circle(x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(...w2c(x, y) , zoom * radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawPlayer(p) {
  circle(p.x, p.y, p.radius, 'blue'); 
  ctx.beginPath();
  ctx.moveTo(...w2c(p.x, p.y));
  ctx.lineTo(...w2c(p.x + projSpeed * 6 * Math.cos(p.angle), p.y + projSpeed * 6 * Math.sin(p.angle)));
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawSpaceObject(o) {
  circle(o.x, o.y, o.radius, 'gray');
}

function drawProjectile(p) {
  circle(p.x, p.y, 20, 'rgba(255, 255, 0, 0.5');
  circle(p.x, p.y, 10, p.id === currentPlayer.id ? "green" : "red");
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


// Gameloop:

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  spaceObjects.forEach(o => drawSpaceObject(o));
  drawPlayer(currentPlayer);
  projectiles.forEach(p => drawProjectile(p));
  ctx.restore();
  drawHUD();
}

function gameLoop() {
  // updateGameObjects();
  render();
  requestAnimationFrame(gameLoop);
}


// Init:

function initPlayer(playerData) {
  currentPlayer = {
    id: playerData.id,
    x: playerData.x,
    y: playerData.y,
    radius: playerData.radius,
    angle: 0
  };  
}

function initGame(data) {
  initPlayer(data.currentPlayer);
  spaceObjects = data.spaceObjects;
  WORLD_WIDTH = data.worldDimensions.WORLD_WIDTH;
  WORLD_HEIGHT = data.worldDimensions.WORLD_HEIGHT;
  cameraX = currentPlayer.x;
  cameraY = currentPlayer.y;

  window.addEventListener("keydown", keyDownEvent);
  canvas.addEventListener("mousedown", mouseDownEvent);
  canvas.addEventListener("mousemove", mouseMoveEvent);
  canvas.addEventListener("mouseup", mouseUpEvent);
  canvas.addEventListener("wheel", mouseWheelEvent);
  // Start game
  gameLoop();
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.mx = canvas.width / 2;
  canvas.my = canvas.height / 2;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
