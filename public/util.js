function distance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function findSafeSpawnLocation(spaceObjects, WORLD_WIDTH, WORLD_HEIGHT) {
  const safeDistance = 100; // Adjust this to change how far away new players must spawn from space objects
  let safe = false;
  let x, y;

  while (!safe) {
    x = Math.floor(Math.random() * WORLD_WIDTH);
    y = Math.floor(Math.random() * WORLD_HEIGHT);
    safe = true;

    for (const spaceObject of spaceObjects) {
      if (distance(x, y, spaceObject.x, spaceObject.y) < safeDistance) {
        safe = false;
        break;
      }
    }
  }

  return { x, y };
}


module.exports = {
  distance,
  findSafeSpawnLocation,
};