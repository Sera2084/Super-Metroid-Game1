import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, minX, maxX) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.minX = minX;
    this.maxX = maxX;
    this.speed = 40;
    this.direction = 1;
    this.hp = 2;
    this.setCollideWorldBounds(true);
    this.body.setSize(12, 14);
    this.body.setOffset(2, 2);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    if (this.x >= this.maxX) this.direction = -1;
    if (this.x <= this.minX) this.direction = 1;

    this.setVelocityX(this.speed * this.direction);
    this.setFlipX(this.direction < 0);
  }

  hurt() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.disableBody(true, true);
    }
  }
}
