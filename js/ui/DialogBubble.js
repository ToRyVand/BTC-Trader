/**
 * DialogBubble - RPG-style text bubbles for agent communication
 * Renders speech bubbles above agents with VGA styling
 */
export class DialogBubble {
  constructor(text, agent, duration = 3000) {
    this.text = text;
    this.agent = agent;
    this.duration = duration;
    this.createdAt = Date.now();
    this.isActive = true;
    
    // Styling
    this.bgColor = '#000';
    this.borderColor = '#00ffff'; // cyan
    this.textColor = '#fff';
    this.font = '6px "Press Start 2P"';
    this.maxWidth = 120;
    this.padding = 8;
    this.tailSize = 6;
    
    // Wrap text
    this.lines = this.wrapText(text, this.maxWidth);
    
    // Calculate bubble dimensions
    this.width = this.maxWidth + (this.padding * 2);
    this.height = (this.lines.length * 10) + (this.padding * 2);
    
    console.log(`[DialogBubble] Created for ${agent.id}: "${text}"`);
  }
  
  /**
   * Wrap text to fit within max width
   * @param {string} text - Text to wrap
   * @param {number} maxWidth - Maximum width in pixels
   * @returns {string[]} Array of text lines
   */
  wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Approximate character width for "Press Start 2P" at 6px
    const charWidth = 4;
    const maxChars = Math.floor(maxWidth / charWidth);
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  /**
   * Update bubble lifecycle
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    const elapsed = Date.now() - this.createdAt;
    
    if (elapsed >= this.duration) {
      this.isActive = false;
    }
  }
  
  /**
   * Render the dialog bubble
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.isActive) return;
    
    // Calculate position above agent
    const x = this.agent.pixelPos.x + 32 - (this.width / 2); // Center above agent
    const y = this.agent.pixelPos.y - this.height - this.tailSize - 10; // Above agent
    
    // Draw bubble background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(x, y, this.width, this.height);
    
    // Draw bubble border
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.width, this.height);
    
    // Draw tail (triangle pointing to agent)
    const tailX = this.agent.pixelPos.x + 32; // Center of agent
    const tailY = y + this.height;
    
    ctx.fillStyle = this.bgColor;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY + this.tailSize);
    ctx.lineTo(tailX - this.tailSize, tailY);
    ctx.lineTo(tailX + this.tailSize, tailY);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY + this.tailSize);
    ctx.lineTo(tailX - this.tailSize, tailY);
    ctx.lineTo(tailX + this.tailSize, tailY);
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = this.textColor;
    ctx.font = this.font;
    ctx.textBaseline = 'top';
    
    this.lines.forEach((line, i) => {
      const textX = x + this.padding;
      const textY = y + this.padding + (i * 10);
      ctx.fillText(line, textX, textY);
    });
  }
  
  /**
   * Check if bubble is still active
   * @returns {boolean}
   */
  isExpired() {
    return !this.isActive;
  }
}
