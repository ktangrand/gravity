import * as player from './player.js';
import * as world from './world.js';

let cameraX = 0;
let cameraY = 0;
let midX = 0;
let midY = 0;
let zoom = 1000;
let canvas;
let ctx;

function setCamera (x, y) {
  cameraX = x;
  cameraY = y;
}

function panCamera (dx, dy) {
  cameraX -= dx / zoom;
  cameraY -= dy / zoom;
}

function zoomCamera (delta) {
  zoom *= delta;
  zoom = Math.min(Math.max(zoom, 100), 2000);
}

function w2c (x, y) { // Convert from world to canvas coordinates
  return [(x - cameraX) * zoom + midX, (y - cameraY) * zoom + midY];
}

function circle (x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(...w2c(x, y), zoom * radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}


function drawPlanet (p) {
  const color = ['#008000', '#0000ff', '#808080', '#ffc0cb'][p.color];
  circle(p.x, p.y, p.radius);
}

function drawProjectiles () {

}

function drawAim () {
  ctx.beginPath();
  ctx.moveTo(...w2c(...player.aimC[0]));
  for (const a of player.aimC) {
    ctx.lineTo(...w2c(...a));
  }
  ctx.strokeStyle = '#103010';
  ctx.lineWidth = 10;
  ctx.stroke();
}

function drawPlayer () {
  const { x, y, radius } = player.home;
  circle(x, y, radius, '#ffffff');

  ctx.beginPath();
  ctx.moveTo(...w2c(x, y));
  ctx.lineTo(...w2c(x + 0.01 * player.power * Math.cos(player.angle),
    y + 0.01 * player.power * Math.sin(player.angle)));
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineTo(...w2c(x + Math.cos(player.angle),
    y + Math.sin(player.angle)));
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGrid () {
  const step = 1 / 31;
  ctx.strokeStyle = '#200020';
  ctx.lineWidth = 1;
  const [ex, ey] = w2c(1, 1);
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

function render () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  drawGrid();
  drawAim();
  world.planets.forEach(p => drawPlanet(p));
  drawPlayer(player, world);
  drawProjectiles();
  ctx.restore();
}

function resize () {
  canvas = document.getElementById('gameCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  midX = canvas.width / 2;
  midY = canvas.height / 2;
}

function init () {
  resize();
  ctx = canvas.getContext('2d');
}

export { init, setCamera, panCamera, zoomCamera, render, w2c, resize };
