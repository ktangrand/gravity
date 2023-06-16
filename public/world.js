let size;
let fieldResolution;
let fx;
let fy;
let planets;
let streams = [];
let fow;
const fowResolution = 32;

function initWorld(_world) {
    ({size, fieldResolution, fx, fy, planets} = _world);
    fx = new DataView(fx);
    fy = new DataView(fy);
    fow = new ArrayBuffer(fowResolution * fowResolution * 1);
}


function calculateAim(home, angle, power) {
    const aimC = [[home.x, home.y]];
    let ax = home.x + 2 * home.radius * Math.cos(angle);
    let ay = home.y + 2 * home.radius * Math.sin(angle);
    let vx = Math.cos(angle) * power;
    let vy = Math.sin(angle) * power;
    for (let i = 0; i < 1000; i++) {
      aimC.push([ax, ay]);
      ax += vx;
      ay += vy;
      if (ax < 0 || ax > size || ay < 0 || ay > size) {
        break;
      }
      let [fx, fy] = gravity(ax, ay);
      if (fx === 1000) { // Collision
        break;
      }
      vx += fx;
      vy += fy;
    }
    return aimC;
  }
  
  
  function gravity(x, y) {
    function getf(xi, yi) {
      if (xi >= fieldResolution || xi >= fieldResolution) {
        return [0, 0];
      }
      const idx = ((yi | 0) * fieldResolution + (xi | 0)) * 4;
      return [
        fx.getFloat32(idx),
        fy.getFloat32(idx)
      ];
    }
  
    const xi = x * (fieldResolution - 1) / size;
    const yi = y * (fieldResolution - 1) / size;
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
  
  function calculateFOW(path, radius) {

  }

  export { initWorld, calculateAim, streams, planets }