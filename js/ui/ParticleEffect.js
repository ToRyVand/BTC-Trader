/**
 * ParticleEffect - Particle system for visual effects
 * Supports sparkles (celebration) and explosions (panic)
 */

export class Particle {
  constructor(x, y, type = 'sparkle') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.lifetime = 0;
    this.maxLifetime = type === 'sparkle' ? 1000 : 800; // ms
    this.isActive = false;
    
    // Physics
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.2;
    
    // Rendering
    this.size = 3;
    this.color = '#fff';
    this.opacity = 1.0;
  }
  
  /**
   * Initialize particle with random velocity
   */
  spawn(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.lifetime = 0;
    this.maxLifetime = type === 'sparkle' ? 1000 : 800;
    this.isActive = true;
    this.opacity = 1.0;
    
    // Random velocity based on type
    if (type === 'sparkle') {
      // Sparkles float upward
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = -Math.random() * 3 - 1;
      this.size = Math.random() * 3 + 2;
      this.color = Math.random() > 0.5 ? '#4ade80' : '#fbbf24'; // green or yellow
    } else if (type === 'explosion') {
      // Explosions burst outward
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.size = Math.random() * 4 + 3;
      this.color = Math.random() > 0.5 ? '#f87171' : '#fb923c'; // red or orange
    }
  }
  
  /**
   * Update particle physics
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    if (!this.isActive) return;
    
    this.lifetime += deltaTime;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Apply gravity for explosions
    if (this.type === 'explosion') {
      this.vy += this.gravity;
    }
    
    // Fade out based on lifetime
    const lifeRatio = this.lifetime / this.maxLifetime;
    this.opacity = 1.0 - lifeRatio;
    
    // Deactivate when expired
    if (this.lifetime >= this.maxLifetime) {
      this.isActive = false;
    }
  }
  
  /**
   * Render particle
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.isActive) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    
    // Draw particle as a small square (pixel-perfect)
    ctx.fillRect(
      Math.floor(this.x),
      Math.floor(this.y),
      this.size,
      this.size
    );
    
    ctx.restore();
  }
}

export class ParticlePool {
  constructor(maxParticles = 100) {
    this.maxParticles = maxParticles;
    this.particles = [];
    
    // Pre-allocate particles
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(new Particle(0, 0));
    }
    
    console.log(`[ParticlePool] Created pool with ${maxParticles} particles`);
  }
  
  /**
   * Spawn a particle effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} type - Particle type ('sparkle' or 'explosion')
   * @param {number} count - Number of particles to spawn
   */
  spawn(x, y, type, count = 10) {
    let spawned = 0;
    
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const particle = this.particles[i];
      
      if (!particle.isActive) {
        particle.spawn(x, y, type);
        spawned++;
      }
    }
    
    console.log(`[ParticlePool] Spawned ${spawned} ${type} particles at (${x}, ${y})`);
  }
  
  /**
   * Update all active particles
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    this.particles.forEach(particle => {
      if (particle.isActive) {
        particle.update(deltaTime);
      }
    });
  }
  
  /**
   * Render all active particles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    this.particles.forEach(particle => {
      if (particle.isActive) {
        particle.render(ctx);
      }
    });
  }
  
  /**
   * Get count of active particles
   * @returns {number}
   */
  getActiveCount() {
    return this.particles.filter(p => p.isActive).length;
  }
  
  /**
   * Clear all particles
   */
  clear() {
    this.particles.forEach(particle => {
      particle.isActive = false;
    });
  }
}
