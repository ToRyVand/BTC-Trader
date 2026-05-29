/**
 * SceneRenderer - Isometric Trading Office like Game Dev Tycoon
 */
export class SceneRenderer {
  constructor(config) {
    this.config = config;
    const gw = config.gridWidth;   // 16
    const gh = config.gridHeight;  // 12
    const CW = 960, CH = 720, PAD = 4;

    // Max tileSize so walls fit edge-to-edge: (gw+gh)*ts/2 = CW - 2*PAD
    this.ts   = Math.floor((CW - 2 * PAD) * 2 / (gw + gh)); // 68
    this.isoW = this.ts;
    this.isoH = this.ts / 2;

    // Taller walls (2×ts) so they fill more vertical space and look proportional
    this.wallH = this.ts * 2.0;   // 136px ≈ 2.6× character height

    // Place left wall at x=PAD, right wall at x=CW-PAD
    // Left edge = offsetX - gh*isoW/2 = PAD  →  offsetX = PAD + gh*isoW/2
    this.offsetX = PAD + gh * this.isoW / 2;  // 412

    // Place top of walls at y=PAD
    // Top of scene = offsetY - wallH = PAD  →  offsetY = PAD + wallH
    this.offsetY = PAD + this.wallH;           // 140

    // Pre-compute static data — never changes at runtime
    this._furnitureList = this._buildFurnitureList();
    this._desks = this._furnitureList.filter(f => f.type === 'desk');

    // Offscreen caches — built once, blitted every frame
    this._floorCache = null;   // 192 tiles rendered once
    this._wallCache  = null;   // static walls (no animated BTC screen)
    this._vignetteGrad = null; // radial gradient object
  }

  // Convert grid coords to isometric screen coords
  toIso(x, y) {
    const isoX = (x - y) * this.isoW / 2;
    const isoY = (x + y) * this.isoH / 2;
    return { x: isoX + this.offsetX, y: isoY + this.offsetY };
  }

  renderFloor(ctx) {
    this.renderFloorTiles(ctx);
    this.renderWalls(ctx);
    this.renderAllFurniture(ctx);
  }

  // Render floor tiles — draws cached offscreen canvas, builds it on first call
  renderFloorTiles(ctx) {
    if (!this._floorCache) {
      const off = document.createElement('canvas');
      off.width  = 960;
      off.height = 720;
      const offCtx = off.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      const gw = this.config.gridWidth;
      const gh = this.config.gridHeight;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          this.renderIsoTile(offCtx, x, y);
        }
      }
      this._floorCache = off;
    }
    ctx.drawImage(this._floorCache, 0, 0);
  }

  // Returns the pre-computed furniture list (no allocation per frame)
  getFurnitureList() {
    return this._furnitureList;
  }

  _buildFurnitureList() {
    return [
      // Desks — 5 agentes
      { type: 'desk', x: 2, y: 2, color: '#4a9eff', name: 'TECH' },
      { type: 'desk', x: 6, y: 2, color: '#4ade80', name: 'QUANT' },
      { type: 'desk', x: 10, y: 2, color: '#fbbf24', name: 'FUND' },
      { type: 'desk', x: 2, y: 6, color: '#a855f7', name: 'SENT' },
      { type: 'desk', x: 6, y: 6, color: '#f87171', name: 'RISK' },
      // Mesa de reuniones (centro)
      { type: 'table', x: 8, y: 5 },
      // Bookshelves (lateral derecho)
      { type: 'bookshelf', x: 13, y: 4 },
      { type: 'bookshelf', x: 13, y: 7 },
      // Lounge: bean bags (esquina inferior derecha)
      { type: 'beanbag', x: 12, y: 10, color: '#4a9eff' },
      { type: 'beanbag', x: 11, y: 11, color: '#ff44bb' },
      { type: 'beanbag', x: 13, y: 10, color: '#55ff55' },
      // Mesa de lounge
      { type: 'table', x: 12, y: 9 },
      // Plantas
      { type: 'plant', x: 1,  y: 10 },
      { type: 'plant', x: 0,  y: 6  },
      { type: 'plant', x: 14, y: 10 },
      { type: 'plant', x: 14, y: 1  },
      { type: 'plant', x: 8,  y: 11 },
      // Watercooler
      { type: 'watercooler', x: 14, y: 5 },
      // SHADO's toys
      { type: 'yarn', x: 4, y: 9, color: '#ff4466' },
      { type: 'yarn', x: 10, y: 8, color: '#44aaff' },
      { type: 'mouse-toy', x: 7, y: 10 },
      { type: 'cat-bed', x: 13, y: 8 },
    ];
  }

  // Render a single furniture item (for z-sorted rendering)
  renderFurnitureItem(ctx, item, time = 0) {
    switch(item.type) {
      case 'desk':
        this.renderIsoDesk(ctx, item.x, item.y, item, time);
        break;
      case 'table':
        this.renderIsoTable(ctx, item.x, item.y);
        break;
      case 'plant':
        this.renderIsoPlant(ctx, item.x, item.y);
        break;
      case 'watercooler':
        this.renderIsoWaterCooler(ctx, item.x, item.y);
        break;
      case 'screen':
        this.renderIsoScreen(ctx, item.x, item.y, time);
        break;
      case 'bookshelf':
        this.renderIsoBookshelf(ctx, item.x, item.y);
        break;
      case 'cabinet':
        this.renderIsoCabinet(ctx, item.x, item.y);
        break;
      case 'chair':
        this.renderIsoChair(ctx, item.x, item.y);
        break;
      case 'poster':
        this.renderIsoPoster(ctx, item.x, item.y);
        break;
      case 'beanbag':
        this.renderIsoBeanbag(ctx, item.x, item.y, item);
        break;
      case 'yarn':
        this.renderIsoYarn(ctx, item.x, item.y, item, time);
        break;
      case 'mouse-toy':
        this.renderIsoMouseToy(ctx, item.x, item.y, time);
        break;
      case 'cat-bed':
        this.renderIsoCatBed(ctx, item.x, item.y, time);
        break;
    }
  }

  renderIsoTile(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);
    const hw = this.isoW / 2;
    const hh = this.isoH / 2;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - hh);
    ctx.lineTo(pos.x + hw, pos.y);
    ctx.lineTo(pos.x, pos.y + hh);
    ctx.lineTo(pos.x - hw, pos.y);
    ctx.closePath();

    // Wood floor pattern (like Game Dev Tycoon)
    const woodBase = (gx + gy) % 3 === 0 ? '#8B6F47' : (gx + gy) % 2 === 0 ? '#9B7F57' : '#AB8F67';
    ctx.fillStyle = woodBase;
    ctx.fill();

    // Wood grain lines
    ctx.strokeStyle = 'rgba(101,67,33,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x - hw + 5, pos.y - 2);
    ctx.lineTo(pos.x + hw - 5, pos.y - 2);
    ctx.stroke();

    // Tile border (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - hh);
    ctx.lineTo(pos.x + hw, pos.y);
    ctx.lineTo(pos.x, pos.y + hh);
    ctx.lineTo(pos.x - hw, pos.y);
    ctx.closePath();
    ctx.stroke();
  }

  // Render walls — static geometry from cache + animated BTC screen on top
  renderWalls(ctx, time = 0) {
    if (!this._wallCache) {
      const off = document.createElement('canvas');
      off.width  = 960;
      off.height = 720;
      const offCtx = off.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      this._renderStaticWalls(offCtx);
      this._wallCache = off;
    }
    ctx.drawImage(this._wallCache, 0, 0);
    this.renderLeftWallScreen(ctx, time);
  }

  _renderStaticWalls(ctx) {
    const ts = this.ts;
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;

    // Back wall (top edge) - Color azul como en Game Dev Tycoon
    const backLeft = this.toIso(0, 0);
    const backRight = this.toIso(gw - 1, 0);

    // Draw back wall with height
    ctx.beginPath();
    ctx.moveTo(backLeft.x, backLeft.y - this.wallH);
    ctx.lineTo(backRight.x + this.isoW/2, backRight.y - this.wallH - this.isoH/2);
    ctx.lineTo(backRight.x + this.isoW/2, backRight.y);
    ctx.lineTo(backLeft.x, backLeft.y);
    ctx.closePath();
    
    // Gradient azul para pared trasera
    const gradBack = ctx.createLinearGradient(backLeft.x, backLeft.y - this.wallH, backLeft.x, backLeft.y);
    gradBack.addColorStop(0, '#5B9BD5');
    gradBack.addColorStop(1, '#4A8BC2');
    ctx.fillStyle = gradBack;
    ctx.fill();
    
    ctx.strokeStyle = '#3A7BA2';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- WINDOWS on back wall ---
    const leftX  = backLeft.x;
    const rightX = backRight.x + this.isoW / 2;
    const topY0  = backLeft.y - this.wallH;
    const topY1  = backRight.y - this.wallH - this.isoH / 2;
    const botY0  = backLeft.y;
    const botY1  = backRight.y;

    [0.20, 0.46, 0.72].forEach(f => {
      const wx = leftX + f * (rightX - leftX);
      const wallTopY = topY0 + f * (topY1 - topY0);
      const wallBotY = botY0 + f * (botY1 - botY0);
      const wallH_f  = wallBotY - wallTopY;
      const wy = wallTopY + wallH_f * 0.45;
      // Scale window with wall height so it stays proportional
      const ww = Math.round(wallH_f * 0.55);
      const wh = Math.round(wallH_f * 0.42);

      // Outer frame
      ctx.fillStyle = '#1e4a6a';
      ctx.fillRect(wx - ww / 2 - 2, wy - wh / 2 - 2, ww + 4, wh + 4);

      // Sky gradient
      const sg = ctx.createLinearGradient(wx, wy - wh / 2, wx, wy + wh / 2);
      sg.addColorStop(0, '#c8eeff');
      sg.addColorStop(1, '#5aaae0');
      ctx.fillStyle = sg;
      ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);

      // Mullions
      ctx.strokeStyle = '#3a78aa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx, wy - wh / 2); ctx.lineTo(wx, wy + wh / 2);
      ctx.moveTo(wx - ww / 2, wy); ctx.lineTo(wx + ww / 2, wy);
      ctx.stroke();

      // Glare
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(wx - ww / 2 + 2, wy - wh / 2 + 2, Math.round(ww * 0.35), Math.round(wh * 0.3));
    });

    // Left wall - Color naranja/terracota como en Game Dev Tycoon
    const leftBack = this.toIso(0, 0);
    const leftFront = this.toIso(0, gh - 1);

    ctx.beginPath();
    ctx.moveTo(leftBack.x, leftBack.y - this.wallH);
    ctx.lineTo(leftFront.x - this.isoW/2, leftFront.y - this.wallH + this.isoH/2);
    ctx.lineTo(leftFront.x - this.isoW/2, leftFront.y);
    ctx.lineTo(leftBack.x, leftBack.y);
    ctx.closePath();
    
    // Gradient naranja para pared izquierda
    const gradLeft = ctx.createLinearGradient(leftBack.x, leftBack.y - this.wallH, leftBack.x, leftBack.y);
    gradLeft.addColorStop(0, '#E67E50');
    gradLeft.addColorStop(1, '#D66E40');
    ctx.fillStyle = gradLeft;
    ctx.fill();
    
    ctx.strokeStyle = '#C65E30';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right wall - Color naranja más claro
    const rightBack = this.toIso(gw - 1, 0);
    const rightFront = this.toIso(gw - 1, gh - 1);

    ctx.beginPath();
    ctx.moveTo(rightBack.x + this.isoW/2, rightBack.y - this.wallH - this.isoH/2);
    ctx.lineTo(rightFront.x, rightFront.y - this.wallH);
    ctx.lineTo(rightFront.x, rightFront.y);
    ctx.lineTo(rightBack.x + this.isoW/2, rightBack.y);
    ctx.closePath();
    
    // Gradient naranja claro para pared derecha
    const gradRight = ctx.createLinearGradient(rightBack.x, rightBack.y - this.wallH, rightBack.x, rightBack.y);
    gradRight.addColorStop(0, '#F08A60');
    gradRight.addColorStop(1, '#E07A50');
    ctx.fillStyle = gradRight;
    ctx.fill();
    
    ctx.strokeStyle = '#D06A40';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Baseboards (zócalos)
    ctx.strokeStyle = '#8B6F47';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(backLeft.x, backLeft.y - 4);
    ctx.lineTo(backRight.x + this.isoW/2, backRight.y - 4);
    ctx.stroke();

    // GOALS post-its — drawn last so they render ON TOP of all wall borders
    // gf=0.91 places them in the right corner of the back wall (past the 3rd window at f=0.72)
    const gf     = 0.91;
    const pxOff  = leftX + gf * (rightX - leftX);
    const gTopY  = topY0 + gf * (topY1 - topY0);
    const gBotY  = botY0 + gf * (botY1 - botY0);
    const pyOff  = gTopY + (gBotY - gTopY) * 0.15;
    const ps     = Math.round(this.wallH * 0.14);
    const gap    = ps + 4;
    const postits = [
      { dx: 0,      dy: 0,      c: '#ffee55' }, { dx: -gap,    dy: 3,      c: '#ff9944' },
      { dx: -2,     dy: gap,    c: '#55ff99' }, { dx: -gap-1,  dy: gap,    c: '#ff55aa' },
      { dx: 2,      dy: gap*2,  c: '#55ccff' }, { dx: -gap+2,  dy: gap*2,  c: '#ffee55' },
    ];
    postits.forEach(p => {
      ctx.fillStyle = p.c;
      ctx.fillRect(pxOff + p.dx, pyOff + p.dy, ps, ps);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(pxOff + p.dx, pyOff + p.dy, ps, ps);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(pxOff + p.dx + 2,       pyOff + p.dy + ps * 0.3);
      ctx.lineTo(pxOff + p.dx + ps - 2,  pyOff + p.dy + ps * 0.3);
      ctx.moveTo(pxOff + p.dx + 2,       pyOff + p.dy + ps * 0.55);
      ctx.lineTo(pxOff + p.dx + ps * 0.7, pyOff + p.dy + ps * 0.55);
      ctx.stroke();
    });
    const labelSize = Math.max(7, Math.round(this.wallH * 0.055));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('GOALS', pxOff + ps + 2, pyOff - 5);
  }

  // BTC/USD screen mapped onto the left wall using isometric wall coordinates
  renderLeftWallScreen(ctx, time = 0) {
    const gh = this.config.gridHeight;
    const lb = this.toIso(0, 0);
    const lf = this.toIso(0, gh - 1);

    const topBack  = { x: lb.x,              y: lb.y - this.wallH };
    const topFront = { x: lf.x - this.isoW/2, y: lf.y - this.wallH + this.isoH/2 };
    const botBack  = { x: lb.x,              y: lb.y };
    const botFront = { x: lf.x - this.isoW/2, y: lf.y };

    // Map wall (u=0 back → 1 front, v=0 top → 1 bottom) to screen
    const wallPt = (u, v) => {
      const x  = topBack.x + u * (topFront.x - topBack.x);
      const ty = topBack.y + u * (topFront.y - topBack.y);
      const by = botBack.y + u * (botFront.y - botBack.y);
      return { x, y: ty + v * (by - ty) };
    };

    // Screen covers most of the left wall
    const U0 = 0.07, U1 = 0.93;
    const V0 = 0.05, V1 = 0.88;

    const tl = wallPt(U0, V0);
    const tr = wallPt(U1, V0);
    const br = wallPt(U1, V1);
    const bl = wallPt(U0, V1);

    // Outer bezel + background
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = '#060e06';
    ctx.fill();
    ctx.clip();

    // Horizontal grid lines
    ctx.strokeStyle = 'rgba(74,222,128,0.07)';
    ctx.lineWidth = 1;
    for (let gi = 0; gi <= 5; gi++) {
      const gv = V0 + (gi / 5) * (V1 - V0);
      const p0 = wallPt(U0, gv);
      const p1 = wallPt(U1, gv);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // Animated chart — 14 points scrolling with sin
    const N = 14;
    const chartPts = [];
    for (let i = 0; i < N; i++) {
      const u = U0 + (U1 - U0) * (i / (N - 1));
      const vNorm = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(
        time * 0.9 + i * 1.3 + Math.cos(time * 0.4 + i * 0.7)
      ));
      chartPts.push(wallPt(u, V0 + (V1 - V0) * vNorm));
    }

    // Area fill under chart
    ctx.beginPath();
    ctx.moveTo(chartPts[0].x, chartPts[0].y);
    chartPts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(wallPt(U1, V1).x, wallPt(U1, V1).y);
    ctx.lineTo(wallPt(U0, V1).x, wallPt(U0, V1).y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,222,128,0.10)';
    ctx.fill();

    // Chart line
    ctx.beginPath();
    ctx.moveTo(chartPts[0].x, chartPts[0].y);
    chartPts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pulsing dot at latest price
    const pulse = (Math.sin(time * 4) + 1) * 0.5;
    const lp = chartPts[N - 1];
    ctx.fillStyle = `rgba(74,222,128,${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 3 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Scanline sweep
    const scanV = V0 + ((time * 0.22) % 1) * (V1 - V0);
    const sl0 = wallPt(U0, scanV);
    const sl1 = wallPt(U1, scanV);
    ctx.beginPath();
    ctx.moveTo(sl0.x, sl0.y);
    ctx.lineTo(sl1.x, sl1.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Glowing border
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    const glow = (Math.sin(time * 1.6) + 1) * 0.5;
    ctx.strokeStyle = `rgba(74,222,128,${0.22 + glow * 0.38})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Labels (rendered in screen space above the screen)
    const labelSize = Math.max(8, Math.round(this.ts * 0.18));
    const titlePt = wallPt(0.5, -0.06);
    ctx.fillStyle = '#4ade80';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('BTC / USD', titlePt.x, titlePt.y);

    const livePt = wallPt(U0 + 0.05, V0 + 0.10);
    ctx.fillStyle = '#ff5555';
    ctx.font = `${Math.max(6, Math.round(this.ts * 0.11))}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('● LIVE', livePt.x, livePt.y);
  }

  renderAllFurniture(ctx) {
    // Furniture list with positions (sorted by depth for proper rendering)
    const furniture = [
      // Fila superior de escritorios (bien espaciados)
      { type: 'desk', x: 6, y: 4, color: '#4a9eff', name: 'TECH' },
      { type: 'desk', x: 11, y: 4, color: '#4ade80', name: 'QUANT' },
      { type: 'desk', x: 16, y: 4, color: '#fbbf24', name: 'FUND' },
      // Fila inferior de escritorios
      { type: 'desk', x: 6, y: 11, color: '#a855f7', name: 'SENT' },
      { type: 'desk', x: 16, y: 11, color: '#f87171', name: 'RISK' },
      // Mesa de reuniones en el centro
      { type: 'table', x: 12, y: 8 },
      // Plantas decorativas
      { type: 'plant', x: 3, y: 15 },
      { type: 'plant', x: 20, y: 15 },
      { type: 'plant', x: 3, y: 3 },
      { type: 'plant', x: 20, y: 3 },
      { type: 'plant', x: 10, y: 2 },
      { type: 'plant', x: 14, y: 2 },
      // Watercooler
      { type: 'watercooler', x: 20, y: 8 },
      // Pantalla grande en la pared trasera
      { type: 'screen', x: 12, y: 2 }
    ];

    // Sort by depth (y + x) for proper z-ordering
    furniture.sort((a, b) => (a.y + a.x) - (b.y + b.x));

    furniture.forEach(item => {
      switch(item.type) {
        case 'desk':
          this.renderIsoDesk(ctx, item.x, item.y, item);
          break;
        case 'table':
          this.renderIsoTable(ctx, item.x, item.y);
          break;
        case 'plant':
          this.renderIsoPlant(ctx, item.x, item.y);
          break;
        case 'watercooler':
          this.renderIsoWaterCooler(ctx, item.x, item.y);
          break;
        case 'screen':
          this.renderIsoScreen(ctx, item.x, item.y);
          break;
        case 'bookshelf':
          this.renderIsoBookshelf(ctx, item.x, item.y);
          break;
        case 'cabinet':
          this.renderIsoCabinet(ctx, item.x, item.y);
          break;
        case 'chair':
          this.renderIsoChair(ctx, item.x, item.y);
          break;
        case 'poster':
          this.renderIsoPoster(ctx, item.x, item.y);
          break;
      }
    });
  }

  renderIsoDesk(ctx, gx, gy, desk, time = 0) {
    const pos = this.toIso(gx, gy);
    const hw = this.isoW / 2;
    const hh = this.isoH / 2;
    const h = this.ts * 0.6; // Desk height

    // Desk shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(pos.x - hw + 4, pos.y + hh - 2);
    ctx.lineTo(pos.x + hw + 4, pos.y + hh - 2);
    ctx.lineTo(pos.x + hw - 4, pos.y + hh + 6);
    ctx.lineTo(pos.x - hw - 4, pos.y + hh + 6);
    ctx.closePath();
    ctx.fill();

    // Desk top (isometric rectangle)
    ctx.beginPath();
    ctx.moveTo(pos.x - hw + 4, pos.y - h);
    ctx.lineTo(pos.x + hw - 4, pos.y - h);
    ctx.lineTo(pos.x + hw, pos.y - hh);
    ctx.lineTo(pos.x - hw, pos.y - hh);
    ctx.closePath();
    ctx.fillStyle = '#5c4033';
    ctx.fill();
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Desk front face
    ctx.beginPath();
    ctx.moveTo(pos.x - hw, pos.y - hh);
    ctx.lineTo(pos.x + hw, pos.y - hh);
    ctx.lineTo(pos.x + hw - 4, pos.y);
    ctx.lineTo(pos.x - hw + 4, pos.y);
    ctx.closePath();
    ctx.fillStyle = '#4a3728';
    ctx.fill();

    // Monitor
    const mx = pos.x;
    const my = pos.y - h - 15;

    // Monitor stand
    ctx.fillStyle = '#333';
    ctx.fillRect(mx - 2, my + 10, 4, 10);

    // Monitor body (rectangle)
    ctx.fillStyle = '#111';
    ctx.fillRect(mx - 10, my - 8, 20, 18);

    // Screen glow
    const grad = ctx.createLinearGradient(mx - 8, my - 6, mx - 8, my + 8);
    grad.addColorStop(0, desk.color);
    grad.addColorStop(1, '#fff');
    ctx.fillStyle = grad;
    ctx.fillRect(mx - 8, my - 6, 16, 14);

    // Screen reflection
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(mx - 8, my - 6, 16, 4);

    // Animated scanline sweeping down the screen
    const scanH = 14;
    const scanPos = my - 6 + ((time * 18) % scanH);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(mx - 8, scanPos, 16, 2);

    // Pulsing monitor glow (color from desk.color)
    const pulse = (Math.sin(time * 2.2 + gx * 0.7 + gy * 0.5) + 1) * 0.5;
    ctx.globalAlpha = 0.08 + pulse * 0.10;
    ctx.fillStyle = desk.color || '#55ff55';
    ctx.fillRect(mx - 14, my - 12, 28, 22);
    ctx.globalAlpha = 1;

    // Chair (behind desk)
    const cx = pos.x;
    const cy = pos.y + hh + 8;

    // Chair shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chair seat
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chair back
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, 8, 10, 0, 0, Math.PI);
    ctx.fill();

    // Name tag
    ctx.fillStyle = '#fff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(desk.name, pos.x, pos.y - h - 20);
  }

  renderIsoTable(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);
    const hw = this.isoW;
    const hh = this.isoH;
    const h = this.ts * 0.4;

    // Table shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + hh/2, hw, hh/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Table top
    ctx.beginPath();
    ctx.moveTo(pos.x - hw, pos.y - h);
    ctx.lineTo(pos.x + hw, pos.y - h);
    ctx.lineTo(pos.x + hw - 4, pos.y - h + hh);
    ctx.lineTo(pos.x - hw + 4, pos.y - h + hh);
    ctx.closePath();
    ctx.fillStyle = '#6c5043';
    ctx.fill();
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Table legs
    ctx.fillStyle = '#444';
    ctx.fillRect(pos.x - hw + 4, pos.y - h + hh, 6, 12);
    ctx.fillRect(pos.x + hw - 10, pos.y - h + hh, 6, 12);

    // Papers on table
    ctx.fillStyle = '#eee';
    ctx.fillRect(pos.x - 8, pos.y - h + 2, 16, 8);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(pos.x + 4, pos.y - h + 6, 10, 6);
  }

  renderIsoPlant(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);

    // Pot shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pot
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(pos.x - 6, pos.y);
    ctx.lineTo(pos.x - 4, pos.y - 12);
    ctx.lineTo(pos.x + 4, pos.y - 12);
    ctx.lineTo(pos.x + 6, pos.y);
    ctx.closePath();
    ctx.fill();

    // Leaves (layered)
    const leaves = [
      { x: 0, y: -16, w: 12, h: 16 },
      { x: -6, y: -14, w: 10, h: 14 },
      { x: 6, y: -14, w: 10, h: 14 },
      { x: -3, y: -20, w: 8, h: 12 }
    ];

    leaves.forEach(leaf => {
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.ellipse(pos.x + leaf.x, pos.y + leaf.y, leaf.w/2, leaf.h/2, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Leaf highlights
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x - 2, pos.y - 16, 4, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  renderIsoWaterCooler(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base
    ctx.fillStyle = '#777';
    ctx.fillRect(pos.x - 8, pos.y - 4, 16, 8);

    // Water bottle
    const grad = ctx.createLinearGradient(pos.x, pos.y - 24, pos.x, pos.y - 4);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#4682B4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pos.x - 6, pos.y - 4);
    ctx.lineTo(pos.x - 4, pos.y - 24);
    ctx.lineTo(pos.x + 4, pos.y - 24);
    ctx.lineTo(pos.x + 6, pos.y - 4);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(pos.x - 3, pos.y - 20, 2, 14);
  }

  renderIsoScreen(ctx, gx, gy, time = 0) {
    const pos = this.toIso(gx, gy);
    // Scale screen proportionally with wall height
    const w = Math.round(this.wallH * 0.88);
    const h = Math.round(this.wallH * 0.44);
    const sx = pos.x - w / 2;
    const sy = pos.y - this.wallH - h;

    // Screen frame
    ctx.fillStyle = '#111';
    ctx.fillRect(sx, sy, w, h);

    // Screen background gradient
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + h);
    grad.addColorStop(0, '#0a3a0a');
    grad.addColorStop(1, '#1a5a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(sx + 4, sy + 4, w - 8, h - 8);

    // Animated chart — 7 sample points offset by time
    const pts = [
      [sx + 6,  sy + h - 12 - Math.sin(time * 0.7 + 0) * 6],
      [sx + 16, sy + h - 20 - Math.sin(time * 0.7 + 1) * 5],
      [sx + 26, sy + h - 16 - Math.sin(time * 0.7 + 2) * 7],
      [sx + 36, sy + h - 24 - Math.sin(time * 0.7 + 3) * 4],
      [sx + 46, sy + h - 18 - Math.sin(time * 0.7 + 4) * 6],
      [sx + 56, sy + h - 28 - Math.sin(time * 0.7 + 5) * 5],
      [sx + 66, sy + h - 22 - Math.sin(time * 0.7 + 6) * 8],
    ];

    // Area fill under chart
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(pts[pts.length - 1][0], sy + h - 4);
    ctx.lineTo(pts[0][0], sy + h - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,222,128,0.12)';
    ctx.fill();

    // Chart line
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.stroke();

    // Scanline sweep
    const scanY = sy + 4 + ((time * 22) % (h - 8));
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(sx + 4, scanY, w - 8, 2);

    // Pulsing frame glow
    const glow = (Math.sin(time * 1.8) + 1) * 0.5;
    ctx.strokeStyle = `rgba(74,222,128,${0.25 + glow * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, w, h);

    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BTC/USD', pos.x, sy - 5);

    ctx.font = '6px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('LIVE', sx + w - 14, sy + 10);
  }

  // === NEW FURNITURE TYPES ===

  renderIsoBookshelf(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);
    const h = this.ts * 0.9; // Bookshelf height

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bookshelf body (wood)
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(pos.x - 14, pos.y - h, 28, h);
    
    // Shelves (horizontal lines)
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const shelfY = pos.y - h + (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pos.x - 14, shelfY);
      ctx.lineTo(pos.x + 14, shelfY);
      ctx.stroke();
    }

    // Books (colorful rectangles)
    const bookColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const shelfY = pos.y - h + 8 + (shelf * (h / 4));
      for (let book = 0; book < 5; book++) {
        const bookX = pos.x - 12 + (book * 5);
        ctx.fillStyle = bookColors[(shelf + book) % bookColors.length];
        ctx.fillRect(bookX, shelfY, 4, 8);
      }
    }

    // Frame
    ctx.strokeStyle = '#3a2718';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - 14, pos.y - h, 28, h);
  }

  renderIsoCabinet(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);
    const h = this.ts * 0.7; // Cabinet height

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabinet body (metal gray)
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(pos.x - 12, pos.y - h, 24, h);

    // Drawers (3 drawers)
    ctx.strokeStyle = '#5a6568';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 2; i++) {
      const drawerY = pos.y - h + (h / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pos.x - 12, drawerY);
      ctx.lineTo(pos.x + 12, drawerY);
      ctx.stroke();
    }

    // Drawer handles
    ctx.fillStyle = '#34495e';
    for (let i = 0; i < 3; i++) {
      const handleY = pos.y - h + 8 + (i * (h / 3));
      ctx.fillRect(pos.x - 2, handleY, 4, 2);
    }

    // Frame
    ctx.strokeStyle = '#5a6568';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - 12, pos.y - h, 24, h);
  }

  renderIsoChair(ctx, gx, gy) {
    const pos = this.toIso(gx, gy);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chair seat
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chair back
    ctx.fillStyle = '#666';
    ctx.fillRect(pos.x - 8, pos.y - 20, 16, 12);
    
    // Chair legs (4 simple lines)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pos.x - 6, pos.y - 8);
    ctx.lineTo(pos.x - 6, pos.y);
    ctx.moveTo(pos.x + 6, pos.y - 8);
    ctx.lineTo(pos.x + 6, pos.y);
    ctx.stroke();
  }

  renderIsoPoster(ctx, gx, gy) {
    // Poster on back wall
    const pos = this.toIso(gx, gy);
    const w = 30;
    const h = 40;

    // Poster frame
    ctx.fillStyle = '#222';
    ctx.fillRect(pos.x - w/2 - 2, pos.y - this.wallH - h - 2, w + 4, h + 4);

    // Poster content (Bitcoin/Trading themed)
    const grad = ctx.createLinearGradient(pos.x - w/2, pos.y - this.wallH - h, pos.x - w/2, pos.y - this.wallH);
    grad.addColorStop(0, '#f39c12');
    grad.addColorStop(1, '#e67e22');
    ctx.fillStyle = grad;
    ctx.fillRect(pos.x - w/2, pos.y - this.wallH - h, w, h);

    // Bitcoin symbol (₿)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('₿', pos.x, pos.y - this.wallH - h/2 + 8);

    // "TO THE MOON" text
    ctx.font = 'bold 6px monospace';
    ctx.fillText('TO THE', pos.x, pos.y - this.wallH - 10);
    ctx.fillText('MOON', pos.x, pos.y - this.wallH - 4);
  }

  renderIsoBeanbag(ctx, gx, gy, item) {
    const pos = this.toIso(gx, gy);
    const color = item.color || '#4488ff';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main blob (beanbag body)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 9, 14, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark base ring (bottom seam)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 2, 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Top highlight (specular)
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.ellipse(pos.x - 4, pos.y - 14, 7, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Subtle seam line across middle
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 9, 14, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── SHADO's toys ──

  renderIsoYarn(ctx, gx, gy, item, time) {
    const pos = this.toIso(gx, gy);
    const color = item.color || '#ff4466';
    const wobble = Math.sin(time * 2 + gx) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x + 2, pos.y + 2, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yarn ball
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 4 + wobble, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yarn cross-hatch lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 4 + wobble, 2 + i * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Loose string
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x + 4, pos.y - 3 + wobble);
    ctx.quadraticCurveTo(pos.x + 10 + Math.sin(time) * 2, pos.y - 8, pos.x + 14, pos.y - 2 + Math.sin(time * 1.5) * 2);
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(pos.x - 2, pos.y - 6 + wobble, 2, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  renderIsoMouseToy(ctx, gx, gy, time) {
    const pos = this.toIso(gx, gy);
    const twitch = Math.sin(time * 5) * 1.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x + 1, pos.y + 1, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouse body (grey oval)
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.ellipse(pos.x + twitch, pos.y - 3, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Mouse head
    ctx.beginPath();
    ctx.ellipse(pos.x - 5 + twitch, pos.y - 4, 3, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Mouse ears
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.ellipse(pos.x - 6 + twitch, pos.y - 7, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pos.x - 3 + twitch, pos.y - 7, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner ears (pink)
    ctx.fillStyle = '#cc8899';
    ctx.beginPath();
    ctx.ellipse(pos.x - 6 + twitch, pos.y - 7, 1, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pos.x - 3 + twitch, pos.y - 7, 1, 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail (string)
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x + 6 + twitch, pos.y - 3);
    ctx.quadraticCurveTo(pos.x + 12, pos.y - 6 + Math.sin(time * 3) * 2, pos.x + 15, pos.y - 2);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(Math.round(pos.x - 6 + twitch), Math.round(pos.y - 5), 1, 1);
  }

  renderIsoCatBed(ctx, gx, gy, time) {
    const pos = this.toIso(gx, gy);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 3, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bed rim (circular cushion)
    ctx.fillStyle = '#664488';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 3, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner cushion
    ctx.fillStyle = '#8855aa';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(pos.x - 2, pos.y - 6, 8, 3, -0.2, 0, Math.PI);
    ctx.fill();

    // "SHADO" label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHADO', pos.x, pos.y - 3);
  }

  // Ambient floating data particles — deterministic, no state needed
  renderAmbientEffects(ctx, time) {
    const desks = this._desks;

    desks.forEach((desk, di) => {
      const pos = this.toIso(desk.x, desk.y);
      const h = this.config.tileSize * 0.6;
      const mx = pos.x;
      const my = pos.y - h - 8; // approx monitor center Y

      // 3 floating dots per desk, staggered
      for (let i = 0; i < 3; i++) {
        const phase = di * 2.3 + i * 2.1;
        const speed = 0.35 + i * 0.12;
        const cycle = ((time * speed + phase) % 3.0) / 3.0; // 0→1
        const dotY = my - cycle * 44;
        const dotX = mx + Math.sin(time * 0.9 + phase) * 7;
        const opacity = Math.max(0, 1 - cycle) * 0.55;

        ctx.globalAlpha = opacity;
        ctx.fillStyle = desk.color || '#55ff55';
        ctx.fillRect(Math.round(dotX) - 1, Math.round(dotY) - 1, 2, 2);
      }
    });

    ctx.globalAlpha = 1;

    // CRT-style vignette overlay — gradient cached, built once
    if (!this._vignetteGrad) {
      const cw = ctx.canvas.width;
      const ch = ctx.canvas.height;
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.28)');
      this._vignetteGrad = g;
    }
    ctx.fillStyle = this._vignetteGrad;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  renderDesks(ctx, deskPositions) {}
  renderMeetingTable(ctx, center) {}
  renderDecorations(ctx, decorations) {}

  /**
   * Destroy scene renderer and release cached canvases
   */
  destroy() {
    this._floorCache = null;
    this._wallCache = null;
    this._vignetteGrad = null;
    this._furnitureList = [];
    this._desks = [];
  }
}
