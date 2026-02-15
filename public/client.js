import * as gfx from './gfx3d.js';
import * as gui from './user-interface.js';
import * as audio from './audio.js';

// Using [player.js] and [world.js] as singleton objects
import * as player from './player.js';
import * as world from './world.js';

const socket = io({ autoConnect: false });

const canvas = document.getElementById('gameCanvas');
let mouse = { x: 0, y: 0 };
let aiming = false;
let lastFrameTime = 0;

// ===== UI Flow =====

const titleScreen = document.getElementById('title-screen');
const loadingScreen = document.getElementById('loading-screen');
const helpScreen = document.getElementById('help-screen');
const hud = document.getElementById('HUD');

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  const muted = audio.toggleMute();
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
});

document.getElementById('play-btn').addEventListener('click', () => {
  titleScreen.style.display = 'none';
  loadingScreen.style.display = 'flex';
  socket.connect();
});

document.getElementById('help-btn').addEventListener('click', () => {
  helpScreen.style.display = helpScreen.style.display === 'flex' ? 'none' : 'flex';
});

document.getElementById('help-dismiss').addEventListener('click', () => {
  helpScreen.style.display = 'none';
  localStorage.setItem('rkv-help-seen', '1');
});

// ===== Socket events =====

socket.on('playerConnected', data => initGame(data));
socket.on('res', data => { player.home.resources = data; });
socket.on('launchProbe', data => {
  world.launchProbe(data.start, data.angle, data.power);
});

socket.on('probeImpact', data => {
  const target = world.planets.find(p => p.nr === data.targetPlanetNr);
  if (target) {
    target.resources = data.targetResources;
  }
  gfx.flashPlanet(data.targetPlanetNr);
  audio.playImpact();
});

socket.on('probeBlocked', data => {
  gui.showNotification(data.reason);
  audio.playBlocked();
});

socket.on('gameStateUpdate', data => {
  for (const pData of data.planets) {
    const planet = world.planets.find(p => p.nr === pData.nr);
    if (planet) {
      planet.resources = pData.resources;
      planet.populated = pData.populated;
    }
  }
  const me = data.players.find(p => p.planetNr === player.home.nr);
  if (me) {
    player.home.resources = me.resources;
  }
});

socket.on('playerLeft', data => {
  gui.showNotification('A player has left');
  const planet = world.planets.find(p => p.nr === data.planetNr);
  if (planet) planet.populated = null;
});

socket.on('playerEliminated', data => {
  gui.showNotification('A player has been eliminated!');
});

socket.on('eliminated', data => {
  gui.showOverlay('DEFEATED', data.reason);
});

socket.on('victory', data => {
  gui.showOverlay('VICTORY', data.reason);
});

socket.on('serverFull', data => {
  loadingScreen.style.display = 'none';
  gui.showOverlay('SERVER FULL', data.message);
});

socket.on('disconnect', () => {
  gui.showNotification('Connection lost - reconnecting...');
});

socket.on('connect', () => {
  // If we reconnected after a disconnect, notify the user
  if (lastFrameTime > 0) {
    gui.showNotification('Reconnected');
  }
});

// ===== User events =====

function keyDownEvent ({ key }) {
  if (['ArrowUp', 'w'].includes(key)) {
    player.adjustPower(1.005);
  } else if (['ArrowDown', 's'].includes(key)) {
    player.adjustPower(0.995);
  } else if (['f'].includes(key)) {
    fireProbe();
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

// ===== Touch events =====

const isTouchDevice = 'ontouchstart' in window;
const fireBtn = document.getElementById('fire-btn');
let touchLastX = 0;
let touchLastY = 0;
let touchAiming = false;
let longPressTimer = null;

function fireProbe () {
  const data = { start: player.home, angle: player.angle, power: player.power };
  socket.emit('launchProbe', data);
  player.sendProbe();
  audio.playLaunch();
}

fireBtn.addEventListener('click', fireProbe);

function touchStart (event) {
  if (event.touches.length === 1) {
    const t = event.touches[0];
    touchLastX = t.clientX;
    touchLastY = t.clientY;
    // Start long-press timer for aim mode
    longPressTimer = setTimeout(() => {
      touchAiming = true;
    }, 300);
  } else if (event.touches.length === 2) {
    // Cancel long press if pinching
    clearTimeout(longPressTimer);
    touchAiming = false;
  }
}

function touchMove (event) {
  event.preventDefault();
  if (event.touches.length === 1) {
    const t = event.touches[0];
    const dx = t.clientX - touchLastX;
    const dy = t.clientY - touchLastY;
    touchLastX = t.clientX;
    touchLastY = t.clientY;

    if (touchAiming) {
      // Aim towards touch position
      const [mx, my] = gfx.c2w(t.clientX, t.clientY);
      const ddx = mx - player.home.x;
      const ddy = my - player.home.y;
      player.setAngle(Math.atan2(ddy, ddx));
    } else {
      // Pan camera
      clearTimeout(longPressTimer);
      gfx.panCamera(dx, dy);
    }
  } else if (event.touches.length === 2) {
    // Pinch to zoom
    const t0 = event.touches[0];
    const t1 = event.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    if (touchLastPinchDist > 0) {
      const scale = touchLastPinchDist / dist;
      if (touchAiming) {
        player.adjustPower(scale);
      } else {
        gfx.zoomCamera(scale);
      }
    }
    touchLastPinchDist = dist;
  }
}

let touchLastPinchDist = 0;

function touchEnd (event) {
  clearTimeout(longPressTimer);
  if (event.touches.length === 0) {
    touchAiming = false;
    touchLastPinchDist = 0;
  }
}

// ===== Game loop =====

function updateHUD () {
  gui.showValue('power', player.power.toFixed(2));
  gui.showValue('angle', (player.angle * 180 / Math.PI).toFixed(1) + '\u00B0');
  gui.showValue('titanium', Math.floor(player.home.resources.titanium || 0));
  gui.showValue('antimatter', Math.floor(player.home.resources.antimatter || 0));
  gui.showValue('metamaterials', Math.floor(player.home.resources.metamaterials || 0));
}

function gameLoop (timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  player.updateAim();
  world.updateProbes(deltaTime);
  gfx.render();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

// ===== Init =====

function initGame (data) {
  loadingScreen.style.display = 'none';

  world.initWorld(data.world);
  player.initPlayer(data.currentPlayer);
  gfx.init();
  gfx.setCamera(player.home.x, player.home.y);
  gui.setupWorldSize(world.worldSize, world.planets.length, data.world.G_CONSTANT);
  gui.onGenerateWorld(params => {
    socket.emit('generateWorld', params);
  });

  // Wire up probe hit callback
  world.onProbeHit(data => {
    socket.emit('probeHit', data);
  });

  // Show HUD
  hud.style.display = 'block';

  // Start ambient music
  audio.startAmbient();

  // Show help screen on first visit
  if (!localStorage.getItem('rkv-help-seen')) {
    helpScreen.style.display = 'flex';
  }

  canvas.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('keydown', keyDownEvent);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('wheel', mouseWheelEvent);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', gfx.resize);

  // Touch support
  if (isTouchDevice) {
    fireBtn.style.display = 'block';
    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    canvas.addEventListener('touchend', touchEnd);
  }

  // Start game
  requestAnimationFrame(gameLoop);
}
