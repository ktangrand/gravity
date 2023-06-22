import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';

let camera;
let renderer;
let zoom = 1;
let canvas;
let scene;


function setCamera(x, y) {
  camera.position.x = x;
  camera.position.y = y;
}


function panCamera(dx, dy) {
  camera.position.x -= dx / 1000;
  camera.position.y += dy / 1000;
}


function zoomCamera(delta) {
  zoom *= delta;
  zoom = Math.min(Math.max(zoom, 0.5), 2);
  camera.position.z = zoom;
}


function w2c(x, y) { // Convert from world to canvas coordinates 
  return [(x - cameraX) * zoom + mx, (y - cameraY) * zoom + my];
}


function drawProjectiles() {

}


function drawAim() {
  return;
/*  ctx.beginPath();
  ctx.moveTo(...w2c(...player.aimC[0]));
  for (const a of player.aimC) {
    ctx.lineTo(...w2c(...a));
  }
  ctx.strokeStyle = '#103010';
  ctx.lineWidth = 10;
  ctx.stroke();
*/
}


function drawPlayer() {
  const { x, y, radius, angle, power } = player.home;
}


function render() {
  drawAim();
  renderer.render(scene, camera);

//  drawPlayer(player, world);
//  drawProjectiles();
}


function buildScene() {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const materials = [
    new THREE.MeshLambertMaterial({color: 0x008000 }),
    new THREE.MeshLambertMaterial({color: 0x0000ff }),
    new THREE.MeshLambertMaterial({color: 0x808080 }),
    new THREE.MeshLambertMaterial({color: 0xffc0cb })
  ];
  for(const p of world.planets) {
    const material = materials[p.color]
    const planet = new THREE.Mesh( geometry, material);
    scene.add( planet );
    planet.position.x = p.x;
    planet.position.y = p.y;
    planet.position.z = 0;
    planet.scale.x = p.radius;
    planet.scale.y = p.radius;
    planet.scale.z = p.radius;
  }
}


function resize() {
  canvas = document.getElementById('gameCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderer.setSize(canvas.width, canvas.height);
  camera.aspect = canvas.width / canvas.height;
}


function init() {
  canvas = document.getElementById('gameCanvas');
  scene = new THREE.Scene();    
  renderer = new THREE.WebGLRenderer({antialias: true, canvas});
  renderer.setSize(canvas.width, canvas.height);
  const fov = 75;
  const aspect = canvas.width / canvas.height;
  const near = 0.1;
  const far = 5;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 1;
  camera.position.x = 0.5;
  camera.position.y = 0.5;
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);
  const ambientLight = new THREE.AmbientLight(0x808080);
  scene.add(ambientLight);
  buildScene();
}


export { init, setCamera, panCamera, zoomCamera, render, w2c, resize };
