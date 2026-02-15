import * as world from './world.js';
let home;
let angle;
let power;
let aimC = [];
let aimDirty = true;

function initPlayer (_home) {
  home = _home;
  power = 1;
  // reveal an initial area around the player's base
  world.calculateFOW([[home.x, home.y]], home.radius * 2);
  angle = 0;
  aimDirty = true;
}

function adjustPower (d) {
  power *= d;
  aimDirty = true;
}

function setAngle (r) {
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  angle = r;
  aimDirty = true;
}

function updateAim () {
  if (aimDirty) {
    aimC = world.calculateAim(home, angle, power);
    aimDirty = false;
  }
}

function sendProbe () {
  world.launchProbe(home, angle, power);
}

function rescaleWorld (factor) {
  home.x *= factor;
  home.y *= factor;
  home.radius *= factor;
  aimDirty = true;
}

export { initPlayer, adjustPower, setAngle, updateAim, angle, home, sendProbe, aimC, power, rescaleWorld };
