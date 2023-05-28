
const ResourceTypeDensities = {
  'titanium': 1000,
  'antimatter' : 700,
  'metamaterials' : 400
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateResources() {
  const celestialObjectProbability = Math.random();

  let resources;
  let color;

  if (celestialObjectProbability < 0.6) { // 60% chance for Terrestrial Planet
    resources = {
      'titanium': getRandomInt(2000,10000),
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
      'antimatter': getRandomInt(5000,8000),
      'metamaterials': getRandomInt(5000,8000)
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
  const radius = Math.cbrt((3 * totalVolume) / (4 * Math.PI))*100.0;

  return {mass: totalMass, color, resources, density: averageDensity, radius};
}


function createWorld() {
    const WIDTH = 20000;
    const HEIGHT = 20000;
    return {
        WIDTH,
        HEIGHT,
        G_CONSTANT: 0.002,
        spaceObjects: Array.from({ length: 100 }, () => createRandomSpaceObject(WIDTH, HEIGHT)),
    }
}


let idCounter = 0;


function newSpaceObject(x, y, mass, color, radius, resources, id = null) {
    return {
        id, x, y, mass, color, radius, resources
    };
}


function createRandomSpaceObject(width, height) {
    const x = Math.random() * width;
    const y = Math.random() * height;

    let p = generateResources();
    return newSpaceObject(x, y, p.mass, p.color, p.radius, p.resources, idCounter++);
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
    newSpaceObject,
    findSafeSpawnLocation,
    ResourceTypeDensities
}