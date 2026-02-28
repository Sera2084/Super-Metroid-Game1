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
    this.maxHp = 3;
    this.hp = this.maxHp;
    this.damageToPlayer = 1;
    this.hitInvulUntil = 0;
    this.isDying = false;
    this.setOrigin(0.5, 1);
    const playerScale = scene?.player?.scaleX ?? 0.1;
    const enemyScale = playerScale * 0.65;
    this.setScale(enemyScale);
    this.recalcBodyFromFrame();
    this.setCollideWorldBounds(true);
    this.setFrame(1);
    this.lastFacingFrame = 1;
    console.log(
      'enemy tex',
      this.frame.width,
      this.frame.height,
      'scale',
      this.scaleX,
      'body',
      this.body.width,
      this.body.height,
      'off',
      this.body.offset
    );
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
      this.setFrame(nextFrame);
      this.recalcBodyFromFrame();
      this.lastFacingFrame = nextFrame;
    }
  }

  recalcBodyFromFrame() {
    const ENEMY_BODY_W_WORLD = 18;
    const ENEMY_BODY_H_WORLD = 14;
    const FOOT_FUDGE_WORLD = 4;
    const scale = this.scaleX || 1;
    const bodyW = Math.max(2, Math.round(ENEMY_BODY_W_WORLD / scale));
    const bodyH = Math.max(2, Math.round(ENEMY_BODY_H_WORLD / scale));
    const f = this.frame;
    const srcW = typeof f?.sourceSizeW === 'number' ? f.sourceSizeW : f?.width ?? bodyW;
    const srcH = typeof f?.sourceSizeH === 'number' ? f.sourceSizeH : f?.height ?? bodyH;
    const trimX = typeof f?.spriteSourceSizeX === 'number' ? f.spriteSourceSizeX : 0;
    const trimY = typeof f?.spriteSourceSizeY === 'number' ? f.spriteSourceSizeY : 0;

    const offXSource = Math.round((srcW - bodyW) / 2);
    const offYSource = Math.round(srcH - bodyH);
    let offX = offXSource - trimX;
    let offY = offYSource - trimY;

    offX = Math.max(0, Math.min(offX, Math.max(0, (f?.width ?? bodyW) - bodyW)));
    offY = Math.max(0, Math.min(offY, Math.max(0, (f?.height ?? bodyH) - bodyH)));
    const fudgeTex = Math.round(FOOT_FUDGE_WORLD / scale);

    this.body.setSize(bodyW, bodyH, false);
    this.body.setOffset(offX, Math.max(0, offY + fudgeTex));
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
