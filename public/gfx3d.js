import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';

let camera;
let renderer;
let zoom = 1;
let canvas;
let scene;


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


let streamGroup;

function drawProjectiles () {
  if (streamGroup) {
    scene.remove(streamGroup);
  }
  streamGroup = new THREE.Group();
  const colors = [0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
  for (const [start, end, color] of world.streams) {
    const material = new THREE.LineBasicMaterial({ color: colors[color % colors.length] });
    const points = [
      new THREE.Vector3(start.x, start.y, 0.01),
      new THREE.Vector3(end.x, end.y, 0.01)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    streamGroup.add(line);
  }
  scene.add(streamGroup);
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
  const origin = new THREE.Vector3(home.x, home.y, 0);
  const length = 0.1 * home.power;
  playerArrow = new THREE.ArrowHelper(dir, origin, length, 0xffff00);
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
    planet.position.x = p.x;
    planet.position.y = p.y;
    planet.position.z = 0;
    planet.scale.x = p.radius;
    planet.scale.y = p.radius;
    planet.scale.z = p.radius;
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
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 5);
  // camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 5);
  camera.position.z = 1;
  camera.position.x = 0.5;
  camera.position.y = 0.5;
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  const ambientLight = new THREE.AmbientLight(0x808080);
  scene.add(ambientLight);
  scene.add(directionalLight);
  buildScene();
  resize();
}


export { init, setCamera, panCamera, zoomCamera, render, w2c, c2w, resize };
