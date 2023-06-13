import * as gfx from "./graphics.js";
import * as gui from "./user-interface.js";
import * as player from "./player.js";

const socket = io();
const canvas = document.getElementById('gameCanvas');

let world;
let mouse = { x: 0, y: 0 };


// Socket events:

socket.on("playerConnected", data => initGame(data));
socket.on("res", data => player.home.resources = data);
socket.on("probe", data => world.streams.push([player.home, data, data.color]));


// User events:

function keyDownEvent({ key }) {
  if (["ArrowUp", "w"].includes(key)) {
    player.adjustPower(0.2);
  } else if (["ArrowDown", "s"].includes(key)) {
    player.adjustPower(-0.2);
  } else if (["f"].includes(key)) {
    player.sendProbe();
  }
};


function mouseDown(event) {
  if (event.button === 0) {
    event.preventDefault();
    canvas.addEventListener('mouseup', stopDrag);
    canvas.addEventListener('mouseleave', stopDrag);
    canvas.addEventListener('mousemove', drag);
  }
  else if (event.button === 2) {
    const iId = setInterval(aim, 1000 / 60);
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
  const [wx, wy] = gfx.w2c(player.home.x, player.home.y);
  const dx = mouse.x - wx;
  const dy = mouse.y - wy;
  const d = dx * dx + dy * dy;
  const ax = dx / (d * 0.1) + Math.cos(player.angle);
  const ay = dy / (d * 0.1) + Math.sin(player.angle);
  player.setAngle(Math.atan2(ay, ax));
}


function mouseWheelEvent(event) {
  event.preventDefault();
  if (event.deltaY != 0) {
    gfx.zoomCamera(Math.sign(event.deltaY));
  }
};


// Gameloop:

function updateHUD() {
  gui.showValue('power', player.power.toFixed(2));
  gui.showValue("angle", (player.angle * 180 / Math.PI).toFixed(3));
  gui.showValue("titanium", player.resources["titanium"]);
  gui.showValue("antimatter", player.resources["antimatter"]);
  gui.showValue("metamaterials", player.resources["metamaterials"]);
}


function gameLoop() {
  gfx.render();
  updateHUD();
  requestAnimationFrame(gameLoop);
}


// Init:

function initGame(data) {
  player.createPlayer(data.currentPlayer);
  world = data.world;
  world.streams = [];
  world.projectiles = [];
  world.fx = new DataView(world.fx);
  world.fy = new DataView(world.fy);

  gfx.init('gameCanvas', player.home, world);
  gfx.setCamera(player.home.x, player.home.y);

  canvas.addEventListener("mousemove", e => mouse = { x: e.clientX, y: e.clientY });
  canvas.addEventListener("mousedown", e => { });
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
  gfx.init('gameCanvas', player, world);
}


window.addEventListener("resize", resizeCanvas);
resizeCanvas();
