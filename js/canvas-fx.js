/**
 * 60fps Liquid Aurora, Dawn Horizon Crossfade & Starlight Particle Canvas Engine
 * Pre-bakes radial aurora sprite textures per theme and smoothly crossfades
 * the sky when transitioning from Midnight (`dark-liquid`) to Sunrise (`seher-dawn`).
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
    this.themeBlend = 1; // 0..1

    this.width = 0;
    this.height = 0;

    this.wishCharge = 0;
    this.wishWarmthBoost = 0;
    this.orbX = 0.5;
    this.orbY = 0.5;

    this.wishGlowSprite = null;
    this.particles = [];
    this.shockwaves = [];
    this.ambientMotes = [];
    this.chargeMotes = [];

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._rafId = null;
    this._lastFrameTime = performance.now();

    this._initMotes();
    this.orbSprites = this._createSpritesForPreset(this.preset);
    this._bakeWishGlow();

    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);

    this.themeEngine.onChange((newPreset) => {
      if (newPreset.id !== this.preset.id) {
        this.prevPreset = this.preset;
        this.prevOrbSprites = this.orbSprites;
        this.preset = newPreset;
        this.orbSprites = this._createSpritesForPreset(newPreset);
        this.themeBlend = this.reducedMotion ? 1 : 0;
      }
      if (this.reducedMotion) this._renderFrame(performance.now());
    });
  }

  start() {
    this._resize();
    window.addEventListener('resize', this._resize, { passive: true });
    if (this.reducedMotion) {
      this._renderFrame(performance.now());
    } else {
      this._lastFrameTime = performance.now();
      this._rafId = requestAnimationFrame(this._loop);
    }
  }

  stop() {
    window.removeEventListener('resize', this._resize);
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.reducedMotion) {
      this._renderFrame(performance.now());
    }
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
    gGrad.addColorStop(0, 'rgba(255, 244, 222, 1)');
    gGrad.addColorStop(0.45, 'rgba(251, 191, 114, 0.52)');
    gGrad.addColorStop(1, 'rgba(251, 191, 114, 0)');
    gctx.fillStyle = gGrad;
    gctx.fillRect(0, 0, size, size);
    this.wishGlowSprite = glowOff;
  }

  _initMotes() {
    this.ambientMotes = Array.from({ length: 20 }, (_, i) => ({
      x: (i * 0.61803398875) % 1,
      y: ((i * 0.38196601125) + 0.17) % 1,
      size: 1.1 + (i % 3) * 0.65,
      speedY: 0.00004 + (i % 4) * 0.000018,
      phase: i * 1.3
    }));

    this.chargeMotes = Array.from({ length: 24 }, (_, i) => ({
      angle: (i / 24) * Math.PI * 2,
      dist: 45 + (i % 5) * 28,
      speed: 0.025 + (i % 3) * 0.012,
      size: 1.5 + (i % 3) * 0.8
    }));
  }

  setWishCharge(progress, normX = 0.5, normY = 0.52) {
    this.wishCharge = Math.max(0, Math.min(1, progress));
    this.orbX = normX;
    this.orbY = normY;
    if (this.reducedMotion) {
      this._renderFrame(performance.now());
    }
  }

  /**
   * Expands two concentric golden-rose light shockwave rings from beneath the user's finger
   */
  triggerSunriseShockwave(normX = 0.5, normY = 0.52) {
    if (this.reducedMotion) return;
    const cx = normX * this.width;
    const cy = normY * this.height;
    const maxRadius = Math.hypot(this.width, this.height) * 0.85;

    this.shockwaves.push(
      {
        x: cx,
        y: cy,
        radius: 36,
        maxRadius,
        speed: Math.max(7.5, maxRadius / 52),
        lineWidth: 28,
        color: 'rgba(253, 226, 184, 0.72)',
        alpha: 0.92
      },
      {
        x: cx,
        y: cy,
        radius: 18,
        maxRadius: maxRadius * 0.95,
        speed: Math.max(5.6, maxRadius / 68),
        lineWidth: 44,
        color: 'rgba(249, 168, 201, 0.48)',
        alpha: 0.78
      }
    );
  }

  triggerCelebration(normX = 0.5, normY = 0.48) {
    this.wishWarmthBoost = 1;
    if (this.reducedMotion) {
      this._renderFrame(performance.now());
      return;
    }

    const cx = normX * this.width;
    const cy = normY * this.height;
    const palette = this.preset.particlePalette || ['#fde2b8', '#fbc2d9', '#ffffff'];

    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2 + (Math.random() - 0.5) * 0.24;
      const speed = 1.8 + Math.random() * 5.8;
      const isStar = i % 3 === 0;

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (0.6 + Math.random() * 1.4),
        drag: 0.968 + Math.random() * 0.016,
        gravity: 0.032 + Math.random() * 0.025,
        size: isStar ? 4.5 + Math.random() * 4.5 : 2 + Math.random() * 2.8,
        isStar,
        color: palette[i % palette.length],
        alpha: 1,
        decay: 0.008 + Math.random() * 0.009,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.06
      });
    }
  }

  _loop(now) {
    const dt = Math.max(4, Math.min(now - this._lastFrameTime, 100));
    this._lastFrameTime = now;
    if (this.themeBlend < 1) {
      this.themeBlend = Math.min(1, this.themeBlend + dt / 1650);
    }
    this._renderFrame(now);
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
      const ox = w * (0.5 + 0.32 * Math.cos(t * 1.15 + i));
      const oy = h * (0.48 + 0.30 * Math.sin(t * 0.9 + i * 0.7));
      const radius = minDim * orb.radiusRatio * (1 + this.wishCharge * 0.16);
      const diam = radius * 2;

      const alphaBoost = 1 + this.wishCharge * 0.35 + this.wishWarmthBoost * 0.25;
      ctx.globalAlpha = Math.min(0.62, orb.alpha * alphaBoost) * blendWeight;
      ctx.drawImage(sprite, ox - radius, oy - radius, diam, diam);
    }
  }

  _renderFrame(now) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (w <= 0 || h <= 0) return;

    // 1. Blended deep sky / dawn base
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this._getBlendedBg();
    ctx.fillRect(0, 0, w, h);

    // 2. Silk Liquid Aurora & Sunrise Horizon Sprites
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

    // 3. Subtle Floating Starlight / Morning Dust
    ctx.fillStyle = '#fde8c8';
    for (let i = 0; i < this.ambientMotes.length; i++) {
      const m = this.ambientMotes[i];
      if (!this.reducedMotion) {
        m.y -= m.speedY * 16;
        if (m.y < -0.04) m.y = 1.04;
      }
      const mx = (m.x + Math.sin(now * 0.0005 + m.phase) * 0.025) * w;
      const my = m.y * h;
      ctx.globalAlpha = 0.2 + 0.24 * (0.5 + 0.5 * Math.sin(now * 0.002 + m.phase));
      ctx.beginPath();
      ctx.arc(mx, my, m.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Interactive Wish Convergence Vortex (Act 3)
    if (this.wishCharge > 0.01 && this.wishGlowSprite) {
      const cx = this.orbX * w;
      const cy = this.orbY * h;
      const glowR = 145 + this.wishCharge * 105;

      ctx.globalAlpha = 0.34 * this.wishCharge;
      ctx.drawImage(this.wishGlowSprite, cx - glowR, cy - glowR, glowR * 2, glowR * 2);

      ctx.fillStyle = '#feebc8';
      ctx.globalAlpha = Math.min(1, 0.3 + this.wishCharge * 0.65);
      for (let i = 0; i < this.chargeMotes.length; i++) {
        const cm = this.chargeMotes[i];
        cm.angle += cm.speed * (1 + this.wishCharge * 1.8);
        const pullRadius = cm.dist * (1.15 - this.wishCharge * 0.78);
        const px = cx + Math.cos(cm.angle) * pullRadius;
        const py = cy + Math.sin(cm.angle) * pullRadius;
        ctx.beginPath();
        ctx.arc(px, py, cm.size * (0.8 + this.wishCharge * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.wishWarmthBoost > 0.005) {
      this.wishWarmthBoost *= 0.985;
    } else {
      this.wishWarmthBoost = 0;
    }

    // 4b. Expanding Golden Sunrise Shockwave Rings
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

    // 5. Golden & Rose-Pearl Celebration Particles
    ctx.globalCompositeOperation = 'source-over';
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.alpha -= p.decay;

      if (p.alpha <= 0.01) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.isStar) {
        this._drawFourPointStar(ctx, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
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
