import { addPlatform, addWall, createGrid, fillGround } from './helpers';

const width = 40;
const height = 18;
const collisionGrid = createGrid(width, height);
fillGround(collisionGrid, 3);
addPlatform(collisionGrid, 12, 5, 14);
addPlatform(collisionGrid, 9, 18, 27);
addPlatform(collisionGrid, 6, 30, 36);
addWall(collisionGrid, 0, 5, 17);
addWall(collisionGrid, width - 1, 5, 17);

export const room06 = {
  id: 'room_06',
  name: 'Canopy Relay',
  width,
  height,
  collisionGrid,
  decoGrid: createGrid(width, height, 0),
  spawnPoints: {
    from_left: { tileX: 2, tileY: 13 },
    from_bottom: { tileX: 31, tileY: 7 }
  },
  doors: [
    {
      id: 'r06_to_r05',
      tileX: 0,
      tileY: 6,
      tileWidth: 1,
      tileHeight: 4,
      targetRoomId: 'room_05',
      targetSpawnId: 'from_top'
    },
    {
      id: 'r06_to_r04',
      tileX: 30,
      tileY: height - 1,
      tileWidth: 3,
      tileHeight: 1,
      targetRoomId: 'room_04',
      targetSpawnId: 'from_bottom'
    }
  ],
  itemSpawns: [],
  enemySpawns: [
    { id: 'r06_enemy_1', type: 'crawler', tileX: 12, tileY: 11, patrolMinTileX: 6, patrolMaxTileX: 14 }
  ]
};
