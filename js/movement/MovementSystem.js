/**
 * MovementSystem - Handles smooth agent movement along paths
 */
export class MovementSystem {
  constructor(tileSize) {
    this.tileSize = tileSize;
    this.movingAgents = [];
    this.onPathFail = null; // Callback for when pathfinding fails
  }
  
  /**
   * Start moving an agent along a path
   */
  moveAgent(agent, path, speed = 2) {
    if (!path || path.length === 0) {
      console.warn(`[MovementSystem] No path for agent ${agent.id} — skipping movement`);
      if (this.onPathFail) {
        this.onPathFail(agent, 'no_path');
      }
      return false;
    }
    
    agent.path = path;
    agent.pathIndex = 0;
    agent.isMoving = true;
    agent.speed = speed; // tiles per second
    
    // Add to moving agents list if not already there
    if (!this.movingAgents.includes(agent)) {
      this.movingAgents.push(agent);
    }
    
    console.log(`[MovementSystem] Agent ${agent.id} moving along path (${path.length} tiles)`);
    return true;
  }
  
  /**
   * Update all moving agents
   */
  update(deltaTime) {
    for (let i = this.movingAgents.length - 1; i >= 0; i--) {
      const agent = this.movingAgents[i];
      
      if (!agent.isMoving || !agent.path || agent.pathIndex >= agent.path.length) {
        // Agent finished moving
        agent.isMoving = false;
        this.movingAgents.splice(i, 1);
        
        // Switch to idle animation
        if (agent.animation) {
          agent.animation.play(`idle_${agent.direction}`, true);
        }
        
        continue;
      }
      
      const targetTile = agent.path[agent.pathIndex];
      const targetPixel = {
        x: targetTile.x * this.tileSize,
        y: targetTile.y * this.tileSize
      };
      
      // Calculate direction vector
      const dx = targetPixel.x - agent.pixelPos.x;
      const dy = targetPixel.y - agent.pixelPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 1) {
        // Reached target tile
        agent.pixelPos.x = targetPixel.x;
        agent.pixelPos.y = targetPixel.y;
        agent.tile = { x: targetTile.x, y: targetTile.y };
        agent.pathIndex++;
        
        // Check if path is complete
        if (agent.pathIndex >= agent.path.length) {
          agent.isMoving = false;
          this.movingAgents.splice(i, 1);
          
          // Switch to idle animation
          if (agent.animation) {
            agent.animation.play(`idle_${agent.direction}`, true);
          }
          
          console.log(`[MovementSystem] Agent ${agent.id} reached destination`);
        }
      } else {
        // Move towards target
        const speed = agent.speed * this.tileSize; // pixels per second
        const moveDistance = speed * deltaTime;
        
        const ratio = Math.min(moveDistance / distance, 1);
        agent.pixelPos.x += dx * ratio;
        agent.pixelPos.y += dy * ratio;
        
        // Update direction based on movement vector
        this.updateDirection(agent, dx, dy);
        
        // Update animation
        if (agent.animation && agent.animation.currentAnimation !== `walk_${agent.direction}`) {
          agent.animation.play(`walk_${agent.direction}`, true);
        }
      }
    }
  }
  
  /**
   * Update agent direction based on movement vector
   */
  updateDirection(agent, dx, dy) {
    // Determine dominant direction
    if (Math.abs(dx) > Math.abs(dy)) {
      agent.direction = dx > 0 ? 'right' : 'left';
    } else {
      agent.direction = dy > 0 ? 'down' : 'up';
    }
  }
  
  /**
   * Stop agent movement
   */
  stopAgent(agent) {
    agent.isMoving = false;
    agent.path = [];
    agent.pathIndex = 0;
    
    const index = this.movingAgents.indexOf(agent);
    if (index !== -1) {
      this.movingAgents.splice(index, 1);
    }
  }
}
