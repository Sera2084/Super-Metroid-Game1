import Phaser from 'phaser';
import { Enemy } from '../game/Enemy';
import { GameState } from '../game/GameState';
import { RoomLoader } from '../game/RoomLoader';
import { getRegisteredRoomCount, getRoomById, MAX_SUPPORTED_ROOMS } from '../rooms';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.playerState = {
      hp: 6,
      maxHp: 6,
      invulUntil: 0,
      dashUntil: 0,
      dashCooldownUntil: 0,
      facing: 1
    };
  }

  create() {
    this.gameState = new GameState();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: 'A',
      right: 'D',
      jump: 'W',
      shoot: 'J',
      dash: 'SHIFT'
    });

    // Player wird zentral erzeugt und in jedem Raum nur repositioniert.
    this.player = this.physics.add.sprite(64, 64, 'player');
    this.player.body.setSize(12, 14);
    this.player.body.setOffset(2, 2);
    this.player.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 18
    });

    this.createHud();

    this.input.keyboard.on('keydown-J', () => this.tryShoot());

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setRoundPixels(true);

    this.roomLoader = new RoomLoader(this, getRoomById, this.gameState);
    this.roomLoader.loadRoom('room_01', 'start');

    this.applyGameStateToPlayer();
    this.updateHud();

    this.scale.on('resize', this.handleResize, this);
  }

  createHud() {
    this.hpText = this.add
      .text(16, 16, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setScrollFactor(0);

    this.roomTitle = this.add
      .text(16, 42, '', { fontFamily: 'monospace', fontSize: '16px', color: '#d7e3ff' })
      .setScrollFactor(0);

    this.skillText = this.add
      .text(16, 66, '', { fontFamily: 'monospace', fontSize: '14px', color: '#b7c6ff' })
      .setScrollFactor(0);

    this.ammoText = this.add
      .text(16, 88, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd88c' })
      .setScrollFactor(0);

    this.mapText = this.add
      .text(16, 110, '', { fontFamily: 'monospace', fontSize: '13px', color: '#94f0c0' })
      .setScrollFactor(0);
  }

  handleResize(gameSize) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
  }

  /**
   * Factory-Methode für RoomLoader, damit Enemy-Erzeugung an der Scene bleibt.
   */
  createEnemy(x, y, minX, maxX) {
    return new Enemy(this, x, y, minX, maxX);
  }

  applyGameStateToPlayer() {
    // Persistente Upgrades werden in das Runtime-Movement übertragen.
    this.playerState.canDash = this.gameState.data.upgrades.dash;
  }

  tryShoot() {
    const now = this.time.now;
    if (this.lastShotAt && now - this.lastShotAt < 180) return;

    const bullet = this.bullets.get(this.player.x, this.player.y - 3, 'bullet');
    if (!bullet) return;

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.allowGravity = false;
    bullet.setVelocity(260 * this.playerState.facing, 0);
    this.lastShotAt = now;

    this.time.delayedCall(1100, () => {
      if (bullet.active) bullet.disableBody(true, true);
    });
  }

  damagePlayer(amount) {
    const now = this.time.now;
    if (now < this.playerState.invulUntil) return;

    this.playerState.hp = Math.max(0, this.playerState.hp - amount);
    this.playerState.invulUntil = now + 850;

    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      yoyo: true,
      repeat: 3,
      duration: 80,
      onComplete: () => this.player.setAlpha(1)
    });

    if (this.playerState.hp <= 0) {
      this.playerState.hp = this.playerState.maxHp;
      this.roomLoader.loadRoom(this.currentRoomId, 'start');
    }

    this.updateHud();
  }

  handleMovement() {
    const body = this.player.body;
    const moveSpeed = 125;

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-moveSpeed);
      this.playerState.facing = -1;
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(moveSpeed);
      this.playerState.facing = 1;
    } else {
      this.player.setVelocityX(0);
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) || Phaser.Input.Keyboard.JustDown(this.cursors.space);
    if (jumpPressed && body.blocked.down) {
      this.player.setVelocityY(-340);
    }

    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.dash);
    if (dashPressed && this.playerState.canDash && this.time.now >= this.playerState.dashCooldownUntil) {
      this.playerState.dashUntil = this.time.now + 130;
      this.playerState.dashCooldownUntil = this.time.now + 650;
      body.allowGravity = false;
      this.player.setVelocity(this.playerState.facing * 360, 0);
    }

    if (this.time.now > this.playerState.dashUntil) {
      body.allowGravity = true;
    }

    this.player.setFlipX(this.playerState.facing < 0);
  }

  updateHud() {
    const visitedCount = Object.keys(this.gameState.data.visitedRooms).length;
    this.hpText.setText(`HP: ${this.playerState.hp}/${this.playerState.maxHp} | Suit: Mk${this.gameState.data.suitLevel}`);
    this.skillText.setText(`Dash: ${this.playerState.canDash ? 'aktiv (Shift)' : 'gesperrt'}`);
    this.ammoText.setText(
      `Ammo -> Missile: ${this.gameState.data.ammo.missile} | Super: ${this.gameState.data.ammo.super}`
    );
    this.mapText.setText(
      `Minimap: ${visitedCount}/${getRegisteredRoomCount()} besucht (System bereit für ${MAX_SUPPORTED_ROOMS}+ Räume)`
    );
  }

  update() {
    this.handleMovement();

    if (this.player.y > this.physics.world.bounds.height + 60) {
      this.damagePlayer(99);
    }
  }
}
