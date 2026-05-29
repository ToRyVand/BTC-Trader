/**
 * AgentController - Manages all trading agents
 */
import { Agent } from './Agent.js';
import { AgentColors } from '../utils/VGAPalette.js';

export class AgentController {
  constructor(config, spriteSystem) {
    this.config = config;
    this.spriteSystem = spriteSystem;
    this.agents = [];
    
    // Agent configurations - isometric grid positions
    this.agentConfigs = [
      {
        id: 'tech',
        name: 'TICKER',
        type: 'technical',
        homeDesk: { x: 3, y: 3 }, // Near desk at (2,2)
        color: AgentColors.tech,
        spriteSheet: 'tech-sprite'
      },
      {
        id: 'quant',
        name: 'LA MAQUINA',
        type: 'quant',
        homeDesk: { x: 7, y: 3 }, // Near desk at (6,2)
        color: AgentColors.quant,
        spriteSheet: 'quant-sprite'
      },
      {
        id: 'fund',
        name: 'ECONOMISTA',
        type: 'fundamental',
        homeDesk: { x: 11, y: 3 }, // Near desk at (10,2)
        color: AgentColors.fund,
        spriteSheet: 'fund-sprite'
      },
      {
        id: 'sent',
        name: 'PERIODISTA',
        type: 'sentiment',
        homeDesk: { x: 3, y: 7 }, // Near desk at (2,6)
        color: AgentColors.sent,
        spriteSheet: 'sent-sprite'
      },
      {
        id: 'risk',
        name: 'JEFE RIESGO',
        type: 'risk',
        homeDesk: { x: 7, y: 7 }, // Near desk at (6,6)
        color: AgentColors.risk,
        spriteSheet: 'risk-sprite'
      },
      {
        id: 'director',
        name: 'EL DIRECTOR',
        type: 'director',
        homeDesk: { x: 11, y: 7 }, // Elevated position, near director panel
        color: AgentColors.director,
        spriteSheet: 'director-sprite'
      }
    ];
  }
  
  /**
   * Create all agents
   */
  createAgents() {
    this.agentConfigs.forEach(config => {
      const agent = new Agent(config.id, config.name, config.type, config);
      
      // Set initial position at home desk
      agent.setTile(config.homeDesk.x, config.homeDesk.y, this.config.tileSize);
      
      // Set sprite sheet
      agent.spriteSheet = config.spriteSheet;
      
      // Setup animations
      const animations = this.getAnimationConfig(config.id);
      agent.setAnimationController(this.spriteSystem, animations);
      
      // Start with idle animation
      agent.animation.play('idle_down', true);
      
      this.agents.push(agent);
      
      console.log(`[AgentController] Created agent "${agent.name}" at (${agent.tile.x}, ${agent.tile.y})`);
    });
    
    return this.agents;
  }
  
  /**
   * Get animation configuration for an agent
   */
  getAnimationConfig(agentId) {
    // Animation configurations (frames and FPS)
    return {
      // Idle animations (2 frames, slow)
      idle_down:  { frames: [0, 1], fps: 2 },
      idle_up:    { frames: [2, 3], fps: 2 },
      idle_left:  { frames: [4, 5], fps: 2 },
      idle_right: { frames: [6, 7], fps: 2 },
      
      // Walk animations (4 frames, faster)
      walk_down:  { frames: [8, 9, 10, 11], fps: 8 },
      walk_up:    { frames: [12, 13, 14, 15], fps: 8 },
      walk_left:  { frames: [16, 17, 18, 19], fps: 8 },
      walk_right: { frames: [20, 21, 22, 23], fps: 8 },
      
      // Think animation (3 frames)
      think:      { frames: [24, 25, 26], fps: 3 },
      
      // Signal animations (2 frames each)
      signal_buy: { frames: [27, 28], fps: 4 },
      signal_sell:{ frames: [29, 30], fps: 4 },
      signal_hold:{ frames: [31, 32], fps: 4 },
      
      // Celebrate animation (4 frames)
      celebrate:  { frames: [33, 34, 35, 36], fps: 6 },
      
      // Panic animation (4 frames)
      panic:      { frames: [37, 38, 39, 40], fps: 8 }
    };
  }
  
  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.agents.find(agent => agent.id === id);
  }
  
  /**
   * Update all agents
   */
  update(deltaTime) {
    this.agents.forEach(agent => {
      agent.update(deltaTime);
    });
  }
  
  /**
   * Get agent at pixel position (for click detection)
   */
  getAgentAtPosition(x, y) {
    const spriteSize = 48;

    for (const agent of this.agents) {
      const ax = agent.pixelPos.x;
      const ay = agent.pixelPos.y;

      if (x >= ax && x <= ax + spriteSize && y >= ay && y <= ay + spriteSize) {
        return agent;
      }
    }

    return null;
  }

  /**
   * Cleanup agents and release resources
   */
  destroy() {
    this.agents.forEach(agent => {
      if (agent.animation) agent.animation.stop();
      if (agent.stateMachine) agent.stateMachine.destroy();
    });
    this.agents = [];
    console.log('[AgentController] Destroyed');
  }
}
