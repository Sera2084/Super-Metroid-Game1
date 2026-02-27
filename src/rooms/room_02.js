import { addPlatform, addWall, createGrid, fillGround } from './helpers';

const width = 56;
const height = 24;
const collisionGrid = createGrid(width, height);
fillGround(collisionGrid, 3);
addPlatform(collisionGrid, 18, 7, 16);
addPlatform(collisionGrid, 14, 22, 34);
addPlatform(collisionGrid, 10, 39, 49);
addWall(collisionGrid, 0, 8, 23);
addWall(collisionGrid, width - 1, 8, 23);

export const room02 = {
  id: 'room_02',
  name: 'Shiver Gallery',
  width,
  height,
  collisionGrid,
  decoGrid: createGrid(width, height, 0),
  spawnPoints: {
    from_left: { tileX: 2, tileY: 19 },
    from_right: { tileX: width - 4, tileY: 19 },
    from_upper: { tileX: 24, tileY: 11 }
  },
  doors: [
    {
      id: 'r02_to_r01',
      tileX: 0,
      tileY: 7,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_01',
      targetSpawnId: 'from_right'
    },
    {
      id: 'r02_to_r03',
      tileX: width - 1,
      tileY: 7,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_03',
      targetSpawnId: 'from_left'
    },
    {
      id: 'r02_to_r05',
      tileX: 24,
      tileY: 0,
      tileWidth: 3,
      tileHeight: 1,
      targetRoomId: 'room_05',
      targetSpawnId: 'from_bottom'
    }
  ],
  itemSpawns: [
    { id: 'item_missile_rack_1', type: 'missile_pack', tileX: 47, tileY: 8, amount: 5 }
  ],
  enemySpawns: [
    { id: 'r02_enemy_1', type: 'crawler', tileX: 14, tileY: 17, patrolMinTileX: 9, patrolMaxTileX: 17 },
    { id: 'r02_enemy_2', type: 'crawler', tileX: 28, tileY: 13, patrolMinTileX: 23, patrolMaxTileX: 34 }
  ]
};
