//
// 
//


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}


function random_distribute() {
  const r = Math.random() * [...arguments].reduce((a, b) => a + b); //random * sum(arguments)
  for (let i = 0, s = arguments[0]; i < arguments.length; i++, s += arguments[i]) {
    if (r < s) return i;
  }
}


function generateResources() {
  const materialKgM3 = {'titanium': 1000, 'antimatter': 700, 'metamaterials': 400};

  const [color, ...resProb] = [
    ['#008000', ['titanium', 2000, 10000], ['antimatter', 200, 1000]],     // Terrestial
    ['#0000ff', ['titanium', 1000, 5000], ['metamaterials', 8000, 1000]],  // Ice Giant
    ['#808080', ['titanium', 3000, 5000], ['antimatter', 5000, 7000]],     // Dense Metal World
    ['#ffc0cb', ['antimatter', 5000, 8000], ['metamaterials', 5000, 8000]] // Nebula
  ][random_distribute(60, 20, 10, 10)];

  let mass = 0;
  let volume = 0;
  let resources = {};
  for ([material, max, min] of resProb) {
    resources[material] = getRandomInt(max, min);
    mass += resources[material] * materialKgM3[material];
    volume += resources[material] / materialKgM3[material];
  }

  return { mass, color, resources, 
           radius: Math.cbrt((3 * volume) / (4 * Math.PI)) * 100.0 };
}


function createWorld(size) {
  const planets = [];
  // Random planets
  for(let nr = 1; nr < 100; nr++) {
    planets.push({
      x: Math.random() * size,
      y: Math.random() * size,
      populated: null,
      nr,
      ...generateResources()
    });
  }
  
  const fieldResolution = 256;
  const world = {
    fieldResolution,
    G_CONSTANT: 0.002,
    size: size,
    planets,
  };

  // Calculate the field grid
  let t = Date.now();
  console.log('start field calc');
  const buffer = new ArrayBuffer(fieldResolution ** 2 * 4 * 2);
  const fxF32 = new DataView(buffer);
  const fyF32 = new DataView(buffer, buffer.byteLength / 2);
  const worldStep = size / (fieldResolution - 1);
  for (let y = 0; y < fieldResolution; y++) {
    const rowOfs = y * fieldResolution;
    for (let x = 0; x < fieldResolution; x++) {
      const [fx, fy] = calcGravity(world, x * worldStep, y * worldStep);
      const bOffset = (rowOfs + x) * 4;
      fxF32.setFloat32(bOffset, fx);
      fyF32.setFloat32(bOffset, fy);
    }
  }
  console.log(`end field calc after ${Date.now() - t} ms`);
  world.fx = fxF32;
  world.fy = fyF32;

  return world;
}


function checkCollision(world, p) {
  for (const o of world.planets) {
    const distance = Math.sqrt((o.x - p.x) ** 2 + (o.y - p.y) ** 2);
    if (distance < (p.radius + o.radius)) {
      return o;
    }
  };
  return null;
}


function calcGravity(world, x, y) {
  let fx = 0;
  let fy = 0;
  world.planets.forEach(o => {
    const dx = o.x - x;
    const dy = o.y - y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    const force = world.G_CONSTANT * o.mass / distance ** 2
    fx += force * dx / distance;
    fy += force * dy / distance;
  });
  return [fx, fy];
}


function gravity(world, x, y) {
  if (x < 0 || x > world.size || y < 0 || y > world.size) {
    return [0, 0];
  }
  const worldStep = world.size / (world.fieldResolution - 1);
  const xi = Math.floor(x / worldStep);
  const yi = Math.floor(y / worldStep);
  const fx = world.fx.getFloat32((yi * world.fieldResolution + xi) * 4);
  const fy = world.fy.getFloat32((yi * world.fieldResolution + xi) * 4);
  return [fx, fy];
}


function findAHome(world) {
  for(planet of world.planets) {
    // first empty blue marble
    if(planet.color === '#008000' && !planet.populated) {
      planet.resources = {
        'titanium': 1000,
        'antimatter': 200,
        'metamaterials': 100
      }
      return planet;
    }
  }
}


module.exports = {
  createWorld,
  findAHome,
  gravity,
  checkCollision,
}