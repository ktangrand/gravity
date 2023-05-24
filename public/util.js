function findSafeSpawnLocation(spaceObjects, WORLD_WIDTH, WORLD_HEIGHT) {
  const safeDistance = 100; // Adjust this to change how far away new players must spawn from space objects
  let safe = false;
  let x, y;

  while (!safe) {
    x = Math.floor(Math.random() * WORLD_WIDTH);
    y = Math.floor(Math.random() * WORLD_HEIGHT);
    safe = true;

    for (const spaceObject of spaceObjects) {
      const distance = Math.sqrt((spaceObject.x - x)**2 + (spaceObject.y - y)**2);
      if (distance < safeDistance) {
        safe = false;
        break;
      }
    }
  }

  return { x, y };
}


module.exports = {
  findSafeSpawnLocation,
};