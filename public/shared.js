class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.homePlanet = new SpaceObject(this.x, this.y, 1000000)
    this.angle = 0;
    this.projectile = null;
  }

  update() {
    this.projectile?.update();
  }

  fire() {
    this.projectile.velocityX = PROJECTILE_SPEED * Math.cos(this.angle);
    this.projectile.velocityY = PROJECTILE_SPEED * Math.sin(this.angle);
  }
}


class SpaceObject {
  constructor(x, y, mass) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.radius = mass / 50000;
  }

  contains(x, y) {
    return (x - this.x) ** 2 + (y - this.y) ** 2 < this.radius ** 2;
  }
}

class Projectile {
  constructor(x, y, velocityX, velocityY) {
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.mass = 1;
    this.radius = 5;
    this.firedAt = Date.now();
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
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