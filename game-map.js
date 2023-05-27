const ResourceType = {
  BASIC_METALS: 'basic_metals',
  EXOTIC_MINERALS: 'exotic_minerals',
  VOLATILE_COMPOUNDS: 'volatile_compounds'
};

const ResourceTypeDensities = {
  [ResourceType.BASIC_METALS]: 1000,
  [ResourceType.EXOTIC_MINERALS]: 700,
  [ResourceType.VOLATILE_COMPOUNDS]: 400
};

function generateResources() {
  const celestialObjectProbability = Math.random();

  let resources;
  let color;

  if (celestialObjectProbability < 0.6) { // 60% chance for Terrestrial Planet
    resources = {
      [ResourceType.BASIC_METALS]: 1000,
      [ResourceType.EXOTIC_MINERALS]: 200
    };
    color = 'green';
  } else if (celestialObjectProbability < 0.8) { // 20% chance for Ice Giant
    resources = {
      [ResourceType.BASIC_METALS]: 300,
      [ResourceType.VOLATILE_COMPOUNDS]: 1000
    };
    color = 'blue';
  } else if (celestialObjectProbability < 0.9) { // 10% chance for Dense Metal World
    resources = {
      [ResourceType.BASIC_METALS]: 1200,
      [ResourceType.EXOTIC_MINERALS]: 1000
    };
    color = 'grey';
  } else { // 10% chance for Nebula
    resources = {
      [ResourceType.EXOTIC_MINERALS]: 800,
      [ResourceType.VOLATILE_COMPOUNDS]: 800
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
    const WIDTH = 10_000;
    const HEIGHT = 10_000;
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
    ResourceType,
    ResourceTypeDensities
}