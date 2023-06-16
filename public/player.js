import * as world from "./world.js";
let home;
let angle = 0;
let power = 20;
let aimC = [];


function initPlayer(_home) {
  home = _home;
  setAngle(0);
}


function adjustPower(d) {
  power += d;
  aimC = world.calculateAim(home, angle, power);
}


function setAngle(r) {
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  angle = r;
  aimC = world.calculateAim(home, angle, power);
}


function sendProbe() {

}


export { initPlayer, adjustPower, setAngle, angle, home, sendProbe, aimC, power }