/**
 * iOS UIKit-Inspired Spring Physics & Gesture Velocity Utilities
 * Provides real damped harmonic motion (`F = -k*x - c*v`) and Apple's exact
 * rubber-band resistance formula for native tactile card & sheet interactions.
 */

/**
 * Apple UIKit UIScrollView rubber-band resistance formula
 * @param {number} distance
 * @param {number} dimension
 * @param {number} [constant=0.55]
 * @returns {number}
 */
export function rubberBand(distance, dimension, constant = 0.55) {
  if (dimension <= 0) return 0;
  const sign = distance < 0 ? -1 : 1;
  const abs = Math.abs(distance);
  return sign * (1 - 1 / ((abs * constant) / dimension + 1)) * dimension;
}

/**
 * Sliding-window pointer velocity tracker (px/ms) modeled after UIPanGestureRecognizer
 */
export class VelocityTracker {
  constructor() {
    this.samples = [];
  }

  reset() {
    this.samples.length = 0;
  }

  addPoint(x, y, timeMs = performance.now()) {
    this.samples.push({ x, y, t: timeMs });
    const cutoff = timeMs - 90;
    while (this.samples.length > 2 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  }

  getVelocity() {
    if (this.samples.length < 2) {
      return { vx: 0, vy: 0 };
    }
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = last.t - first.t;
    if (dt <= 1) {
      return { vx: 0, vy: 0 };
    }
    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt
    };
  }
}

/**
 * 2D Damped Harmonic Spring Animator
 */
export class Spring2D {
  constructor({ stiffness = 290, damping = 26, mass = 1 } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.targetX = 0;
    this.targetY = 0;

    this._rafId = null;
    this._lastTime = 0;
  }

  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  setPosition(x, y) {
    this.stop();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  animateTo(
    targetX,
    targetY,
    { vx = 0, vy = 0, precision = 0.8, onUpdate, onComplete } = {}
  ) {
    this.stop();
    this.targetX = targetX;
    this.targetY = targetY;
    // Convert px/ms gesture velocity to px/s
    this.vx = vx * 1000;
    this.vy = vy * 1000;
    this._lastTime = performance.now();

    const step = (now) => {
      const rawDt = (now - this._lastTime) / 1000;
      const dt = Math.max(0.004, Math.min(rawDt > 0 ? rawDt : 0.016, 0.5));
      this._lastTime = now;

      // Frame-rate-independent sub-stepping (stable across 120Hz ProMotion, 60Hz & 30Hz Low Power Mode)
      const numSteps = Math.max(2, Math.ceil(dt / 0.008));
      const subDt = dt / numSteps;
      for (let i = 0; i < numSteps; i++) {
        const fx = -this.stiffness * (this.x - this.targetX) - this.damping * this.vx;
        const fy = -this.stiffness * (this.y - this.targetY) - this.damping * this.vy;

        this.vx += (fx / this.mass) * subDt;
        this.vy += (fy / this.mass) * subDt;

        this.x += this.vx * subDt;
        this.y += this.vy * subDt;
      }

      if (onUpdate) {
        onUpdate(this.x, this.y);
      }

      const dist = Math.hypot(this.x - this.targetX, this.y - this.targetY);
      const speed = Math.hypot(this.vx, this.vy);

      if (dist <= precision && speed <= Math.max(12, precision * 18)) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.vx = 0;
        this.vy = 0;
        this._rafId = null;
        if (onUpdate) onUpdate(this.x, this.y);
        if (onComplete) onComplete();
        return;
      }

      this._rafId = requestAnimationFrame(step);
    };

    this._rafId = requestAnimationFrame(step);
  }
}
