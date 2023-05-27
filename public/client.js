import * as gfx from "./graphics.js"
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


let player;
let projectiles = [];
let spaceObjects = [];

let mouse = {x: 0, y: 0};

// Socket events:

socket.on("playerConnected", data => initGame(data));
socket.on("world", world => spaceObjects = world.spaceObjects);
socket.on("score", data => player.radius = data);
socket.on("res", data => player.resources = data);

socket.on("gameStateUpdate", data => {
  projectiles = data.projectiles;
});


// User events:

function keyDownEvent({key}) {
  if (["ArrowLeft", "a"].includes(key)) {
    setAngle(player.angle + 0.02);
  } else if (["ArrowRight", "d"].includes(key)) {
    setAngle(player.angle - 0.02);
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


function mouseDown(event) {
  if(event.button === 0) {
    event.preventDefault();
    canvas.addEventListener('mouseup', stopDrag);
    canvas.addEventListener('mouseleave', stopDrag);
    canvas.addEventListener('mousemove', drag);
  }
  else if(event.button === 2) {
    const iId = setInterval(aim, 1);
    canvas.addEventListener('mouseup', () => clearInterval(iId));
    canvas.addEventListener('mouseleave', () => clearInterval(iId));
  }
};


function stopDrag() {
  canvas.removeEventListener('mousemove', drag);
};


function drag(event) {
  gfx.panCamera(event.movementX, event.movementY);
};


function aim() {
  const [wx, wy] = gfx.w2c(player.x, player.y);
  const dx = mouse.x - wx;
  const dy = mouse.y - wy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const ax = dx / (d * d * 0.1) + Math.cos(player.angle);
  const ay = dy / (d * d * 0.1) + Math.sin(player.angle);
  const angleToMouse = Math.atan2(dy, dx);

  setAngle(Math.atan2(ay, ax));
}


function mouseWheelEvent(event) {
  event.preventDefault();
  if (event.deltaY != 0) {
    gfx.zoomCamera(Math.sign(event.deltaY));
  }
};


// Gameloop:

function drawHUD() {
  document.getElementById("power").textContent = player.power.toFixed(2);
  document.getElementById("angle").textContent = (player.angle * 180 / Math.PI).toFixed(3);
  document.getElementById("x").textContent = mouse.x;
  document.getElementById("y").textContent = mouse.y;
  document.getElementById("titanium").textContent = player.resources["titanium"]
  document.getElementById("antimatter").textContent = player.resources["antimatter"]
  document.getElementById("metamaterials").textContent = player.resources["metamaterials"]
}


function gameLoop() {
  gfx.render(player, spaceObjects, projectiles, mouse);
  drawHUD();
  requestAnimationFrame(gameLoop);
}


// Init:

function initPlayer(playerData) {
  return {
    ...playerData,
    angle: 0,
    power: 10
  };  
}

function setAngle(r) {
  while(r > Math.PI) r -= 2 * Math.PI;
  while(r < -Math.PI) r += 2 * Math.PI;
  player.angle = r; 
}


function initGame(data) {
  player = initPlayer(data.currentPlayer);
  spaceObjects = data.world.spaceObjects;
  
  gfx.setCamera(player.x, player.y);

  canvas.addEventListener("mousemove", e => mouse = {x: e.clientX, y: e.clientY});
  canvas.addEventListener("mousedown", e => {});
  window.addEventListener("keydown", keyDownEvent);
  canvas.addEventListener("mousedown", mouseDown);
  canvas.addEventListener("wheel", mouseWheelEvent);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
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
