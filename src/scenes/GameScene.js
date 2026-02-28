import Phaser from 'phaser';
import { Enemy } from '../game/Enemy';
import { GameState } from '../game/GameState';
import { RoomLoader } from '../game/RoomLoader';
import { getRegisteredRoomCount, getRoomById, MAX_SUPPORTED_ROOMS } from '../rooms';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.pad = null;
    this.gamepadPrevPressed = new Map();
    this.lastPressedButtonIndex = -1;
    this.lastAxesPreview = 'n/a';
    this.lastGamepadDebugHudAt = 0;
    this.gamepadDeadzone = 0.25;
    this.gamepadButtons = {
      jump: 1,
      shoot: 3,
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
    this.physics.world.gravity.y = 0;

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
      allowGravity: false
    });

    this.createHud();
    this.installErrorReporting();

    const gamepadPlugin = this.input.gamepad;
    if (gamepadPlugin) {
      this.refreshConnectedPad(true);
      gamepadPlugin.on('connected', (pad) => {
        this.pad = pad;
        this.updateHud();
      });
      gamepadPlugin.on('disconnected', (pad) => {
        if (this.pad?.id === pad.id) {
          this.pad = null;
        }
        this.refreshConnectedPad(true);
      });
      this.gamepadPollEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          if (!this.pad || !this.pad.connected) {
            this.refreshConnectedPad(true);
          }
        }
      });
    }

    this.roomLoader = new RoomLoader(this, getRoomById, this.gameState);
    this.roomLoader.loadRoom('room_01', 'start');
    this.updateCameraZoomToFit();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setRoundPixels(true);
    this.scale.on('resize', this.updateCameraZoomToFit, this);

    this.applyGameStateToPlayer();
    this.updateHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.updateCameraZoomToFit, this);
      this.gamepadPollEvent?.remove(false);
      if (typeof window !== 'undefined') {
        if (this.onWindowError) window.removeEventListener('error', this.onWindowError);
        if (this.onUnhandledRejection) window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
      }
    });
  }

  updateCameraZoomToFit() {
    const TILE_SIZE = 16;
    const TARGET_TILES_X = 28;
    const TARGET_TILES_Y = 16;
    const MAX_ZOOM = 4;
    const visibleWidth = this.scale.gameSize.width;
    const visibleHeight = this.scale.gameSize.height;
    const zoomX = Math.floor(visibleWidth / (TARGET_TILES_X * TILE_SIZE));
    const zoomY = Math.floor(visibleHeight / (TARGET_TILES_Y * TILE_SIZE));
    const nextZoom = Phaser.Math.Clamp(Math.min(zoomX, zoomY), 1, MAX_ZOOM);
    this.cameras.main.setZoom(nextZoom);
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

    this.gamepadDetailsText = this.add
      .text(16, 148, '', { fontFamily: 'monospace', fontSize: '11px', color: '#7fb8ff' })
      .setScrollFactor(0);

    this.gamepadHintText = this.add
      .text(16, 164, 'Click game to focus, then press any gamepad button', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c9d6ff'
      })
      .setScrollFactor(0);

    this.lastErrorText = this.add
      .text(16, 180, 'LastError: none', { fontFamily: 'monospace', fontSize: '11px', color: '#ff8e8e' })
      .setScrollFactor(0);

    this.gamepadLiveText = this.add
      .text(16, 196, 'PadLive: btn=-1 axes=n/a', { fontFamily: 'monospace', fontSize: '11px', color: '#ffd79a' })
      .setScrollFactor(0);

    this.pewText = this.add
      .text(16, 212, '', { fontFamily: 'monospace', fontSize: '12px', color: '#fff176' })
      .setScrollFactor(0);

    this.shotsText = this.add
      .text(16, 228, 'Shots: 0', { fontFamily: 'monospace', fontSize: '11px', color: '#ffcf8a' })
      .setScrollFactor(0);
  }

  installErrorReporting() {
    if (typeof window === 'undefined') return;
    this.onWindowError = (event) => {
      this.reportError(event?.error ?? event?.message ?? 'Unknown window error');
    };
    this.onUnhandledRejection = (event) => {
      this.reportError(event?.reason ?? 'Unhandled promise rejection');
    };
    window.addEventListener('error', this.onWindowError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
  }

  reportError(errorLike) {
    let text = 'Unknown error';
    if (errorLike instanceof Error) {
      text = errorLike.message || errorLike.toString();
    } else if (typeof errorLike === 'string') {
      text = errorLike;
    } else if (errorLike && typeof errorLike === 'object') {
      try {
        text = JSON.stringify(errorLike);
      } catch {
        text = String(errorLike);
      }
    } else if (errorLike != null) {
      text = String(errorLike);
    }
    const normalized = text.replace(/\s+/g, ' ').trim();
    const shortened = normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
    this.lastErrorMessage = shortened || 'Unknown error';
    this.lastErrorExpiresAt = (this.time?.now ?? 0) + 2000;
    console.error('[GameScene] Runtime error:', errorLike);
    this.lastErrorText?.setText(`LastError: ${this.lastErrorMessage}`);
  }

  getMoveX() {
    if (!this.pad || !this.pad.connected) return 0;

    const leftPressed = Boolean(this.getButton(this.gamepadButtons.dpadLeft)?.pressed);
    const rightPressed = Boolean(this.getButton(this.gamepadButtons.dpadRight)?.pressed);

    if (leftPressed && !rightPressed) return -1;
    if (rightPressed && !leftPressed) return 1;

    const stickX = this.getAxisValue(this.gamepadButtons.stickX);
    if (Math.abs(stickX) < this.gamepadDeadzone) return 0;
    return stickX > 0 ? 1 : -1;
  }

  getAxisValue(index) {
    if (!this.pad || !this.pad.connected) return 0;
    const axes = this.pad.axes;
    if (!Array.isArray(axes) || !Number.isInteger(index) || index < 0 || index >= axes.length) {
      return 0;
    }
    const axis = axes[index];
    let value = 0;
    if (typeof axis === 'number') {
      value = axis;
    } else if (axis && typeof axis.getValue === 'function') {
      value = axis.getValue();
    } else if (axis && typeof axis.value === 'number') {
      value = axis.value;
    }
    if (!Number.isFinite(value)) return 0;
    return Phaser.Math.Clamp(value, -1, 1);
  }

  getButton(index) {
    if (!this.pad || !this.pad.connected) return null;
    const buttons = this.pad.buttons;
    if (!Array.isArray(buttons) || !Number.isInteger(index) || index < 0 || index >= buttons.length) {
      return null;
    }
    const button = buttons[index];
    if (!button || typeof button !== 'object') return null;
    return button;
  }

  isGamepadButtonJustPressed(buttonIndex) {
    if (!this.pad || !this.pad.connected) return false;
    const button = this.getButton(buttonIndex);
    if (!button) return false;
    const pressedNow = Boolean(button.pressed);
    const pressedBefore = Boolean(this.gamepadPrevPressed.get(buttonIndex));
    this.gamepadPrevPressed.set(buttonIndex, pressedNow);
    return pressedNow && !pressedBefore;
  }

  refreshConnectedPad(forceHud = false) {
    const gamepadPlugin = this.input.gamepad;
    if (!gamepadPlugin) return;
    const previousId = this.pad?.id ?? null;
    this.pad = gamepadPlugin.gamepads?.find((pad) => pad && pad.connected) ?? null;
    if (!this.pad || !this.pad.connected) {
      this.gamepadPrevPressed.clear();
    }
    const nextId = this.pad?.id ?? null;
    if (forceHud || previousId !== nextId) {
      this.updateHud();
    }
  }

  isJumpJustDown() {
    const justPressed = this.isGamepadButtonJustPressed(this.gamepadButtons.jump);
    if (justPressed) this.lastPressedButtonIndex = this.gamepadButtons.jump;
    return justPressed;
  }

  isShootJustDown() {
    const justPressed = this.isGamepadButtonJustPressed(this.gamepadButtons.shoot);
    if (justPressed) this.lastPressedButtonIndex = this.gamepadButtons.shoot;
    return justPressed;
  }

  captureLastPressedButton() {
    if (!this.pad || !this.pad.connected || !Array.isArray(this.pad.buttons)) return;
    for (let i = 0; i < this.pad.buttons.length; i += 1) {
      if (i === this.gamepadButtons.jump || i === this.gamepadButtons.shoot) continue;
      if (this.isGamepadButtonJustPressed(i)) {
        this.lastPressedButtonIndex = i;
      }
    }
  }

  collectAxesPreview() {
    if (!this.pad || !this.pad.connected || !Array.isArray(this.pad.axes) || this.pad.axes.length === 0) {
      return 'n/a';
    }
    const limit = Math.min(this.pad.axes.length, 4);
    const values = [];
    for (let i = 0; i < limit; i += 1) {
      values.push(this.getAxisValue(i).toFixed(2));
    }
    return values.join(', ');
  }

  updateGamepadLiveHud(force = false) {
    if (!force && this.time.now - this.lastGamepadDebugHudAt < 100) return;
    this.lastGamepadDebugHudAt = this.time.now;
    this.lastAxesPreview = this.collectAxesPreview();
    this.gamepadLiveText?.setText(`PadLive: btn=${this.lastPressedButtonIndex} axes=${this.lastAxesPreview}`);
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
    if (this.lastShotAt && now < this.lastShotAt + 150) return;
    const facing = this.playerState.facing >= 0 ? 1 : -1;
    const spawn = this.getBulletSpawn(this.player, facing);
    const dir = this.playerState.facing >= 0 ? 1 : -1;
    const bullet = this.physics.add.image(spawn.x, spawn.y, 'bullet');
    if (!bullet || !bullet.body) return;
    bullet.setActive(true).setVisible(true);
    bullet.setDepth(10);
    bullet.setAllowGravity(false);
    bullet.body.setAllowGravity(false);
    bullet.body.allowGravity = false;
    bullet.body.setGravity(0, 0);
    bullet.body.setDrag(0, 0);
    bullet.body.setFriction(0, 0);
    bullet.body.setBounce(0, 0);
    bullet.body.setImmovable(false);
    bullet.body.setSize(6, 6, true);
    bullet.body.reset(spawn.x, spawn.y);
    bullet.setVelocity(dir * 520, 0);
    bullet.body.setMaxVelocity(520, 0);
    bullet.body.velocity.y = 0;
    bullet.isProjectile = true;
    bullet.setCollideWorldBounds(false);
    this.bullets.add(bullet);
    this.lastShotAt = now;
    this.pewText.setText('PEW!');
    this.shotsText.setText(`Shots: ${this.bullets.countActive(true)}`);
    this.time.delayedCall(200, () => {
      if (this.pewText?.active) this.pewText.setText('');
    });
    this.time.delayedCall(800, () => {
      if (bullet && bullet.active) bullet.destroy();
    });
  }

  getBulletSpawn(player, facing) {
    const body = player?.body;
    const dir = facing >= 0 ? 1 : -1;
    const pad = 8;
    let spawnX = player.x + dir * ((body?.halfWidth ?? 8) + pad);
    const spawnY = player.y - ((body?.halfHeight ?? 12) * 0.55);

    if (this.roomCollisionLayer?.getTileAtWorldXY) {
      for (let i = 0; i < 2; i += 1) {
        const tile = this.roomCollisionLayer.getTileAtWorldXY(spawnX, spawnY, true);
        if (!tile?.collides) break;
        spawnX += dir * 16;
      }
    }

    return { x: spawnX, y: spawnY };
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
    if (this.pad && this.pad.connected) {
      const mapping = this.pad.mapping || 'unknown';
      const buttonCount = this.pad.buttons?.length ?? 0;
      const axisCount = this.pad.axes?.length ?? 0;
      this.gamepadDetailsText.setText(`Pad: ${this.pad.id} | mapping: ${mapping} | buttons: ${buttonCount} | axes: ${axisCount}`);
    } else {
      this.gamepadDetailsText.setText('Pad: none | mapping: n/a | buttons: 0 | axes: 0');
      this.lastPressedButtonIndex = -1;
    }
    this.lastErrorText.setText(`LastError: ${this.lastErrorMessage || 'none'}`);
    this.updateGamepadLiveHud(true);
  }

  update(_time, delta) {
    try {
      this.handleMovement();
      this.captureLastPressedButton();
      const shootPressed = Phaser.Input.Keyboard.JustDown(this.keys.shoot) || this.isShootJustDown();
      if (shootPressed) {
        this.tryShoot();
      }
      this.bullets.children.iterate((bullet) => {
        if (!bullet?.active || !bullet.body) return;
        if (bullet.isProjectile) {
          bullet.body.allowGravity = false;
          bullet.body.gravity.y = 0;
          bullet.body.velocity.y = 0;
        }
      });
      this.shotsText.setText(`Shots: ${this.bullets.countActive(true)}`);
      let firstActiveBullet = null;
      this.bullets.children.iterate((bullet) => {
        if (firstActiveBullet || !bullet?.active) return;
        firstActiveBullet = bullet;
      });
      if (firstActiveBullet?.body) {
        this.lastErrorText?.setText(
          `BulletVX: ${Math.round(firstActiveBullet.body.velocity.x)} VY:${Math.round(firstActiveBullet.body.velocity.y)}`
        );
      }
      this.updateGamepadLiveHud();
      if (this.player.y > this.physics.world.bounds.height + 60) {
        this.damagePlayer(99);
      }
      if (this.lastErrorMessage && this.time.now > (this.lastErrorExpiresAt ?? 0)) {
        this.lastErrorMessage = null;
        this.lastErrorText?.setText('LastError: none');
      }
    } catch (error) {
      this.reportError(error);
      return;
    }
  }
}
