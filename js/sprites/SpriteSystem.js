/**
 * SpriteSystem - Manages sprite sheet loading and frame extraction
 */
export class SpriteSystem {
  constructor() {
    this.spriteSheets = new Map();
    this.spriteCache = new Map();
  }
  
  /**
   * Load a sprite sheet image
   */
  async loadSpriteSheet(name, imagePath, frameConfig) {
    try {
      const img = new Image();
      img.src = imagePath;
      await img.decode();
      
      this.spriteSheets.set(name, {
        image: img,
        config: frameConfig
      });
      
      console.log(`[SpriteSystem] Loaded sprite sheet "${name}" from ${imagePath}`);
      return true;
    } catch (error) {
      console.warn(`[SpriteSystem] FAILED to load sprite sheet "${name}" from ${imagePath}: ${error.message}`);
      console.warn(`[SpriteSystem] → Using CSS box-shadow fallback for "${name}"`);
      // Fallback to CSS box-shadow sprites
      this.generateCSSFallback(name, frameConfig);
      return false;
    }
  }
  
  /**
   * Get a specific frame from a sprite sheet
   */
  getSprite(name, frame) {
    const sheet = this.spriteSheets.get(name);
    if (!sheet) {
      console.warn(`[SpriteSystem] Sprite sheet "${name}" not found — no fallback available`);
      return null;
    }

    const { image, config } = sheet;
    const { frameWidth, frameHeight } = config;

    // For single-frame sprites (generated sprites), always use frame 0
    const isSingleFrame = image.width === frameWidth && image.height === frameHeight;
    const actualFrame = isSingleFrame ? 0 : frame;

    const cacheKey = `${name}_${actualFrame}`;

    // Check cache first
    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey);
    }

    // Calculate frame position in sprite sheet
    const framesPerRow = Math.floor(image.width / frameWidth);
    const frameX = (actualFrame % framesPerRow) * frameWidth;
    const frameY = Math.floor(actualFrame / framesPerRow) * frameHeight;
    
    // Create offscreen canvas for this frame
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // Draw frame to canvas
    ctx.drawImage(
      image,
      frameX, frameY, frameWidth, frameHeight,
      0, 0, frameWidth, frameHeight
    );
    
    // Cache the frame
    this.spriteCache.set(cacheKey, canvas);
    
    return canvas;
  }
  
  /**
   * Generate CSS box-shadow sprite as fallback when PNG fails to load
   */
  generateCSSFallback(name, frameConfig) {
    const { frameWidth, frameHeight } = frameConfig;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw a simple colored square with border (placeholder fallback)
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#5555ff';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, 28, 28);
    
    this.spriteSheets.set(name, {
      image: canvas,
      config: frameConfig,
      isFallback: true
    });
    
    console.log(`[SpriteSystem] Generated CSS fallback sprite for "${name}" (32x32 placeholder)`);
  }
  
  /**
   * Create animation configuration
   */
  createAnimation(name, frames, fps, loop = true) {
    return {
      name,
      frames,
      fps,
      loop,
      duration: frames.length / fps
    };
  }

  /**
   * Destroy sprite system and release cached resources
   */
  destroy() {
    this.spriteSheets.clear();
    this.spriteCache.clear();
    console.log('[SpriteSystem] Destroyed');
  }
}
