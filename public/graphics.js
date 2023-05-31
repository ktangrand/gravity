
let cameraX = 0;
let cameraY = 0;
let mx;
let my;
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


function w2c(x, y) {
    return [(x - cameraX) * zoom + mx, (y - cameraY) * zoom + my];
}


function circle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(...w2c(x, y), zoom * radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}


function drawResourceStreams(streams) {
    const anim = Date.now();
    for (const [start, end, color] of streams) {
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


function drawProjectiles(projectiles, id) {
    projectiles.forEach((p) => {
        circle(p.x, p.y, 20, 'rgba(255, 255, 0, 0.1');
        circle(p.x, p.y, 10, p.id === id ? 'green' : 'red');
    });
}


function drawAim(p, world) {
    let ax = p.x + p.radius * Math.cos(p.angle);
    let ay = p.y + p.radius * Math.sin(p.angle);
    ctx.beginPath();
    ctx.moveTo(...w2c(ax, ay));
    let vx = Math.cos(p.angle) * p.power;
    let vy = Math.sin(p.angle) * p.power;
    for(let i=0; i<1000; i++) {
        ax += vx;
        ay += vy;
        if(i % 30) {
            ctx.lineTo(...w2c(ax, ay));
        }
        let [fx, fy] = gravity(world, ax, ay);
        vx += fx;
        vy += fy;
    }
    ctx.strokeStyle = '#10301040';
    ctx.lineWidth = 10;
    ctx.stroke()
}


function drawPlayer(p) {
    circle(p.x, p.y, p.radius + 20, '#ff00ff020');

    ctx.beginPath();
    ctx.moveTo(...w2c(p.x, p.y));
    ctx.lineTo(...w2c(p.x + p.power * 60 * Math.cos(p.angle), p.y + p.power * 60 * Math.sin(p.angle)));
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
}


function drawGrid() {
    const step = 20000 / 31;
    ctx.strokeStyle = 'rgb(32, 0, 32)';
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


function gravity(world, x, y) {
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


function render(player, world) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    drawGrid();
    drawAim(player, world);
    drawResourceStreams(world.streams);
    world.planets.forEach(p => drawPlanet(p));
    drawPlayer(player, world);
    drawProjectiles(world.projectiles, player.id);
    ctx.restore();
}


function init(canvasId) {
    canvas = document.getElementById(canvasId);
    mx = canvas.width / 2;
    my = canvas.height / 2;
    ctx = canvas.getContext('2d');
}


export { init, setCamera, panCamera, zoomCamera, render, w2c };