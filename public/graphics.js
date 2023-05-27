
let cameraX = 0;
let cameraY = 0;
let mx;
let my;
let zoom = 1;
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
    const scaleFactor = 0.02;
    zoom -= scaleFactor * delta;
    zoom = Math.min(Math.max(zoom, 0.1), 3);
}


function w2c(x, y) {
    return [(x - cameraX) * zoom + mx, (y - cameraY) * zoom + my];
}


function circle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(...w2c(x, y), zoom * radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}


function drawPlayer(p) {
    circle(p.x, p.y, p.radius, 'blue');
    ctx.beginPath();
    ctx.moveTo(...w2c(p.x, p.y));
    ctx.lineTo(...w2c(p.x + 20000 * Math.cos(p.angle), p.y + 20000 * Math.sin(p.angle)));
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.01)';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...w2c(p.x, p.y));
    ctx.lineTo(...w2c(p.x + p.power * 60 * Math.cos(p.angle), p.y + p.power * 60 * Math.sin(p.angle)));
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
}


function drawPlanet(p) {
    circle(p.x, p.y, p.radius, 'gray');
}


function drawProjectiles(projectiles, id) {
    projectiles.forEach((p) => {
        circle(p.x, p.y, 20, 'rgba(255, 255, 0, 0.1');
        circle(p.x, p.y, 10, p.id === id ? 'green' : 'red');
    });
}


function render(player, planets, projectiles, mouse) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    planets.forEach(p => drawPlanet(p));
    drawPlayer(player);
    drawProjectiles(projectiles, player.id);
    ctx.restore();    
}


function init(canvasId) {
    canvas = document.getElementById(canvasId);
    mx = canvas.width / 2;
    my = canvas.height / 2;   
    ctx = canvas.getContext('2d');
}


export { init, setCamera, panCamera, zoomCamera, render, w2c };