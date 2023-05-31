import * as gfx from "./graphics.js";
import * as gui from "./user-interface.js";
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


let player;
let world;
let mouse = {x: 0, y: 0};


// Socket events:

socket.on("playerConnected", data => initGame(data));
socket.on("res", data => player.resources = data);
socket.on("probe", data =>  world.streams.push([player, data, data.color]));

socket.on("gameStateUpdate", data => {
  world.projectiles = data.projectiles;
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
  const [wx, wy] = gfx.w2c(player.x, player.y);
  const dx = mouse.x - wx;
  const dy = mouse.y - wy;
  const d = dx * dx + dy * dy;
  const ax = dx / (d * 0.1) + Math.cos(player.angle);
  const ay = dy / (d * 0.1) + Math.sin(player.angle);
  setAngle(Math.atan2(ay, ax));
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
  gui.showValue("metamaterials",player.resources["metamaterials"]);
}


function gameLoop() {
  gfx.render(player, world);
  updateHUD();
  requestAnimationFrame(gameLoop);
}


// Init:

function initPlayer(playerData) {
  return {
    ...playerData,
    angle: 0,
    power: 20
  };  
}

function setAngle(r) {
  while(r > Math.PI) r -= 2 * Math.PI;
  while(r < -Math.PI) r += 2 * Math.PI;
  player.angle = r; 
}


function initGame(data) {
  player = initPlayer(data.currentPlayer);
  world = data.world;
  world.streams = [];
  world.projectiles = [];
  world.fx = new DataView(world.fx);
  world.fy = new DataView(world.fy);
  
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
