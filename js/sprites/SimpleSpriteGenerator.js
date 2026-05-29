/**
 * SimpleSpriteGenerator - Generates 16-bit style pixel art sprites
 * Creates detailed SNES-era style characters for each agent
 */
import { AgentColors } from '../utils/VGAPalette.js';

export class SimpleSpriteGenerator {
  /**
   * Generate a detailed 16-bit style sprite for an agent
   */
  static generateAgentSprite(agentId, frameWidth = 32, frameHeight = 32) {
    const mainColor = AgentColors[agentId] || '#5555ff';

    // Create canvas - smaller for tighter pixel art
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Clear background (transparent)
    ctx.clearRect(0, 0, frameWidth, frameHeight);

    // Helper function to draw a pixel (2x2 blocks for finer detail)
    const p = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * 2, y * 2, 2, 2);
    };

    // Helper to draw a rectangle of pixels
    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * 2, y * 2, w * 2, h * 2);
    };

    // Agent-specific 16-bit style designs (16x16 grid on 32x32 canvas)
    switch(agentId) {
      case 'tech': // TICKER - Blue analyst with laptop and glasses
        // Hair (brown)
        rect(6, 2, 4, 2, '#8B4513');
        rect(5, 3, 6, 2, '#8B4513');
        // Face (skin tone)
        rect(6, 4, 4, 3, '#fdbf60');
        // Glasses
        rect(5, 5, 2, 1, '#333');
        rect(9, 5, 2, 1, '#333');
        rect(7, 5, 2, 1, mainColor);
        // Eyes
        p(6, 5, '#000'); p(9, 5, '#000');
        // Shirt
        rect(5, 7, 6, 4, mainColor);
        rect(6, 11, 4, 1, '#fff'); // Collar
        // Tie
        rect(7, 8, 2, 3, '#333');
        // Arms holding laptop
        rect(3, 8, 2, 3, mainColor);
        rect(11, 8, 2, 3, mainColor);
        // Laptop
        rect(5, 10, 6, 2, '#444');
        rect(6, 11, 4, 1, '#0ff'); // Screen glow
        // Legs
        rect(5, 12, 2, 4, '#333');
        rect(9, 12, 2, 4, '#333');
        break;

      case 'quant': // LA MAQUINA - Green robot with screen face
        // Antenna
        rect(7, 0, 2, 2, '#666');
        p(7, 2, '#0f0'); // Blinking light
        // Head (metallic)
        rect(5, 2, 6, 5, '#888');
        rect(6, 3, 4, 3, '#666'); // Face screen
        // Eyes on screen
        p(7, 4, mainColor); p(10, 4, mainColor);
        p(7, 5, mainColor); p(10, 5, mainColor);
        // Body
        rect(4, 7, 8, 5, '#555');
        // Chest display
        rect(6, 8, 4, 3, '#222');
        rect(7, 9, 2, 1, mainColor); // Heart/core
        // Arms
        rect(2, 8, 2, 3, '#666');
        rect(12, 8, 2, 3, '#666');
        // Legs (mechanical)
        rect(5, 12, 2, 4, '#444');
        rect(9, 12, 2, 4, '#444');
        // Feet
        rect(4, 15, 4, 1, '#333');
        rect(8, 15, 4, 1, '#333');
        break;

      case 'fund': // ECONOMISTA - Yellow professor with book and mustache
        // Bald head with side hair
        rect(6, 2, 4, 1, '#888');
        rect(5, 3, 1, 3, '#888');
        rect(10, 3, 1, 3, '#888');
        // Face
        rect(6, 3, 4, 4, '#fdbf60');
        // Glasses
        rect(5, 5, 2, 1, '#333');
        rect(9, 5, 2, 1, '#333');
        rect(7, 5, 2, 1, mainColor);
        // Mustache
        rect(6, 6, 4, 1, '#666');
        // Suit
        rect(5, 7, 6, 5, '#444');
        rect(6, 7, 4, 1, mainColor); // Tie
        // Book in left hand
        rect(2, 9, 3, 4, '#8B4513');
        rect(3, 10, 1, 2, '#fff'); // Pages
        // Right arm
        rect(11, 8, 2, 3, '#444');
        // Legs
        rect(5, 12, 2, 4, '#222');
        rect(9, 12, 2, 4, '#222');
        break;

      case 'sent': // PERIODISTA - Magenta reporter with microphone
        // Hair (red curly)
        rect(5, 1, 6, 3, '#aa2222');
        rect(4, 2, 1, 3, '#aa2222');
        rect(11, 2, 1, 3, '#aa2222');
        // Face
        rect(6, 4, 4, 3, '#fdbf60');
        // Smile
        rect(6, 6, 4, 1, '#d00');
        // Eyes with makeup
        p(6, 5, mainColor); p(9, 5, mainColor);
        // Blush
        p(5, 5, '#f99'); p(10, 5, '#f99');
        // Jacket
        rect(5, 7, 6, 5, mainColor);
        // Microphone in right hand
        rect(11, 7, 1, 4, '#666');
        rect(11, 5, 1, 2, '#aaa'); // Mic head
        // Left arm
        rect(3, 8, 2, 3, mainColor);
        // Legs
        rect(5, 12, 2, 4, '#222');
        rect(9, 12, 2, 4, '#222');
        break;

      case 'risk': // JEFE RIESGO - Red armored guardian with shield
        // Helmet
        rect(5, 1, 6, 5, '#666');
        rect(6, 2, 4, 3, '#888');
        // Visor
        rect(5, 3, 6, 2, mainColor);
        p(7, 3, '#fff'); p(8, 3, '#fff'); // Eyes
        // Armor body
        rect(4, 6, 8, 6, '#555');
        // Chest emblem (shield)
        rect(6, 8, 4, 3, mainColor);
        rect(7, 9, 2, 1, '#fff'); // Cross/shield symbol
        // Pauldrons (shoulder armor)
        rect(2, 6, 2, 3, '#666');
        rect(12, 6, 2, 3, '#666');
        // Shield on left arm
        rect(1, 9, 3, 5, '#444');
        rect(2, 10, 1, 3, mainColor); // Emblem
        // Sword/weapon on right
        rect(13, 8, 2, 6, '#888');
        rect(13, 6, 2, 2, '#666'); // Hilt
        // Legs (armored)
        rect(5, 12, 2, 4, '#444');
        rect(9, 12, 2, 4, '#444');
        break;

      case 'director': // EL DIRECTOR - Wizard with glasses and lucky hat
        // Lucky hat (top hat with star)
        rect(5, 0, 6, 1, '#aa00aa');       // Hat brim
        rect(6, 0, 4, 1, '#ffcc00');       // Gold band
        rect(6, 1, 4, 3, '#aa00aa');       // Hat crown
        rect(7, 2, 2, 1, '#ffcc00');       // Lucky star
        // Hood under hat
        rect(5, 4, 6, 1, '#660066');
        // Face (AI glow)
        rect(6, 5, 4, 3, '#fdbf60');
        // GLASSES (round frames)
        rect(5, 5, 2, 2, '#ffcc00');       // Left lens frame
        rect(9, 5, 2, 2, '#ffcc00');       // Right lens frame
        rect(7, 6, 2, 1, '#ffcc00');       // Bridge
        // Eyes behind glasses (glowing magenta)
        p(6, 5, mainColor); p(6, 6, mainColor);
        p(9, 5, mainColor); p(9, 6, mainColor);
        // Wisdom beard
        rect(7, 8, 2, 1, '#ccc');
        // Robe body
        rect(4, 9, 8, 5, '#660066');
        // Robe trim
        rect(5, 9, 6, 1, mainColor);
        // Star on chest
        rect(6, 10, 4, 3, '#440044');
        rect(7, 11, 2, 1, '#ffcc00'); // Lucky star
        // Arms with spell energy
        rect(2, 10, 2, 3, '#660066');
        rect(12, 10, 2, 3, '#660066');
        p(2, 9, mainColor); p(12, 9, mainColor);
        // Legs (robe flowing)
        rect(5, 14, 2, 2, '#550055');
        rect(9, 14, 2, 2, '#550055');
        break;

      default:
        // Fallback - colored square
        rect(4, 4, 8, 8, mainColor);
        rect(6, 6, 4, 4, '#fff');
    }

    // Add white border for visibility
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, frameWidth, frameHeight);

    console.log(`[SimpleSpriteGenerator] Generated 32x32 sprite for "${agentId}"`);
    return canvas;
  }
  
  /**
   * Generate all agent sprites
   */
  static generateAllAgentSprites() {
    const sprites = {};
    const agentIds = ['tech', 'quant', 'fund', 'sent', 'risk', 'director'];
    
    agentIds.forEach(id => {
      sprites[id] = this.generateAgentSprite(id);
    });
    
    return sprites;
  }
}
