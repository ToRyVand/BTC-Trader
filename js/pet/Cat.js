/**
 * Cat (SHADO) — Black cat mascot that roams the trading floor
 * Walks randomly, naps, plays with toys. Good luck companion.
 */
export class Cat {
  constructor(config) {
    this.name = 'SHADO';
    this.tile = { x: 8, y: 9 };
    this.pixelPos = { x: 0, y: 0 };
    this.tileSize = config.tileSize || 64;
    this.direction = 0; // 0=right, 1=down, 2=left, 3=up

    // States: idle, walking, sitting, sleeping, playing
    this.state = 'idle';
    this.stateTimer = 0;
    this.nextStateDelay = 0;

    // Movement
    this.targetTile = null;
    this.moveSpeed = 0.4; // tiles per second (slow cat walk)
    this.moveProgress = 0;
    this.startTile = { x: 8, y: 9 };

    // Wandering
    this.idleDuration = 3 + Math.random() * 5; // 3-8s idle
    this.walkInterval = 200 + Math.random() * 400; // random wander distance

    // Tail animation
    this.tailPhase = Math.random() * Math.PI * 2;
    this.tailSpeed = 1.5;

    // Purr particles
    this.puffTimer = 0;
    this.zzzPhase = 0;
  }

  /**
   * Set position on grid
   */
  setTile(gx, gy, toIsoFn) {
    this.tile.x = gx;
    this.tile.y = gy;
    this.startTile.x = gx;
    this.startTile.y = gy;
    if (toIsoFn) {
      const pos = toIsoFn(gx, gy);
      this.pixelPos = { x: pos.x, y: pos.y };
    }
  }

  /**
   * Convert tile coords to pixel position (isometric)
   */
  updatePixelPos(toIsoFn) {
    if (toIsoFn) {
      const pos = toIsoFn(this.tile.x, this.tile.y);
      this.pixelPos.x = pos.x;
      this.pixelPos.y = pos.y;
    }
  }

  /**
   * Pick a random walkable tile and start moving there
   */
  pickNewDestination(gridW, gridH) {
    // Stay within a reasonable area of the office
    const minX = 2, maxX = gridW - 2;
    const minY = 2, maxY = gridH - 2;

    let tries = 0;
    let tx, ty;
    do {
      tx = minX + Math.floor(Math.random() * (maxX - minX));
      ty = minY + Math.floor(Math.random() * (maxY - minY));
      tries++;
    } while (tries < 20 && Math.abs(tx - this.tile.x) + Math.abs(ty - this.tile.y) < 3);

    this.targetTile = { x: tx, y: ty };
    this.startTile = { x: this.tile.x, y: this.tile.y };
    this.moveProgress = 0;
    this.state = 'walking';

    // Determine walking direction
    const dx = tx - this.startTile.x;
    const dy = ty - this.startTile.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? 0 : 2;
    } else {
      this.direction = dy > 0 ? 1 : 3;
    }
  }

  /**
   * Update cat state machine
   */
  update(deltaTime, gridW, gridH, toIsoFn) {
    this.tailPhase += this.tailSpeed * deltaTime;

    if (this.state === 'sleeping') {
      this.zzzPhase += deltaTime * 2;
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.stateTimer = 1;
      }
      this.updatePixelPos(toIsoFn);
      return;
    }

    if (this.state === 'sitting') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        // Sometimes go back to sleep, sometimes walk
        if (Math.random() < 0.3) {
          this.state = 'sleeping';
          this.stateTimer = 5 + Math.random() * 8;
        } else {
          this.pickNewDestination(gridW, gridH);
        }
      }
      this.updatePixelPos(toIsoFn);
      return;
    }

    if (this.state === 'playing') {
      this.stateTimer -= deltaTime;
      this.tailSpeed = 4; // excited tail
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.stateTimer = 2;
        this.tailSpeed = 1.5;
      }
      this.updatePixelPos(toIsoFn);
      return;
    }

    if (this.state === 'idle') {
      this.stateTimer -= deltaTime;
      this.tailSpeed = 1.5;
      if (this.stateTimer <= 0) {
        const r = Math.random();
        if (r < 0.25) {
          // Sit down
          this.state = 'sitting';
          this.stateTimer = 4 + Math.random() * 6;
        } else if (r < 0.4) {
          // Sleep
          this.state = 'sleeping';
          this.stateTimer = 5 + Math.random() * 10;
        } else if (r < 0.5) {
          // Play (chase imaginary mouse)
          this.state = 'playing';
          this.stateTimer = 3 + Math.random() * 4;
        } else {
          // Walk somewhere
          this.pickNewDestination(gridW, gridH);
        }
      }
      this.updatePixelPos(toIsoFn);
      return;
    }

    // Walking
    if (this.state === 'walking' && this.targetTile) {
      const dx = this.targetTile.x - this.startTile.x;
      const dy = this.targetTile.y - this.startTile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.moveProgress += (this.moveSpeed * deltaTime) / dist;

      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.tile.x = this.targetTile.x;
        this.tile.y = this.targetTile.y;
        this.startTile.x = this.tile.x;
        this.startTile.y = this.tile.y;
        this.state = 'idle';
        this.stateTimer = this.idleDuration;
        this.targetTile = null;

        // Random chance to play when arriving somewhere
        if (Math.random() < 0.15) {
          this.state = 'playing';
          this.stateTimer = 2 + Math.random() * 3;
        }
      } else {
        this.tile.x = this.startTile.x + dx * this.moveProgress;
        this.tile.y = this.startTile.y + dy * this.moveProgress;
      }

      this.updatePixelPos(toIsoFn);
    }
  }

  /**
   * Render SHADO the black cat
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} time - elapsed time for animations
   */
  render(ctx, time = 0) {
    const px = Math.round(this.pixelPos.x);
    const py = Math.round(this.pixelPos.y);
    const bob = Math.sin(time * 3 + this.tailPhase) * 1.5;
    const isCatMoving = this.state === 'walking';
    const walkBob = isCatMoving ? Math.sin(time * 6) * 2 : 0;
    const bodyY = py + bob + walkBob;

    // Shadow (very faint for cat)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(px, py + 5, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden glow ring around the cat (visibility + mystic effect)
    const glowPulse = 0.15 + Math.sin(time * 2) * 0.08;
    ctx.strokeStyle = `rgba(255,204,0,${glowPulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 8, 14, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Second glow layer (larger, softer)
    ctx.strokeStyle = `rgba(255,204,0,${glowPulse * 0.4})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 8, 16, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Lucky star particles above cat
    this._renderLuckyStars(ctx, px, bodyY - 26, time);

    if (this.state === 'sleeping') {
      this._renderSleeping(ctx, px, bodyY, time);
      this._renderZzz(ctx, px, bodyY, time);
    } else if (this.state === 'sitting') {
      this._renderSitting(ctx, px, bodyY, time);
    } else if (this.state === 'playing') {
      this._renderPlaying(ctx, px, bodyY, time);
    } else {
      this._renderStanding(ctx, px, bodyY, time);
    }

    // Name tag — always visible
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    const tw = 40;
    ctx.fillRect(px - tw / 2, bodyY - 36, tw, 9);
    ctx.strokeStyle = this.state === 'sleeping' ? '#555' : '#ffcc00';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px - tw / 2, bodyY - 36, tw, 9);
    ctx.fillStyle = this.state === 'sleeping' ? '#888' : '#ffcc00';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHADO', px, bodyY - 29);
    ctx.font = '7px monospace';
    ctx.fillText('🐈‍⬛', px + 16, bodyY - 29);
  }

  _renderLuckyStars(ctx, px, bodyY, time) {
    // 2-3 floating sparkles around the cat (luck aura)
    for (let i = 0; i < 3; i++) {
      const phase = time * 0.8 + i * 2.1;
      const sx = px + Math.sin(phase) * 12;
      const sy = bodyY + Math.cos(phase * 1.3) * 4 - i * 2;
      const alpha = (Math.sin(phase * 2) + 1) * 0.25;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffcc00';
      // Tiny 4-point star
      const s = 1.5;
      ctx.fillRect(sx - s, sy, s * 2, 0.5);
      ctx.fillRect(sx, sy - s, 0.5, s * 2);
    }
    ctx.globalAlpha = 1;
  }

  _renderStanding(ctx, px, bodyY, time) {
    // Body outline (golden rim for visibility)
    ctx.strokeStyle = 'rgba(255,204,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 8, 10, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Body (lighter charcoal-grey — clearly visible on any floor)
    ctx.fillStyle = '#4a4a5a';
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 8, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fur highlights (top edge catches light)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(px - 2, bodyY - 13, 6, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head (matching lighter body)
    ctx.fillStyle = '#4a4a5a';
    const hx = px + (this.direction === 0 ? 8 : this.direction === 2 ? -8 : 0);
    ctx.beginPath();
    ctx.ellipse(hx, bodyY - 16, 5.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head outline (golden rim)
    ctx.strokeStyle = 'rgba(255,204,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(hx, bodyY - 16, 5.5, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Ears (matching body, slightly darker)
    ctx.fillStyle = '#3e3e4e';
    ctx.beginPath();
    ctx.moveTo(hx - 4, bodyY - 19);
    ctx.lineTo(hx - 7, bodyY - 25);
    ctx.lineTo(hx - 1, bodyY - 19);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + 1, bodyY - 19);
    ctx.lineTo(hx + 4, bodyY - 25);
    ctx.lineTo(hx + 7, bodyY - 19);
    ctx.fill();

    // Inner ears (pink, more visible)
    ctx.fillStyle = '#664444';
    ctx.beginPath();
    ctx.moveTo(hx - 3, bodyY - 19);
    ctx.lineTo(hx - 5, bodyY - 23);
    ctx.lineTo(hx - 2, bodyY - 19);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + 2, bodyY - 19);
    ctx.lineTo(hx + 4, bodyY - 23);
    ctx.lineTo(hx + 5, bodyY - 19);
    ctx.fill();

    // Eyes (larger, glowing green — mystical cat)
    const eyeX1 = hx + (this.direction === 0 ? 1 : this.direction === 2 ? -3 : -3);
    const eyeX2 = hx + (this.direction === 0 ? 3 : this.direction === 2 ? -1 : 1);
    const blink = Math.sin(time * 3) > 0.95;
    if (!blink) {
      // Eye glow (bigger aura)
      ctx.fillStyle = 'rgba(51,255,51,0.25)';
      ctx.beginPath();
      ctx.arc(eyeX1 + 1, bodyY - 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX2 + 1, bodyY - 16, 4, 0, Math.PI * 2);
      ctx.fill();

      // Iris
      ctx.fillStyle = '#33ff33';
      ctx.beginPath();
      ctx.arc(eyeX1 + 1, bodyY - 16, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX2 + 1, bodyY - 16, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (vertical slit)
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(eyeX1 + 1, bodyY - 16, 0.8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeX2 + 1, bodyY - 16, 0.8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs (matching body)
    ctx.fillStyle = '#4a4a5a';
    const legWalk = this.state === 'walking' ? Math.sin(time * 8) * 2 : 0;
    // Front legs
    ctx.fillRect(px - 6, bodyY - 3, 3, 5);
    ctx.fillRect(px + 3, bodyY - 3, 3, 5);
    // Back legs
    ctx.fillRect(px - 2 + legWalk, bodyY - 3, 2, 4);
    ctx.fillRect(px + 1 - legWalk, bodyY - 3, 2, 4);

    // Paws (slightly lighter)
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(px - 6, bodyY + 1, 3, 1);
    ctx.fillRect(px + 3, bodyY + 1, 3, 1);
    ctx.fillRect(px - 2 + legWalk, bodyY + 1, 2, 1);
    ctx.fillRect(px + 1 - legWalk, bodyY + 1, 2, 1);

    // Tail (wavy, more visible)
    this._renderTail(ctx, px, bodyY - 6, time, 1);
  }

  _renderSitting(ctx, px, bodyY, time) {
    // Sitting body outline
    ctx.strokeStyle = 'rgba(255,204,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 6, 10, 11, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sitting body (rounder, more compact)
    ctx.fillStyle = '#4a4a5a';
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 6, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 18, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#3e3e4e';
    ctx.beginPath();
    ctx.moveTo(px - 4, bodyY - 21);
    ctx.lineTo(px - 6, bodyY - 26);
    ctx.lineTo(px - 1, bodyY - 21);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 1, bodyY - 21);
    ctx.lineTo(px + 3, bodyY - 26);
    ctx.lineTo(px + 6, bodyY - 21);
    ctx.fill();

    // Eyes (half closed, sleepy)
    ctx.fillStyle = '#33ff33';
    ctx.fillRect(px - 3, bodyY - 19, 2, 2);
    ctx.fillRect(px + 1, bodyY - 19, 2, 2);

    // Paws in front (slightly lighter)
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(px - 4, bodyY - 1, 3, 2);
    ctx.fillRect(px + 1, bodyY - 1, 3, 2);

    // Tail curled around
    this._renderTail(ctx, px, bodyY - 3, time, 0.7);
  }

  _renderSleeping(ctx, px, bodyY, time) {
    // Sleeping outline
    ctx.strokeStyle = 'rgba(255,204,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 5, 11, 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Curled up ball
    ctx.fillStyle = '#4a4a5a';
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 5, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head tucked in
    ctx.beginPath();
    ctx.ellipse(px + 6, bodyY - 8, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Closed eye
    ctx.strokeStyle = '#33ff33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + 7, bodyY - 9, 2, 0, Math.PI);
    ctx.stroke();

    // Tail wrapped around body
    ctx.strokeStyle = '#3e3e4e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, bodyY - 4, 11, -0.5, 1.5);
    ctx.stroke();

    // Breathing animation (subtle scale)
    const breathe = Math.sin(time * 1.5) * 0.5;
    ctx.fillStyle = 'rgba(51,255,51,0.05)';
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 5, 9 + breathe, 8 + breathe, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderPlaying(ctx, px, bodyY, time) {
    // Playing outline
    ctx.strokeStyle = 'rgba(255,204,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 10, 11, 9, Math.sin(time * 4) * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Playful arched back
    ctx.fillStyle = '#4a4a5a';
    ctx.beginPath();
    ctx.ellipse(px, bodyY - 10, 8, 6, Math.sin(time * 4) * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Head bouncy
    const headBob = Math.sin(time * 6) * 2;
    ctx.beginPath();
    ctx.ellipse(px + 8, bodyY - 18 + headBob, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears perked up
    ctx.fillStyle = '#3e3e4e';
    ctx.beginPath();
    ctx.moveTo(px + 4, bodyY - 22 + headBob);
    ctx.lineTo(px + 2, bodyY - 27 + headBob);
    ctx.lineTo(px + 7, bodyY - 21 + headBob);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 7, bodyY - 22 + headBob);
    ctx.lineTo(px + 9, bodyY - 27 + headBob);
    ctx.lineTo(px + 12, bodyY - 21 + headBob);
    ctx.fill();

    // Wide excited eyes
    ctx.fillStyle = '#33ff33';
    ctx.fillRect(px + 7, bodyY - 19 + headBob, 2, 3);
    ctx.fillRect(px + 11, bodyY - 19 + headBob, 2, 3);
    // Pupils dilated
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 7, bodyY - 19 + headBob, 2, 3);

    // Legs splayed (matching body)
    ctx.fillStyle = '#4a4a5a';
    const leg1 = Math.sin(time * 8) * 3;
    ctx.fillRect(px - 4 + leg1, bodyY - 3, 3, 5);
    ctx.fillRect(px + 3 - leg1, bodyY - 3, 3, 5);

    // Puffed tail
    this._renderTail(ctx, px, bodyY - 10, time, 2);
  }

  _renderTail(ctx, startX, startY, time, amplitude) {
    const segments = 6;
    const length = 14;
    const tailAngle = this.tailPhase * amplitude;

    // Tail outline (golden)
    ctx.strokeStyle = `rgba(255,204,0,0.3)`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX + (this.direction === 2 ? 8 : -8), startY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const cx = startX + (this.direction === 2 ? 8 : -8) + Math.sin(tailAngle + t * 2) * 6 * amplitude;
      const cy = startY - t * length;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Tail body (matching cat)
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX + (this.direction === 2 ? 8 : -8), startY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const cx = startX + (this.direction === 2 ? 8 : -8) + Math.sin(tailAngle + t * 2) * 6 * amplitude;
      const cy = startY - t * length;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  _renderZzz(ctx, px, bodyY, time) {
    const zOffset = (this.zzzPhase * 3) % 12;
    const zAlpha = Math.max(0, 1 - zOffset / 12);

    ctx.globalAlpha = zAlpha;
    ctx.fillStyle = '#88aaff';
    ctx.font = `${6 + zOffset}px monospace`;
    ctx.textAlign = 'left';

    // Z letters floating up
    for (let i = 0; i < 3; i++) {
      const z = ((this.zzzPhase + i * 0.5) % 1.5) / 1.5;
      const zx = px + 8 + z * 8;
      const zy = bodyY - 22 - z * 16;
      const za = Math.max(0, 1 - z);
      ctx.globalAlpha = za * 0.7;
      ctx.fillText('Z', zx, zy);
    }

    ctx.globalAlpha = 1;
  }
}
