import * as world from './world.js';
let home;
let angle;
let power;
let aimC = [];

function initPlayer (_home) {
  home = _home;
  power = 1;
  // reveal an initial area around the player's base
  world.calculateFOW([[home.x, home.y]], home.radius * 2);
  setAngle(0);
}

function adjustPower (d) {
  power *= d;
  aimC = world.calculateAim(home, angle, power);
}

function setAngle (r) {
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  angle = r;
  aimC = world.calculateAim(home, angle, power);
}

function sendProbe () {
  world.launchProbe(home, angle, power);
}

export { initPlayer, adjustPower, setAngle, angle, home, sendProbe, aimC, power };
