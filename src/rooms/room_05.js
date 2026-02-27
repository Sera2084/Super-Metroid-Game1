import { addPlatform, addWall, createGrid, fillGround } from './helpers';

const width = 32;
const height = 30;
const collisionGrid = createGrid(width, height);
fillGround(collisionGrid, 2);
addPlatform(collisionGrid, 24, 4, 12);
addPlatform(collisionGrid, 18, 14, 24);
addPlatform(collisionGrid, 12, 8, 15);
addPlatform(collisionGrid, 6, 18, 28);
addWall(collisionGrid, 0, 5, 29);
addWall(collisionGrid, width - 1, 5, 29);

export const room05 = {
  id: 'room_05',
  name: 'Vertical Cache',
  width,
  height,
  collisionGrid,
  decoGrid: createGrid(width, height, 0),
  spawnPoints: {
    from_bottom: { tileX: 14, tileY: 26 },
    from_top: { tileX: 20, tileY: 7 }
  },
  doors: [
    {
      id: 'r05_to_r02',
      tileX: 13,
      tileY: height - 1,
      tileWidth: 3,
      tileHeight: 1,
      targetRoomId: 'room_02',
      targetSpawnId: 'from_upper'
    },
    {
      id: 'r05_to_r06',
      tileX: 19,
      tileY: 0,
      tileWidth: 2,
      tileHeight: 1,
      targetRoomId: 'room_06',
      targetSpawnId: 'from_left'
    }
  ],
  itemSpawns: [
    { id: 'suit_mk2', type: 'suit_upgrade', tileX: 24, tileY: 5, level: 2 }
  ],
  enemySpawns: [
    { id: 'r05_enemy_1', type: 'crawler', tileX: 10, tileY: 23, patrolMinTileX: 5, patrolMaxTileX: 12 }
  ]
};
