/**
 * TileGrid - Manages the grid of tiles and obstacles
 */
export class Tile {
  constructor(x, y, type = 'floor', walkable = true) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.walkable = walkable;
    this.occupant = null;
    this.sprite = null;
  }
  
  toPixels(tileSize) {
    return { x: this.x * tileSize, y: this.y * tileSize };
  }
}

export class TileGrid {
  constructor(width, height, tileSize) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.grid = [];
    
    // Create grid
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(new Tile(x, y));
      }
      this.grid.push(row);
    }
    
    console.log(`[TileGrid] Created ${width}x${height} grid`);
  }
  
  /**
   * Get tile at position
   */
  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.grid[y][x];
  }
  
  /**
   * Set tile walkability
   */
  setWalkable(x, y, walkable) {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.walkable = walkable;
    }
  }
  
  /**
   * Mark obstacles (desks, walls, etc.)
   */
  setObstacles(obstacles) {
    obstacles.forEach(obstacle => {
      const { x, y, w = 1, h = 1 } = obstacle;
      
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          this.setWalkable(x + dx, y + dy, false);
        }
      }
    });
    
    console.log(`[TileGrid] Set ${obstacles.length} obstacles`);
  }
  
  /**
   * Check if tile is walkable
   */
  isWalkable(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.walkable : false;
  }
  
  /**
   * Get neighbors of a tile (4-directional)
   */
  getNeighbors(tile) {
    const neighbors = [];
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];
    
    directions.forEach(dir => {
      const nx = tile.x + dir.x;
      const ny = tile.y + dir.y;
      const neighbor = this.getTile(nx, ny);
      
      if (neighbor) {
        neighbors.push(neighbor);
      }
    });
    
    return neighbors;
  }
}
