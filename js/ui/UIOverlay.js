/**
 * UIOverlay - Coordinates all UI elements (bubbles, particles, panels)
 * Manages lifecycle and rendering of UI components
 */
import { DialogBubble } from './DialogBubble.js';
import { ParticlePool } from './ParticleEffect.js';
import { StatsPanel } from './StatsPanel.js';

export class UIOverlay {
  constructor() {
    this.dialogBubbles = [];
    this.particlePool = new ParticlePool(100);
    this.statsPanel = new StatsPanel();
    
    console.log('[UIOverlay] Initialized');
  }
  
  /**
   * Show a dialog bubble for an agent
   * @param {string} text - Text to display
   * @param {Object} agent - Agent to show bubble for
   * @param {number} duration - Duration in ms (default 3000)
   */
  showDialog(text, agent, duration = 3000) {
    const bubble = new DialogBubble(text, agent, duration);
    this.dialogBubbles.push(bubble);
  }
  
  /**
   * Spawn particle effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} type - Particle type ('sparkle' or 'explosion')
   * @param {number} count - Number of particles
   */
  spawnParticles(x, y, type, count = 10) {
    this.particlePool.spawn(x, y, type, count);
  }
  
  /**
   * Show stats panel for an agent
   * @param {Object} agent - Agent to show stats for
   */
  showStats(agent) {
    this.statsPanel.show(agent);
  }
  
  /**
   * Hide stats panel
   */
  hideStats() {
    this.statsPanel.hide();
  }
  
  /**
   * Toggle stats panel for an agent
   * @param {Object} agent - Agent to toggle stats for
   */
  toggleStats(agent) {
    this.statsPanel.toggle(agent);
  }
  
  /**
   * Update all UI elements
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    // Update dialog bubbles
    this.dialogBubbles.forEach(bubble => bubble.update(deltaTime));
    
    // Remove expired bubbles
    this.dialogBubbles = this.dialogBubbles.filter(bubble => !bubble.isExpired());
    
    // Update particles
    this.particlePool.update(deltaTime);
  }
  
  /**
   * Render all UI elements
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   */
  render(ctx, canvasWidth, canvasHeight) {
    // Render dialog bubbles
    this.dialogBubbles.forEach(bubble => bubble.render(ctx));
    
    // Render particles
    this.particlePool.render(ctx);
    
    // Render stats panel (on top of everything)
    this.statsPanel.render(ctx, canvasWidth, canvasHeight);
  }
  
  /**
   * Handle click event
   * @param {number} x - Click X coordinate
   * @param {number} y - Click Y coordinate
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @returns {boolean} True if click was handled
   */
  handleClick(x, y, canvasWidth, canvasHeight) {
    // Check if click is on stats panel
    if (this.statsPanel.containsPoint(x, y, canvasWidth, canvasHeight)) {
      return true; // Click handled by panel
    }
    
    // If stats panel is visible and click is outside, hide it
    if (this.statsPanel.isVisible) {
      this.statsPanel.hide();
      return true;
    }
    
    return false; // Click not handled
  }
  
  /**
   * Clear all UI elements
   */
  clear() {
    this.dialogBubbles = [];
    this.particlePool.clear();
    this.statsPanel.hide();
  }

  /**
   * Destroy UI overlay and release all resources
   */
  destroy() {
    this.dialogBubbles = [];
    this.particlePool.clear();
    this.statsPanel.destroy();
    console.log('[UIOverlay] Destroyed');
  }
}
