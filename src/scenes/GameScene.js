import Phaser from 'phaser';
import { Enemy } from '../game/Enemy';
import { GameState } from '../game/GameState';
import { RoomLoader } from '../game/RoomLoader';
import { getRegisteredRoomCount, getRoomById, MAX_SUPPORTED_ROOMS } from '../rooms';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.bulletsList = [];
    this.pad = null;
    this.gamepadPrevPressed = new Map();
    this.lastPressedButtonIndex = -1;
    this.lastGamepadDebugHudAt = 0;
    this.gamepadButtons = {
      jump: 1,
      shoot: 3,
      dpadUp: 12,
      dpadDown: 13,
      dpadLeft: 14,
      dpadRight: 15
    };
    this.playerState = {
      hp: 6,
      maxHp: 6,
      invulUntil: 0,
      dashUntil: 0,
      dashCooldownUntil: 0,
      facing: 1,
      isCrouching: false
    };
    this._jumpJustPressed = false;
    this._groundedFrames = 0;
    this._disableGroundSnap = false;
    this._debugJitter = false;
    this._jitterHudAt = 0;
    this._jitterLast = null;
    this.playerHitboxStandW = 26;
    this.playerHitboxStandH = 44;
    this.playerHitboxCrouchH = 30;
  }

  create() {
    this.gameState = new GameState();
    this.physics.world.gravity.y = 600;
    this._debugPhysics = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: 'A',
      right: 'D',
      jump: 'W',
      shoot: 'J',
      dash: 'SHIFT'
    });

    // Player wird zentral erzeugt und in jedem Raum nur repositioniert.
    this.player = this.physics.add.sprite(64, 64, 'player_v2', 1);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(0.07);
    this.setWorldHitbox(this.player, this.playerHitboxStandW, this.playerHitboxStandH);
    this.player.setFrame(0);
    this.player.setFlipX(false);
    this.player.setCollideWorldBounds(true);

    this.bulletsGroup = this.physics.add.group({
      allowGravity: false
    });
    this.bulletsList = [];

    this.createHud();
    this._jitterHudText = this.add
      .text(16, 170, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100000)
      .setVisible(false);
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
    this.cameras.main.roundPixels = true;
    this.cameras.main.setRoundPixels(true);
    this.updatePixelCamera();
    this.scale.on('resize', this.updateCameraZoomToFit, this);
    this.onF2ToggleDebug = () => {
      this.setPhysicsDebugEnabled(!this._debugPhysics);
    };
    this.onF3ToggleJitter = () => {
      this._debugJitter = !this._debugJitter;
      this._jitterHudText?.setVisible(this._debugJitter);
      if (this._debugJitter) this.updateJitterHud(true);
    };
    this.onF4ToggleSnapDebug = () => {
      this._disableGroundSnap = !this._disableGroundSnap;
    };
    this.input.keyboard?.on('keydown-F2', this.onF2ToggleDebug);
    this.input.keyboard?.on('keydown-F3', this.onF3ToggleJitter);
    this.input.keyboard?.on('keydown-F4', this.onF4ToggleSnapDebug);

    this.applyGameStateToPlayer();
    this.updateHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.updateCameraZoomToFit, this);
      this.gamepadPollEvent?.remove(false);
      this.input.keyboard?.off('keydown-F2', this.onF2ToggleDebug);
      this.input.keyboard?.off('keydown-F3', this.onF3ToggleJitter);
      this.input.keyboard?.off('keydown-F4', this.onF4ToggleSnapDebug);
      this._tileDebugGraphic?.destroy();
      this._tileDebugGraphic = null;
      this._spriteDebugGraphic?.destroy();
      this._spriteDebugGraphic = null;
      this._jitterHudText?.destroy();
      this._jitterHudText = null;
      this.buildText?.destroy();
      this.buildText = null;
      if (typeof window !== 'undefined') {
        if (this.onWindowError) window.removeEventListener('error', this.onWindowError);
        if (this.onUnhandledRejection) window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
      }
    });
  }

  setPhysicsDebugEnabled(enabled) {
    const world = this.physics?.world;
    if (!world) return;
    this._debugPhysics = Boolean(enabled);
    world.drawDebug = this._debugPhysics;
    if (this._debugPhysics && !world.debugGraphic) {
      world.createDebugGraphic();
    }
    if (world.debugGraphic) {
      world.debugGraphic.clear();
      world.debugGraphic.visible = this._debugPhysics;
    }
    if (!this._tileDebugGraphic) {
      this._tileDebugGraphic = this.add.graphics().setDepth(9999);
      this._tileDebugGraphic.setScrollFactor(1);
    }
    if (!this._spriteDebugGraphic) {
      this._spriteDebugGraphic = this.add.graphics().setDepth(10000);
      this._spriteDebugGraphic.setScrollFactor(1);
    }
    this._tileDebugGraphic.clear();
    this._tileDebugGraphic.setVisible(this._debugPhysics);
    this._spriteDebugGraphic.clear();
    this._spriteDebugGraphic.setVisible(this._debugPhysics);
    if (this._debugPhysics && this.roomCollisionLayer?.renderDebug) {
      this.roomCollisionLayer.renderDebug(this._tileDebugGraphic, {
        collidingTileColor: new Phaser.Display.Color(255, 80, 80, 180),
        faceColor: new Phaser.Display.Color(80, 255, 80, 180)
      });
    }
  }

  drawSpriteDebugBounds() {
    if (!this._debugPhysics || !this._spriteDebugGraphic) return;
    const g = this._spriteDebugGraphic;
    g.clear();
    const drawSpriteBounds = (sprite, color = 0x00ffff) => {
      if (!sprite?.active) return;
      const b = sprite.getBounds();
      g.lineStyle(1, color, 1);
      g.strokeRect(Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height));
      if (sprite.body) {
        g.lineStyle(1, 0xffff00, 1);
        g.strokeRect(
          Math.round(sprite.body.x),
          Math.round(sprite.body.y),
          Math.round(sprite.body.width),
          Math.round(sprite.body.height)
        );
      }
    };
    drawSpriteBounds(this.player, 0x00ffff);
    this.enemyGroup?.children?.iterate?.((enemy) => {
      drawSpriteBounds(enemy, 0xff66ff);
    });
  }

  debugGroundAlignment() {
    if (!this._debugPhysics || !this.roomCollisionLayer) return;
    const now = this.time.now;
    if (now - (this._lastGroundDebugAt ?? 0) < 200) return;
    this._lastGroundDebugAt = now;
    const camera = this.cameras.main;
    const camBounds = camera?.getBounds?.() ?? camera?._bounds ?? null;
    const maxScrollY = camBounds ? camBounds.y + camBounds.height - camera.worldView.height : Number.NaN;
    const isAtBottom = Number.isFinite(maxScrollY) ? Math.abs(camera.scrollY - maxScrollY) < 0.51 : false;
    const scrollRoundDelta = Math.round(camera.scrollY) - camera.scrollY;
    // eslint-disable-next-line no-console
    console.log(
      `[CAMERA] scrollY=${camera.scrollY.toFixed(3)} roundDelta=${scrollRoundDelta.toFixed(3)} worldViewTop=${camera.worldView.y.toFixed(3)} worldViewBottom=${camera.worldView.bottom.toFixed(3)} maxScrollY=${Number.isFinite(maxScrollY) ? maxScrollY.toFixed(3) : 'n/a'} atBottom=${isAtBottom}`
    );
    const debugOne = (label, sprite) => {
      if (!sprite?.active || !sprite.body) return;
      const bounds = sprite.getBounds();
      const spriteBottom = bounds.bottom;
      const bodyBottom = sprite.body.bottom;
      const tile = this.roomCollisionLayer.getTileAtWorldXY(sprite.body.center.x, bodyBottom + 1, true);
      const tileTop = tile?.pixelY ?? null;
      const tileDelta = tileTop == null ? 'n/a' : (tileTop - bodyBottom).toFixed(2);
      // eslint-disable-next-line no-console
      console.log(
        `[${label}] x=${sprite.x.toFixed(2)} y=${sprite.y.toFixed(2)} body=(${sprite.body.x.toFixed(2)},${sprite.body.y.toFixed(2)}) down=${Boolean(sprite.body.blocked.down)} touchingDown=${Boolean(sprite.body.touching.down)} vy=${sprite.body.velocity.y.toFixed(2)} bodyBottom=${bodyBottom.toFixed(2)} spriteBottom=${spriteBottom.toFixed(2)} deltaSB=${(spriteBottom - bodyBottom).toFixed(2)} tileTop=${tileTop} tileDelta=${tileDelta}`
      );
    };
    debugOne('PLAYER', this.player);
    const firstEnemy = this.enemyGroup?.getChildren?.()?.find((e) => e?.active);
    if (firstEnemy) debugOne('ENEMY', firstEnemy);
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

  updatePixelCamera() {
    const cam = this.cameras.main;
    const target = this.player;
    if (!cam || !target) return;
    const zoom = cam.zoom || 1;
    const viewW = cam.width / zoom;
    const viewH = cam.height / zoom;
    const roomW = this._roomWorldW ?? (cam.getBounds?.()?.width ?? cam._bounds?.width ?? viewW);
    const roomH = this._roomWorldH ?? (cam.getBounds?.()?.height ?? cam._bounds?.height ?? viewH);
    const desiredX = target.x - viewW * 0.5;
    const desiredY = target.y - viewH * 0.6;
    const sx = Math.round(Phaser.Math.Clamp(desiredX, 0, Math.max(0, roomW - viewW)));
    const sy = Math.round(Phaser.Math.Clamp(desiredY, 0, Math.max(0, roomH - viewH)));
    cam.setScroll(sx, sy);
  }

  refreshPlayerTileCollider() {
    if (this.playerTileCollider) {
      this.physics.world.removeCollider(this.playerTileCollider);
      this.playerTileCollider = null;
    }
    if (this.player && this.roomCollisionLayer) {
      this.playerTileCollider = this.physics.add.collider(this.player, this.roomCollisionLayer);
    }
  }

  snapPlayerToGroundIfNeeded() {
    const body = this.player?.body;
    if (!body || !this.roomCollisionLayer) return;
    if (this._disableGroundSnap) return;
    const grounded = Boolean(body.blocked.down || body.touching.down);
    if (!grounded) return;
    if (body.velocity.y < 0 || Math.abs(body.velocity.y) >= 5) return;

    const tile = this.roomCollisionLayer.getTileAtWorldXY(body.center.x, body.bottom + 1, true);
    if (!tile || !tile.collides) return;

    const tileTop = tile.pixelY;
    const delta = tileTop - body.bottom;
    if (delta < -0.6 || delta > 0.6) return;
    if (Math.abs(delta) < 0.001) return;

    this.player.y += delta;
    this.player.y = Math.round(this.player.y);
    if (typeof body.updateFromGameObject === 'function') {
      body.updateFromGameObject();
    }
    body.velocity.y = 0;
  }

  setWorldHitbox(sprite, targetWWorld, targetHWorld) {
    if (!sprite?.body) return;

    sprite.setOrigin(0.5, 1);

    const scaleX = Math.abs(sprite.scaleX || 1);
    const scaleY = Math.abs(sprite.scaleY || 1);
    if (scaleX <= 0 || scaleY <= 0) return;

    const body = sprite.body;

    // Arcade Body size/offset in unscaled frame pixels.
    const w = Math.max(1, Math.round(targetWWorld / scaleX));
    const h = Math.max(1, Math.round(targetHWorld / scaleY));

    body.setSize(w, h, false);

    const fw = sprite.width;
    const fh = sprite.height;

    const offX = Math.round((fw - w) / 2);
    const offY = Math.round(fh - h);

    body.setOffset(offX, offY);

    if (typeof body.updateFromGameObject === 'function') {
      body.updateFromGameObject();
    }
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
      .text(16, 196, 'PadLive: btn=-1', { fontFamily: 'monospace', fontSize: '11px', color: '#ffd79a' })
      .setScrollFactor(0);

    this.pewText = this.add
      .text(16, 212, '', { fontFamily: 'monospace', fontSize: '12px', color: '#fff176' })
      .setScrollFactor(0);

    this.shotsText = this.add
      .text(16, 228, 'Shots: 0', { fontFamily: 'monospace', fontSize: '11px', color: '#ffcf8a' })
      .setScrollFactor(0);

    const sha = typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'unknown';
    const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown';
    this.buildText = this.add
      .text(16, 244, `Build: ${sha} | ${buildTime}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#a8ffb0'
      })
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
    return 0;
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

  updateGamepadLiveHud(force = false) {
    if (!force && this.time.now - this.lastGamepadDebugHudAt < 100) return;
    this.lastGamepadDebugHudAt = this.time.now;
    this.gamepadLiveText?.setText(`PadLive: btn=${this.lastPressedButtonIndex}`);
  }

  updateJitterHud(force = false) {
    if (!this._debugJitter) return;
    const now = this.time.now;
    if (!force && now - (this._jitterHudAt ?? 0) < 100) return;
    this._jitterHudAt = now;

    const p = this.player;
    const body = p?.body;
    const cam = this.cameras.main;
    const b = cam?.getBounds?.() ?? cam?._bounds;

    const px = p?.x ?? 0;
    const py = p?.y ?? 0;
    const bx = body?.x ?? 0;
    const by = body?.y ?? 0;
    const bbot = body?.bottom ?? 0;
    const vx = body?.velocity?.x ?? 0;
    const vy = body?.velocity?.y ?? 0;
    const blockedDown = Boolean(body?.blocked?.down);
    const touchingDown = Boolean(body?.touching?.down);

    let tileTop = null;
    let deltaToTop = null;
    if (this.roomCollisionLayer && body) {
      const tile = this.roomCollisionLayer.getTileAtWorldXY(body.center.x, bbot + 1, true);
      if (tile && tile.collides) {
        tileTop = tile.pixelY;
        deltaToTop = tileTop - bbot;
      }
    }

    const zoom = cam?.zoom ?? 1;
    const maxScrollY = b ? b.bottom - cam.height / zoom : Number.NaN;
    const maxScrollX = b ? b.right - cam.width / zoom : Number.NaN;
    const clampedBottom = Number.isFinite(maxScrollY) ? cam.scrollY >= maxScrollY - 0.01 : false;
    const clampedRight = Number.isFinite(maxScrollX) ? cam.scrollX >= maxScrollX - 0.01 : false;

    const last = this._jitterLast ?? null;
    let likely = 'n/a';
    if (last) {
      const bodyDelta = Math.abs(bbot - last.bbot);
      const camDelta = Math.abs(cam.scrollY - last.scrollY);
      if (bodyDelta < 0.01 && camDelta >= 0.5) likely = 'LIKELY CAMERA JITTER';
      else if (camDelta < 0.01 && bodyDelta >= 0.5) likely = 'LIKELY PHYSICS JITTER';
      else if (camDelta >= 0.5 && bodyDelta >= 0.5) likely = 'MIXED/ROUNDING';
      else likely = 'STABLE';
    }
    this._jitterLast = { bbot, scrollY: cam?.scrollY ?? 0 };

    const lines = [
      `JITTER HUD (F3)  ${likely}`,
      `P: x=${px.toFixed(2)} y=${py.toFixed(3)} (rnd=${Math.round(py)})  jumpJust=${Boolean(this._jumpJustPressed)} gf=${this._groundedFrames ?? 0}`,
      `B: x=${bx.toFixed(2)} y=${by.toFixed(2)} bottom=${bbot.toFixed(2)} vx=${vx.toFixed(2)} vy=${vy.toFixed(2)}`,
      `Down: blocked=${blockedDown} touching=${touchingDown}  tileTop=${tileTop ?? 'n/a'} dTop=${deltaToTop == null ? 'n/a' : deltaToTop.toFixed(3)}`,
      `Cam: sx=${cam.scrollX.toFixed(3)} sy=${cam.scrollY.toFixed(3)} zoom=${zoom.toFixed(2)} view=(${cam.worldView.x.toFixed(3)},${cam.worldView.y.toFixed(3)})`,
      `Bounds: x=${b?.x?.toFixed?.(2) ?? 'n/a'} y=${b?.y?.toFixed?.(2) ?? 'n/a'} r=${b?.right?.toFixed?.(2) ?? 'n/a'} b=${b?.bottom?.toFixed?.(2) ?? 'n/a'}`,
      `CLAMPED_BOTTOM: ${clampedBottom} (maxSY=${Number.isFinite(maxScrollY) ? maxScrollY.toFixed(3) : 'n/a'})  right=${clampedRight} (maxSX=${Number.isFinite(maxScrollX) ? maxScrollX.toFixed(3) : 'n/a'})`
    ];
    this._jitterHudText?.setText(lines.join('\n'));
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

  enterCrouch() {
    if (this.playerState.isCrouching) return;
    this.playerState.isCrouching = true;
    this.player.setTexture('player_kneel', 0);
    this.player.setFrame(0);
    this.player.setFlipX(this.playerState.facing < 0);
    this.setWorldHitbox(this.player, this.playerHitboxStandW, this.playerHitboxCrouchH);
    this.player.setVelocityX(0);
  }

  exitCrouch() {
    if (!this.playerState.isCrouching) return;
    this.playerState.isCrouching = false;
    this.player.setTexture('player_v2', 0);
    this.player.setFrame(0);
    this.player.setFlipX(this.playerState.facing < 0);
    this.setWorldHitbox(this.player, this.playerHitboxStandW, this.playerHitboxStandH);
  }

  tryShoot() {
    const now = this.time.now;
    if (this.lastShotAt && now < this.lastShotAt + 150) return;
    const dir = this.playerState?.facing < 0 ? -1 : 1;
    const spawn = this.getBulletSpawn(this.player, dir);
    const bullet = this.physics.add.image(spawn.x, spawn.y, 'bullet');
    if (!bullet || !bullet.body) return;
    bullet.setPosition(spawn.x, spawn.y);
    bullet.setActive(true).setVisible(true);
    bullet.setDepth(10);
    const body = bullet.body;
    body.reset(spawn.x, spawn.y);
    body.moves = true;
    body.allowGravity = false;
    if (body.setGravityY) body.setGravityY(0);
    body.gravity.y = 0;
    body.setDrag(0, 0);
    body.setBounce(0, 0);
    const BULLET_SPEED = 520;
    bullet.vx = dir * BULLET_SPEED;
    body.velocity.x = bullet.vx;
    body.velocity.y = 0;
    if (body.setVelocity) body.setVelocity(bullet.vx, 0);
    if (bullet.setVelocity) bullet.setVelocity(bullet.vx, 0);
    bullet.isProjectile = true;
    bullet.setCollideWorldBounds(false);
    bullet.spawnTime = this.time.now;
    bullet.lifespan = 450;
    this.bulletsGroup.add(bullet);
    this.bulletsList.push(bullet);
    this.lastErrorText?.setText(`Shoot dir:${dir} vx:${Math.round(body.velocity.x)} vy:${Math.round(body.velocity.y)}`);
    this.lastShotAt = now;
    this.pewText.setText('PEW!');
    this.shotsText.setText(`Shots: ${this.bulletsList.filter((b) => b?.active).length}`);
    this.time.delayedCall(200, () => {
      if (this.pewText?.active) this.pewText.setText('');
    });
  }

  getBulletSpawn(player, facing) {
    const body = player?.body;
    const dir = facing >= 0 ? 1 : -1;
    if (!body) {
      return { x: player.x + dir * 12, y: player.y - 10 };
    }
    const { spawnX, spawnY } = this.getShotSpawnOffset(body, dir);
    return { x: Math.round(spawnX), y: Math.round(spawnY) };
  }

  getShotSpawnOffset(body, dir) {
    const pad = 6;
    const spawnX = dir > 0 ? body.right + pad : body.left - pad;

    const STAND_FRAC = 0.55;
    const CROUCH_FRAC = 0.5;
    const frac = this.playerState?.isCrouching ? CROUCH_FRAC : STAND_FRAC;
    let spawnY = body.top + body.height * frac;

    const minY = body.top + 4;
    const maxY = body.bottom - 6;
    spawnY = Phaser.Math.Clamp(spawnY, minY, maxY);

    return { spawnX, spawnY };
  }

  damagePlayer(amount) {
    const now = this.time.now;
    if (now < this.playerState.invulUntil) return false;

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
    return true;
  }

  onPlayerTouchEnemy(player, enemy) {
    const damage = Math.max(1, enemy?.damageToPlayer ?? 1);
    const wasDamaged = this.damagePlayer(damage);
    if (!wasDamaged) return;
    const dir = (player?.x ?? 0) < (enemy?.x ?? 0) ? -1 : 1;
    player?.setVelocity?.(dir * 150, -150);
  }

  handleMovement() {
    const body = this.player.body;
    const moveSpeed = 125;
    const keyboardMoveX = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    const gamepadMoveX = this.getMoveX();
    const moveXRaw = gamepadMoveX !== 0 ? gamepadMoveX : keyboardMoveX;
    const moveX = moveXRaw === 0 ? 0 : moveXRaw > 0 ? 1 : -1;
    const grounded = Boolean(body.blocked.down || body.touching.down);
    const crouchDownPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.isGamepadButtonJustPressed(this.gamepadButtons.dpadDown);
    const crouchUpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.isGamepadButtonJustPressed(this.gamepadButtons.dpadUp);

    if (!this.playerState.isCrouching && grounded && crouchDownPressed) {
      this.enterCrouch();
    } else if (this.playerState.isCrouching && crouchUpPressed) {
      this.exitCrouch();
    }

    if (this.playerState.isCrouching) {
      this.player.setVelocityX(0);
    } else {
      this.player.setVelocityX(Math.round(moveX * moveSpeed));
      if (moveX < 0) {
        this.playerState.facing = -1;
        this.player.setFrame(0);
        this.player.setFlipX(true);
      } else if (moveX > 0) {
        this.playerState.facing = 1;
        this.player.setFrame(0);
        this.player.setFlipX(false);
      }
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      this.isJumpJustDown();
    this._jumpJustPressed = jumpPressed;
    if (jumpPressed && this.playerState.isCrouching) {
      this.exitCrouch();
    }
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
    if (moveX === 0 && body.blocked.down) {
      body.velocity.x = 0;
    }

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
      `Gamepad: ${status} (B:${this.gamepadButtons.jump} Y:${this.gamepadButtons.shoot} D:${this.gamepadButtons.dpadLeft}/${this.gamepadButtons.dpadRight})`
    );
    if (this.pad && this.pad.connected) {
      const mapping = this.pad.mapping || 'unknown';
      const buttonCount = this.pad.buttons?.length ?? 0;
      this.gamepadDetailsText.setText(`Pad: ${this.pad.id} | mapping: ${mapping} | buttons: ${buttonCount}`);
    } else {
      this.gamepadDetailsText.setText('Pad: none | mapping: n/a | buttons: 0');
      this.lastPressedButtonIndex = -1;
    }
    this.lastErrorText.setText(`LastError: ${this.lastErrorMessage || 'none'}`);
    this.updateGamepadLiveHud(true);
  }

  update(_time, delta) {
    try {
      this.handleMovement();
      this.snapPlayerToGroundIfNeeded();
      this.drawSpriteDebugBounds();
      this.debugGroundAlignment();
      this.captureLastPressedButton();
      const shootPressed = Phaser.Input.Keyboard.JustDown(this.keys.shoot) || this.isShootJustDown();
      if (shootPressed) {
        this.tryShoot();
      }
      const leftBound = this.cameras.main.worldView.left - 50;
      const rightBound = this.cameras.main.worldView.right + 50;
      this.bulletsList = this.bulletsList.filter((b) => {
        if (!b || !b.active || !b.body) return false;
        if (Math.abs(b.body.velocity.x) < 1 && typeof b.vx === 'number') {
          b.body.velocity.x = b.vx;
        }
        b.body.velocity.y = 0;
        b.body.allowGravity = false;
        b.body.gravity.y = 0;
        b.lifespan -= delta;
        if (b.lifespan <= 0 || b.x < leftBound || b.x > rightBound) {
          b.destroy();
          return false;
        }
        return true;
      });
      this.shotsText.setText(`Shots: ${this.bulletsList.length}`);
      const lastBullet = this.bulletsList[this.bulletsList.length - 1];
      if (lastBullet?.body) {
        this.lastErrorText?.setText(
          `Bullet vx:${Math.round(lastBullet.body.velocity.x)} vy:${Math.round(lastBullet.body.velocity.y)}`
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
      this.updatePixelCamera();
      this.updateJitterHud();
    } catch (error) {
      this.reportError(error);
      return;
    }
  }
}

