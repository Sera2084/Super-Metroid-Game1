import { addPlatform, addWall, createGrid, fillGround } from './helpers';

const width = 48;
const height = 20;
const collisionGrid = createGrid(width, height);
fillGround(collisionGrid, 2);
addPlatform(collisionGrid, 14, 5, 12);
addPlatform(collisionGrid, 10, 15, 24);
addPlatform(collisionGrid, 6, 28, 38);
addWall(collisionGrid, 0, 6, 19);
addWall(collisionGrid, width - 1, 6, 19);

export const room03 = {
  id: 'room_03',
  name: 'Overhang Split',
  width,
  height,
  collisionGrid,
  decoGrid: createGrid(width, height, 0),
  spawnPoints: {
    from_left: { tileX: 3, tileY: 16 },
    from_right: { tileX: width - 4, tileY: 16 }
  },
  doors: [
    {
      id: 'r03_to_r02',
      tileX: 0,
      tileY: 6,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_02',
      targetSpawnId: 'from_right'
    },
    {
      id: 'r03_to_r04',
      tileX: width - 1,
      tileY: 6,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_04',
      targetSpawnId: 'from_left'
    }
  ],
  itemSpawns: [
    { id: 'upgrade_dash_module', type: 'dash_module', tileX: 36, tileY: 5 }
  ],
  enemySpawns: [
    { id: 'r03_enemy_1', type: 'crawler', tileX: 8, tileY: 13, patrolMinTileX: 5, patrolMaxTileX: 12 }
  ]
};
