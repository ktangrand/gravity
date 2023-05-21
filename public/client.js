const socket = io();

let currentPlayer;
let cameraX = 0;
let cameraY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let isMouseDown = false;
let killCam = false;
let projectiles = [];
let spaceObjects = [];
let zoom = 1;
let projSpeed = 2.0;


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

socket.on("playerConnected", (data) => {
  const playerData = data.currentPlayer;
  currentPlayer = {
    id: playerData.id,
    x: playerData.x,
    y: playerData.y,
    radius: 1000000 / 50000,
    angle: 0
  };
  spaceObjects = data.spaceObjects;
  WORLD_WIDTH = data.worldDimensions.WORLD_WIDTH;
  WORLD_HEIGHT = data.worldDimensions.WORLD_HEIGHT;

  cameraX = currentPlayer.x;
  cameraY = currentPlayer.y;
});


socket.on("gameStateUpdate", (data) => {
  projectiles = [];
  for (const p in data.projectiles) {
    projectiles.push({
      id: p.id,
      x: p.x,
      y: p.y,
      radius: 5
    });
  }
  render();
});

// Event listeners for user input
window.addEventListener("keydown", ({key}) => {
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
    killCam = false;
  } else if (["q"].includes(key)) {
    killCam = currentPlayer.id in projectiles;
  }
});

canvas.addEventListener("mousedown", ({clientX, clientY}) => {
  isMouseDown = true;
  killCam = false;
  prevMouseX = clientX;
  prevMouseY = clientY;
});

canvas.addEventListener("mousemove", ({clientX, clientY}) => {
  if (isMouseDown) {
    const deltaX = (clientX - prevMouseX) / zoom;
    const deltaY = (clientY - prevMouseY) / zoom;

    cameraX -= deltaX;
    cameraY -= deltaY;

    prevMouseX = clientX;
    prevMouseY = clientY;

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
    let zoom0 = zoom;
    zoom -= scaleFactor * Math.sign(event.deltaY);
    zoom = Math.min(Math.max(zoom, 0.1), 3);
    if (!killCam) {
      cameraX += ((event.clientX - canvas.mx) * (zoom - zoom0)) / zoom;
      cameraY += ((event.clientY - canvas.my) * (zoom - zoom0)) / zoom;
    }
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
  return [(x - cameraX) * zoom + canvas.mx, (y - cameraY) * zoom + canvas.my];
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

  if(killCam &&= currentPlayer.id in projectiles) {
    cameraX = projectiles[currentPlayer.id].x;
    cameraY = projectiles[currentPlayer.id].y;
  }

  // Draw space objects
  spaceObjects.forEach(o => draw(o, 'gray'));

  draw(currentPlayer, 'blue'); 
  ctx.beginPath();
  ctx.moveTo(...w2c(currentPlayer.x, currentPlayer.y));
  ctx.lineTo(...w2c(currentPlayer.x + projSpeed * 10 * Math.cos(currentPlayer.angle),
                    currentPlayer.y + projSpeed * 10 * Math.sin(currentPlayer.angle)));
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw projectiles
  for (const p in projectiles) {
    draw(p, p.id === currentPlayer.id ? "red" : "green");
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