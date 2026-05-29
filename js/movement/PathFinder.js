/**
 * PathFinder - A* pathfinding algorithm
 */
export class PathFinder {
  constructor(tileGrid) {
    this.tileGrid = tileGrid;
  }
  
  /**
   * Find path from start to end using A*
   */
  findPath(start, end) {
    if (!start || !end) return [];
    if (!this.tileGrid.isWalkable(end.x, end.y)) return [];
    
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    gScore.set(this.tileKey(start), 0);
    fScore.set(this.tileKey(start), this.heuristic(start, end));
    
    while (openSet.length > 0) {
      // Get tile with lowest fScore
      const current = this.getLowestFScore(openSet, fScore);
      
      // Check if we reached the goal
      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(cameFrom, current);
      }
      
      // Remove current from openSet
      const index = openSet.indexOf(current);
      openSet.splice(index, 1);
      
      // Check neighbors
      const neighbors = this.tileGrid.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        if (!neighbor.walkable) continue;
        
        const tentativeGScore = gScore.get(this.tileKey(current)) + 1;
        const neighborKey = this.tileKey(neighbor);
        
        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
          
          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }
    
    // No path found
    return [];
  }
  
  /**
   * Manhattan distance heuristic
   */
  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  
  /**
   * Get tile with lowest fScore from openSet
   */
  getLowestFScore(openSet, fScore) {
    let lowest = openSet[0];
    let lowestScore = fScore.get(this.tileKey(lowest)) || Infinity;
    
    for (const tile of openSet) {
      const score = fScore.get(this.tileKey(tile)) || Infinity;
      if (score < lowestScore) {
        lowest = tile;
        lowestScore = score;
      }
    }
    
    return lowest;
  }
  
  /**
   * Reconstruct path from cameFrom map
   */
  reconstructPath(cameFrom, current) {
    const path = [current];
    let key = this.tileKey(current);
    
    while (cameFrom.has(key)) {
      current = cameFrom.get(key);
      path.unshift(current);
      key = this.tileKey(current);
    }
    
    return path;
  }
  
  /**
   * Generate unique key for a tile
   */
  tileKey(tile) {
    return `${tile.x},${tile.y}`;
  }
}
