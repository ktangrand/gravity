
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
  const ResourceTypeDensities = {
    'titanium': 1000,
    'antimatter': 700,
    'metamaterials': 400
  };

  const celestialObjectProbability = Math.random();

  let resources;
  let color;

  if (celestialObjectProbability < 0.6) { // 60% chance for Terrestrial Planet
    resources = {
      'titanium': getRandomInt(2000, 10000),
      'antimatter': getRandomInt(200, 1000)
    };
    color = 'rgb(0, 128, 0)';
  } else if (celestialObjectProbability < 0.8) { // 20% chance for Ice Giant
    resources = {
      'titanium': getRandomInt(1000, 5000),
      'metamaterials': getRandomInt(8000, 10000)
    };
    color = 'rgb(0, 0, 255)';
  } else if (celestialObjectProbability < 0.9) { // 10% chance for Dense Metal World
    resources = {
      'titanium': getRandomInt(3000, 5000),
      'antimatter': getRandomInt(5000, 7000)
    };
    color = 'rgb(128, 128, 128)';
  } else { // 10% chance for Nebula
    resources = {
      'antimatter': getRandomInt(5000, 8000),
      'metamaterials': getRandomInt(5000, 8000)
    };
    color = 'rgb(255, 192, 203)';
  }

  let totalMass = 0;
  let totalVolume = 0;
  for (const resourceType in resources) {
    const resourceDensity = ResourceTypeDensities[resourceType];
    const resourceMass = resources[resourceType] * resourceDensity;
    const resourceVolume = resources[resourceType] / resourceDensity;

    totalMass += resourceMass;
    totalVolume += resourceVolume;
  }

  const averageDensity = totalMass / totalVolume;

  // Calculate the radius (m) of the planet based on its volume (m^3)
  const radius = Math.cbrt((3 * totalVolume) / (4 * Math.PI)) * 100.0;

  return { mass: totalMass, color, resources, density: averageDensity, radius };
}


function createWorld() {
  const WIDTH = 20000;
  const HEIGHT = 20000;
  return {
    G_CONSTANT: 0.002,
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    spaceObjects: Array.from({ length: 100 }, () => createRandomSpaceObject(WIDTH, HEIGHT)),
  }
}


function checkCollision(world, p) {
  for(const o of world.spaceObjects) {
    const distance = Math.sqrt((o.x - p.x) ** 2 + (o.y - p.y) ** 2);
    if (distance < (p.radius + o.radius)) {
      return o;
    }
  };
  return null;
}


function gravity(world, x, y) {
  let fx = 0;
  let fy = 0;
  world.spaceObjects.forEach(o => {  // todo: include other players
    const dx = o.x - x;
    const dy = o.y - y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    const force = world.G_CONSTANT * o.mass / distance ** 2
    fx += force * dx / distance;
    fy += force * dy / distance;
  });
  return [fx, fy];
}


let idCounter = 0;
function createRandomSpaceObject(width, height) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    id: idCounter++,
    ...generateResources()
  }
}


function findSafeSpawnLocation(world) {
  const safeDistance = 100; // Adjust this to change how far away new players must spawn from space objects
  let safe = false;
  let x, y;
  while (!safe) {
    x = Math.random() * world.WIDTH;
    y = Math.random() * world.HEIGHT;
    safe = true;
    for (const spaceObject of world.spaceObjects) {
      const distance = Math.sqrt((spaceObject.x - x) ** 2 + (spaceObject.y - y) ** 2);
      if (distance < safeDistance) {
        safe = false;
        break;
      }
    }
  }
  return { x, y };
}


module.exports = {
  createWorld,
  findSafeSpawnLocation,
  gravity,
  checkCollision,
}