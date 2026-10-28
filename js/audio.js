/**
 * Dual-Engine Studio Song Player (`Shirin David - Brillis`) + Tactile Micro-SFX
 * & Crystalline Celesta "Happy Birthday" Sunrise Crescendo
 *
 * Why this architecture is 100% bulletproof across Safari, iOS, Chrome, Edge & Localhost:
 *  1. Uses native `HTMLAudioElement` (`new Audio()`) unlocked synchronously inside the
 *     first user click gesture — plays EVERY real-world `.mp3`, `.m4a`, `.aac`, `.ogg`,
 *     or YouTube-converted audio file without `AudioContext.decodeAudioData` failures!
 *  2. Cache-busted check on `./assets/music.mp3?v=...`:
 *     - If Ali placed a real song (`>= 25 KB`), plays his full local song from an
 *       instant in-memory Blob URL.
 *     - Otherwise (`< 25 KB` placeholder), automatically streams the official studio
 *       chorus preview of **Shirin David – "Brillis"** from Apple Music's public API!
 *  3. Smoothly fades in over 1.45s on tap 1, and automatically ducks `Brillis` down to
 *     ~17% volume during the 2.2s Hold-Completion Celesta "Happy Birthday" melody before
 *     swelling smoothly back up as Ali's golden calligraphic signature draws itself.
 */

const MIN_REAL_MP3_BYTES = 25000;

export class SoundEngine {
  constructor(audioConfig = {}) {
    this.config = audioConfig;
    this.ctx = null;
    this.masterGain = null;
    this.melodicBus = null;
    this.sfxBus = null;

    this.isMuted = false;
    this.isStarted = false;
    this.isPlaying = false;

    // Native HTML5 Audio element for 100% codec compatibility + synchronous iOS unlock
    this._bgAudio = new window.Audio();
    this._bgAudio.loop = true;
    this._bgAudio.preload = 'auto';
    this._bgAudio.playsInline = true;

    this._targetSongVol = audioConfig.songVolume ?? 0.2;
    this._fadeFactor = 0.02;
    this._duckFactor = 1.0;
    this._loopDipFactor = 1.0;

    this._resolvedTrackUrl = audioConfig.fallbackPreviewUrl || null;
    this._isLocalFullTrack = false;
    this._blobObjectUrl = null;
    this._envelopeRaf = null;
    this._duckStartPerf = 0;
    this._fadeStartPerf = 0;

    this._wishOsc = null;
    this._wishGain = null;
    this._wishFilter = null;

    this.listeners = new Set();

    // Smooth micro-crossfade at loop boundary when playing 30s Apple Music chorus stream
    this._bgAudio.addEventListener('timeupdate', () => {
      if (this._isLocalFullTrack) {
        this._loopDipFactor = 1.0;
        return;
      }
      const dur = this._bgAudio.duration;
      const cur = this._bgAudio.currentTime;
      if (Number.isFinite(dur) && dur > 8 && dur < 45) {
        const rem = dur - cur;
        if (rem < 0.75) {
          this._loopDipFactor = Math.max(0.22, rem / 0.75);
        } else if (cur < 0.65) {
          this._loopDipFactor = Math.max(0.22, Math.min(1.0, 0.22 + (cur / 0.65) * 0.78));
        } else {
          this._loopDipFactor = 1.0;
        }
        this._applySongVolume();
      }
    });

    // Resolve local full MP3 vs. official Shirin David "Brillis" chorus stream on startup
    this._resolveSongSource();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
        if (!this._bgAudio.paused) {
          this._bgAudio.pause();
        }
      } else if (this.isStarted && !this.isMuted) {
        if (this.ctx) {
          this.ctx.resume().catch(() => {});
        }
        this._bgAudio.play().catch(() => {});
      }
    });
  }

  onStateChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  _emit() {
    const active = this.isStarted && !this.isMuted;
    this.isPlaying = active;
    for (const cb of this.listeners) {
      cb(active, this.isMuted);
    }
  }

  _applySongVolume() {
    if (this.isMuted) {
      this._bgAudio.volume = 0;
      return;
    }
    const v = this._targetSongVol * this._fadeFactor * this._duckFactor * this._loopDipFactor;
    this._bgAudio.volume = Math.max(0, Math.min(1, v));
  }

  async _resolveSongSource() {
    const baseLocal = this.config.customTrackUrl || './assets/music.mp3';
    const bustUrl = `${baseLocal}${baseLocal.includes('?') ? '&' : '?'}v=${Date.now()}`;

    try {
      const res = await window.fetch(bustUrl, { cache: 'no-store' });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size >= MIN_REAL_MP3_BYTES) {
          if (this._blobObjectUrl) {
            window.URL.revokeObjectURL(this._blobObjectUrl);
          }
          this._blobObjectUrl = window.URL.createObjectURL(blob);
          this._resolvedTrackUrl = this._blobObjectUrl;
          this._isLocalFullTrack = true;
          this._swapAndContinueIfStarted(this._blobObjectUrl);
          return;
        }
      }
    } catch {
      // Ignore fetch errors (e.g. strict offline sandbox) and fall through cleanly
    }

    // Fallback: Official Apple Music DE public chorus preview of Shirin David - "Brillis"
    if (this.config.fallbackPreviewUrl) {
      this._resolvedTrackUrl = this.config.fallbackPreviewUrl;
      if (!this._bgAudio.src) {
        this._bgAudio.src = this._resolvedTrackUrl;
      }
    }

    // Refresh official preview URL dynamically from Apple iTunes Lookup API if online
    if (this.config.itunesLookupUrl) {
      try {
        const lookupRes = await window.fetch(this.config.itunesLookupUrl);
        if (lookupRes.ok) {
          const data = await lookupRes.json();
          const freshUrl =
            data &&
            Array.isArray(data.results) &&
            data.results[0] &&
            data.results[0].previewUrl;
          if (freshUrl && !this._isLocalFullTrack && freshUrl !== this._resolvedTrackUrl) {
            this._resolvedTrackUrl = freshUrl;
            this._swapAndContinueIfStarted(freshUrl);
          }
        }
      } catch {
        // Offline or sandboxed environment — keep existing fallbackPreviewUrl silently
      }
    }
  }

  _swapAndContinueIfStarted(newUrl) {
    if (!newUrl) return;
    const wasPlaying = this.isStarted && !this.isMuted;
    if (this._bgAudio.src !== newUrl) {
      this._bgAudio.src = newUrl;
      if (wasPlaying) {
        this._applySongVolume();
        this._bgAudio.play().catch(() => {});
      }
    }
  }

  _startEnvelopeLoop() {
    if (this._envelopeRaf) return;
    const step = (nowPerf) => {
      let keepRunning = false;

      // 1. 1.45s Studio Fade-In Envelope
      if (this._fadeStartPerf > 0) {
        const elapsed = (nowPerf - this._fadeStartPerf) / 1450;
        if (elapsed >= 1) {
          this._fadeFactor = 1.0;
          this._fadeStartPerf = 0;
        } else {
          this._fadeFactor = 0.03 + Math.max(0, elapsed) * 0.97;
          keepRunning = true;
        }
      }

      // 2. Sunrise "Happy Birthday" Celesta Auto-Ducking Envelope
      if (this._duckStartPerf > 0) {
        const tSec = (nowPerf - this._duckStartPerf) / 1000;
        if (tSec < 0.24) {
          // Smoothly dip down to 0.17 over 240ms
          const p = Math.max(0, tSec / 0.24);
          this._duckFactor = 1.0 - p * 0.83;
          keepRunning = true;
        } else if (tSec < 2.9) {
          // Hold softly underneath while the Celesta "Happy Birthday" melody sparkles
          this._duckFactor = 0.17;
          keepRunning = true;
        } else if (tSec < 4.35) {
          // Smoothly swell Shirin David - Brillis back up as Ali's signature draws!
          const p = (tSec - 2.9) / 1.45;
          this._duckFactor = 0.17 + Math.min(1, p) * 0.83;
          keepRunning = true;
        } else {
          this._duckFactor = 1.0;
          this._duckStartPerf = 0;
        }
      }

      this._applySongVolume();

      if (keepRunning) {
        this._envelopeRaf = window.requestAnimationFrame(step);
      } else {
        this._envelopeRaf = null;
      }
    };

    this._envelopeRaf = window.requestAnimationFrame(step);
  }

  _ensureContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;
      this.masterGain.connect(this.ctx.destination);

      const synthWarmth = this.ctx.createBiquadFilter();
      synthWarmth.type = 'lowpass';
      synthWarmth.frequency.value = 6800;
      synthWarmth.Q.value = 0.45;
      synthWarmth.connect(this.masterGain);

      this.melodicBus = this.ctx.createGain();
      this.melodicBus.gain.value = 0.65;

      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = 0.28;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.22;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1450;

      this.melodicBus.connect(synthWarmth);
      this.melodicBus.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(feedback);
      feedback.connect(delay);
      delayFilter.connect(synthWarmth);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.56;
      this.sfxBus.connect(synthWarmth);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synchronously unlocks both HTML5 `<audio>` (`Brillis`) and Web Audio (`Celesta` + SFX)
   * directly inside the user's first tap gesture!
   */
  unlockAndStart() {
    if (this.isMuted) return;

    // 1. Unlock & start song synchronously inside click gesture (100% iOS/Chrome safe!)
    if (!this._bgAudio.src && this._resolvedTrackUrl) {
      this._bgAudio.src = this._resolvedTrackUrl;
    }
    if (!this.isStarted) {
      this._fadeFactor = 0.03;
      this._fadeStartPerf = window.performance.now();
      this._applySongVolume();
      this._startEnvelopeLoop();
    }
    if (this._bgAudio.src) {
      this._bgAudio.play().catch(() => {});
    }

    // 2. Unlock Web Audio context for micro-SFX + Hold-to-Wish Celesta crescendo
    if (this._ensureContext()) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.isStarted) {
        const now = this.ctx.currentTime;
        const targetVol = this.config.masterVolume ?? 0.78;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(0.0001, now);
        this.masterGain.gain.linearRampToValueAtTime(targetVol, now + 0.5);
      }
    }

    if (!this.isStarted) {
      this.isStarted = true;
      this._emit();
    }
  }

  toggleMute() {
    if (!this.isStarted) {
      this.isMuted = false;
      this.unlockAndStart();
      this.playTap(1.1);
      return;
    }

    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this._applySongVolume();
      this._bgAudio.pause();
    } else {
      this._fadeFactor = 1.0;
      this._applySongVolume();
      if (this._bgAudio.src) {
        this._bgAudio.play().catch(() => {});
      }
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);

      if (this.isMuted) {
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
      } else {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        const targetVol = this.config.masterVolume ?? 0.78;
        this.masterGain.gain.linearRampToValueAtTime(targetVol, now + 0.28);
        this.playTap(1.12);
      }
    }
    this._emit();
  }

  _playFeltNote(freq, startTime, duration, peakGain, type = 'sine') {
    if (!this.ctx || !this.melodicBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.melodicBus);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Subtle iOS glass micro-tap feedback
   */
  playTap(pitch = 1.0) {
    if (this.isMuted || !this.ctx || !this.sfxBus) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(240 * pitch, now + 0.032);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.036);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Continuous rising harmonic glow during Hold-to-Wish (G4 -> G5)
   */
  startWishHum() {
    if (this.isMuted || !this.ctx || !this.sfxBus) return;
    if (this.ctx.state !== 'running') return;
    this.stopWishHum(false);

    const now = this.ctx.currentTime;
    this._wishOsc = this.ctx.createOscillator();
    this._wishFilter = this.ctx.createBiquadFilter();
    this._wishGain = this.ctx.createGain();

    this._wishOsc.type = 'triangle';
    this._wishOsc.frequency.setValueAtTime(392.0, now);

    this._wishFilter.type = 'lowpass';
    this._wishFilter.frequency.setValueAtTime(480, now);

    this._wishGain.gain.setValueAtTime(0.0001, now);
    this._wishGain.gain.linearRampToValueAtTime(0.062, now + 0.2);

    this._wishOsc.connect(this._wishFilter);
    this._wishFilter.connect(this._wishGain);
    this._wishGain.connect(this.sfxBus);

    this._wishOsc.start(now);
  }

  setWishProgress(progress) {
    if (!this._wishOsc || !this._wishFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, progress));
    this._wishOsc.frequency.setTargetAtTime(392.0 + clamped * 392.0, now, 0.06);
    this._wishFilter.frequency.setTargetAtTime(480 + clamped * 1700, now, 0.06);
  }

  stopWishHum(completed = false) {
    if (this._wishOsc && this._wishGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this._wishGain.gain.cancelScheduledValues(now);
        this._wishGain.gain.setValueAtTime(this._wishGain.gain.value, now);
        this._wishGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        this._wishOsc.stop(now + 0.22);
      } catch {
        // Ignore already-stopped oscillator
      }
    }
    this._wishOsc = null;
    this._wishGain = null;
    this._wishFilter = null;

    if (completed) {
      this.playBirthdaySunriseCrescendo();
    }
  }

  /**
   * Crystalline Swiss Music-Box / Celesta Tine Synthesizer
   */
  _playCelestaTine(freq, startTime, duration, peakGain) {
    if (!this.ctx || !this.masterGain) return;

    const fund = this.ctx.createOscillator();
    const oct = this.ctx.createOscillator();
    const bell = this.ctx.createOscillator();

    const mainGain = this.ctx.createGain();
    const octGain = this.ctx.createGain();
    const bellGain = this.ctx.createGain();

    fund.type = 'sine';
    fund.frequency.setValueAtTime(freq, startTime);

    oct.type = 'triangle';
    oct.frequency.setValueAtTime(freq * 2, startTime);

    bell.type = 'sine';
    bell.frequency.setValueAtTime(freq * 3, startTime);

    mainGain.gain.setValueAtTime(0.0001, startTime);
    mainGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    octGain.gain.setValueAtTime(0.0001, startTime);
    octGain.gain.linearRampToValueAtTime(peakGain * 0.2, startTime + 0.008);
    octGain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + Math.min(0.42, duration)
    );

    bellGain.gain.setValueAtTime(0.0001, startTime);
    bellGain.gain.linearRampToValueAtTime(peakGain * 0.12, startTime + 0.005);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

    fund.connect(mainGain);
    oct.connect(octGain);
    bell.connect(bellGain);
    octGain.connect(mainGain);
    bellGain.connect(mainGain);
    mainGain.connect(this.masterGain);

    const stopAt = startTime + duration + 0.05;
    fund.start(startTime);
    oct.start(startTime);
    bell.start(startTime);
    fund.stop(stopAt);
    oct.stop(stopAt);
    bell.stop(stopAt);
  }

  /**
   * Cinematic Sunrise Unlock Crescendo:
   * Gently ducks Shirin David's song (`_duckFactor` -> 0.17) while a crystal
   * Music-Box / Celesta plays "Happy Birthday to You" in G Major (D5-D5-E5-D5-G5-F#5)
   * over a warm sunrise harp bloom, then swells the song smoothly back up!
   */
  playBirthdaySunriseCrescendo() {
    if (this.isMuted) return;

    // 1. Duck Shirin David - "Brillis" smoothly during the Celesta melody
    this._duckStartPerf = window.performance.now();
    this._startEnvelopeLoop();

    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 2. "Hap-py Birth-day to you" in G Major (expressive music-box phrasing)
    const motif = [
      { freq: 587.33, offset: 0.05, dur: 0.36, gain: 0.125 }, // D5 ("Hap-")
      { freq: 587.33, offset: 0.31, dur: 0.30, gain: 0.115 }, // D5 ("-py")
      { freq: 659.25, offset: 0.54, dur: 0.64, gain: 0.14  }, // E5 ("Birth-")
      { freq: 587.33, offset: 1.06, dur: 0.64, gain: 0.13  }, // D5 ("-day")
      { freq: 783.99, offset: 1.60, dur: 0.72, gain: 0.155 }, // G5 ("to")
      { freq: 739.99, offset: 2.18, dur: 1.65, gain: 0.145 }  // F#5 ("you...")
    ];

    motif.forEach((n) => {
      this._playCelestaTine(n.freq, now + n.offset, n.dur, n.gain);
    });

    // 3. Soft shimmering Gmaj7 -> Dmaj9 sunrise harp halo underneath
    const openPad = [392.0, 493.88, 587.33];
    openPad.forEach((f, i) => {
      this._playCelestaTine(f, now + 0.04 + i * 0.045, 1.5, 0.044);
    });

    const resolvePad = [293.66, 369.99, 440.0, 587.33];
    resolvePad.forEach((f, i) => {
      this._playCelestaTine(f, now + 2.18 + i * 0.05, 1.75, 0.042);
    });
  }

  /**
   * Radiant golden starlight Gmaj9 chord bloom
   */
  playSparkle() {
    if (this.isMuted || !this.ctx || !this.melodicBus) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const chord = [392.0, 493.88, 587.33, 739.99, 880.0];
    chord.forEach((freq, i) => {
      this._playFeltNote(freq, now + i * 0.058, 1.9, 0.042, 'sine');
    });
  }

  /**
   * Crystalline 3D Wax-Gold Envelope Unseal Harp Glissando
   */
  playEnvelopeUnseal() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98];
    notes.forEach((freq, i) => {
      this._playCelestaTine(freq, now + i * 0.068, 1.35, 0.088 - i * 0.01);
    });
  }

  /**
   * Harmonic charge milestone bell at 33% & 66% orb hold
   */
  playHarmonicMilestone(step = 1) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const freq = step <= 1 ? 783.99 : 987.77;
    this._playCelestaTine(freq, now, 0.55, 0.052);
  }

  /**
   * Whisper-soft golden ink signature completion chime
   */
  playSignatureChime() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1318.51];
    notes.forEach((freq, i) => {
      this._playCelestaTine(freq, now + i * 0.085, 1.25, 0.046);
    });
  }
}
