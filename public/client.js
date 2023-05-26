import * as gfx from "./graphics.js"
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


let player;
let projectiles = [];
let spaceObjects = [];
let WORLD_WIDTH;
let WORLD_HEIGHT;


// Socket events:

socket.on("playerConnected", data => initGame(data));


socket.on("gameStateUpdate", data => {
  projectiles = data.projectiles;
});


// User events:

let prevMouseX = 0;
let prevMouseY = 0;
let isMouseDown = false;

function keyDownEvent({key}) {
  if (["ArrowLeft", "a"].includes(key)) {
    player.angle -= 0.02;
  } else if (["ArrowRight", "d"].includes(key)) {
    player.angle += 0.02;
  } else if (["ArrowUp", "w"].includes(key)) {
    player.power += 0.2;
  } else if (["ArrowDown", "s"].includes(key)) {
    player.power -= 0.2;
  } else if (["f"].includes(key)) {
    socket.emit("fireProjectile", { angle: player.angle, projSpeed: player.power });
  } else if (["c"].includes(key)) {
    socket.emit("cancelProjectile");
  } else if (["Home", "h"].includes(key)) {
    gfx.setCamera(player.x, player.y);
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
    const deltaX = clientX - prevMouseX;
    const deltaY = clientY - prevMouseY;
    gfx.panCamera(deltaX, deltaY);
    prevMouseX = clientX;
    prevMouseY = clientY;
  }
};


function mouseWheelEvent(event) {
  event.preventDefault();
  if (event.deltaY != 0) {
    gfx.zoomCamera(Math.sign(event.deltaY));
  }
};


// Gameloop:

function drawHUD() {
  ctx.save();
  ctx.font = "20px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Initial Thrust: ${player.power.toFixed(1)}`, 10, 10);
  ctx.restore();
}


function gameLoop() {
  gfx.render(player, spaceObjects, projectiles);
  drawHUD();
  requestAnimationFrame(gameLoop);
}


// Init:

function initPlayer(playerData) {
  player = {
    id: playerData.id,
    x: playerData.x,
    y: playerData.y,
    radius: playerData.radius,
    angle: 0,
    power: 10
  };  
}


function initGame(data) {
  initPlayer(data.currentPlayer);

  spaceObjects = data.spaceObjects;
  WORLD_WIDTH = data.worldDimensions.WORLD_WIDTH;
  WORLD_HEIGHT = data.worldDimensions.WORLD_HEIGHT;
  gfx.setCamera(player.x, player.y)

  window.addEventListener("keydown", keyDownEvent);
  canvas.addEventListener("mouseleave", mouseUpEvent);
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
  gfx.init('gameCanvas');
}


window.addEventListener("resize", resizeCanvas);
resizeCanvas();
