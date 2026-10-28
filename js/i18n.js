/**
 * Bilingual Reactive Engine (`EN` Default | `DE` German)
 * Switches all UI strings, dynamic state labels & ARIA attributes smoothly
 * in-place without resetting current act, card stack index, or sheet state.
 */

export class I18nEngine {
  constructor(config) {
    this.translations = config.translations;
    this.supported = config.supportedLanguages || ['en', 'de'];
    this.lang = config.defaultLanguage || 'en';
    this.listeners = new Set();
    this._switchTimer = null;
  }

  init() {
    this._applyDomTranslations(this.lang);
    this._syncSwitcherUi();
  }

  getLanguage() {
    return this.lang;
  }

  /**
   * Look up a nested dot-path key (e.g. 'act1.title' or 'act2.cards.0.title')
   * @param {string} keyPath
   * @param {string} [overrideLang]
   * @returns {string}
   */
  t(keyPath, overrideLang) {
    const targetLang = overrideLang || this.lang;
    const dict = this.translations[targetLang] || this.translations.en;
    const parts = keyPath.split('.');
    let current = dict;
    for (const part of parts) {
      if (current === null || current === undefined) return keyPath;
      current = current[part];
    }
    return typeof current === 'string' ? current : keyPath;
  }

  /**
   * Switch active language with Apple optical blur crossfade
   * @param {string} nextLang
   */
  setLanguage(nextLang) {
    if (!this.supported.includes(nextLang) || nextLang === this.lang) {
      return;
    }

    this.lang = nextLang;
    this._syncSwitcherUi();

    const viewport = document.querySelector('.app-viewport');
    if (viewport) {
      viewport.classList.add('lang-switching');
    }

    clearTimeout(this._switchTimer);
    this._switchTimer = setTimeout(() => {
      this._applyDomTranslations(this.lang);
      for (const listener of this.listeners) {
        listener(this.lang);
      }
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.classList.remove('lang-switching');
        });
      }
    }, 150);
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _syncSwitcherUi() {
    document.documentElement.setAttribute('lang', this.lang);

    const langPill = document.getElementById('lang-pill');
    if (langPill) {
      langPill.setAttribute('data-lang', this.lang);
    }

    document.querySelectorAll('[data-lang-choice]').forEach((btn) => {
      const isSelected = btn.getAttribute('data-lang-choice') === this.lang;
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  _applyDomTranslations(lang) {
    const metaTitle = this.t('metaTitle', lang);
    if (metaTitle && metaTitle !== 'metaTitle') {
      document.title = metaTitle;
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key, lang);
      if (val !== key) {
        el.textContent = val;
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const val = this.t(key, lang);
      if (val !== key) {
        el.innerHTML = val;
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      const val = this.t(key, lang);
      if (val !== key) {
        el.setAttribute('aria-label', val);
      }
    });
  }
}
