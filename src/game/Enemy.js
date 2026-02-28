import Phaser from 'phaser';

const LEFT_FRAME = 0;
const RIGHT_FRAME = 1;
const ENEMY_FRAMES_ARE_LEFT_RIGHT = false;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, minX, maxX) {
    super(scene, x, y, 'enemy1', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.minX = minX;
    this.maxX = maxX;
    this.speed = 40;
    this.direction = 1;
    this.maxHp = 3;
    this.hp = this.maxHp;
    this.damageToPlayer = 1;
    this.hitInvulUntil = 0;
    this.isDying = false;
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    this.body.allowGravity = true;
    this.setFacingFrame(this.direction);
    this.lastFacingFrame = 1;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    if (this.body?.blocked?.left) this.direction = 1;
    if (this.body?.blocked?.right) this.direction = -1;
    if (this.x >= this.maxX) this.direction = -1;
    if (this.x <= this.minX) this.direction = 1;

    const layer = this.scene?.roomCollisionLayer;
    if (layer && this.body?.blocked?.down) {
      const aheadX = this.body.center.x + this.direction * (this.body.halfWidth + 2);
      const downY = this.body.bottom + 2;
      const tileAhead = layer.getTileAtWorldXY(aheadX, downY, true);
      if (!tileAhead || !tileAhead.collides) {
        this.direction *= -1;
      }
    }

    this.setVelocityX(this.speed * this.direction);
    const nextFrame = this.direction < 0 ? 0 : 1;
    if (nextFrame !== this.lastFacingFrame) {
      this.setFacingFrame(this.direction);
      this.scene?.setWorldHitbox?.(this, 18, 14);
      this.lastFacingFrame = nextFrame;
    }
  }

  setFacingFrame(dir) {
    if (ENEMY_FRAMES_ARE_LEFT_RIGHT) {
      this.setFrame(dir < 0 ? LEFT_FRAME : RIGHT_FRAME);
    } else {
      this.setFrame(dir < 0 ? RIGHT_FRAME : LEFT_FRAME);
    }
  }

  takeDamage(amount = 1, knockbackDir = 0) {
    if (!this.active || this.isDying) return;
    const now = this.scene?.time?.now ?? 0;
    if (now < this.hitInvulUntil) return;
    this.hitInvulUntil = now + 80;
    this.hp = Math.max(0, this.hp - amount);
    this.setTintFill(0xffffff);
    this.scene?.time?.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    if (knockbackDir !== 0) {
      this.setVelocityX(knockbackDir * 90);
      this.setVelocityY(-50);
    }
    if (this.hp <= 0) this.die();
  }

  hurt() {
    this.takeDamage(1, 0);
  }

  die() {
    if (this.isDying) return;
    this.isDying = true;
    this.disableBody(true, true);
    this.destroy();
  }
}
