export const TILE_SIZE = 16;

/**
 * Erzeugt ein leeres Tile-Grid in gewünschter Größe.
 */
export function createGrid(width, height, fill = 0) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

/**
 * Füllt die untersten Reihen mit soliden Tiles als Basiskollisionsboden.
 */
export function fillGround(grid, rows = 2) {
  const h = grid.length;
  const w = grid[0].length;
  for (let y = h - rows; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      grid[y][x] = 1;
    }
  }
}

/**
 * Plattform als horizontale Linie von solid tiles.
 */
export function addPlatform(grid, y, startX, endX) {
  for (let x = startX; x <= endX; x += 1) {
    if (grid[y] && grid[y][x] !== undefined) {
      grid[y][x] = 1;
    }
  }
}

/**
 * Vertikale Wand.
 */
export function addWall(grid, x, startY, endY) {
  for (let y = startY; y <= endY; y += 1) {
    if (grid[y] && grid[y][x] !== undefined) {
      grid[y][x] = 1;
    }
  }
}

/**
 * Hilfsfunktion: tile-Koordinaten in Pixel.
 */
export function tileToPixel(tileX, tileY) {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2
  };
}
