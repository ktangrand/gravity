import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

// ── State ──────────────────────────────────────────────────────────
let camera, renderer, canvas, scene;
let zoom = 1;
let viewSize = 1;
let planetMeshes = [];
let planetGlows = [];
const planetFlashes = [];

// Probe pool
const PROBE_POOL_SIZE = 100;
let probeMeshes = [];
let probeGeom;

// Aim line (thick, dashed)
let aimLine, aimGeometry;
const AIM_MAX_POINTS = 1001;
let lastAimRef = null;

// Player arrow
let arrowGroup, arrowShaft, arrowHead, arrowShaftMat, arrowHeadMat;

// Background
let starField;

// Reusable colors
const colorGreen = new THREE.Color(0x00ff00);
const colorRed = new THREE.Color(0xff0000);
const tmpColor = new THREE.Color();

// Planet palette (richer than old flat colors)
const PLANET_COLORS = [
  0x2ecc71, // Terrestrial – emerald green
  0x5dade2, // Ice Giant – sky blue
  0xaab7b8, // Dense Metal – silver
  0xe88dd6, // Nebula – vibrant pink
];
const PLANET_EMISSIVE = [
  0x0a2e14,
  0x0a1a2e,
  0x151515,
  0x2e0a20,
];


// ── Camera ─────────────────────────────────────────────────────────

function setCamera (x, y) {
  camera.position.x = x;
  camera.position.y = y;
}

function panCamera (dx, dy) {
  // Zoom-aware: when zoomed in each pixel maps to less world space
  const scale = viewSize / (canvas.height * zoom);
  camera.position.x -= dx * scale;
  camera.position.y += dy * scale;
}

function zoomCamera (delta) {
  // delta > 1 on scroll-down → zoom OUT (smaller camera.zoom)
  zoom /= delta;
  zoom = Math.min(Math.max(zoom, 0.3), 30);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}

function updateWorldScale () {
  const ws = world.worldSize || 1;
  viewSize = ws;
  applyFrustum(ws);
  camera.position.set(ws / 2, ws / 2, 5);
  zoom = 1;
  camera.zoom = 1;
  camera.updateProjectionMatrix();

  // Rebuild starfield for the new world size
  if (starField) {
    scene.remove(starField);
    starField.geometry.dispose();
    starField.material.dispose();
  }
  createStarfield(ws);
}

function applyFrustum (ws) {
  const aspect = canvas.width / canvas.height;
  camera.left = -ws / 2 * aspect;
  camera.right = ws / 2 * aspect;
  camera.top = ws / 2;
  camera.bottom = -ws / 2;
}

function w2c (x, y) {
  const v = new THREE.Vector3(x, y, 0);
  v.project(camera);
  return [
    (v.x + 1) / 2 * canvas.width,
    (-v.y + 1) / 2 * canvas.height,
  ];
}

function c2w (x, y) {
  const v = new THREE.Vector3(
    (x / canvas.width) * 2 - 1,
    -(y / canvas.height) * 2 + 1,
    0,
  );
  v.unproject(camera);
  return [v.x, v.y];
}


// ── Starfield background ──────────────────────────────────────────

function createStarfield (ws) {
  const count = 700;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.2) * ws * 1.4;
    positions[i * 3 + 1] = (Math.random() - 0.2) * ws * 1.4;
    positions[i * 3 + 2] = -1; // behind everything

    const b = 0.3 + Math.random() * 0.7;
    const tint = Math.random();
    // Slight blue / warm / white tints
    colors[i * 3] = tint < 0.3 ? b * 0.8 : b;
    colors[i * 3 + 1] = b * (tint > 0.6 ? 1 : 0.95);
    colors[i * 3 + 2] = tint < 0.3 ? b : b * 0.85;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: ws * 0.003,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  starField = new THREE.Points(geom, mat);
  scene.add(starField);
}


// ── Planets ───────────────────────────────────────────────────────

function buildScene () {
  const geom = new THREE.SphereGeometry(1, 32, 24);
  planetMeshes = [];
  planetGlows = [];

  for (const p of world.planets) {
    // Planet body – smooth Phong shading with subtle emissive glow
    const mat = new THREE.MeshPhongMaterial({
      color: PLANET_COLORS[p.color],
      emissive: PLANET_EMISSIVE[p.color],
      shininess: 30,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(p.x, p.y, 0);
    mesh.scale.setScalar(p.radius);
    scene.add(mesh);
    planetMeshes.push(mesh);

    // Pulsing glow ring (only visible when populated)
    const ringGeom = new THREE.RingGeometry(1.3, 1.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(p.x, p.y, 0.01);
    ring.scale.setScalar(p.radius);
    scene.add(ring);
    planetGlows.push(ring);
  }
}

function updatePlanets () {
  const now = performance.now();
  for (let i = 0; i < planetMeshes.length; i++) {
    const mesh = planetMeshes[i];
    const glow = planetGlows[i];
    const p = world.planets[i];
    if (!mesh || !p) continue;

    mesh.position.set(p.x, p.y, 0);
    mesh.scale.setScalar(p.radius);

    if (glow) {
      glow.position.set(p.x, p.y, 0.01);
      glow.scale.setScalar(p.radius);
      if (p.populated) {
        glow.material.opacity = 0.35 + Math.sin(now * 0.003) * 0.15;
        glow.material.color.setHex(
          player.home && p.nr === player.home.nr ? 0x00ff88 : 0xff4444,
        );
      } else {
        glow.material.opacity = 0;
      }
    }
  }
}


// ── Probes ────────────────────────────────────────────────────────

function initProbePool () {
  probeGeom = new THREE.CircleGeometry(1, 12);
  for (let i = 0; i < PROBE_POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const mesh = new THREE.Mesh(probeGeom, mat);
    mesh.visible = false;
    scene.add(mesh);
    probeMeshes.push(mesh);
  }
}

function drawProjectiles () {
  const ws = world.worldSize || 1;
  const size = ws * 0.005;
  let idx = 0;
  for (const probe of world.probes) {
    if (!probe.visible || idx >= PROBE_POOL_SIZE) continue;
    const mesh = probeMeshes[idx++];
    mesh.visible = true;
    mesh.position.set(probe.x, probe.y, 0.05);
    mesh.scale.setScalar(size);
    // Pulsing yellow-orange glow
    const pulse = 0.7 + Math.sin(performance.now() * 0.01 + idx) * 0.3;
    mesh.material.color.setRGB(pulse, pulse * 0.9, pulse * 0.2);
  }
  for (let i = idx; i < PROBE_POOL_SIZE; i++) {
    probeMeshes[i].visible = false;
  }
}


// ── Aim trajectory (thick dashed line) ────────────────────────────

function initAimLine () {
  aimGeometry = new LineGeometry();
  aimGeometry.setPositions([0, 0, 0, 1, 0, 0]);

  const mat = new LineMaterial({
    color: 0x44ff88,
    linewidth: 3, // screen-space pixels
    transparent: true,
    opacity: 0.85,
    worldUnits: false,
    dashed: true,
    dashScale: 3,
    dashSize: 1,
    gapSize: 0.5,
  });
  mat.resolution.set(canvas.width, canvas.height);

  aimLine = new Line2(aimGeometry, mat);
  aimLine.visible = false;
  scene.add(aimLine);
}

function drawAim () {
  const points = player.aimC;
  if (!points || points.length < 2) {
    aimLine.visible = false;
    return;
  }

  // Only rebuild geometry when aim data actually changes
  if (points === lastAimRef) return;
  lastAimRef = points;

  aimLine.visible = true;
  const len = Math.min(points.length, AIM_MAX_POINTS);
  const positions = [];
  for (let i = 0; i < len; i++) {
    positions.push(points[i][0], points[i][1], 0.02);
  }

  aimGeometry.setPositions(positions);
  aimLine.computeLineDistances();
  aimLine.material.resolution.set(canvas.width, canvas.height);
}


// ── Player direction arrow ────────────────────────────────────────

function initPlayerArrow () {
  arrowGroup = new THREE.Group();

  // Shaft – flat rectangle
  const shaftGeom = new THREE.PlaneGeometry(1, 1);
  arrowShaftMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9,
  });
  arrowShaft = new THREE.Mesh(shaftGeom, arrowShaftMat);

  // Head – triangle pointing right (will be rotated)
  const headShape = new THREE.Shape();
  headShape.moveTo(0, -0.5);
  headShape.lineTo(1, 0);
  headShape.lineTo(0, 0.5);
  headShape.closePath();
  arrowHeadMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9,
  });
  arrowHead = new THREE.Mesh(new THREE.ShapeGeometry(headShape), arrowHeadMat);

  arrowGroup.add(arrowShaft, arrowHead);
  scene.add(arrowGroup);
}

function drawPlayer () {
  if (!player.home) return;

  const { x: hx, y: hy, radius: hr } = player.home;
  const angle = player.angle;
  const ws = world.worldSize || 1;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Length grows with power, capped
  const maxLen = ws * 0.12;
  const len = Math.min(maxLen, ws * 0.025 * player.power);
  const thickness = ws * 0.005;
  const headSize = ws * 0.015;

  // Green → Red colour ramp with power
  tmpColor.copy(colorGreen).lerp(colorRed, len / maxLen);
  arrowShaftMat.color.copy(tmpColor);
  arrowHeadMat.color.copy(tmpColor);

  // Shaft
  const startDist = hr * 1.5;
  const cx = hx + cosA * (startDist + len / 2);
  const cy = hy + sinA * (startDist + len / 2);
  arrowShaft.position.set(cx, cy, 0.07);
  arrowShaft.scale.set(len, thickness, 1);
  arrowShaft.rotation.z = angle;

  // Arrow head
  const tipDist = startDist + len;
  arrowHead.position.set(hx + cosA * tipDist, hy + sinA * tipDist, 0.07);
  arrowHead.scale.setScalar(headSize);
  arrowHead.rotation.z = angle;
}


// ── Flash effect on impact ────────────────────────────────────────

function flashPlanet (planetNr) {
  const idx = world.planets.findIndex(p => p.nr === planetNr);
  if (idx === -1 || !planetMeshes[idx]) return;
  planetMeshes[idx].material.emissive.set(0xffffff);
  planetFlashes.push({ mesh: planetMeshes[idx], startTime: performance.now() });
}

function updateFlashes () {
  const now = performance.now();
  for (let i = planetFlashes.length - 1; i >= 0; i--) {
    const f = planetFlashes[i];
    const elapsed = now - f.startTime;
    if (elapsed >= 400) {
      // Reset to planet's default emissive
      const pIdx = planetMeshes.indexOf(f.mesh);
      if (pIdx !== -1 && world.planets[pIdx]) {
        f.mesh.material.emissive.set(PLANET_EMISSIVE[world.planets[pIdx].color]);
      } else {
        f.mesh.material.emissive.set(0x000000);
      }
      planetFlashes.splice(i, 1);
    } else {
      f.mesh.material.emissive.setScalar(1 - elapsed / 400);
    }
  }
}


// ── Render ─────────────────────────────────────────────────────────

function render () {
  updatePlanets();
  drawAim();
  drawPlayer();
  drawProjectiles();
  updateFlashes();
  renderer.render(scene, camera);
}


// ── Resize ─────────────────────────────────────────────────────────

function resize () {
  if (!canvas || !renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  renderer.setSize(w, h);
  applyFrustum(viewSize);
  camera.updateProjectionMatrix();
  if (aimLine) aimLine.material.resolution.set(w, h);
}


// ── Init / cleanup ────────────────────────────────────────────────

function clearScene () {
  if (!scene) return;
  while (scene.children.length) {
    const obj = scene.children[0];
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  }
  planetMeshes = [];
  planetGlows = [];
  probeMeshes = [];
  planetFlashes.length = 0;
  lastAimRef = null;
  starField = null;
}

function init () {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas = document.getElementById('gameCanvas');
  canvas.width = w;
  canvas.height = h;

  // Reuse WebGL renderer across re-inits (avoids context limit)
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  renderer.setSize(w, h);

  // Tear down previous scene if re-initialising
  if (scene) clearScene();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // Orthographic camera – proper 2D top-down view
  const ws = world.worldSize || 1;
  viewSize = ws;
  const aspect = w / h;
  camera = new THREE.OrthographicCamera(
    -ws / 2 * aspect, ws / 2 * aspect,
    ws / 2, -ws / 2,
    -10, 10,
  );
  camera.position.set(ws / 2, ws / 2, 5);
  zoom = 1;
  camera.zoom = 1;

  // Lighting
  scene.add(new THREE.AmbientLight(0x404060));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 1, 5);
  scene.add(dir);

  // Build world
  createStarfield(ws);
  buildScene();
  initProbePool();
  initAimLine();
  initPlayerArrow();
  resize();
}


export {
  init, setCamera, panCamera, zoomCamera, render,
  flashPlanet, w2c, c2w, resize, updateWorldScale, updatePlanets,
};
