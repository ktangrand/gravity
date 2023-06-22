import * as player from './player.js';
import * as world from './world.js';
import * as THREE from 'three';

let cameraX = 0;
let cameraY = 0;
let mx = 0;
let my = 0;
let zoom = 0.2;
let canvas;
let ctx;


function setCamera(x, y) {
  cameraX = x;
  cameraY = y;
}


function panCamera(dx, dy) {
  cameraX -= dx / zoom;
  cameraY -= dy / zoom;
}


function zoomCamera(delta) {
  const scaleFactor = 0.05;
  zoom -= scaleFactor * delta;
  zoom = Math.min(Math.max(zoom, 0.1), 3);
}


function w2c(x, y) { // Convert from world to canvas coordinates 
  return [(x - cameraX) * zoom + mx, (y - cameraY) * zoom + my];
}


function circle(x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(...w2c(x, y), zoom * radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}


function drawResourceStreams() {
  const anim = Date.now();
  for (const [start, end, color] of world.streams) {
    const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    let incr = 800 / dist;
    for (let i = 0; i < 1 - incr; i += incr) {
      const a = i + incr * (anim & 255) / 256;
      circle(end.x - (end.x - start.x) * a, end.y - (end.y - start.y) * a, 8, color);
    }
    incr = 200 / dist;
    for (let i = 0; i < 1 - incr; i += incr) {
      const a = i + incr * (anim & 255) / 256;
      circle(end.x - (end.x - start.x) * a, end.y - (end.y - start.y) * a, 6, color);
    }
  }
}


function drawPlanet(p) {
  circle(p.x, p.y, p.radius, p.color);
}


function drawProjectiles() {

}


function drawAim() {
  ctx.beginPath();
  ctx.moveTo(...w2c(...player.aimC[0]));
  for (const a of player.aimC) {
    ctx.lineTo(...w2c(...a));
  }
  ctx.strokeStyle = '#103010';
  ctx.lineWidth = 10;
  ctx.stroke();
}


function drawPlayer() {
  const { x, y, radius } = player.home;
  circle(x, y, radius + 20, '#ffffff');

  ctx.beginPath();
  ctx.moveTo(...w2c(x, y));
  ctx.lineTo(...w2c(x + player.power * 60 * Math.cos(player.angle),
    y + player.power * 60 * Math.sin(player.angle)));
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 20 * zoom;
  ctx.stroke();
  ctx.lineTo(...w2c(x + 20000 * Math.cos(player.angle),
    y + 20000 * Math.sin(player.angle)));
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 1;
  ctx.stroke();
}


function drawGrid() {
  const step = 20000 / 31;
  ctx.strokeStyle = '#200020';
  ctx.lineWidth = 1;
  const [ex, ey] = w2c(20000, 20000);
  const [zx, zy] = w2c(0, 0);
  for (let i = 0, g = 0; i < 32; i++, g += step) {
    const [cx, cy] = w2c(g, g);
    ctx.moveTo(zx, cy);
    ctx.lineTo(ex, cy);
    ctx.stroke();
    ctx.moveTo(cx, zy);
    ctx.lineTo(cx, ey);
    ctx.stroke();
  }
}


function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  drawGrid();
  drawAim();
  drawResourceStreams();
  world.planets.forEach(p => drawPlanet(p));
  drawPlayer(player, world);
  drawProjectiles();
  ctx.restore();
}


function resize() {
  canvas = document.getElementById('gameCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  mx = canvas.width / 2;
  my = canvas.height / 2;
}


function init() {
  canvas = document.getElementById('gameCanvas');    
  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({antialias: true, canvas});
  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
}


export { init, setCamera, panCamera, zoomCamera, render, w2c, resize };
