import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';

let camera;
let renderer;
let zoom = 1;
let canvas;
let scene;
let planetMeshes = [];


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
  //  camera.position.z = zoom;
  camera.position.z = zoom;
}

function updateWorldScale () {
  const ws = world.worldSize || 1;
  camera.far = ws * 5;
  camera.position.z = Math.max(1, ws);
  camera.position.x = ws / 2;
  camera.position.y = ws / 2;
  camera.updateProjectionMatrix();
}


function w2c (x, y) { // Convert from world to canvas coordinates

  // Project the given world point using the camera and convert it from
  // normalized device coordinates to pixel space on the canvas.
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

let probeGroup;

function drawProjectiles () {
  // The old implementation rendered a stream line between the firing planet
  // and the hit planet. This visualisation has been removed.

  if (probeGroup) {
    scene.remove(probeGroup);
  }
  probeGroup = new THREE.Group();
  const geom = new THREE.SphereGeometry(0.01, 8, 8);
  const mtl = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  for (const probe of world.probes) {
    if (!probe.visible) continue;
    const mesh = new THREE.Mesh(geom, mtl);
    mesh.position.set(probe.x, probe.y, 0.05);
    probeGroup.add(mesh);
  }
  scene.add(probeGroup);
}


let aimLine;

function drawAim () {
  if (aimLine) {
    scene.remove(aimLine);
  }
  const points = player.aimC.map(([ax, ay]) => new THREE.Vector3(ax, ay, 0));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x103010 });
  aimLine = new THREE.Line(geometry, material);
  scene.add(aimLine);
}


let playerArrow;

function drawPlayer () {
  if (playerArrow) {
    scene.remove(playerArrow);
  }
  const home = player.home;
  const dir = new THREE.Vector3(Math.cos(home.angle), Math.sin(home.angle), 0).normalize();
  const group = new THREE.Group();
  const maxLen = 0.4;
  const len = Math.min(maxLen, 0.1 * home.power);
  const baseGeom = new THREE.BoxGeometry(maxLen, 0.01, 0.01);
  const baseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.set(home.x + dir.x * maxLen / 2, home.y + dir.y * maxLen / 2, 0.06);
  base.rotation.z = home.angle;
  group.add(base);
  const color = new THREE.Color(0x00ff00).lerp(new THREE.Color(0xff0000), len / maxLen);
  const fillGeom = new THREE.BoxGeometry(len, 0.02, 0.02);
  const fillMat = new THREE.MeshBasicMaterial({ color });
  const fill = new THREE.Mesh(fillGeom, fillMat);
  fill.position.set(home.x + dir.x * len / 2, home.y + dir.y * len / 2, 0.07);
  fill.rotation.z = home.angle;
  group.add(fill);
  const headGeom = new THREE.ConeGeometry(0.03, 0.05, 8);
  const head = new THREE.Mesh(headGeom, fillMat);
  head.position.set(home.x + dir.x * (len + 0.025), home.y + dir.y * (len + 0.025), 0.07);
  head.rotation.z = home.angle - Math.PI / 2;
  group.add(head);
  playerArrow = group;
  scene.add(playerArrow);
}


function render () {
  drawAim();
  drawPlayer();
  drawProjectiles();
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
    const material = materials[p.color];
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
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, worldSize * 5);
  // camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 5);
  camera.position.z = Math.max(1, worldSize);
  camera.position.x = worldSize / 2;
  camera.position.y = worldSize / 2;
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  const ambientLight = new THREE.AmbientLight(0x808080);
  scene.add(ambientLight);
  scene.add(directionalLight);
  buildScene();
  resize();
}

export { init, setCamera, panCamera, zoomCamera, render, w2c, c2w, resize, updateWorldScale, updatePlanets };
