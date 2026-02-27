import { addPlatform, addWall, createGrid, fillGround } from './helpers';

const width = 64;
const height = 28;
const collisionGrid = createGrid(width, height);
fillGround(collisionGrid, 3);
addPlatform(collisionGrid, 20, 8, 20);
addPlatform(collisionGrid, 16, 24, 36);
addPlatform(collisionGrid, 12, 40, 53);
addWall(collisionGrid, 0, 9, 27);
addWall(collisionGrid, width - 1, 9, 27);

export const room04 = {
  id: 'room_04',
  name: 'Long Resonance Hall',
  width,
  height,
  collisionGrid,
  decoGrid: createGrid(width, height, 0),
  spawnPoints: {
    from_left: { tileX: 3, tileY: 22 },
    from_bottom: { tileX: 51, tileY: 15 }
  },
  doors: [
    {
      id: 'r04_to_r03',
      tileX: 0,
      tileY: 8,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_03',
      targetSpawnId: 'from_right'
    },
    {
      id: 'r04_to_r06',
      tileX: 50,
      tileY: 0,
      tileWidth: 3,
      tileHeight: 1,
      targetRoomId: 'room_06',
      targetSpawnId: 'from_bottom'
    }
  ],
  itemSpawns: [
    { id: 'item_super_pack_1', type: 'super_pack', tileX: 45, tileY: 11, amount: 2 }
  ],
  enemySpawns: [
    { id: 'r04_enemy_1', type: 'crawler', tileX: 18, tileY: 19, patrolMinTileX: 10, patrolMaxTileX: 20 },
    { id: 'r04_enemy_2', type: 'crawler', tileX: 33, tileY: 15, patrolMinTileX: 25, patrolMaxTileX: 36 }
  ]
};
