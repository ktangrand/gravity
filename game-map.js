
const ResourceTypeDensities = {
  'titanium': 1000,
  'antimatter' : 700,
  'metamaterials' : 400
};

function generateResources() {
  const celestialObjectProbability = Math.random();

  let resources;
  let color;

  if (celestialObjectProbability < 0.6) { // 60% chance for Terrestrial Planet
    resources = {
      'titanium': 1000,
      'antimatter': 200
    };
    color = 'green';
  } else if (celestialObjectProbability < 0.8) { // 20% chance for Ice Giant
    resources = {
      'titanium': 300,
      'metamaterials': 1000
    };
    color = 'blue';
  } else if (celestialObjectProbability < 0.9) { // 10% chance for Dense Metal World
    resources = {
      'titanium': 1200,
      'antimatter': 1000
    };
    color = 'grey';
  } else { // 10% chance for Nebula
    resources = {
      'antimatter': 800,
      'metamaterials': 800
    };
    color = 'pink';
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


function newSpaceObject(x, y, mass, color, radius, resources, id = null) {
    return {
        id, x, y, mass, color, radius, resources
    };
}


function createRandomSpaceObject(width, height) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    // const mass = (Math.random() ** 4 * 20 + 1) * 800_000;
    // radius = Math.sqrt(mass) / 20;

    let p = generateResources();
    return newSpaceObject(x, y, p.mass, p.color, p.radius, p.resources);
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