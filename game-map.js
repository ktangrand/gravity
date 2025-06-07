// =================================================================
// Generate new world
// =================================================================
const WORLD_SIZE = 1;

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function random_distribute (...probs) {
  const r = Math.random() * probs.reduce((a, b) => a + b); // random * sum(arguments)
  for (let i = 0, s = probs[0]; i < probs.length; i++, s += probs[i]) {
    if (r <= s) return i;
  }
}

function generateResources () {
  const materialKgM3 = { titanium: 1000, antimatter: 700, metamaterials: 400 };

  const [color, ...resProb] = [ //
    [0, ['titanium', 2000, 10000], ['antimatter', 200, 1000]], // Terrestial
    [1, ['titanium', 1000, 5000], ['metamaterials', 8000, 1000]], // Ice Giant
    [2, ['titanium', 3000, 5000], ['antimatter', 5000, 7000]], // Dense Metal World
    [3, ['antimatter', 5000, 8000], ['metamaterials', 5000, 8000]] // Nebula
  ][random_distribute(60, 20, 10, 10)];

  let mass = 0;
  let volume = 0;
  const resources = {};
  for (const [material, min, max] of resProb) {
    resources[material] = getRandomInt(min, max);
    mass += resources[material] * materialKgM3[material];
    volume += resources[material] / materialKgM3[material];
  }

  mass = mass / 1_000_000;
  return {
    mass,
    color,
    resources,
    radius: Math.cbrt((3 * volume) / (4 * Math.PI)) / 100
  };
}

function createWorld (size = 1) {
  const worldSize = size;
  const planets = [];
  // Random planets
  for (let nr = 1; nr < 100; nr++) {
    planets.push({
      x: Math.random() * worldSize,
      y: Math.random() * worldSize,
      populated: null,
      nr,
      ...generateResources()
    });
  }

  const fieldResolution = 256;
  const world = {
    fieldResolution,
    G_CONSTANT: 0.00000004,
    size: worldSize,
    planets
  };

  // Calculate the field grid
  const t = Date.now();
  console.log('start field calc');
  const buffer = new ArrayBuffer(fieldResolution ** 2 * 4 * 2);
  const fxF32 = new DataView(buffer);
  const fyF32 = new DataView(buffer, buffer.byteLength / 2);
  const worldStep = worldSize / (fieldResolution - 1);
  for (let y = 0; y < fieldResolution; y++) {
    const rowOfs = y * fieldResolution;
    for (let x = 0; x < fieldResolution; x++) {
      const [gx, gy] = calcGravity(world, x * worldStep, y * worldStep);
      const bOffset = (rowOfs + x) * 4;
      fxF32.setFloat32(bOffset, gx);
      fyF32.setFloat32(bOffset, gy);
    }
  }
  console.log(`end field calc after ${Date.now() - t} ms`);
  world.field = fxF32;

  return world;
}

function calcGravity (world, x, y) {
  let gx = 0;
  let gy = 0;
  for (const o of world.planets) {
    const dx = o.x - x;
    const dy = o.y - y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    if (distance <= o.radius) {
      return [1000, o.nr];
    }
    const force = world.G_CONSTANT * o.mass / distance ** 2;
    gx += force * dx / distance;
    gy += force * dy / distance;
  };
  return [gx, gy];
}

// =================================================================
//
// =================================================================

function findAHome (world) {
  for (const planet of world.planets) {
    // first empty ..green marble
    if (planet.color === 0 && !planet.populated) {
      planet.resources = {
        titanium: 1000,
        antimatter: 200,
        metamaterials: 100
      };
      return planet;
    }
  }
}

module.exports = {
  createWorld,
  findAHome
};
