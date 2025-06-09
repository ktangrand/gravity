// import * as gfx from './graphics.js';
import * as gfx from './gfx3d.js';
import * as gui from './user-interface.js';

// Using [player.js] and [world.js] as singleton objects
import * as player from './player.js';
import * as world from './world.js';

// FOR DEBUGGING
window.d = { gfx, gui, player, world };

const socket = io();

const canvas = document.getElementById('gameCanvas');
let mouse = { x: 0, y: 0 };
let aiming = false;
let lastFrameTime = 0;

// Socket events:

socket.on('playerConnected', data => initGame(data));
socket.on('res', data => player.home.resources = data);
socket.on('launchProbe', data => {
  world.launchProbe(data.start, data.angle, data.power);
});

// User events:

function keyDownEvent ({ key }) {
  if (['ArrowUp', 'w'].includes(key)) {
    player.adjustPower(1.005);
  } else if (['ArrowDown', 's'].includes(key)) {
    player.adjustPower(0.995);
  } else if (['f'].includes(key)) {
    const data = { start: player.home, angle: player.angle, power: player.power };
    socket.emit('launchProbe', data);
    player.sendProbe();
  }
}

function mouseDown (event) {
  if (event.button === 0) {
    event.preventDefault();
    canvas.addEventListener('mouseup', stopDrag);
    canvas.addEventListener('mouseleave', stopDrag);
    canvas.addEventListener('mousemove', drag);
  } else if (event.button === 2) {
    aiming = true;
    const iId = setInterval(aim, 1000 / 60);
    const stop = () => {
      clearInterval(iId);
      aiming = false;
      canvas.removeEventListener('mouseup', stop);
      canvas.removeEventListener('mouseleave', stop);
    };
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
  }
}

function stopDrag () {
  canvas.removeEventListener('mousemove', drag);
}

function drag (event) {
  gfx.panCamera(event.movementX, event.movementY);
}

function aim () {
  const [mx, my] = gfx.c2w(mouse.x, mouse.y);
  const dx = mx - player.home.x;
  const dy = my - player.home.y;
  player.setAngle(Math.atan2(dy, dx));
}

function mouseWheelEvent (event) {
  event.preventDefault();
  if (aiming) {
    if (event.deltaY !== 0) {
      player.adjustPower(1 - event.deltaY / 1000);
    }
  } else if (event.deltaY !== 0) {
    gfx.zoomCamera(1 + event.deltaY / 1000);
  }
}

// Gameloop:

function updateHUD () {
  gui.showValue('power', player.power.toFixed(2));
  gui.showValue('angle', (player.angle * 180 / Math.PI).toFixed(3));
  gui.showValue('titanium', player.home.resources.titanium);
  gui.showValue('antimatter', player.home.resources.antimatter);
  gui.showValue('metamaterials', player.home.resources.metamaterials);
}

function gameLoop (timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  world.updateProbes(deltaTime);
  gfx.render();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

// Init:

function initGame (data) {
  world.initWorld(data.world);
  player.initPlayer(data.currentPlayer);
  gfx.init();
  gfx.setCamera(player.home.x, player.home.y);
  gui.setupWorldSize(
    world.worldSize,
    world.planets.length,
    data.world.G_CONSTANT,
    data.world.planetRadius,
    data.world.planetMass
  );
  gui.onGenerateWorld(params => {
    socket.emit('generateWorld', params);
  });

  canvas.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('keydown', keyDownEvent);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('wheel', mouseWheelEvent);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', gfx.resize);
  // Start game
  requestAnimationFrame(gameLoop);
}
