import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, minX, maxX) {
    super(scene, x, y, 'enemy1', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.minX = minX;
    this.maxX = maxX;
    this.speed = 40;
    this.direction = 1;
    this.hp = 2;
    this.setOrigin(0.5, 1);
    this.setScale(0.03);
    const scale = this.scaleX || 1;
    const bodyW = Math.max(1, Math.round(22 / scale));
    const bodyH = Math.max(1, Math.round(26 / scale));
    this.body.setSize(bodyW, bodyH, false);
    this.body.setOffset(Math.round((768 - bodyW) / 2), Math.round(1024 - bodyH));
    this.setCollideWorldBounds(true);
    this.setFrame(1);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    if (this.x >= this.maxX) this.direction = -1;
    if (this.x <= this.minX) this.direction = 1;

    this.setVelocityX(this.speed * this.direction);
    this.setFrame(this.direction < 0 ? 0 : 1);
  }

  hurt() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.disableBody(true, true);
    }
  }
}
