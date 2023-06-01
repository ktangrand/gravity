
let cameraX = 0;
let cameraY = 0;
let mx = 0;
let my = 0;
let zoom = 0.2;
let canvas;
let ctx;
let world = {};
let player = {};
let aimC = [];


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


function w2c(x, y) {
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
            let a = i + incr * (anim & 255) / 256;
            circle(end.x - (end.x - start.x) * a, end.y - (end.y - start.y) * a, 8, color);
        }
        incr = 200 / dist;
        for (let i = 0; i < 1 - incr; i += incr) {
            let a = i + incr * (anim & 255) / 256;
            circle(end.x - (end.x - start.x) * a, end.y - (end.y - start.y) * a, 6, color);
        }
    }
}


function drawPlanet(p) {
    circle(p.x, p.y, p.radius, p.color);
}


function drawProjectiles() {
    world.projectiles.forEach((p) => {
        circle(p.x, p.y, 10, p.id === player.id ? 'green' : 'red');
    });
}


function calculateAim() {
    aimC = [];
    let ax = player.x + player.radius * Math.cos(player.angle);
    let ay = player.y + player.radius * Math.sin(player.angle);
    let vx = Math.cos(player.angle) * player.power;
    let vy = Math.sin(player.angle) * player.power;
    for (let i = 0; i < 1000; i++) {
        if (i % 30) {
            aimC.push([ax, ay]);
        }
        ax += vx;
        ay += vy;
        if (ax < 0 || ax > world.size || ay < 0 || ay > world.size) break;
        let [fx, fy] = gravity(ax, ay);
        vx += fx;
        vy += fy;
    }
}


function drawAim() {
    ctx.beginPath();
    ctx.moveTo(...w2c(...aimC[0]));
    for (let a of aimC) {
        ctx.lineTo(...w2c(...a));
    }
    ctx.strokeStyle = '#103010';
    ctx.lineWidth = 10;
    ctx.stroke()
}


function drawPlayer() {
    circle(player.x, player.y, player.radius + 20, '#ffffff');

    ctx.beginPath();
    ctx.moveTo(...w2c(player.x, player.y));
    ctx.lineTo(...w2c(player.x + player.power * 60 * Math.cos(player.angle),
        player.y + player.power * 60 * Math.sin(player.angle)));
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 20 * zoom;
    ctx.stroke();
    ctx.lineTo(...w2c(player.x + 20000 * Math.cos(player.angle),
        player.y + 20000 * Math.sin(player.angle)));
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    ctx.stroke();
}


function drawGrid() {
    const step = 20000 / 31;
    ctx.strokeStyle = '#200020';
    ctx.lineWidth = 1;
    let [ex, ey] = w2c(20000, 20000);
    let [zx, zy] = w2c(0, 0);
    for (let i = 0, g = 0; i < 32; i++, g += step) {
        let [cx, cy] = w2c(g, g);
        ctx.moveTo(zx, cy);
        ctx.lineTo(ex, cy);
        ctx.stroke();
        ctx.moveTo(cx, zy);
        ctx.lineTo(cx, ey);
        ctx.stroke();
    }
}


function gravity(x, y) {
    if (x < 0 || x > world.size || y < 0 || y > world.size) {
        return [0, 0];
    }
    const worldStep = world.size / (world.fieldResolution - 1);
    const xi = Math.floor(x / worldStep);
    const yi = Math.floor(y / worldStep);
    const fx = world.fx.getFloat32((yi * world.fieldResolution + xi) * 4);
    const fy = world.fy.getFloat32((yi * world.fieldResolution + xi) * 4);
    return [fx, fy];
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


function init(canvasId, aPlayer, aWorld) {
    player = aPlayer;
    world = aWorld;
    canvas = document.getElementById(canvasId);
    mx = canvas.width / 2;
    my = canvas.height / 2;
    ctx = canvas.getContext('2d');
}


export { init, setCamera, panCamera, zoomCamera, render, w2c, calculateAim };