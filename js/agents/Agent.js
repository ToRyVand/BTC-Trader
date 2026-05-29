/**
 * Agent - Represents a trading agent with sprite, FSM, and stats
 */
import { AnimationController } from '../sprites/AnimationController.js';

export class Agent {
  constructor(id, name, type, config) {
    // Identity
    this.id = id;                    // 'tech', 'quant', 'fund', 'sent', 'risk'
    this.name = name;                // 'TICKER', 'LA MAQUINA', etc.
    this.type = type;                // 'technical', 'quant', etc.
    
    // Position
    this.tile = { x: 0, y: 0 };      // Grid position
    this.pixelPos = { x: 0, y: 0 };  // Pixel position (for smooth movement)
    this.direction = 'down';         // 'up', 'down', 'left', 'right'
    
    // State
    this.state = 'IDLE';             // Current FSM state
    this.stateMachine = null;        // Will be set by StateManager
    
    // Movement
    this.path = [];                  // Current path (array of tiles)
    this.pathIndex = 0;              // Index in path
    this.speed = 2;                  // tiles/second (64 px/s at 32px tiles)
    this.isMoving = false;
    
    // Animation
    this.animation = null;           // AnimationController instance
    this.spriteSheet = null;         // Sprite sheet name
    this.animations = null;          // Animation configurations
    
    // Trading data
    this.signal = null;              // { signal: 'BUY', confidence: 0.8, reason: '...' }
    this.stats = {
      confidence: 0,
      wins: 0,
      losses: 0,
      xp: 0,
      level: 1
    };
    
    // Configuration
    this.homeDesk = config.homeDesk || { x: 0, y: 0 };
    this.color = config.color;
    
    // Validation
    this.validate();
  }
  
  /**
   * Validate agent properties
   */
  validate() {
    const validDirections = ['up', 'down', 'left', 'right'];
    if (!validDirections.includes(this.direction)) {
      throw new Error(`Invalid direction: ${this.direction}`);
    }
    
    if (this.speed <= 0) {
      throw new Error(`Invalid speed: ${this.speed}`);
    }
  }
  
  /**
   * Set animation controller
   */
  setAnimationController(spriteSystem, animations) {
    this.animation = new AnimationController(spriteSystem);
    this.animations = animations;
    this.animation.setAnimations(animations);
  }
  
  /**
   * Update agent (called each frame)
   */
  update(deltaTime) {
    // Update animation
    if (this.animation) {
      this.animation.update(deltaTime);
    }
  }
  
  /**
   * Set tile position and update pixel position
   */
  setTile(x, y, tileSize) {
    this.tile = { x, y };
    this.pixelPos = {
      x: x * tileSize,
      y: y * tileSize
    };
  }
  
  /**
   * Get current animation frame for rendering
   */
  getCurrentFrame() {
    return this.animation ? this.animation.getCurrentFrame() : 0;
  }
}
