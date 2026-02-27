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

  clearCurrentRoom() {
    this.scene.tileGroup?.clear(true, true);
    this.scene.enemyGroup?.clear(true, true);
    this.scene.doorZones?.clear(true, true);
    this.scene.itemSprites?.clear(true, true);

    this.scene.playerTileCollider?.destroy();
    this.scene.enemyTileCollider?.destroy();
    this.scene.playerEnemyCollider?.destroy();
    this.scene.playerDoorOverlap?.destroy();
    this.scene.playerItemOverlap?.destroy();
    this.scene.bulletEnemyOverlap?.destroy();
    this.scene.bulletTileCollider?.destroy();
  }

  loadRoom(roomId, spawnId = 'start') {
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

    for (let y = 0; y < room.height; y += 1) {
      for (let x = 0; x < room.width; x += 1) {
        if (room.collisionGrid[y][x] === 1) {
          const tile = this.scene.tileGroup
            .create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'tile-solid')
            .setOrigin(0.5);
          tile.refreshBody();
        }
      }
    }

    this.scene.physics.world.setBounds(0, 0, room.width * TILE_SIZE, room.height * TILE_SIZE);
    this.scene.cameras.main.setBounds(0, 0, room.width * TILE_SIZE, room.height * TILE_SIZE);

    const spawn = room.spawnPoints[spawnId] ?? room.spawnPoints.start;
    const spawnPx = tileToPixel(spawn.tileX, spawn.tileY);
    this.scene.player.setPosition(spawnPx.x, spawnPx.y);

    room.enemySpawns.forEach((spawnDef) => {
      const start = tileToPixel(spawnDef.tileX, spawnDef.tileY);
      const min = tileToPixel(spawnDef.patrolMinTileX, spawnDef.tileY);
      const max = tileToPixel(spawnDef.patrolMaxTileX, spawnDef.tileY);
      const enemy = this.scene.createEnemy(start.x, start.y, min.x, max.x);
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

    this.scene.playerTileCollider = this.scene.physics.add.collider(this.scene.player, this.scene.tileGroup);
    this.scene.enemyTileCollider = this.scene.physics.add.collider(this.scene.enemyGroup, this.scene.tileGroup);
    this.scene.playerEnemyCollider = this.scene.physics.add.overlap(this.scene.player, this.scene.enemyGroup, () => {
      this.scene.damagePlayer(1);
    });
    this.scene.bulletEnemyOverlap = this.scene.physics.add.overlap(
      this.scene.bullets,
      this.scene.enemyGroup,
      (bullet, enemy) => {
        bullet.disableBody(true, true);
        enemy.hurt();
      }
    );
    this.scene.bulletTileCollider = this.scene.physics.add.collider(this.scene.bullets, this.scene.tileGroup, (bullet) => {
      bullet.disableBody(true, true);
    });

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
