import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';

let camera;
let renderer;
let zoom = 1;
let canvas;
let scene;
let planetMeshes = [];
const planetFlashes = []; // { mesh, startTime } for active flash effects

// Pre-allocated objects for per-frame rendering
const PROBE_POOL_SIZE = 100;
const AIM_MAX_POINTS = 1001;
let probeMeshes = [];
let probeGeom;
let probeMat;
let aimLine;
let aimGeometry;
let aimPositions;
let arrowFill;
let arrowHead;
let arrowGroup;
let arrowFillMat;
let arrowHeadMat;

// Reusable color objects to avoid allocations
const colorGreen = new THREE.Color(0x00ff00);
const colorRed = new THREE.Color(0xff0000);
const tmpColor = new THREE.Color();


function setCamera (x, y) {
  camera.position.x = x;
  camera.position.y = y;
}


function panCamera (dx, dy) {
  camera.position.x -= dx / 1000;
  camera.position.y += dy / 1000;
}


function zoomCamera (delta) {
  zoom *= delta;
  zoom = Math.min(Math.max(zoom, 0.5), 2);
  camera.position.z = zoom;
}

function updateWorldScale () {
  const ws = world.worldSize || 1;
  camera.far = ws * 10;
  camera.position.z = Math.max(1, ws * 1.5);
  camera.position.x = ws / 2;
  camera.position.y = ws / 2;
  camera.updateProjectionMatrix();
}


function w2c (x, y) { // Convert from world to canvas coordinates
  const vector = new THREE.Vector3(x, y, 0);
  vector.project(camera);

  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;

  return [
    vector.x * halfWidth + halfWidth,
    -vector.y * halfHeight + halfHeight
  ];
}

function c2w (x, y) { // Convert from canvas to world coordinates (z=0 plane)
  const ndcX = (x / canvas.width) * 2 - 1;
  const ndcY = -(y / canvas.height) * 2 + 1;
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  return [pos.x, pos.y];
}


function initProbePool () {
  probeGeom = new THREE.SphereGeometry(0.01, 8, 8);
  probeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  for (let i = 0; i < PROBE_POOL_SIZE; i++) {
    const mesh = new THREE.Mesh(probeGeom, probeMat);
    mesh.visible = false;
    scene.add(mesh);
    probeMeshes.push(mesh);
  }
}

function drawProjectiles () {
  let idx = 0;
  for (const probe of world.probes) {
    if (!probe.visible || idx >= PROBE_POOL_SIZE) continue;
    const mesh = probeMeshes[idx++];
    mesh.visible = true;
    mesh.position.set(probe.x, probe.y, 0.05);
  }
  // Hide unused pool meshes
  for (let i = idx; i < PROBE_POOL_SIZE; i++) {
    probeMeshes[i].visible = false;
  }
}


function initAimLine () {
  aimPositions = new Float32Array(AIM_MAX_POINTS * 3);
  aimGeometry = new THREE.BufferGeometry();
  aimGeometry.setAttribute('position', new THREE.BufferAttribute(aimPositions, 3));
  aimGeometry.setDrawRange(0, 0);
  const aimMaterial = new THREE.LineBasicMaterial({ color: 0x103010 });
  aimLine = new THREE.Line(aimGeometry, aimMaterial);
  scene.add(aimLine);
}

function drawAim () {
  const points = player.aimC;
  const len = Math.min(points.length, AIM_MAX_POINTS);
  for (let i = 0; i < len; i++) {
    aimPositions[i * 3] = points[i][0];
    aimPositions[i * 3 + 1] = points[i][1];
    aimPositions[i * 3 + 2] = 0;
  }
  aimGeometry.attributes.position.needsUpdate = true;
  aimGeometry.setDrawRange(0, len);
}


function initPlayerArrow () {
  arrowGroup = new THREE.Group();
  const fillGeom = new THREE.BoxGeometry(1, 0.02, 0.02);
  arrowFillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  arrowFill = new THREE.Mesh(fillGeom, arrowFillMat);
  const headGeom = new THREE.ConeGeometry(0.03, 0.05, 8);
  arrowHeadMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  arrowHead = new THREE.Mesh(headGeom, arrowHeadMat);
  arrowGroup.add(arrowFill, arrowHead);
  scene.add(arrowGroup);
}

function drawPlayer () {
  const home = player.home;
  const angle = player.angle;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const maxLen = 0.4;
  const len = Math.min(maxLen, 0.1 * player.power);
  tmpColor.copy(colorGreen).lerp(colorRed, len / maxLen);
  arrowFillMat.color.copy(tmpColor);
  arrowHeadMat.color.copy(tmpColor);

  arrowFill.scale.x = len;
  arrowFill.position.set(home.x + cosA * len / 2, home.y + sinA * len / 2, 0.07);
  arrowFill.rotation.z = angle;

  arrowHead.position.set(home.x + cosA * (len + 0.025), home.y + sinA * (len + 0.025), 0.07);
  arrowHead.rotation.z = angle - Math.PI / 2;
}


function flashPlanet (planetNr) {
  const idx = world.planets.findIndex(p => p.nr === planetNr);
  if (idx === -1 || !planetMeshes[idx]) return;
  const mesh = planetMeshes[idx];
  mesh.material.emissive.set(0xffffff);
  planetFlashes.push({ mesh, startTime: performance.now() });
}

function updateFlashes () {
  const now = performance.now();
  for (let i = planetFlashes.length - 1; i >= 0; i--) {
    const flash = planetFlashes[i];
    const elapsed = now - flash.startTime;
    const duration = 400; // ms
    if (elapsed >= duration) {
      flash.mesh.material.emissive.set(0x000000);
      planetFlashes.splice(i, 1);
    } else {
      const intensity = 1 - elapsed / duration;
      flash.mesh.material.emissive.setScalar(intensity);
    }
  }
}

function render () {
  drawAim();
  drawPlayer();
  drawProjectiles();
  updateFlashes();
  renderer.render(scene, camera);
}


function buildScene () {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const materials = [
    new THREE.MeshLambertMaterial({ color: 0x008000, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0x0000ff, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0x808080, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0xffc0cb, flatShading: true })
  ];
  for (const p of world.planets) {
    const material = materials[p.color].clone();
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);
    planetMeshes.push(planet);
    planet.position.x = p.x;
    planet.position.y = p.y;
    planet.position.z = 0;
    planet.scale.x = p.radius;
    planet.scale.y = p.radius;
    planet.scale.z = p.radius;
  }
}

function updatePlanets () {
  for (let i = 0; i < planetMeshes.length; i++) {
    const mesh = planetMeshes[i];
    const p = world.planets[i];
    if (!mesh || !p) continue;
    mesh.position.x = p.x;
    mesh.position.y = p.y;
    mesh.scale.set(p.radius, p.radius, p.radius);
  }
}


function resize () {
  if (!canvas || !renderer || !camera) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderer.setSize(canvas.width, canvas.height);
  camera.aspect = canvas.width / canvas.height;
  camera.updateProjectionMatrix();
}


function init () {
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas = document.getElementById('gameCanvas');
  canvas.width = width;
  canvas.height = height;

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: false, canvas });
  renderer.setSize(width, height);
  const fov = 75;
  const aspect = width / height;
  const worldSize = world.worldSize || 1;
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, worldSize * 10);
  camera.position.z = Math.max(1, worldSize * 1.5);
  camera.position.x = worldSize / 2;
  camera.position.y = worldSize / 2;
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  const ambientLight = new THREE.AmbientLight(0x808080);
  scene.add(ambientLight);
  scene.add(directionalLight);
  buildScene();
  initProbePool();
  initAimLine();
  initPlayerArrow();
  resize();
}

export { init, setCamera, panCamera, zoomCamera, render, flashPlanet, w2c, c2w, resize, updateWorldScale, updatePlanets };
