/**
 * Main Application Orchestrator — Seher's Apple-Native Birthday Experience
 * Streamlined Flow:
 *  Stage 1: Happy Birthday, Seher (Apple Invites Liquid Glass Card)
 *  Stage 2: Touch & Hold Finger on the Light (Awakens Seher Dawn Sunrise)
 *  Stage 3: Ali's Birthday Note Sheet + Keepsake Pass
 */

import { APP_CONFIG } from './config.js?v=2';
import { ThemeEngine } from './theme-engine.js?v=2';
import { I18nEngine } from './i18n.js?v=2';
import { SoundEngine } from './audio.js?v=2';
import { CanvasFX } from './canvas-fx.js?v=2';
import { VelocityTracker, rubberBand } from './spring.js?v=2';
import { SpatialCard3D } from './spatial-tilt.js?v=2';

class BirthdayExperienceApp {
  constructor() {
    this.themeEngine = new ThemeEngine(APP_CONFIG.defaultTheme);
    this.i18n = new I18nEngine(APP_CONFIG);
    this.sound = new SoundEngine(APP_CONFIG.audio);
    this.canvasFx = null;
    this._sigObserver = null;
    this.spatialCards = [];
    this.isEnvelopeUnsealing = false;
    this._envelopeTimer = null;

    this.currentAct = 1;

    // Stage 2 Hold-to-Unlock State
    this.wishState = 'idle'; // 'idle' | 'holding' | 'completed'
    this.wishProgress = 0;
    this._wishMilestoneStep = 0;
    this._wishRaf = null;
    this._wishLastTime = 0;
    this._wishTransitionTimer = null;

    // Stage 3 Bottom Sheet State
    this.isSheetOpen = false;
    this._hasPlayedSigChime = false;
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
      this.canvasFx.triggerWarpBurst(0.88);
    }

    // Gentle celestial starburst when tapping open sky outside controls/sheet
    const stageScaler = document.querySelector('.app-stage-scaler');
    stageScaler?.addEventListener('pointerdown', (e) => {
      if (this.isSheetOpen) return;
      if (e.target.closest('button, a, .keepsake-pass, .envelope-3d-scene')) return;
      this.canvasFx?.spawnMiniBurst(e.clientX, e.clientY, 12);
    });

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
      this.spatialCards.push(
        new SpatialCard3D(inviteCard, {
          maxTilt: 10.5,
          idleTilt: 2.6,
          glareVars: ['--glare-x', '--glare-y']
        })
      );
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (APP_CONFIG.audio.autoStartOnFirstTap && !this.sound.isMuted) {
          this.sound.unlockAndStart();
        }
        this.sound.playTap(1.05);
        this.canvasFx?.triggerWarpBurst(1.45);
        if (this.wishState === 'completed') {
          this._resetWishState();
        }
        this.goToAct(2);
      });
    }
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
      document.getElementById('wish-orb-wrap')?.classList.add('is-charging');
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
      document.getElementById('wish-orb-wrap')?.classList.remove('is-charging');
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
      if (this.wishProgress >= 0.34 && this._wishMilestoneStep < 1) {
        this._wishMilestoneStep = 1;
        this.sound.playHarmonicMilestone(1);
        this.canvasFx?.triggerMilestoneRipple(0.5, 0.52);
      } else if (this.wishProgress >= 0.68 && this._wishMilestoneStep < 2) {
        this._wishMilestoneStep = 2;
        this.sound.playHarmonicMilestone(2);
        this.canvasFx?.triggerMilestoneRipple(0.5, 0.52);
      }
      this._renderWishProgress();
      this.sound.setWishProgress(this.wishProgress);

      if (this.wishProgress >= 1) {
        this._completeWish();
        return;
      }
      this._wishRaf = requestAnimationFrame((t) => this._stepWishLoop(t));
    } else if (this.wishState === 'idle' && this.wishProgress > 0) {
      this.wishProgress = Math.max(0, this.wishProgress - dt / 650);
      if (this.wishProgress < 0.3) this._wishMilestoneStep = 0;
      else if (this.wishProgress < 0.64) this._wishMilestoneStep = 1;
      this._renderWishProgress();
      if (this.wishProgress > 0) {
        this._wishRaf = requestAnimationFrame((t) => this._stepWishLoop(t));
      }
    }
  }

  _renderWishProgress() {
    const ringFill = document.getElementById('wish-ring-fill');
    const sparkHead = document.getElementById('wish-spark-head');
    const orbWrap = document.getElementById('wish-orb-wrap');
    const circumference = 540.35;

    if (ringFill) {
      const offset = circumference * (1 - this.wishProgress);
      ringFill.style.strokeDashoffset = offset.toFixed(2);
    }
    if (sparkHead) {
      const showSpark = this.wishProgress > 0.015 && this.wishProgress < 0.998;
      sparkHead.style.opacity = showSpark ? '1' : '0';
      sparkHead.style.transform = `rotate(${(this.wishProgress * 360).toFixed(1)}deg)`;
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
    document.getElementById('wish-orb-wrap')?.classList.remove('is-charging');

    this.sound.stopWishHum(true);
    this.themeEngine.apply(APP_CONFIG.wishAwakensTheme || 'seher-dawn');
    this._syncSkyThemePillUi();

    if (this.canvasFx) {
      this.canvasFx.setWishCharge(0);
      this.canvasFx.triggerSunriseShockwave(0.5, 0.52);
      this.canvasFx.triggerCelebration(0.5, 0.48);
    }
    this._syncWishTextUi();

    // Glide forward through golden sunrise light to present Ali's 3D Wax-Sealed Envelope!
    this._setAct3Mode('envelope');
    clearTimeout(this._wishTransitionTimer);
    this._wishTransitionTimer = setTimeout(() => {
      this.goToAct(3);
    }, 1150);
  }

  _resetWishState() {
    cancelAnimationFrame(this._wishRaf);
    clearTimeout(this._wishTransitionTimer);
    clearTimeout(this._envelopeTimer);
    this.isEnvelopeUnsealing = false;
    this.wishState = 'idle';
    this.wishProgress = 0;
    this._wishMilestoneStep = 0;
    const orbBtn = document.getElementById('wish-orb-btn');
    if (orbBtn) {
      orbBtn.classList.remove('is-holding', 'is-completed');
    }
    document.getElementById('wish-orb-wrap')?.classList.remove('is-charging');
    document.getElementById('envelope-3d-card')?.classList.remove('is-unsealing');
    document.getElementById('envelope-stage-wrap')?.classList.remove('is-unsealing');
    this._setAct3Mode('envelope');
    this._renderWishProgress();
    this._syncWishTextUi();
  }

  _setAct3Mode(mode) {
    const act3 = document.getElementById('act-3');
    const envWrap = document.getElementById('envelope-stage-wrap');
    const keepWrap = document.getElementById('keepsake-wrap');
    if (!act3) return;

    act3.setAttribute('data-act3-mode', mode);
    const isEnvelope = mode === 'envelope';
    if (envWrap) {
      envWrap.setAttribute('aria-hidden', isEnvelope ? 'false' : 'true');
      envWrap.inert = !isEnvelope;
    }
    if (keepWrap) {
      keepWrap.setAttribute('aria-hidden', isEnvelope ? 'true' : 'false');
      keepWrap.inert = isEnvelope;
    }
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
    const envelopeScene = document.getElementById('envelope-3d-scene');
    const envelopeCard = document.getElementById('envelope-3d-card');
    const envelopeSealBtn = document.getElementById('envelope-seal-btn');
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
    const progressBar = document.getElementById('sheet-progress-bar');
    const signoffEl = document.getElementById('letter-signoff-block');

    const updateReadProgress = () => {
      if (!scrollBody || !progressBar) return;
      const maxScroll = scrollBody.scrollHeight - scrollBody.clientHeight;
      const ratio = maxScroll <= 4 ? 1 : Math.max(0.06, Math.min(1, scrollBody.scrollTop / maxScroll));
      progressBar.style.setProperty('--read-progress', ratio.toFixed(3));
    };

    scrollBody?.addEventListener('scroll', updateReadProgress, { passive: true });
    this._updateReadProgress = updateReadProgress;

    if (sheet && scrollBody && signoffEl && typeof IntersectionObserver === 'function') {
      this._sigObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && this.isSheetOpen) {
              if (!sheet.classList.contains('is-signing')) {
                sheet.classList.add('is-signing');
                if (!this._hasPlayedSigChime) {
                  this._hasPlayedSigChime = true;
                  this.sound.playSignatureChime();
                }
              }
            }
          }
        },
        { root: scrollBody, threshold: 0.35 }
      );
      this._sigObserver.observe(signoffEl);
    }

    if (envelopeScene) {
      this.spatialCards.push(
        new SpatialCard3D(envelopeScene, {
          maxTilt: 11.5,
          idleTilt: 3.4,
          glareVars: []
        })
      );
    }

    if (keepsakePass) {
      const passSpatial = new SpatialCard3D(keepsakePass, {
        maxTilt: 13,
        idleTilt: 3.1,
        glareVars: ['--holo-x', '--holo-y']
      });
      this.spatialCards.push(passSpatial);

      const emblemMini = keepsakePass.querySelector('.keepsake-emblem-mini');
      keepsakePass.addEventListener('click', (e) => {
        this.sound.playSparkle();
        passSpatial.impulse(-6.2, 6.8);
        this.canvasFx?.spawnMiniBurst(e.clientX, e.clientY, 18);
        if (emblemMini) {
          emblemMini.classList.remove('is-spinning');
          void emblemMini.offsetWidth;
          emblemMini.classList.add('is-spinning');
          setTimeout(() => emblemMini.classList.remove('is-spinning'), 720);
        }
      });
    }

    envelopeSealBtn?.addEventListener('click', () => {
      if (this.isEnvelopeUnsealing) return;
      this.isEnvelopeUnsealing = true;
      this.sound.playEnvelopeUnseal();
      this.canvasFx?.triggerCelebration(0.5, 0.44);
      envelopeCard?.classList.add('is-unsealing');
      document.getElementById('envelope-stage-wrap')?.classList.add('is-unsealing');

      clearTimeout(this._envelopeTimer);
      this._envelopeTimer = setTimeout(() => {
        this._setAct3Mode('pass');
        this.openSheet();
      }, 1180);
    });

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
      this.canvasFx?.triggerWarpBurst(1.15);
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
    this._hasPlayedSigChime = false;
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
      this._updateReadProgress?.();
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
