let fieldResolution;
let fieldX, fieldY;
let planets;
let worldSize = 1;
let gConstant = 0.0000001;
const probes = [];
const projectileSpeed = 0.007;
let fow;
let fowView;
const fowResolution = 32;

function initWorld (_world) {
  let field;
  ({ field, fieldResolution, planets, size: worldSize = 1, G_CONSTANT: gConstant = 0.0000001 } = _world);
  fieldX = new DataView(field, 0, field.byteLength / 2);
  fieldY = new DataView(field, field.byteLength / 2, field.byteLength / 2);
  fow = new ArrayBuffer(fowResolution * fowResolution * 1);
  fowView = new Uint8Array(fow);
  probes.length = 0;
}

function calculateAim (home, angle, power) {
  const aimC = [[home.x, home.y]];
  let ax = home.x + 1.1 * home.radius * Math.cos(angle);
  let ay = home.y + 1.1 * home.radius * Math.sin(angle);
  let vx = projectileSpeed * Math.cos(angle) * power;
  let vy = projectileSpeed * Math.sin(angle) * power;
  for (let i = 0; i < 1000; i++) {
    aimC.push([ax, ay]);
    ax += vx;
    ay += vy;
    if (ax < 0 || ax > worldSize || ay < 0 || ay > worldSize) {
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

  const xi = x / worldSize * (fieldResolution - 1);
  const yi = y / worldSize * (fieldResolution - 1);
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
  // Calculate fog-of-war visibility along the provided path. The fog buffer is
  // a single byte per cell which is set to `1` when visible. This simple
  // implementation does not fade visibility over time but is sufficient for
  // revealing projectiles to other players when they enter a cell.
  const res = fowResolution;
  const rad = Math.max(1, Math.ceil(radius / worldSize * res));
  for (const [x, y] of path) {
    const cx = Math.floor(x / worldSize * res);
    const cy = Math.floor(y / worldSize * res);
    for (let yi = cy - rad; yi <= cy + rad; yi++) {
      if (yi < 0 || yi >= res) continue;
      for (let xi = cx - rad; xi <= cx + rad; xi++) {
        if (xi < 0 || xi >= res) continue;
        fowView[yi * res + xi] = 1; // sample value indicating visibility
      }
    }
  }
}

function isInFOW (x, y) {
  const res = fowResolution;
  const xi = Math.floor(x / worldSize * res);
  const yi = Math.floor(y / worldSize * res);
  if (xi < 0 || yi < 0 || xi >= res || yi >= res) return false;
  return fowView[yi * res + xi] !== 0;
}

function calcGravityAt (x, y) {
  let gx = 0;
  let gy = 0;
  for (const o of planets) {
    const dx = o.x - x;
    const dy = o.y - y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    if (distance <= o.radius) {
      return [1000, o.nr];
    }
    const force = gConstant * o.mass / distance ** 2;
    gx += force * dx / distance;
    gy += force * dy / distance;
  }
  return [gx, gy];
}

function recalcField () {
  const buffer = new ArrayBuffer(fieldResolution ** 2 * 4 * 2);
  const fx = new DataView(buffer, 0, buffer.byteLength / 2);
  const fy = new DataView(buffer, buffer.byteLength / 2, buffer.byteLength / 2);
  const worldStep = worldSize / (fieldResolution - 1);
  for (let y = 0; y < fieldResolution; y++) {
    const rowOfs = y * fieldResolution;
    for (let x = 0; x < fieldResolution; x++) {
      const [gx, gy] = calcGravityAt(x * worldStep, y * worldStep);
      const idx = (rowOfs + x) * 4;
      fx.setFloat32(idx, gx);
      fy.setFloat32(idx, gy);
    }
  }
  fieldX = fx;
  fieldY = fy;
}

function setWorldSize (size) {
  const factor = size / worldSize;
  worldSize = size;
  for (const p of planets) {
    p.x *= factor;
    p.y *= factor;
    p.radius *= factor;
  }
  recalcField();
  recalcProbes();
}

function launchProbe (start, angle, power) {
  const path = calculateAim(start, angle, power);
  if (path.length < 2) {
    return;
  }
  const [x, y] = path[1];
  calculateFOW([[x, y]], 0.02);
  probes.push({ start, angle, power, path, step: 1, x, y, visible: isInFOW(x, y) });
}

function updateProbes () {
  for (const probe of probes) {
    if (probe.step >= probe.path.length) {
      continue;
    }
    const [x, y] = probe.path[probe.step];
    probe.x = x;
    probe.y = y;
    // Reveal fog of war around the projectile's current location
    calculateFOW([[x, y]], 0.02);
    probe.visible = isInFOW(x, y);
    probe.step++;
    if (probe.step >= probe.path.length) {
      let target = null;
      for (const p of planets) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= p.radius) {
          target = p;
          break;
        }
      }
      probe.done = true;
    }
  }
  for (let i = probes.length - 1; i >= 0; i--) {
    if (probes[i].done) probes.splice(i, 1);
  }
}

function recalcProbes () {
  for (const probe of probes) {
    const origin = { x: probe.x, y: probe.y, radius: probe.start.radius };
    probe.path = calculateAim(origin, probe.angle, probe.power);
    probe.step = 1;
    calculateFOW([[probe.x, probe.y]], 0.02);
    probe.visible = isInFOW(probe.x, probe.y);
  }
}

export {
  initWorld,
  calculateAim,
  calculateFOW,
  isInFOW,
  planets,
  probes,
  launchProbe,
  updateProbes,
  recalcProbes,
  worldSize,
  setWorldSize
};
