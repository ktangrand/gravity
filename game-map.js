
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


function newSpaceObject(x, y, mass, id = null) {
    return {
        id, x, y, mass,
    };
}


function createRandomSpaceObject(width, height) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const mass = (Math.random() ** 4 * 20 + 1) * 800_000;
    return newSpaceObject(x, y, mass);
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
}