import { TILE_SIZE, tileToPixel } from '../rooms/helpers';

/**
 * Lädt datengetriebene Räume in eine Scene: Tiles, Kollisionen, Gegner, Türen, Items.
 */
export class RoomLoader {
  constructor(scene, roomProvider, gameState) {
    this.scene = scene;
    this.roomProvider = roomProvider;
    this.gameState = gameState;
    this.currentRoom = null;
    this.transitionLock = false;
  }

  safelyRemoveCollider(key) {
    const collider = this.scene[key];
    if (!collider) return;
    const world = this.scene.physics?.world;
    if (world && !collider.destroyed) {
      world.removeCollider(collider);
    }
    this.scene[key] = null;
  }

  clearCurrentRoom() {
    this.safelyRemoveCollider('playerTileCollider');
    this.safelyRemoveCollider('enemyTileCollider');
    this.safelyRemoveCollider('playerEnemyCollider');
    this.safelyRemoveCollider('playerDoorOverlap');
    this.safelyRemoveCollider('playerItemOverlap');
    this.safelyRemoveCollider('bulletEnemyOverlap');
    this.safelyRemoveCollider('bulletTileCollider');

    this.scene.roomCollisionLayer?.destroy();
    this.scene.roomTilemap?.destroy();
    this.scene.enemyGroup?.clear(true, true);
    this.scene.doorZones?.clear(true, true);
    this.scene.itemSprites?.clear(true, true);
  }

  loadRoom(roomId, spawnId = 'start') {
    this.safelyRemoveCollider('bulletTileCollider');

    const room = this.roomProvider(roomId);
    if (!room) {
      throw new Error(`Raum nicht gefunden: ${roomId}`);
    }

    this.clearCurrentRoom();
    this.currentRoom = room;
    this.scene.currentRoomId = room.id;
    this.gameState.markRoomVisited(room.id);

    this.scene.tileGroup = this.scene.physics.add.staticGroup();
    this.scene.enemyGroup = this.scene.physics.add.group({ runChildUpdate: true });
    this.scene.doorZones = this.scene.add.group();
    this.scene.itemSprites = this.scene.physics.add.staticGroup();

    const collisionData = room.collisionGrid.map((row) => row.map((cell) => (cell === 1 ? 0 : -1)));
    const tilemap = this.scene.make.tilemap({
      data: collisionData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE
    });
    const biolabTileset = tilemap.addTilesetImage('tiles_biolab');
    if (!biolabTileset) {
      throw new Error('Tileset "tiles_biolab" konnte nicht erstellt werden.');
    }
    const collisionLayer = tilemap.createLayer(0, biolabTileset, 0, 0);
    collisionLayer.setCollisionByExclusion([-1], true);

    this.scene.roomTilemap = tilemap;
    this.scene.roomCollisionLayer = collisionLayer;

    const worldW = room.width * TILE_SIZE;
    const worldH = room.height * TILE_SIZE;
    const BOTTOM_PADDING = 128;
    this.scene.physics.world.setBounds(0, 0, worldW, worldH + BOTTOM_PADDING);
    this.scene.cameras.main.setBounds(0, 0, worldW, worldH);
    this.scene._roomWorldW = worldW;
    this.scene._roomWorldH = worldH;

    const spawn = room.spawnPoints[spawnId] ?? room.spawnPoints.start;
    const spawnPx = {
      x: spawn.tileX * TILE_SIZE + TILE_SIZE / 2,
      y: (spawn.tileY + 1) * TILE_SIZE
    };
    this.scene.player.setPosition(spawnPx.x, spawnPx.y);
    this.scene.setWorldHitbox?.(this.scene.player, 26, 44);

    room.enemySpawns.forEach((spawnDef) => {
      const startX = tileToPixel(spawnDef.tileX, spawnDef.tileY).x;
      const startY = (spawnDef.tileY + 1) * TILE_SIZE;
      const min = tileToPixel(spawnDef.patrolMinTileX, spawnDef.tileY);
      const max = tileToPixel(spawnDef.patrolMaxTileX, spawnDef.tileY);
      const enemy = this.scene.createEnemy(startX, startY, min.x, max.x);
      const pScale = this.scene.player?.scaleX ?? 0.07;
      const enemyScale = pScale * 0.95;
      enemy.setScale(enemyScale);
      this.scene.setWorldHitbox?.(enemy, 18, 14);
      this.scene.enemyGroup.add(enemy);
    });

    room.doors.forEach((door) => {
      const zone = this.scene.add
        .zone(
          door.tileX * TILE_SIZE,
          door.tileY * TILE_SIZE,
          door.tileWidth * TILE_SIZE,
          door.tileHeight * TILE_SIZE
        )
        .setOrigin(0, 0);
      this.scene.physics.add.existing(zone, true);
      zone.setData('door', door);
      this.scene.doorZones.add(zone);
    });

    room.itemSpawns.forEach((item) => {
      if (this.gameState.isItemCollected(item.id)) return;
      const pos = tileToPixel(item.tileX, item.tileY);
      const key = item.type === 'dash_module' ? 'dash-pickup' : 'item-pickup';
      const sprite = this.scene.itemSprites.create(pos.x, pos.y, key);
      sprite.setData('item', item);
    });

    this.scene.refreshPlayerTileCollider?.();
    this.scene.enemyTileCollider = this.scene.physics.add.collider(this.scene.enemyGroup, this.scene.roomCollisionLayer);
    this.scene.playerEnemyCollider = this.scene.physics.add.overlap(this.scene.player, this.scene.enemyGroup, (player, enemy) => {
      if (this.scene.onPlayerTouchEnemy) {
        this.scene.onPlayerTouchEnemy(player, enemy);
      } else {
        this.scene.damagePlayer(1);
      }
    });
    this.scene.bulletEnemyOverlap = this.scene.physics.add.overlap(
      this.scene.bulletsGroup,
      this.scene.enemyGroup,
      (bullet, enemy) => {
        if (bullet?.active) bullet.destroy();
        const dir = bullet?.body?.velocity?.x >= 0 ? 1 : -1;
        if (enemy?.takeDamage) {
          enemy.takeDamage(1, dir);
        } else if (enemy?.hurt) {
          enemy.hurt();
        }
      }
    );
    this.safelyRemoveCollider('bulletTileCollider');
    this.scene.bulletTileCollider = this.scene.physics.add.overlap(
      this.scene.bulletsGroup,
      this.scene.roomCollisionLayer,
      (bullet) => {
        this.scene.lastErrorText?.setText(`BulletHitTile @ ${Math.round(bullet.x)},${Math.round(bullet.y)}`);
        if (bullet?.active) bullet.destroy();
      },
      (bullet) => {
        const now = this.scene.time.now;
        const spawnTime = bullet.spawnTime ?? 0;
        return now - spawnTime > 80;
      },
      this
    );

    this.scene.playerDoorOverlap = this.scene.physics.add.overlap(this.scene.player, this.scene.doorZones, (_, zone) => {
      const door = zone.getData('door');
      this.transitionToRoom(door.targetRoomId, door.targetSpawnId);
    });

    this.scene.playerItemOverlap = this.scene.physics.add.overlap(this.scene.player, this.scene.itemSprites, (_, sprite) => {
      const item = sprite.getData('item');
      this.gameState.applyItem(item);
      sprite.destroy();
      this.scene.applyGameStateToPlayer();
      this.scene.updateHud();
    });

    this.scene.roomTitle.setText(`Room: ${room.name}`);
    this.scene.updateHud();
  }

  transitionToRoom(nextRoomId, spawnId) {
    if (this.transitionLock) return;
    this.transitionLock = true;

    const cam = this.scene.cameras.main;
    cam.fadeOut(160, 0, 0, 0);

    cam.once('camerafadeoutcomplete', () => {
      this.loadRoom(nextRoomId, spawnId);
      cam.fadeIn(180, 0, 0, 0);
      this.transitionLock = false;
    });
  }
}
