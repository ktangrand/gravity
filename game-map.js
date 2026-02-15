// =================================================================
// Generate new world
// =================================================================

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function random_distribute (...probs) {
  const r = Math.random() * probs.reduce((a, b) => a + b);
  for (let i = 0, s = probs[0]; i < probs.length; i++, s += probs[i]) {
    if (r <= s) return i;
  }
}

// Planet types (index = color sent to client):
// 0 = Terrestrial (green)  – habitable, player start
// 1 = Ice Giant (blue)     – metamaterials-rich
// 2 = Dense Metal (silver) – titanium + antimatter
// 3 = Nebula (pink)        – antimatter + metamaterials
// 4 = Star (gold)          – massive gravity anchor, very resource-rich
// 5 = Gas Giant (orange)   – large, resource-rich

const PLANET_CONFIGS = [
  { color: 0, res: [['titanium', 2000, 10000], ['antimatter', 200, 1000]], sizeMul: 1 },
  { color: 1, res: [['titanium', 1000, 5000], ['metamaterials', 8000, 15000]], sizeMul: 1.5 },
  { color: 2, res: [['titanium', 3000, 5000], ['antimatter', 5000, 7000]], sizeMul: 0.8 },
  { color: 3, res: [['antimatter', 5000, 8000], ['metamaterials', 5000, 8000]], sizeMul: 1.2 },
  { color: 4, res: [['titanium', 15000, 30000], ['antimatter', 10000, 20000], ['metamaterials', 5000, 10000]], sizeMul: 8 },
  { color: 5, res: [['titanium', 5000, 15000], ['antimatter', 3000, 8000], ['metamaterials', 2000, 5000]], sizeMul: 4 },
];

const materialKgM3 = { titanium: 1000, antimatter: 700, metamaterials: 400 };

function generatePlanet (type) {
  const cfg = PLANET_CONFIGS[type];
  let mass = 0;
  let volume = 0;
  const resources = {};

  for (const [material, min, max] of cfg.res) {
    resources[material] = getRandomInt(min, max);
    mass += resources[material] * materialKgM3[material];
    volume += resources[material] / materialKgM3[material];
  }

  mass = mass / 1_000_000;
  const baseRadius = Math.cbrt((3 * volume) / (4 * Math.PI)) / 100;
  const variability = 0.6 + Math.random() * 0.8;

  return {
    mass: mass * variability * cfg.sizeMul,
    color: cfg.color,
    resources,
    radius: baseRadius * variability * cfg.sizeMul,
  };
}

function createWorld (size = 1, options = {}) {
  const worldSize = size;
  const planets = [];
  const planetCount = options.planetCount || getRandomInt(80, 150);
  const gravityScale = options.gravityScale || 1;
  let nr = 1;

  // Z-depth range: planets distributed within ±zRange of z=0
  // Physics stays on XY plane, Z is purely visual
  const zRange = worldSize * 0.4;

  // Check minimum distance from existing planets (XY only, for physics)
  function tooClose (x, y, minDist) {
    for (const p of planets) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist + p.radius) return true;
    }
    return false;
  }

  function placeWithMargin (radius) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const margin = radius * 2;
      const x = margin + Math.random() * (worldSize - margin * 2);
      const y = margin + Math.random() * (worldSize - margin * 2);
      if (!tooClose(x, y, radius * 2)) return { x, y };
    }
    return { x: Math.random() * worldSize, y: Math.random() * worldSize };
  }

  // Assign a Z coordinate based on planet type and randomness
  function assignZ (type, radius) {
    // Stars stay near z=0 (they're gravity anchors)
    if (type === 4) return (Math.random() - 0.5) * zRange * 0.15;
    // Gas giants spread moderately
    if (type === 5) return (Math.random() - 0.5) * zRange * 0.6;
    // Regular planets spread across the full Z range
    // Smaller planets can go further from the plane
    const spread = 0.5 + Math.random() * 0.5;
    return (Math.random() - 0.5) * zRange * 2 * spread;
  }

  // ── Stars (1-2 massive gravity anchors) ──
  const starCount = Math.random() < 0.6 ? 1 : 2;
  for (let i = 0; i < starCount; i++) {
    const props = generatePlanet(4);
    const pos = starCount === 1
      ? { x: worldSize * (0.35 + Math.random() * 0.3), y: worldSize * (0.35 + Math.random() * 0.3) }
      : placeWithMargin(props.radius);
    const z = assignZ(4, props.radius);
    planets.push({ x: pos.x, y: pos.y, z, populated: null, nr: nr++, ...props });
  }

  // ── Gas Giants (2-5 large bodies) ──
  const giantCount = getRandomInt(2, 6);
  for (let i = 0; i < giantCount; i++) {
    const props = generatePlanet(5);
    const pos = placeWithMargin(props.radius);
    const z = assignZ(5, props.radius);
    planets.push({ x: pos.x, y: pos.y, z, populated: null, nr: nr++, ...props });
  }

  // ── Clusters (groups of smaller planets) ──
  const clusterCount = getRandomInt(3, 7);
  const clusters = [];
  for (let c = 0; c < clusterCount; c++) {
    clusters.push({
      cx: worldSize * (0.1 + Math.random() * 0.8),
      cy: worldSize * (0.1 + Math.random() * 0.8),
      cz: (Math.random() - 0.5) * zRange,  // clusters have a Z center too
      spread: worldSize * (0.03 + Math.random() * 0.08),
    });
  }

  // ── Regular planets (with overlap check) ──
  const regularCount = planetCount - starCount - giantCount;
  for (let i = 0; i < regularCount; i++) {
    // 55% terrestrial, 18% ice, 12% dense metal, 10% nebula, 5% bonus large
    const roll = random_distribute(55, 18, 12, 10, 5);
    const actualType = roll === 4 ? getRandomInt(0, 4) : roll;
    const props = generatePlanet(actualType);

    // "Bonus large" planets get extra size
    if (roll === 4) {
      const boost = 1.5 + Math.random();
      props.radius *= boost;
      props.mass *= boost * boost;
    }

    let placed = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      let x, y, z;
      if (Math.random() < 0.4 && clusters.length > 0) {
        const cl = clusters[Math.floor(Math.random() * clusters.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * cl.spread;
        x = Math.max(props.radius, Math.min(worldSize - props.radius, cl.cx + Math.cos(angle) * dist));
        y = Math.max(props.radius, Math.min(worldSize - props.radius, cl.cy + Math.sin(angle) * dist));
        z = cl.cz + (Math.random() - 0.5) * cl.spread * 2;
      } else {
        x = props.radius + Math.random() * (worldSize - props.radius * 2);
        y = props.radius + Math.random() * (worldSize - props.radius * 2);
        z = assignZ(actualType, props.radius);
      }
      if (!tooClose(x, y, props.radius)) {
        planets.push({ x, y, z, populated: null, nr: nr++, ...props });
        placed = true;
        break;
      }
    }
    // Skip planet if no non-overlapping position found after 30 tries
    if (!placed) continue;
  }

  // ── Gravity field ──
  const fieldResolution = 256;
  const world = {
    fieldResolution,
    G_CONSTANT: 0.0000001 * gravityScale,
    size: worldSize,
    planets,
  };

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
  }
  return [gx, gy];
}

// =================================================================

function findAHome (world) {
  for (const planet of world.planets) {
    // First empty terrestrial (green) planet
    if (planet.color === 0 && !planet.populated) {
      planet.resources = {
        titanium: 1000,
        antimatter: 200,
        metamaterials: 100,
      };
      return planet;
    }
  }
}

module.exports = {
  createWorld,
  findAHome,
};
