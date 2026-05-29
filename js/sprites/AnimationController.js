/**
 * AnimationController - Controls frame-by-frame animation playback
 */
export class AnimationController {
  constructor(spriteSystem) {
    this.spriteSystem = spriteSystem;
    this.currentAnimation = null;
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isPlaying = false;
    this.loop = true;
    this.onComplete = null;
  }
  
  /**
   * Play an animation
   */
  play(animationName, loop = true, onComplete = null) {
    // Animation config should be set externally
    // For now, we'll use a simple frame-based approach
    this.currentAnimation = animationName;
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isPlaying = true;
    this.loop = loop;
    this.onComplete = onComplete;
  }
  
  /**
   * Stop animation
   */
  stop() {
    this.isPlaying = false;
    this.currentFrame = 0;
    this.elapsedTime = 0;
  }
  
  /**
   * Update animation based on deltaTime
   */
  update(deltaTime) {
    if (!this.isPlaying || !this.currentAnimation) return;
    
    this.elapsedTime += deltaTime;
    
    // Get animation config (this will be set by Agent)
    const animConfig = this.getAnimationConfig(this.currentAnimation);
    if (!animConfig) return;
    
    const { frames, fps } = animConfig;
    const frameDuration = 1 / fps;
    
    // Calculate current frame
    const totalFrames = frames.length;
    const frameIndex = Math.floor(this.elapsedTime / frameDuration);
    
    if (this.loop) {
      this.currentFrame = frameIndex % totalFrames;
    } else {
      this.currentFrame = Math.min(frameIndex, totalFrames - 1);
      
      // Check if animation completed
      if (frameIndex >= totalFrames) {
        this.isPlaying = false;
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }
  }
  
  /**
   * Get current frame index
   */
  getCurrentFrame() {
    return this.currentFrame;
  }

  /**
   * Stop animation and clear resources
   */
  destroy() {
    this.stop();
    this.animations = null;
    this.onComplete = null;
  }

  /**
   * Get animation configuration (will be overridden by Agent)
   */
  getAnimationConfig(animationName) {
    return this.animations?.[animationName] || { frames: [0], fps: 1 };
  }

  /**
   * Set animation configurations
   */
  setAnimations(animations) {
    this.animations = animations;
  }
}
