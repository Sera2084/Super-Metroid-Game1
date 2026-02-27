import Phaser from 'phaser';
import { Enemy } from '../game/Enemy';
import { GameState } from '../game/GameState';
import { RoomLoader } from '../game/RoomLoader';
import { getRegisteredRoomCount, getRoomById, MAX_SUPPORTED_ROOMS } from '../rooms';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.pad = null;
    this.gamepadDeadzone = 0.25;
    this.gamepadButtons = {
      jump: 0,
      shoot: 2,
      dpadLeft: 14,
      dpadRight: 15,
      stickX: 0
    };
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

    const connectedPad = this.input.gamepad?.gamepads?.find((pad) => pad && pad.connected);
    if (connectedPad) {
      this.pad = connectedPad;
    }
    this.input.gamepad.once('connected', (pad) => {
      this.pad = pad;
      this.updateHud();
    });
    this.input.gamepad.on('disconnected', (pad) => {
      if (this.pad?.id === pad.id) {
        this.pad = this.input.gamepad?.gamepads?.find((nextPad) => nextPad && nextPad.connected) ?? null;
        this.updateHud();
      }
    });

    this.roomLoader = new RoomLoader(this, getRoomById, this.gameState);
    this.roomLoader.loadRoom('room_01', 'start');
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setRoundPixels(true);

    this.applyGameStateToPlayer();
    this.updateHud();

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

    this.gamepadText = this.add
      .text(16, 132, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9ec5ff' })
      .setScrollFactor(0);
  }

  getMoveX() {
    if (!this.pad || !this.pad.connected) return 0;

    const leftPressed =
      this.pad.left?.pressed || this.pad.buttons?.[this.gamepadButtons.dpadLeft]?.pressed || false;
    const rightPressed =
      this.pad.right?.pressed || this.pad.buttons?.[this.gamepadButtons.dpadRight]?.pressed || false;

    if (leftPressed && !rightPressed) return -1;
    if (rightPressed && !leftPressed) return 1;

    const axis = this.pad.axes?.[this.gamepadButtons.stickX];
    const axisX = axis?.getValue ? axis.getValue() : axis?.value ?? 0;
    if (Math.abs(axisX) < this.gamepadDeadzone) return 0;
    return axisX > 0 ? 1 : -1;
  }

  isJumpJustDown() {
    const jumpButton = this.pad?.buttons?.[this.gamepadButtons.jump];
    return Boolean(jumpButton && Phaser.Input.Gamepad.JustDown(jumpButton));
  }

  isShootJustDown() {
    const shootButton = this.pad?.buttons?.[this.gamepadButtons.shoot];
    return Boolean(shootButton && Phaser.Input.Gamepad.JustDown(shootButton));
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
    const keyboardMoveX = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    const gamepadMoveX = this.getMoveX();
    const moveX = gamepadMoveX !== 0 ? gamepadMoveX : keyboardMoveX;

    this.player.setVelocityX(moveX * moveSpeed);
    if (moveX !== 0) {
      this.playerState.facing = moveX > 0 ? 1 : -1;
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      this.isJumpJustDown();
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
    const status = this.pad && this.pad.connected ? 'connected' : 'disconnected';
    this.gamepadText.setText(
      `Gamepad: ${status} (B:${this.gamepadButtons.jump} Y:${this.gamepadButtons.shoot} D:${this.gamepadButtons.dpadLeft}/${this.gamepadButtons.dpadRight} AX:${this.gamepadButtons.stickX})`
    );
  }

  update() {
    this.handleMovement();
    const shootPressed = Phaser.Input.Keyboard.JustDown(this.keys.shoot) || this.isShootJustDown();
    if (shootPressed) {
      this.tryShoot();
    }

    if (this.player.y > this.physics.world.bounds.height + 60) {
      this.damagePlayer(99);
    }
  }
}
