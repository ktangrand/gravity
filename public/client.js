// import * as gfx from './graphics.js';
import * as gfx from './gfx3d.js';
import * as gui from './user-interface.js';

// Using [player.js] and [world.js] as singleton objects
import * as player from './player.js';
import * as world from './world.js';

// FOR DEBUGGING
window.d = {gfx, gui, player, world};

const socket = io();

const canvas = document.getElementById('gameCanvas');
let mouse = { x: 0, y: 0 };


// Socket events:

socket.on('playerConnected', data => initGame(data));
socket.on('res', data => player.home.resources = data);
socket.on('probe', data => world.streams.push([player.home, data, data.color]));


// User events:

function keyDownEvent({ key }) {
  if (['ArrowUp', 'w'].includes(key)) {
    player.adjustPower(1.005);
  } else if (['ArrowDown', 's'].includes(key)) {
    player.adjustPower(0.995);
  } else if (['f'].includes(key)) {
    player.sendProbe();
  }
}


function mouseDown(event) {
  if (event.button === 0) {
    event.preventDefault();
    canvas.addEventListener('mouseup', stopDrag);
    canvas.addEventListener('mouseleave', stopDrag);
    canvas.addEventListener('mousemove', drag);
  } else if (event.button === 2) {
    const iId = setInterval(aim, 1000 / 60);
    canvas.addEventListener('mouseup', () => clearInterval(iId));
    canvas.addEventListener('mouseleave', () => clearInterval(iId));
  }
}


function stopDrag() {
  canvas.removeEventListener('mousemove', drag);
}


function drag(event) {
  gfx.panCamera(event.movementX, event.movementY);
}


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
  if (event.deltaY !== 0) {
    gfx.zoomCamera(1 + event.deltaY / 1000);
  }
};


// Gameloop:

function updateHUD() {
  gui.showValue('power', player.power.toFixed(2));
  gui.showValue('angle', (player.angle * 180 / Math.PI).toFixed(3));
  gui.showValue('titanium', player.home.resources['titanium']);
  gui.showValue('antimatter', player.home.resources['antimatter']);
  gui.showValue('metamaterials', player.home.resources['metamaterials']);
}


function gameLoop() {
  gfx.render();
  updateHUD();
  requestAnimationFrame(gameLoop);
}


// Init:

function initGame(data) {
  world.initWorld(data.world);
  player.initPlayer(data.currentPlayer);
  gfx.init();
  gfx.setCamera(player.home.x, player.home.y);

  canvas.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('mousedown', e => { });
  window.addEventListener('keydown', keyDownEvent);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('wheel', mouseWheelEvent);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  // Start game
  gameLoop();
}

window.addEventListener('resize', gfx.resize);
