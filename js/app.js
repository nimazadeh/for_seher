/**
 * Main Application Orchestrator — Seher's Apple-Native Birthday Experience
 * Streamlined Flow:
 *  Stage 1: Happy Birthday, Seher (Apple Invites Liquid Glass Card)
 *  Stage 2: Touch & Hold Finger on the Light (Awakens Seher Dawn Sunrise)
 *  Stage 3: Ali's Birthday Note Sheet + Keepsake Pass
 */

import { APP_CONFIG } from './config.js';
import { ThemeEngine } from './theme-engine.js';
import { I18nEngine } from './i18n.js';
import { SoundEngine } from './audio.js';
import { CanvasFX } from './canvas-fx.js';
import { VelocityTracker, rubberBand } from './spring.js';

class BirthdayExperienceApp {
  constructor() {
    this.themeEngine = new ThemeEngine(APP_CONFIG.defaultTheme);
    this.i18n = new I18nEngine(APP_CONFIG);
    this.sound = new SoundEngine(APP_CONFIG.audio);
    this.canvasFx = null;
    this._sigObserver = null;

    this.currentAct = 1;

    // Stage 2 Hold-to-Unlock State
    this.wishState = 'idle'; // 'idle' | 'holding' | 'completed'
    this.wishProgress = 0;
    this._wishRaf = null;
    this._wishLastTime = 0;
    this._wishTransitionTimer = null;

    // Stage 3 Bottom Sheet State
    this.isSheetOpen = false;
    this.sheetVelocity = new VelocityTracker();
    this._saveResetTimer = null;
  }

  init() {
    this.themeEngine.init();
    this.i18n.init();

    const canvas = document.getElementById('ambient-canvas');
    if (canvas) {
      this.canvasFx = new CanvasFX(canvas, this.themeEngine);
      this.canvasFx.start();
    }

    this._bindHud();
    this._bindAct1Welcome();
    this._bindAct2HoldToUnlock();
    this._bindAct3KeepsakeAndSheet();
    this._bindI18nDynamicSync();

    this._syncAudioPillUi(false, false);
    this._syncSkyThemePillUi();
    this._syncWishTextUi();
  }

  /* ========================================================================
     HUD: Language Pill & Dynamic Island Audio Capsule
     ======================================================================== */
  _bindHud() {
    document.querySelectorAll('[data-lang-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang-choice');
        this.sound.playTap(1.08);
        this.i18n.setLanguage(lang);
      });
    });

    const audioPill = document.getElementById('audio-pill');
    if (audioPill) {
      audioPill.addEventListener('click', () => {
        this.sound.toggleMute();
      });
    }

    this.sound.onStateChange((isPlaying, isMuted) => {
      this._syncAudioPillUi(isPlaying, isMuted);
    });
  }

  _syncAudioPillUi(isPlaying, isMuted) {
    const audioPill = document.getElementById('audio-pill');
    const audioLabel = document.getElementById('audio-pill-label');
    if (!audioPill || !audioLabel) return;

    const visibleText =
      isMuted && this.sound.isStarted
        ? this.i18n.t('hud.soundOff')
        : this.i18n.t('hud.soundOn');

    audioPill.setAttribute('data-playing', isPlaying ? 'true' : 'false');
    audioPill.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    audioLabel.textContent = visibleText;
    audioPill.setAttribute(
      'aria-label',
      `${visibleText} — ${this.i18n.t('hud.soundAriaLabel')}`
    );
  }

  _bindI18nDynamicSync() {
    this.i18n.onChange(() => {
      this._syncAudioPillUi(this.sound.isPlaying, this.sound.isMuted);
      this._syncWishTextUi();
      this._syncSkyThemePillUi();
    });
  }

  /* ========================================================================
     Stage Transitions (1 -> 2 -> 3)
     ======================================================================== */
  goToAct(actNumber) {
    if (actNumber < 1 || actNumber > 3) return;
    const prevAct = this.currentAct;
    this.currentAct = actNumber;

    document.querySelectorAll('.act').forEach((el) => {
      const idNum = Number(el.getAttribute('data-act'));
      el.classList.remove('is-active', 'is-exiting-left');
      if (idNum === actNumber) {
        el.classList.add('is-active');
        el.setAttribute('aria-hidden', 'false');
        el.inert = false;
      } else {
        if (idNum === prevAct && actNumber > prevAct) {
          el.classList.add('is-exiting-left');
        }
        el.setAttribute('aria-hidden', 'true');
        el.inert = true;
      }
    });
  }

  /* ========================================================================
     Stage 1 — Apple Invites Glass Welcome Card (Happy Birthday, Seher)
     ======================================================================== */
  _bindAct1Welcome() {
    const inviteCard = document.getElementById('invite-card');
    const startBtn = document.getElementById('start-journey-btn');

    if (inviteCard) {
      this._attachSpecularGlare(inviteCard, '--glare-x', '--glare-y');
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (APP_CONFIG.audio.autoStartOnFirstTap && !this.sound.isMuted) {
          this.sound.unlockAndStart();
        }
        this.sound.playTap(1.05);
        if (this.wishState === 'completed') {
          this._resetWishState();
        }
        this.goToAct(2);
      });
    }
  }

  _attachSpecularGlare(cardEl, varX, varY) {
    const updateGlare = (clientX, clientY) => {
      const rect = cardEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      cardEl.style.setProperty(varX, `${xPct.toFixed(1)}%`);
      cardEl.style.setProperty(varY, `${yPct.toFixed(1)}%`);
    };

    cardEl.addEventListener(
      'pointermove',
      (e) => {
        updateGlare(e.clientX, e.clientY);
      },
      { passive: true }
    );
  }

  /* ========================================================================
     Stage 2 — Touch & Hold Finger to Awaken Sunrise & Reveal Ali's Message
     ======================================================================== */
  _bindAct2HoldToUnlock() {
    const orbBtn = document.getElementById('wish-orb-btn');
    if (!orbBtn) return;

    orbBtn.addEventListener('contextmenu', (e) => e.preventDefault());

    const beginHold = (e) => {
      if (this.currentAct !== 2 || this.wishState === 'completed') return;
      if (e.type === 'pointerdown' && e.button !== undefined && e.button !== 0) return;

      if (APP_CONFIG.audio.autoStartOnFirstTap && !this.sound.isMuted) {
        this.sound.unlockAndStart();
      }

      this.wishState = 'holding';
      orbBtn.classList.add('is-holding');
      this.sound.startWishHum();
      this._syncWishTextUi();

      this._wishLastTime = performance.now();
      cancelAnimationFrame(this._wishRaf);
      this._wishRaf = requestAnimationFrame((now) => this._stepWishLoop(now));
    };

    const endHold = () => {
      if (this.wishState !== 'holding') return;
      this.wishState = 'idle';
      orbBtn.classList.remove('is-holding');
      this.sound.stopWishHum(false);
      this._syncWishTextUi();

      this._wishLastTime = performance.now();
      cancelAnimationFrame(this._wishRaf);
      this._wishRaf = requestAnimationFrame((now) => this._stepWishLoop(now));
    };

    orbBtn.addEventListener('pointerdown', beginHold);
    window.addEventListener('pointerup', endHold);
    window.addEventListener('pointercancel', endHold);

    orbBtn.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        beginHold(e);
      }
    });
    orbBtn.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        endHold();
      }
    });
  }

  _stepWishLoop(now) {
    const rawDt = now - this._wishLastTime;
    const dt = Math.max(4, Math.min(rawDt > 0 ? rawDt : 16, 600));
    this._wishLastTime = now;

    if (this.wishState === 'holding') {
      this.wishProgress = Math.min(
        1,
        this.wishProgress + dt / APP_CONFIG.wishHoldDurationMs
      );
      this._renderWishProgress();
      this.sound.setWishProgress(this.wishProgress);

      if (this.wishProgress >= 1) {
        this._completeWish();
        return;
      }
      this._wishRaf = requestAnimationFrame((t) => this._stepWishLoop(t));
    } else if (this.wishState === 'idle' && this.wishProgress > 0) {
      this.wishProgress = Math.max(0, this.wishProgress - dt / 650);
      this._renderWishProgress();
      if (this.wishProgress > 0) {
        this._wishRaf = requestAnimationFrame((t) => this._stepWishLoop(t));
      }
    }
  }

  _renderWishProgress() {
    const ringFill = document.getElementById('wish-ring-fill');
    const orbWrap = document.getElementById('wish-orb-wrap');
    const circumference = 540.35;

    if (ringFill) {
      const offset = circumference * (1 - this.wishProgress);
      ringFill.style.strokeDashoffset = offset.toFixed(2);
    }
    if (orbWrap) {
      orbWrap.style.setProperty('--wish-charge', this.wishProgress.toFixed(3));
    }
    if (this.canvasFx) {
      this.canvasFx.setWishCharge(this.wishProgress, 0.5, 0.52);
    }
  }

  _completeWish() {
    cancelAnimationFrame(this._wishRaf);
    this.wishState = 'completed';
    this.wishProgress = 1;
    this._renderWishProgress();

    const orbBtn = document.getElementById('wish-orb-btn');
    if (orbBtn) {
      orbBtn.classList.remove('is-holding');
      orbBtn.classList.add('is-completed');
    }

    this.sound.stopWishHum(true);
    this.themeEngine.apply(APP_CONFIG.wishAwakensTheme || 'seher-dawn');
    this._syncSkyThemePillUi();

    if (this.canvasFx) {
      this.canvasFx.setWishCharge(0);
      this.canvasFx.triggerSunriseShockwave(0.5, 0.52);
      this.canvasFx.triggerCelebration(0.5, 0.48);
    }
    this._syncWishTextUi();

    // Let the golden shockwave & opening Music-Box "Happy Birthday" notes bloom
    // across the awakening Seher Dawn sky, then glide Ali's note smoothly open!
    clearTimeout(this._wishTransitionTimer);
    this._wishTransitionTimer = setTimeout(() => {
      this.goToAct(3);
      setTimeout(() => {
        this.openSheet();
      }, 280);
    }, 1250);
  }

  _resetWishState() {
    cancelAnimationFrame(this._wishRaf);
    clearTimeout(this._wishTransitionTimer);
    this.wishState = 'idle';
    this.wishProgress = 0;
    const orbBtn = document.getElementById('wish-orb-btn');
    if (orbBtn) {
      orbBtn.classList.remove('is-holding', 'is-completed');
    }
    this._renderWishProgress();
    this._syncWishTextUi();
  }

  _syncWishTextUi() {
    const subtitle = document.getElementById('wish-subtitle');
    const statusText = document.getElementById('wish-status-text');
    if (!subtitle || !statusText) return;

    if (this.wishState === 'holding') {
      subtitle.textContent = this.i18n.t('act2.subtitleHolding');
      statusText.textContent = this.i18n.t('act2.statusHolding');
    } else if (this.wishState === 'completed') {
      subtitle.textContent = this.i18n.t('act2.subtitleDone');
      statusText.textContent = this.i18n.t('act2.statusDone');
    } else {
      subtitle.textContent = this.i18n.t('act2.subtitleIdle');
      statusText.textContent = this.i18n.t('act2.statusIdle');
    }
  }

  /* ========================================================================
     Stage 3 — Holographic Keepsake Pass + Draggable iOS Bottom Sheet
     ======================================================================== */
  _bindAct3KeepsakeAndSheet() {
    const keepsakePass = document.getElementById('keepsake-pass');
    const skyThemePill = document.getElementById('sky-theme-pill');
    const openNoteBtn = document.getElementById('open-note-btn');
    const replayBtn = document.getElementById('replay-journey-btn');

    const sheet = document.getElementById('birthday-sheet');
    const scrim = document.getElementById('sheet-scrim');
    const dragHeader = document.getElementById('sheet-drag-header');
    const closeBtn = document.getElementById('sheet-close-btn');
    const viewPassBtn = document.getElementById('view-pass-btn');

    // Trigger live golden "Ali" signature right when user scrolls down to the sign-off!
    const scrollBody = sheet ? sheet.querySelector('.sheet-scroll-body') : null;
    const signoffEl = document.getElementById('letter-signoff-block');
    if (sheet && scrollBody && signoffEl && typeof IntersectionObserver === 'function') {
      this._sigObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && this.isSheetOpen) {
              sheet.classList.add('is-signing');
            }
          }
        },
        { root: scrollBody, threshold: 0.35 }
      );
      this._sigObserver.observe(signoffEl);
    }

    if (keepsakePass) {
      this._attachSpecularGlare(keepsakePass, '--holo-x', '--holo-y');
    }

    skyThemePill?.addEventListener('click', () => {
      this.sound.playTap(1.12);
      this.themeEngine.toggleDawn();
      this._syncSkyThemePillUi();
    });

    openNoteBtn?.addEventListener('click', () => {
      this.sound.playTap(1.06);
      this.openSheet();
    });

    replayBtn?.addEventListener('click', () => {
      this.sound.playTap(0.96);
      this.closeSheet();
      this.themeEngine.apply(APP_CONFIG.defaultTheme || 'dark-liquid');
      this._syncSkyThemePillUi();
      this._resetWishState();
      this.goToAct(1);
    });

    closeBtn?.addEventListener('click', () => {
      this.sound.playTap(0.95);
      this.closeSheet();
    });

    viewPassBtn?.addEventListener('click', () => {
      this.sound.playTap(0.98);
      this.closeSheet();
    });

    scrim?.addEventListener('click', () => {
      this.closeSheet();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isSheetOpen) {
        this.closeSheet();
      }
    });

    // Native iOS Drag-to-Dismiss on Sheet Header / Grabber
    if (dragHeader && sheet) {
      let dragPointerId = null;
      let startY = 0;
      let currentDy = 0;

      dragHeader.addEventListener('pointerdown', (e) => {
        if (!this.isSheetOpen) return;
        if (closeBtn && closeBtn.contains(e.target)) return;

        dragPointerId = e.pointerId;
        startY = e.clientY;
        currentDy = 0;
        this.sheetVelocity.reset();
        this.sheetVelocity.addPoint(e.clientX, e.clientY);
        sheet.classList.add('is-dragging');

        try {
          dragHeader.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic pointer capture error
        }
      });

      dragHeader.addEventListener('pointermove', (e) => {
        if (e.pointerId !== dragPointerId) return;
        const rawDy = e.clientY - startY;
        currentDy = rawDy >= 0 ? rawDy : rubberBand(rawDy, 36, 0.35);
        this.sheetVelocity.addPoint(e.clientX, e.clientY);

        sheet.style.transform = `translate3d(0, ${currentDy.toFixed(1)}px, 0)`;

        const scaler = document.querySelector('.app-stage-scaler');
        if (scaler && currentDy > 0) {
          const t = Math.min(1, currentDy / 280);
          const scale = 0.935 + t * 0.065;
          const yShift = 8 * (1 - t);
          scaler.style.transition = 'none';
          scaler.style.transform = `scale(${scale.toFixed(4)}) translateY(${yShift.toFixed(1)}px)`;
        }
      });

      const endSheetDrag = (e) => {
        if (e.pointerId !== dragPointerId) return;
        dragPointerId = null;
        sheet.classList.remove('is-dragging');

        const scaler = document.querySelector('.app-stage-scaler');
        if (scaler) {
          scaler.style.transition = '';
          scaler.style.transform = '';
        }

        const { vy } = this.sheetVelocity.getVelocity();
        if (currentDy > 95 || vy > 0.5) {
          sheet.style.transform = '';
          this.closeSheet();
        } else {
          sheet.style.transform = '';
        }
      };

      dragHeader.addEventListener('pointerup', endSheetDrag);
      dragHeader.addEventListener('pointercancel', endSheetDrag);
    }
  }

  _syncSkyThemePillUi() {
    const label = document.getElementById('sky-theme-label');
    if (!label) return;
    const isDawn = this.themeEngine.currentThemeId === 'seher-dawn';
    label.textContent = isDawn
      ? this.i18n.t('act3.skyToggleDawn')
      : this.i18n.t('act3.skyToggleNight');
  }

  openSheet() {
    const viewport = document.querySelector('.app-viewport');
    const sheet = document.getElementById('birthday-sheet');
    const scrim = document.getElementById('sheet-scrim');
    if (!sheet || !scrim || !viewport) return;

    this.isSheetOpen = true;
    sheet.classList.remove('is-signing');
    viewport.classList.add('sheet-open');
    scrim.classList.add('is-open');
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    sheet.inert = false;
    const scrollBody = sheet.querySelector('.sheet-scroll-body');
    if (scrollBody) {
      scrollBody.scrollTop = 0;
    }

    requestAnimationFrame(() => {
      const signoffEl = document.getElementById('letter-signoff-block');
      if (this._sigObserver && signoffEl) {
        this._sigObserver.unobserve(signoffEl);
        this._sigObserver.observe(signoffEl);
      } else if (this.isSheetOpen) {
        sheet.classList.add('is-signing');
      }
    });
  }

  closeSheet() {
    const viewport = document.querySelector('.app-viewport');
    const sheet = document.getElementById('birthday-sheet');
    const scrim = document.getElementById('sheet-scrim');
    if (!sheet || !scrim || !viewport) return;

    this.isSheetOpen = false;
    viewport.classList.remove('sheet-open');
    scrim.classList.remove('is-open');
    sheet.classList.remove('is-open', 'is-signing');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.inert = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new BirthdayExperienceApp();
  app.init();
  window.__birthdayApp = app;
});
