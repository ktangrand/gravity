import * as world from './world.js';
let home;
let angle;
let power;
let aimC = [];

function initPlayer (_home) {
  home = _home;
  power = 1;
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
  const path = world.calculateAim(home, angle, power);
  if (path.length < 2) {
    return;
  }
  const [x, y] = path[path.length - 1];
  let target = null;
  for (const p of world.planets) {
    const dx = p.x - x;
    const dy = p.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= p.radius) {
      target = p;
      break;
    }
  }
  world.streams.push([home, target || { x, y }, target ? target.color : 0]);
}

export { initPlayer, adjustPower, setAngle, angle, home, sendProbe, aimC, power };
