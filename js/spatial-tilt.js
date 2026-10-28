/**
 * Apple visionOS & Apple Card 3D Spatial Tilt, Gyroscope, Levitation & Diffraction Controller
 * Combines continuous subtle 3D figure-8 orbital levitation, silent hardware orientation tilt
 * (when available without intrusive OS permission dialogs), tactile touch/pointer 3D tilt,
 * specular glare tracking, and `Spring2D` release/impulse physics.
 */

import { Spring2D } from './spring.js?v=2';

const gyroState = {
  initialized: false,
  active: false,
  rx: 0,
  ry: 0,
  baseBeta: null,
  baseGamma: null
};

function initSilentGyroscope() {
  if (gyroState.initialized || typeof window === 'undefined') return;
  gyroState.initialized = true;

  // Never trigger an intrusive iOS system permission popup mid-surprise;
  // bind silently wherever DeviceOrientationEvent streams without requestPermission.
  if (
    typeof window.DeviceOrientationEvent === 'undefined' ||
    typeof window.DeviceOrientationEvent.requestPermission === 'function'
  ) {
    return;
  }

  window.addEventListener(
    'deviceorientation',
    (e) => {
      if (typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
      if (gyroState.baseBeta === null) {
        gyroState.baseBeta = e.beta;
        gyroState.baseGamma = e.gamma;
      }
      const dBeta = Math.max(-24, Math.min(24, e.beta - gyroState.baseBeta));
      const dGamma = Math.max(-24, Math.min(24, e.gamma - gyroState.baseGamma));
      gyroState.rx = (-dBeta / 24) * 7.5;
      gyroState.ry = (dGamma / 24) * 8.5;
      gyroState.active = true;
    },
    { passive: true }
  );
}

export class SpatialCard3D {
  constructor(el, { maxTilt = 12, idleTilt = 3.2, glareVars = ['--glare-x', '--glare-y'] } = {}) {
    this.el = el;
    this.maxTilt = maxTilt;
    this.idleTilt = idleTilt;
    this.glareVars = glareVars;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.spring = new Spring2D({ stiffness: 250, damping: 21, mass: 1 });

    this.isPointerActive = false;
    this.pointerRx = 0;
    this.pointerRy = 0;
    this._phaseOffset = Math.random() * Math.PI * 2;
    this._rafId = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._tick = this._tick.bind(this);

    if (this.el) {
      initSilentGyroscope();
      this._bind();
    }
  }

  _bind() {
    this.el.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    this.el.addEventListener('pointermove', this._onPointerMove, { passive: true });
    this.el.addEventListener('pointerup', this._onPointerUp, { passive: true });
    this.el.addEventListener('pointercancel', this._onPointerUp, { passive: true });
    this.el.addEventListener('pointerleave', this._onPointerUp, { passive: true });

    if (!this.reducedMotion) {
      this._rafId = requestAnimationFrame(this._tick);
    }
  }

  /**
   * Applies a crisp 3D spring impulse when the user taps the card
   */
  impulse(rxBoost = -5.5, ryBoost = 5.5) {
    if (this.reducedMotion || !this.el) return;
    this.spring.setPosition(rxBoost, ryBoost);
    this.spring.animateTo(0, 0, {
      onUpdate: (rx, ry) => this._applyVars(rx, ry, 50 + ry * 2.6, 36 - rx * 2.6)
    });
  }

  destroy() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.spring.stop();
  }

  _updateFromPointer(e) {
    if (!this.el || this.reducedMotion) return;
    const rect = this.el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const cx = (nx - 0.5) * 2;
    const cy = (ny - 0.5) * 2;

    this.pointerRy = cx * this.maxTilt;
    this.pointerRx = -cy * this.maxTilt;

    this.spring.animateTo(this.pointerRx, this.pointerRy, {
      onUpdate: (rx, ry) => this._applyVars(rx, ry, nx * 100, ny * 100)
    });
  }

  _onPointerDown(e) {
    this.isPointerActive = true;
    this._updateFromPointer(e);
  }

  _onPointerMove(e) {
    if (e.pointerType === 'touch' && !this.isPointerActive) return;
    this.isPointerActive = true;
    this._updateFromPointer(e);
  }

  _onPointerUp() {
    if (!this.isPointerActive) return;
    this.isPointerActive = false;
    this.spring.animateTo(0, 0, {
      onUpdate: (rx, ry) => this._applyVars(rx, ry, 50 + ry * 2.4, 36 - rx * 2.4)
    });
  }

  _applyVars(rx, ry, gx, gy) {
    if (!this.el) return;
    this.el.style.setProperty('--tilt-rx', `${rx.toFixed(2)}deg`);
    this.el.style.setProperty('--tilt-ry', `${ry.toFixed(2)}deg`);
    const angle = 128 + ry * 3.4 - rx * 2.3;
    this.el.style.setProperty('--foil-angle', `${angle.toFixed(1)}deg`);

    const [vx, vy] = this.glareVars;
    if (vx) this.el.style.setProperty(vx, `${gx.toFixed(1)}%`);
    if (vy) this.el.style.setProperty(vy, `${gy.toFixed(1)}%`);
  }

  _tick(now) {
    if (!this.isPointerActive && this.el) {
      const parentAct = this.el.closest('.act');
      const hiddenWrap = this.el.closest('[aria-hidden="true"]');
      const isVisible = (!parentAct || parentAct.classList.contains('is-active')) && !hiddenWrap;
      if (isVisible) {
        const t = now * 0.0011 + this._phaseOffset;
        const gyroRx = gyroState.active ? gyroState.rx : 0;
        const gyroRy = gyroState.active ? gyroState.ry : 0;
        const idleRx = Math.sin(t) * this.idleTilt + gyroRx + this.spring.x * 0.42;
        const idleRy = Math.cos(t * 0.78) * (this.idleTilt * 1.18) + gyroRy + this.spring.y * 0.42;
        const gx = 50 + Math.cos(t * 0.9) * 28 + gyroRy * 2.2;
        const gy = 34 + Math.sin(t * 1.15) * 22 - gyroRx * 2.2;
        this._applyVars(idleRx, idleRy, gx, gy);
      }
    }
    this._rafId = requestAnimationFrame(this._tick);
  }
}
