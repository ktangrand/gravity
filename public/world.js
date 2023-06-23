let fieldResolution;
let fieldX, fieldY;
let planets;
const streams = [];
let fow;
const fowResolution = 32;

function initWorld (_world) {
  let field;
  ({ field, fieldResolution, planets } = _world);
  fieldX = new DataView(field, 0, field.byteLength / 2);
  fieldY = new DataView(field, field.byteLength / 2, field.byteLength / 2);
  fow = new ArrayBuffer(fowResolution * fowResolution * 1);
}

function calculateAim (home, angle, power) {
  const aimC = [[home.x, home.y]];
  let ax = home.x + 1.1 * home.radius * Math.cos(angle);
  let ay = home.y + 1.1 * home.radius * Math.sin(angle);
  let vx = 0.01 * Math.cos(angle) * power;
  let vy = 0.01 * Math.sin(angle) * power;
  for (let i = 0; i < 1000; i++) {
    aimC.push([ax, ay]);
    ax += vx;
    ay += vy;
    if (ax < 0 || ax > 1 || ay < 0 || ay > 1) {
      break;
    }
    const [gx, gy] = gravity(ax, ay);
    if (gx === 1000) { // Collision
      break;
    }
    vx += gx;
    vy += gy;
  }
  return aimC;
}

function gravity (x, y) {
  function getf (xi, yi) {
    if (xi >= fieldResolution || xi >= fieldResolution) {
      return [0, 0];
    }
    const idx = ((yi | 0) * fieldResolution + (xi | 0)) * 4;
    return [
      fieldX.getFloat32(idx),
      fieldY.getFloat32(idx)
    ];
  }

  const xi = x * (fieldResolution - 1);
  const yi = y * (fieldResolution - 1);
  const [gx00, gy00] = getf(xi, yi);
  const [gx10, gy10] = getf(xi + 1, yi);
  const [gx01, gy01] = getf(xi, yi + 1);
  const [gx11, gy11] = getf(xi + 1, yi + 1);

  for (const [gx, gy] of [[gx00, gy00], [gx10, gy10], [gx01, gy01], [gx11, gy11]]) {
    if (gx === 1000) {
      return [gx, gy];
    }
  }

  const xfrac = xi % 1;
  const yfrac = yi % 1;
  const i00 = (1 - xfrac) * (1 - yfrac);
  const i10 = xfrac * (1 - yfrac);
  const i01 = (1 - xfrac) * yfrac;
  const i11 = xfrac * yfrac;

  return [
    gx00 * i00 + gx01 * i01 + gx10 * i10 + gx11 * i11,
    gy00 * i00 + gy01 * i01 + gy10 * i10 + gy11 * i11
  ];
}

function calculateFOW (path, radius) {

}

export {
  initWorld,
  calculateAim,
  streams,
  planets
};
