/**
 * V2 Spatial 3D Volumetric Starfield, Celestial Astrolabe Rings,
 * Interactive Touch Stardust Ribbon, Shooting Stars, Rising Dawn Motes,
 * Perspective Warp-Drive & Sunrise Aurora Canvas Engine (60fps Pure Vanilla JS)
 */

export class CanvasFX {
  constructor(canvas, themeEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.themeEngine = themeEngine;

    this.preset = themeEngine.getPreset();
    this.prevPreset = null;
    this.prevOrbSprites = [];
    this.orbSprites = [];
    this.themeBlend = 1;

    this.width = 0;
    this.height = 0;

    // 3D Perspective Camera State
    this.fov = 410;
    this.camX = 0;
    this.camY = 0;
    this.targetCamX = 0;
    this.targetCamY = 0;
    this.warpBoost = 0;

    this.wishCharge = 0;
    this.wishWarmthBoost = 0;
    this.orbX = 0.5;
    this.orbY = 0.52;

    this.wishGlowSprite = null;
    this.stars3D = [];
    this.helixMotes = [];
    this.dawnMotes = [];
    this.pointerTrail = [];
    this.shootingStars = [];
    this.particles = [];
    this.shockwaves = [];

    this._lastTrailTime = 0;
    this._lastTrailX = -999;
    this._lastTrailY = -999;
    this._nextMeteorAt = performance.now() + 2600;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._rafId = null;
    this._lastFrameTime = performance.now();

    this._init3DWorld();
    this.orbSprites = this._createSpritesForPreset(this.preset);
    this._bakeWishGlow();

    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    this._onGlobalPointer = this._onGlobalPointer.bind(this);

    this.themeEngine.onChange((newPreset) => {
      if (newPreset.id !== this.preset.id) {
        this.prevPreset = this.preset;
        this.prevOrbSprites = this.orbSprites;
        this.preset = newPreset;
        this.orbSprites = this._createSpritesForPreset(newPreset);
        this.themeBlend = this.reducedMotion ? 1 : 0;
      }
      if (this.reducedMotion) this._renderFrame(performance.now(), 16);
    });
  }

  start() {
    this._resize();
    window.addEventListener('resize', this._resize, { passive: true });
    window.addEventListener('pointermove', this._onGlobalPointer, { passive: true });
    if (this.reducedMotion) {
      this._renderFrame(performance.now(), 16);
    } else {
      this._lastFrameTime = performance.now();
      this._rafId = requestAnimationFrame(this._loop);
    }
  }

  stop() {
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('pointermove', this._onGlobalPointer);
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _onGlobalPointer(e) {
    if (this.reducedMotion || this.width <= 0 || this.height <= 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const nx = lx / Math.max(1, rect.width) - 0.5;
    const ny = ly / Math.max(1, rect.height) - 0.5;
    this.targetCamX = Math.max(-0.6, Math.min(0.6, nx)) * 68;
    this.targetCamY = Math.max(-0.6, Math.min(0.6, ny)) * 56;

    // Silky fingertip / pointer stardust ribbon inside frame bounds
    if (lx >= 0 && lx <= rect.width && ly >= 0 && ly <= rect.height) {
      const now = performance.now();
      const dist = Math.hypot(lx - this._lastTrailX, ly - this._lastTrailY);
      if (now - this._lastTrailTime >= 26 && dist >= 10) {
        this._lastTrailTime = now;
        this._lastTrailX = lx;
        this._lastTrailY = ly;
        this._spawnTrailMote(
          (lx / Math.max(1, rect.width)) * this.width,
          (ly / Math.max(1, rect.height)) * this.height
        );
      }
    }
  }

  _spawnTrailMote(x, y) {
    if (this.pointerTrail.length >= 36) {
      this.pointerTrail.shift();
    }
    const colors = ['#fff7e6', '#fde2b8', '#fbc2d9', '#e9d8fd'];
    this.pointerTrail.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 0.55,
      vy: -0.35 - Math.random() * 0.65,
      size: 2.2 + Math.random() * 2.8,
      alpha: 0.86,
      decay: 0.022 + Math.random() * 0.012,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.08,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  /**
   * Spawns a delicate 4-point starlight blossom at client viewport coordinates
   */
  spawnMiniBurst(clientX, clientY, count = 14) {
    if (this.reducedMotion || this.width <= 0 || this.height <= 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * this.width;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * this.height;
    if (x < -20 || x > this.width + 20 || y < -20 || y > this.height + 20) return;

    const palette = this.preset.particlePalette || ['#fde2b8', '#fbc2d9', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = 1.4 + Math.random() * 3.4;
      this.particles.push({
        x,
        y,
        z: (Math.random() - 0.4) * 90,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.45,
        vz: (Math.random() - 0.4) * 2.5,
        drag: 0.958,
        gravity: 0.018,
        size: i % 2 === 0 ? 4.2 + Math.random() * 3.2 : 2.0 + Math.random() * 2.0,
        isStar: i % 2 === 0,
        color: palette[i % palette.length],
        alpha: 0.96,
        decay: 0.016 + Math.random() * 0.01,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.09
      });
    }
  }

  triggerMilestoneRipple(normX = 0.5, normY = 0.52) {
    if (this.reducedMotion) return;
    const cx = normX * this.width;
    const cy = normY * this.height;
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 42,
      maxRadius: Math.min(this.width, this.height) * 0.46,
      speed: 4.8,
      lineWidth: 14,
      color: 'rgba(253, 226, 184, 0.58)',
      alpha: 0.72
    });
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.reducedMotion) {
      this._renderFrame(performance.now(), 16);
    }
  }

  _init3DWorld() {
    const starColors = ['#ffffff', '#fde6c4', '#fbc5dc', '#e9d8fd', '#fef6e6'];
    this.stars3D = Array.from({ length: 105 }, (_, i) => {
      const u = ((i * 0.61803398875) % 1) * 2 - 1;
      const v = (((i * 0.38196601125) + 0.23) % 1) * 2 - 1;
      return {
        x: u * 440,
        y: v * 580,
        z: 45 + ((i * 53) % 860),
        baseSize: 1.0 + (i % 4) * 0.58,
        color: starColors[i % starColors.length],
        twinklePhase: i * 1.17,
        isSparkle: i % 9 === 0
      };
    });

    this.helixMotes = Array.from({ length: 34 }, (_, i) => ({
      angle: (i / 34) * Math.PI * 2,
      radius: 52 + (i % 6) * 24,
      zOffset: ((i % 7) - 3) * 38,
      speed: 0.028 + (i % 4) * 0.011,
      size: 1.5 + (i % 3) * 0.85,
      hueColor: i % 2 === 0 ? '#fde6c4' : '#fbc5dc'
    }));

    // Warm golden sunrise lantern motes that float upward in `seher-dawn` sky
    this.dawnMotes = Array.from({ length: 22 }, (_, i) => ({
      nx: ((i * 0.6180339) % 1),
      ny: ((i * 0.271828 + 0.11) % 1),
      speedY: 0.00018 + (i % 5) * 0.00005,
      swayPhase: i * 1.43,
      swayAmp: 0.018 + (i % 4) * 0.006,
      radius: 1.8 + (i % 4) * 1.15,
      color: i % 3 === 0 ? '#fff5df' : i % 3 === 1 ? '#fde2b8' : '#fbc2d9'
    }));
  }

  _spawnShootingStar() {
    if (this.width <= 0 || this.height <= 0 || this.shootingStars.length >= 2) return;
    const fromLeft = Math.random() > 0.35;
    const startX = fromLeft
      ? this.width * (0.08 + Math.random() * 0.42)
      : this.width * (0.52 + Math.random() * 0.38);
    const startY = this.height * (0.07 + Math.random() * 0.25);
    const angle = fromLeft
      ? 0.34 + Math.random() * 0.26
      : Math.PI - (0.34 + Math.random() * 0.26);
    const speed = 7.4 + Math.random() * 3.2;

    this.shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      tailLen: 68 + Math.random() * 44,
      life: 0,
      maxLife: 34 + Math.floor(Math.random() * 16)
    });
  }

  _createSpritesForPreset(preset) {
    const orbs = preset.auroraOrbs || [];
    const size = 128;
    const half = size / 2;

    return orbs.map((orb) => {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      const [r, g, b] = orb.color;
      const grad = octx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
      grad.addColorStop(0.52, `rgba(${r}, ${g}, ${b}, 0.42)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      octx.fillStyle = grad;
      octx.fillRect(0, 0, size, size);
      return off;
    });
  }

  _bakeWishGlow() {
    const size = 128;
    const half = size / 2;
    const glowOff = document.createElement('canvas');
    glowOff.width = size;
    glowOff.height = size;
    const gctx = glowOff.getContext('2d');
    const gGrad = gctx.createRadialGradient(half, half, 2, half, half, half);
    gGrad.addColorStop(0, 'rgba(255, 246, 228, 1)');
    gGrad.addColorStop(0.45, 'rgba(251, 191, 114, 0.54)');
    gGrad.addColorStop(1, 'rgba(251, 191, 114, 0)');
    gctx.fillStyle = gGrad;
    gctx.fillRect(0, 0, size, size);
    this.wishGlowSprite = glowOff;
  }

  /**
   * Triggers a 3D perspective starfield warp glide forward through Z-space
   */
  triggerWarpBurst(intensity = 1) {
    if (this.reducedMotion) return;
    this.warpBoost = Math.min(2.2, Math.max(this.warpBoost, intensity));
  }

  setWishCharge(progress, normX = 0.5, normY = 0.52) {
    this.wishCharge = Math.max(0, Math.min(1, progress));
    this.orbX = normX;
    this.orbY = normY;
    if (this.reducedMotion) {
      this._renderFrame(performance.now(), 16);
    }
  }

  triggerSunriseShockwave(normX = 0.5, normY = 0.52) {
    this.triggerWarpBurst(1.65);
    if (this.reducedMotion) return;
    const cx = normX * this.width;
    const cy = normY * this.height;
    const maxRadius = Math.hypot(this.width, this.height) * 0.88;

    this.shockwaves.push(
      {
        x: cx,
        y: cy,
        radius: 32,
        maxRadius,
        speed: Math.max(8, maxRadius / 48),
        lineWidth: 30,
        color: 'rgba(253, 226, 184, 0.78)',
        alpha: 0.94
      },
      {
        x: cx,
        y: cy,
        radius: 16,
        maxRadius: maxRadius * 0.96,
        speed: Math.max(5.8, maxRadius / 64),
        lineWidth: 46,
        color: 'rgba(249, 168, 201, 0.52)',
        alpha: 0.8
      }
    );
  }

  triggerCelebration(normX = 0.5, normY = 0.48) {
    this.wishWarmthBoost = 1;
    if (this.reducedMotion) {
      this._renderFrame(performance.now(), 16);
      return;
    }

    const cx = normX * this.width;
    const cy = normY * this.height;
    const palette = this.preset.particlePalette || ['#fde2b8', '#fbc2d9', '#ffffff'];

    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2 + (Math.random() - 0.5) * 0.26;
      const speed = 2.0 + Math.random() * 6.4;
      const vz = (Math.random() - 0.42) * 5.2;
      const isStar = i % 3 === 0;

      this.particles.push({
        x: cx,
        y: cy,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (0.7 + Math.random() * 1.5),
        vz,
        drag: 0.968 + Math.random() * 0.015,
        gravity: 0.03 + Math.random() * 0.024,
        size: isStar ? 4.8 + Math.random() * 4.8 : 2.1 + Math.random() * 3.0,
        isStar,
        color: palette[i % palette.length],
        alpha: 1,
        decay: 0.0075 + Math.random() * 0.0085,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.07
      });
    }
  }

  _loop(now) {
    const dt = Math.max(4, Math.min(now - this._lastFrameTime, 64));
    this._lastFrameTime = now;
    if (this.themeBlend < 1) {
      this.themeBlend = Math.min(1, this.themeBlend + dt / 1600);
    }
    if (!this.reducedMotion && now >= this._nextMeteorAt) {
      this._spawnShootingStar();
      this._nextMeteorAt = now + 4400 + Math.random() * 2800;
    }
    this._renderFrame(now, dt);
    this._rafId = requestAnimationFrame(this._loop);
  }

  _getBlendedBg() {
    const target = Array.isArray(this.preset.canvasBg)
      ? this.preset.canvasBg
      : [7, 8, 16];
    if (this.themeBlend >= 1 || !this.prevPreset || !Array.isArray(this.prevPreset.canvasBg)) {
      return `rgb(${target[0]}, ${target[1]}, ${target[2]})`;
    }
    const prev = this.prevPreset.canvasBg;
    const t = this.themeBlend;
    const r = Math.round(prev[0] + (target[0] - prev[0]) * t);
    const g = Math.round(prev[1] + (target[1] - prev[1]) * t);
    const b = Math.round(prev[2] + (target[2] - prev[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  _drawOrbSet(orbs, sprites, now, blendWeight) {
    if (blendWeight <= 0.01) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const minDim = Math.min(w, h);

    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i];
      const sprite = sprites[i];
      if (!sprite) continue;

      const t = now * orb.speed + i * 1.85;
      const ox = w * (0.5 + 0.32 * Math.cos(t * 1.15 + i)) - this.camX * (0.18 + i * 0.05);
      const oy = h * (0.48 + 0.30 * Math.sin(t * 0.9 + i * 0.7)) - this.camY * (0.18 + i * 0.05);
      const radius = minDim * orb.radiusRatio * (1 + this.wishCharge * 0.18);
      const diam = radius * 2;

      const alphaBoost = 1 + this.wishCharge * 0.38 + this.wishWarmthBoost * 0.26;
      ctx.globalAlpha = Math.min(0.64, orb.alpha * alphaBoost) * blendWeight;
      ctx.drawImage(sprite, ox - radius, oy - radius, diam, diam);
    }
  }

  /**
   * Projects & renders 3 gossamer 3D Celestial Astrolabe Rings rotating in deep space
   */
  _draw3DAstrolabeRings(ctx, now, w, h) {
    const cx = w * 0.5 - this.camX * 0.32;
    const cy = h * 0.49 - this.camY * 0.32;
    const baseRadius = Math.min(w, h) * 0.44 * (1 - this.wishCharge * 0.16);
    const speedMult = 1 + this.wishCharge * 2.4;
    const isDawn = this.preset.id === 'seher-dawn';

    const rings = [
      { r: baseRadius * 1.04, rx: 1.08 + Math.sin(now * 0.00042) * 0.24, ry: now * 0.00028 * speedMult, rz: 0.42 },
      { r: baseRadius * 0.82, rx: -0.92 + Math.cos(now * 0.00036) * 0.22, ry: -now * 0.00035 * speedMult, rz: -0.58 },
      { r: baseRadius * 1.24, rx: 1.32, ry: now * 0.00018 * speedMult, rz: 0.18 + Math.sin(now * 0.0003) * 0.15 }
    ];

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const segments = 56;

    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
      const ring = rings[rIdx];
      const cosX = Math.cos(ring.rx);
      const sinX = Math.sin(ring.rx);
      const cosY = Math.cos(ring.ry);
      const sinY = Math.sin(ring.ry);
      const cosZ = Math.cos(ring.rz);
      const sinZ = Math.sin(ring.rz);

      let prevSX = 0;
      let prevSY = 0;

      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const lx = Math.cos(theta) * ring.r;
        const ly = Math.sin(theta) * ring.r;

        const y1 = ly * cosX;
        const z1 = ly * sinX;

        const x2 = lx * cosY + z1 * sinY;
        const z2 = -lx * sinY + z1 * cosY;

        const x3 = x2 * cosZ - y1 * sinZ;
        const y3 = x2 * sinZ + y1 * cosZ;
        const zWorld = 460 + z2;

        const scale = this.fov / Math.max(90, zWorld);
        const sx = cx + x3 * scale;
        const sy = cy + y3 * scale;

        if (s > 0) {
          const depthFactor = Math.max(0.14, Math.min(1, (560 - zWorld) / 280));
          const baseAlpha = isDawn ? 0.11 : 0.085;
          ctx.globalAlpha = (baseAlpha + this.wishCharge * 0.12) * depthFactor;
          ctx.strokeStyle = rIdx % 2 === 0 ? '#fde2b8' : '#f9a8c9';
          ctx.lineWidth = 0.85 + depthFactor * 0.85;
          ctx.beginPath();
          ctx.moveTo(prevSX, prevSY);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        prevSX = sx;
        prevSY = sy;
      }
    }
    ctx.restore();
  }

  _drawShootingStars(ctx) {
    if (this.shootingStars.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const m = this.shootingStars[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life += 1;

      if (m.life >= m.maxLife) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      const p = m.life / m.maxLife;
      const alpha = Math.sin(p * Math.PI) * 0.82;
      const speedNorm = Math.max(0.1, Math.hypot(m.vx, m.vy));
      const tx = m.x - (m.vx / speedNorm) * m.tailLen;
      const ty = m.y - (m.vy / speedNorm) * m.tailLen;

      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, `rgba(255, 250, 238, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.38, `rgba(253, 226, 184, ${(alpha * 0.55).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(253, 226, 184, 0)');

      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff9eb';
      ctx.save();
      ctx.translate(m.x, m.y);
      this._drawFourPointStar(ctx, 4.2);
      ctx.restore();
    }
    ctx.restore();
  }

  _drawDawnMotes(ctx, now, dt, w, h) {
    const dawnWeight =
      this.preset.id === 'seher-dawn'
        ? this.themeBlend
        : this.prevPreset?.id === 'seher-dawn'
          ? 1 - this.themeBlend
          : 0;
    if (dawnWeight <= 0.02) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.dawnMotes.length; i++) {
      const dm = this.dawnMotes[i];
      if (!this.reducedMotion) {
        dm.ny -= dm.speedY * dt;
        if (dm.ny < -0.05) dm.ny = 1.05;
      }
      const sway = Math.sin(now * 0.0012 + dm.swayPhase) * dm.swayAmp;
      const x = (dm.nx + sway) * w - this.camX * 0.24;
      const y = dm.ny * h - this.camY * 0.24;
      const edgeFade = Math.sin(Math.max(0, Math.min(1, dm.ny)) * Math.PI);
      ctx.globalAlpha = 0.28 * edgeFade * dawnWeight;
      ctx.fillStyle = dm.color;
      ctx.beginPath();
      ctx.arc(x, y, dm.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _renderFrame(now, dt) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (w <= 0 || h <= 0) return;

    // Smooth 3D camera parallax spring
    this.camX += (this.targetCamX - this.camX) * 0.065;
    this.camY += (this.targetCamY - this.camY) * 0.065;

    if (this.warpBoost > 0.004) {
      this.warpBoost *= Math.pow(0.94, dt / 16);
    } else {
      this.warpBoost = 0;
    }

    // 1. Blended deep sky / dawn base
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this._getBlendedBg();
    ctx.fillRect(0, 0, w, h);

    // 2. Silk Liquid Aurora & Sunrise Horizon Sprites (with 3D camera parallax)
    ctx.globalCompositeOperation = 'lighter';
    if (this.themeBlend < 1 && this.prevPreset) {
      this._drawOrbSet(
        this.prevPreset.auroraOrbs || [],
        this.prevOrbSprites,
        now,
        1 - this.themeBlend
      );
    }
    this._drawOrbSet(
      this.preset.auroraOrbs || [],
      this.orbSprites,
      now,
      this.themeBlend
    );

    // 3. 3D Celestial Astrolabe Orbital Rings + Rising Dawn Lantern Motes
    this._draw3DAstrolabeRings(ctx, now, w, h);
    this._drawDawnMotes(ctx, now, dt, w, h);

    // 4. True 3D Volumetric Starfield + Warp Perspective Rays + Shooting Stars
    const cx = w * 0.5;
    const cy = h * 0.5;
    const zStep = this.reducedMotion
      ? 0
      : (0.42 + this.warpBoost * 18.5 + this.wishCharge * 3.8) * (dt / 16);

    for (let i = 0; i < this.stars3D.length; i++) {
      const s = this.stars3D[i];
      const prevZ = s.z;
      s.z -= zStep;

      if (s.z <= 28) {
        s.z += 880;
        continue;
      }

      const scale = this.fov / s.z;
      const sx = cx + (s.x - this.camX) * scale;
      const sy = cy + (s.y - this.camY) * scale;

      if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;

      const depthAlpha = Math.min(1, (910 - s.z) / 520);
      const twinkle = 0.58 + 0.42 * Math.sin(now * 0.0024 + s.twinklePhase);
      const alpha = Math.max(0.06, depthAlpha * twinkle * 0.78);
      const radius = Math.min(3.8, s.baseSize * scale * 0.85);

      if (this.warpBoost > 0.08 && prevZ > s.z) {
        const tailZ = s.z + this.warpBoost * 46;
        const tailScale = this.fov / tailZ;
        const tx = cx + (s.x - this.camX) * tailScale;
        const ty = cy + (s.y - this.camY) * tailScale;
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = alpha * Math.min(0.85, this.warpBoost * 0.7);
        ctx.lineWidth = Math.max(0.8, radius * 0.85);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      if (s.isSparkle && radius > 1.35) {
        ctx.save();
        ctx.translate(sx, sy);
        this._drawFourPointStar(ctx, radius * 1.9);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this._drawShootingStars(ctx);

    // 5. 3D Helical Starlight Vortex during Hold-to-Unlock (Act 2)
    if (this.wishCharge > 0.01 && this.wishGlowSprite) {
      const ox = this.orbX * w;
      const oy = this.orbY * h;
      const glowR = 152 + this.wishCharge * 115;

      ctx.globalAlpha = 0.38 * this.wishCharge;
      ctx.drawImage(this.wishGlowSprite, ox - glowR, oy - glowR, glowR * 2, glowR * 2);

      for (let i = 0; i < this.helixMotes.length; i++) {
        const hm = this.helixMotes[i];
        hm.angle += hm.speed * (1 + this.wishCharge * 2.2);
        const z3d = 320 + Math.sin(hm.angle * 2 + i) * 95 * (1 - this.wishCharge * 0.65);
        const pScale = this.fov / Math.max(120, z3d);
        const pullR = hm.radius * (1.22 - this.wishCharge * 0.84) * pScale;
        const px = ox + Math.cos(hm.angle) * pullR;
        const py = oy + Math.sin(hm.angle) * pullR * 0.82;

        ctx.fillStyle = hm.hueColor;
        ctx.globalAlpha = Math.min(1, 0.34 + this.wishCharge * 0.66) * Math.min(1.1, pScale);
        ctx.beginPath();
        ctx.arc(px, py, hm.size * pScale * (0.85 + this.wishCharge * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.wishWarmthBoost > 0.005) {
      this.wishWarmthBoost *= 0.985;
    } else {
      this.wishWarmthBoost = 0;
    }

    // 6. Interactive Touch / Pointer Stardust Ribbon
    if (this.pointerTrail.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = this.pointerTrail.length - 1; i >= 0; i--) {
        const tm = this.pointerTrail[i];
        tm.x += tm.vx;
        tm.y += tm.vy;
        tm.rotation += tm.spin;
        tm.alpha -= tm.decay;

        if (tm.alpha <= 0.01) {
          this.pointerTrail.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = tm.alpha;
        ctx.translate(tm.x, tm.y);
        ctx.rotate(tm.rotation);
        ctx.fillStyle = tm.color;
        this._drawFourPointStar(ctx, tm.size * (0.65 + tm.alpha * 0.55));
        ctx.restore();
      }
      ctx.restore();
    }

    // 7. Expanding Golden Sunrise Shockwave Rings
    if (this.shockwaves.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += sw.speed;
        const progress = Math.min(1, sw.radius / sw.maxRadius);
        const fade = Math.pow(1 - progress, 1.65) * sw.alpha;

        if (progress >= 1 || fade <= 0.01) {
          this.shockwaves.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = fade;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(2, sw.lineWidth * (1 - progress * 0.72));
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. 3D Volumetric Celebration Stars & Pearls
    ctx.globalCompositeOperation = 'source-over';
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.vz *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.z = Math.max(-220, p.z + p.vz);
      p.rotation += p.spin;
      p.alpha -= p.decay;

      if (p.alpha <= 0.01) {
        this.particles.splice(i, 1);
        continue;
      }

      const zFactor = Math.max(0.55, Math.min(1.65, 340 / (340 - p.z)));
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.isStar) {
        this._drawFourPointStar(ctx, p.size * zFactor);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * zFactor, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  _drawFourPointStar(ctx, r) {
    const inner = r * 0.28;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(inner, -inner, r, 0);
    ctx.quadraticCurveTo(inner, inner, 0, r);
    ctx.quadraticCurveTo(-inner, inner, -r, 0);
    ctx.quadraticCurveTo(-inner, -inner, 0, -r);
    ctx.closePath();
    ctx.fill();
  }
}
