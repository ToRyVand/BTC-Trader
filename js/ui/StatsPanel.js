/**
 * StatsPanel - Display agent statistics on click
 * Shows agent info in a VGA-styled panel
 */
export class StatsPanel {
  constructor() {
    this.isVisible = false;
    this.agent = null;
    
    // Styling
    this.bgColor = '#1a1a1a';
    this.borderColor = '#4a9eff';
    this.textColor = '#fff';
    this.labelColor = '#888';
    this.font = '8px "Press Start 2P"';
    this.titleFont = '10px "Press Start 2P"';
    
    // Dimensions
    this.width = 200;
    this.height = 180;
    this.padding = 12;
    
    console.log('[StatsPanel] Initialized');
  }
  
  /**
   * Show panel for an agent
   * @param {Object} agent - Agent to display stats for
   */
  show(agent) {
    this.agent = agent;
    this.isVisible = true;
    console.log(`[StatsPanel] Showing stats for ${agent.name}`);
  }
  
  /**
   * Hide the panel
   */
  hide() {
    this.isVisible = false;
    this.agent = null;
    console.log('[StatsPanel] Hidden');
  }
  
  /**
   * Toggle panel visibility
   * @param {Object} agent - Agent to display stats for
   */
  toggle(agent) {
    if (this.isVisible && this.agent === agent) {
      this.hide();
    } else {
      this.show(agent);
    }
  }
  
  /**
   * Render the stats panel
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} canvasWidth - Canvas width for positioning
   * @param {number} canvasHeight - Canvas height for positioning
   */
  render(ctx, canvasWidth, canvasHeight) {
    if (!this.isVisible || !this.agent) return;
    
    // Position in top-right corner
    const x = canvasWidth - this.width - 20;
    const y = 20;
    
    // Draw background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(x, y, this.width, this.height);
    
    // Draw border
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, this.width, this.height);
    
    // Draw title
    ctx.fillStyle = this.borderColor;
    ctx.font = this.titleFont;
    ctx.textBaseline = 'top';
    ctx.fillText('AGENT STATS', x + this.padding, y + this.padding);
    
    // Draw separator line
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + this.padding, y + this.padding + 14);
    ctx.lineTo(x + this.width - this.padding, y + this.padding + 14);
    ctx.stroke();
    
    // Draw stats
    ctx.font = this.font;
    let currentY = y + this.padding + 24;
    const lineHeight = 14;
    
    // Agent name
    this.drawStat(ctx, x + this.padding, currentY, 'NAME', this.agent.name);
    currentY += lineHeight;
    
    // Agent type
    this.drawStat(ctx, x + this.padding, currentY, 'TYPE', this.agent.id.toUpperCase());
    currentY += lineHeight;
    
    // Current state
    const state = this.agent.stateMachine ? this.agent.stateMachine.getCurrentState() : 'UNKNOWN';
    this.drawStat(ctx, x + this.padding, currentY, 'STATE', state);
    currentY += lineHeight;
    
    // Position
    this.drawStat(ctx, x + this.padding, currentY, 'POS', `(${this.agent.tilePos.x}, ${this.agent.tilePos.y})`);
    currentY += lineHeight;
    
    // Confidence (mock data for now)
    const confidence = this.agent.signal ? Math.floor(this.agent.signal.confidence * 100) : 50;
    this.drawStat(ctx, x + this.padding, currentY, 'CONF', `${confidence}%`);
    currentY += lineHeight;
    
    // Level (mock data)
    this.drawStat(ctx, x + this.padding, currentY, 'LEVEL', '5');
    currentY += lineHeight;
    
    // XP (mock data)
    this.drawStat(ctx, x + this.padding, currentY, 'XP', '1250');
    currentY += lineHeight;
    
    // Wins/Losses (mock data)
    this.drawStat(ctx, x + this.padding, currentY, 'W/L', '12/5');
    currentY += lineHeight;
    
    // Close hint
    ctx.fillStyle = this.labelColor;
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('Click outside to close', x + this.padding, y + this.height - this.padding - 8);
  }
  
  /**
   * Draw a stat line (label: value)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} label - Stat label
   * @param {string} value - Stat value
   */
  drawStat(ctx, x, y, label, value) {
    // Draw label
    ctx.fillStyle = this.labelColor;
    ctx.fillText(`${label}:`, x, y);
    
    // Draw value
    ctx.fillStyle = this.textColor;
    ctx.fillText(value, x + 60, y);
  }
  
  /**
   * Check if a point is inside the panel
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @returns {boolean}
   */
  containsPoint(x, y, canvasWidth, canvasHeight) {
    if (!this.isVisible) return false;
    
    const panelX = canvasWidth - this.width - 20;
    const panelY = 20;
    
    return x >= panelX && x <= panelX + this.width &&
           y >= panelY && y <= panelY + this.height;
  }

  /**
   * Destroy the panel
   */
  destroy() {
    this.hide();
    console.log('[StatsPanel] Destroyed');
  }
}
