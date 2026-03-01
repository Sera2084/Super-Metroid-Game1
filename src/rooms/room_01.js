import { addPlatform, addWall, createGrid, fillGround } from './helpers';

const width = 44;
const height = 22;
const collisionGrid = createGrid(width, height);
fillGround(collisionGrid, 3);
addPlatform(collisionGrid, 15, 5, 14);
addPlatform(collisionGrid, 12, 18, 28);
addPlatform(collisionGrid, 8, 24, 34);
addPlatform(collisionGrid, 4, 22, 30);
addWall(collisionGrid, 0, 10, 21);
addWall(collisionGrid, width - 1, 8, 21);

export const room01 = {
  id: 'room_01',
  name: 'Entry Grotto',
  width,
  height,
  collisionGrid,
  decoGrid: createGrid(width, height, 0),
  spawnPoints: {
    start: { tileX: 3, tileY: 17 },
    from_right: { tileX: width - 4, tileY: 17 }
  },
  doors: [
    {
      id: 'r01_to_r02',
      tileX: width - 1,
      tileY: 7,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_02',
      targetSpawnId: 'from_left'
    }
  ],
  itemSpawns: [],
  enemySpawns: [
    { id: 'r01_enemy_1', type: 'crawler', tileX: 12, tileY: 14, patrolMinTileX: 8, patrolMaxTileX: 15 }
  ]
};
