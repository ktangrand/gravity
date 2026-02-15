import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

// ── State ──────────────────────────────────────────────────────────
let camera, renderer, canvas, scene;
let viewSize = 1;
let planetMeshes = [];
const planetFlashes = [];

// Camera orbit parameters
let focusX = 0.5, focusY = 0.5;
let camDist = 1.5;
let camPhi = 1.0;     // tilt from vertical (rad) — ~57°, range [0.2, 1.45]
let camTheta = 0;      // azimuthal rotation around vertical

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

// Reusable objects
const colorGreen = new THREE.Color(0x00ff00);
const colorRed = new THREE.Color(0xff0000);
const tmpColor = new THREE.Color();
const worldPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const raycaster = new THREE.Raycaster();
const tmpVec2 = new THREE.Vector2();

// Planet palette
const PLANET_COLORS = [
  0x2ecc71, // 0 Terrestrial
  0x5dade2, // 1 Ice Giant
  0xaab7b8, // 2 Dense Metal
  0xe88dd6, // 3 Nebula
  0xf5c842, // 4 Star
  0xe67e22, // 5 Gas Giant
];
const PLANET_EMISSIVE = [
  0x0a2e14, 0x0a1a2e, 0x151515, 0x2e0a20, 0x4a3a08, 0x3a1f08,
];


// ── Camera ─────────────────────────────────────────────────────────

function updateCameraPosition () {
  camera.position.set(
    focusX + camDist * Math.sin(camPhi) * Math.cos(camTheta),
    focusY + camDist * Math.sin(camPhi) * Math.sin(camTheta),
    camDist * Math.cos(camPhi),
  );
  camera.lookAt(focusX, focusY, 0);
}

function setCamera (x, y) {
  focusX = x;
  focusY = y;
  updateCameraPosition();
}

function panCamera (dx, dy) {
  // Scale pixel movement to world units based on camera distance
  const vFov = camera.fov * Math.PI / 180;
  const worldH = 2 * camDist * Math.tan(vFov / 2);
  const scale = worldH / canvas.clientHeight;

  // Camera right & up vectors projected onto world XY plane
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);

  focusX -= (dx * right.x - dy * up.x) * scale;
  focusY -= (dx * right.y - dy * up.y) * scale;

  updateCameraPosition();
}

function zoomCamera (delta) {
  camDist *= delta;
  const ws = viewSize || 1;
  camDist = Math.max(ws * 0.05, Math.min(ws * 5, camDist));
  updateCameraPosition();
}

function rotateCamera (dTheta, dPhi) {
  if (dTheta) camTheta += dTheta;
  if (dPhi) camPhi = Math.max(0.2, Math.min(1.45, camPhi + dPhi));
  updateCameraPosition();
}

function updateWorldScale () {
  const ws = world.worldSize || 1;
  viewSize = ws;
  focusX = ws / 2;
  focusY = ws / 2;
  camDist = ws * 1.5;
  camPhi = 1.0;
  camTheta = 0;
  camera.far = ws * 30;
  camera.near = ws * 0.001;
  camera.updateProjectionMatrix();
  updateCameraPosition();

  if (starField) {
    scene.remove(starField);
    starField.geometry.dispose();
    starField.material.dispose();
  }
  createStarfield(ws);
}

function w2c (x, y) {
  const v = new THREE.Vector3(x, y, 0);
  v.project(camera);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  return [(v.x + 1) / 2 * cw, (-v.y + 1) / 2 * ch];
}

function c2w (x, y) {
  // Raycast from camera through screen point onto the z=0 world plane
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  tmpVec2.set((x / cw) * 2 - 1, -(y / ch) * 2 + 1);
  raycaster.setFromCamera(tmpVec2, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(worldPlane, hit)) {
    return [hit.x, hit.y];
  }
  return [focusX, focusY];
}


// ── Starfield (sphere of stars surrounding the world) ─────────────

function createStarfield (ws) {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const radius = ws * 12;

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = ws / 2 + radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = ws / 2 + radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const b = 0.3 + Math.random() * 0.7;
    const tint = Math.random();
    colors[i * 3]     = tint < 0.3 ? b * 0.8 : b;
    colors[i * 3 + 1] = b * (tint > 0.6 ? 1 : 0.95);
    colors[i * 3 + 2] = tint < 0.3 ? b : b * 0.85;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: ws * 0.02,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });

  starField = new THREE.Points(geom, mat);
  scene.add(starField);
}


// ── Planets ───────────────────────────────────────────────────────

function buildScene () {
  const geom = new THREE.SphereGeometry(1, 32, 24);
  planetMeshes = [];

  for (const p of world.planets) {
    const mat = new THREE.MeshPhongMaterial({
      color: PLANET_COLORS[p.color] || 0xffffff,
      emissive: PLANET_EMISSIVE[p.color] || 0x000000,
      shininess: 30,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(p.x, p.y, 0);
    mesh.scale.setScalar(p.radius);
    scene.add(mesh);
    planetMeshes.push(mesh);
  }
}

function updatePlanets () {
  const now = performance.now();
  for (let i = 0; i < planetMeshes.length; i++) {
    const mesh = planetMeshes[i];
    const p = world.planets[i];
    if (!mesh || !p) continue;

    mesh.position.set(p.x, p.y, 0);
    mesh.scale.setScalar(p.radius);

    if (p.populated) {
      // Pulsing emissive for populated planets
      const pulse = 0.5 + Math.sin(now * 0.003) * 0.3;
      const isOwn = player.home && p.nr === player.home.nr;
      if (isOwn) {
        mesh.material.emissive.setRGB(0, pulse * 0.5, pulse * 0.3);
      } else {
        mesh.material.emissive.setRGB(pulse * 0.5, 0, 0);
      }
    } else {
      mesh.material.emissive.set(PLANET_EMISSIVE[p.color] || 0);
    }
  }
}


// ── Probes ────────────────────────────────────────────────────────

function initProbePool () {
  probeGeom = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0; i < PROBE_POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const mesh = new THREE.Mesh(probeGeom, mat);
    mesh.visible = false;
    scene.add(mesh);
    probeMeshes.push(mesh);
  }
}

function drawProjectiles () {
  const ws = viewSize || 1;
  const size = ws * 0.004;
  let idx = 0;
  for (const probe of world.probes) {
    if (!probe.visible || idx >= PROBE_POOL_SIZE) continue;
    const mesh = probeMeshes[idx++];
    mesh.visible = true;
    mesh.position.set(probe.x, probe.y, 0);
    mesh.scale.setScalar(size);
    const pulse = 0.7 + Math.sin(performance.now() * 0.01 + idx) * 0.3;
    mesh.material.color.setRGB(pulse, pulse * 0.9, pulse * 0.2);
  }
  for (let i = idx; i < PROBE_POOL_SIZE; i++) {
    probeMeshes[i].visible = false;
  }
}


// ── Aim trajectory (thick dashed line on the world plane) ─────────

function initAimLine () {
  aimGeometry = new LineGeometry();
  aimGeometry.setPositions([0, 0, 0, 1, 0, 0]);

  const mat = new LineMaterial({
    color: 0x44ff88,
    linewidth: 3,
    transparent: true,
    opacity: 0.85,
    worldUnits: false,
    dashed: true,
    dashScale: 3,
    dashSize: 1,
    gapSize: 0.5,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);

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

  if (points === lastAimRef) return;
  lastAimRef = points;

  aimLine.visible = true;
  const len = Math.min(points.length, AIM_MAX_POINTS);
  const positions = [];
  for (let i = 0; i < len; i++) {
    positions.push(points[i][0], points[i][1], 0.005);
  }

  aimGeometry.setPositions(positions);
  aimLine.computeLineDistances();
  aimLine.material.resolution.set(canvas.clientWidth, canvas.clientHeight);
}


// ── Player direction arrow (flat on the world plane) ──────────────

function initPlayerArrow () {
  arrowGroup = new THREE.Group();

  const shaftGeom = new THREE.PlaneGeometry(1, 1);
  arrowShaftMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  arrowShaft = new THREE.Mesh(shaftGeom, arrowShaftMat);

  const headShape = new THREE.Shape();
  headShape.moveTo(0, -0.5);
  headShape.lineTo(1, 0);
  headShape.lineTo(0, 0.5);
  headShape.closePath();
  arrowHeadMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  arrowHead = new THREE.Mesh(new THREE.ShapeGeometry(headShape), arrowHeadMat);

  arrowGroup.add(arrowShaft, arrowHead);
  scene.add(arrowGroup);
}

function drawPlayer () {
  if (!player.home) return;

  const { x: hx, y: hy, radius: hr } = player.home;
  const angle = player.angle;
  const ws = viewSize || 1;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const maxLen = ws * 0.12;
  const len = Math.min(maxLen, ws * 0.025 * player.power);
  const thickness = ws * 0.005;
  const headSize = ws * 0.015;

  tmpColor.copy(colorGreen).lerp(colorRed, len / maxLen);
  arrowShaftMat.color.copy(tmpColor);
  arrowHeadMat.color.copy(tmpColor);

  const startDist = hr * 1.5;
  const cx = hx + cosA * (startDist + len / 2);
  const cy = hy + sinA * (startDist + len / 2);
  arrowShaft.position.set(cx, cy, 0.01);
  arrowShaft.scale.set(len, thickness, 1);
  arrowShaft.rotation.z = angle;

  const tipDist = startDist + len;
  arrowHead.position.set(hx + cosA * tipDist, hy + sinA * tipDist, 0.01);
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
      const pIdx = planetMeshes.indexOf(f.mesh);
      if (pIdx !== -1 && world.planets[pIdx]) {
        f.mesh.material.emissive.set(PLANET_EMISSIVE[world.planets[pIdx].color] || 0);
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
  renderer.setSize(w, h);
  camera.aspect = w / h;
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
  probeMeshes = [];
  planetFlashes.length = 0;
  lastAimRef = null;
  starField = null;
}

function init () {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas = document.getElementById('gameCanvas');

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  renderer.setSize(w, h);

  if (scene) clearScene();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030308);

  // ── Perspective camera with orbital controls ──
  const ws = world.worldSize || 1;
  viewSize = ws;
  camera = new THREE.PerspectiveCamera(50, w / h, ws * 0.001, ws * 30);
  focusX = ws / 2;
  focusY = ws / 2;
  camDist = ws * 1.5;
  camPhi = 1.0;   // ~57° tilt from vertical
  camTheta = 0;
  updateCameraPosition();

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0x303050, 1.5));
  const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
  sun.position.set(ws, ws * 0.5, ws * 2);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x334466, 0.3);
  fill.position.set(-ws, -ws, -ws * 0.5);
  scene.add(fill);

  // ── Build world ──
  createStarfield(ws);
  buildScene();
  initProbePool();
  initAimLine();
  initPlayerArrow();
  resize();
}


export {
  init, setCamera, panCamera, zoomCamera, rotateCamera, render,
  flashPlanet, w2c, c2w, resize, updateWorldScale, updatePlanets,
};
