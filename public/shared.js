const PROJECTILE_START_X = 0;
const PROJECTILE_START_Y = 0;

class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.homePlanet = new SpaceObject(this.x, this.y, 1000000)
    this.angle = 0;
    this.projectile = new Projectile(this.x, this.y, 0, 0);
  }

  resetProjectile() {
    this.projectile.resetProjectile(this.x, this.y);
  }

  update() {
    this.projectile.update();
  }

  fire() {
    this.projectile.velocityX = PROJECTILE_SPEED * Math.cos(this.angle);
    this.projectile.velocityY = PROJECTILE_SPEED * Math.sin(this.angle);
    this.projectile.isFired = true;
  }
}


class SpaceObject {
  constructor(x, y, mass) {
    this.x = x;
    this.y = y;
    this.mass = mass;
  }

  draw(ctx, offsetX, offsetY, color) {
    ctx.beginPath();
    ctx.arc(this.x - offsetX, this.y - offsetY, this.mass / 50000, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  contains(x, y) {
    return (x - this.x) ** 2 + (y - this.y) ** 2 < (this.mass / 50000) ** 2;
  }
}

class Projectile {
  constructor(x, y, velocityX, velocityY) {
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.mass = 1;
    this.isFired = false;
  }

  resetProjectile(x, y) {
    this.x = x;
    this.y = y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isFired = false;
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
  }

  draw(ctx, offsetX, offsetY, color) {
    ctx.beginPath();
    ctx.arc(this.x - offsetX, this.y - offsetY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
}


// Export classes for Node.js and define them globally for the browser
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { SpaceObject, Projectile, Player };
} else {
  window.SpaceObject = SpaceObject;
  window.Projectile = Projectile;
  window.Player = Player;
}