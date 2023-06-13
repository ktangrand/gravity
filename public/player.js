let world;
let home;
let angle;
let power;
let aimC;


function createPlayer(world, homePlanet) {
  world = world;
  home = homePlanet;
}


function adjustPower(d) {
  power += d;
  calculateAim();
}


function setAngle(r) {
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  angle = r;
  calculateAim();
}


function calculateAim() {
  aimC = [[player.x, player.y]];
  let ax = player.x + 2 * player.radius * Math.cos(player.angle);
  let ay = player.y + 2 * player.radius * Math.sin(player.angle);
  let vx = Math.cos(player.angle) * player.power;
  let vy = Math.sin(player.angle) * player.power;
  for (let i = 0; i < 1000; i++) {
    aimC.push([ax, ay]);
    ax += vx;
    ay += vy;
    if (ax < 0 || ax > world.size || ay < 0 || ay > world.size) break;
    let [fx, fy] = gravity(ax, ay);
    if (fx === 1000) { // Collision
      break;
    }
    vx += fx;
    vy += fy;
  }
}


function gravity(x, y) {
  function getf(xi, yi) {
    if (xi >= world.fieldResolution || xi >= world.fieldResolution) {
      return [0, 0];
    }
    const idx = ((yi | 0) * world.fieldResolution + (xi | 0)) * 4;
    return [
      world.fx.getFloat32(idx),
      world.fy.getFloat32(idx)
    ];
  }

  const xi = x * (world.fieldResolution - 1) / world.size;
  const yi = y * (world.fieldResolution - 1) / world.size;
  const [fx00, fy00] = getf(xi, yi);
  const [fx10, fy10] = getf(xi + 1, yi);
  const [fx01, fy01] = getf(xi, yi + 1);
  const [fx11, fy11] = getf(xi + 1, yi + 1);

  for (const [fx, fy] of [[fx00, fy00], [fx10, fy00], [fx01, fy01], [fx11, fy11]]) {
    if (fx === 1000) {
      return [fx, fy];
    }
  }

  const xfrac = xi % 1;
  const yfrac = yi % 1;
  const i00 = (1 - xfrac) * (1 - yfrac);
  const i10 = xfrac * (1 - yfrac);
  const i01 = (1 - xfrac) * yfrac;
  const i11 = xfrac * yfrac;

  return [
    fx00 * i00 + fx01 * i01 + fx10 * i10 + fx11 * i11,
    fy00 * i00 + fy01 * i01 + fy10 * i10 + fy11 * i11
  ];
}


function sendProbe() {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const planet = players[id];
}


export { createPlayer, adjustPower, angle, home, sendProbe }