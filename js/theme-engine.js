/**
 * Modular Theme Engine (`ThemeEngine`)
 * Ships with two cohesive themes:
 * - `dark-liquid`: Velvet Midnight + Starlight Liquid Glass (Acts 1–3)
 * - `seher-dawn`: Warm Rose-Gold Sunrise ("Seher" = Dawn, awakens upon wish completion!)
 */

const THEME_PRESETS = {
  'dark-liquid': {
    id: 'dark-liquid',
    label: 'Midnight Glass',
    metaThemeColor: '#070810',
    canvasBg: [7, 8, 16],
    auroraOrbs: [
      { color: [244, 114, 158], alpha: 0.25, radiusRatio: 0.58, speed: 0.00028 },
      { color: [251, 191, 114], alpha: 0.20, radiusRatio: 0.52, speed: 0.00022 },
      { color: [139, 116, 249], alpha: 0.24, radiusRatio: 0.62, speed: 0.00025 },
      { color: [96, 185, 245], alpha: 0.13, radiusRatio: 0.46, speed: 0.00031 }
    ],
    particlePalette: [
      '#fff8eb',
      '#fde2b8',
      '#fbbf72',
      '#fbc2d9',
      '#f4729e',
      '#d8d0ff'
    ]
  },

  'seher-dawn': {
    id: 'seher-dawn',
    label: 'Seher Dawn',
    metaThemeColor: '#19101f',
    canvasBg: [25, 16, 31],
    auroraOrbs: [
      { color: [253, 180, 108], alpha: 0.36, radiusRatio: 0.68, speed: 0.00024 },
      { color: [249, 115, 147], alpha: 0.32, radiusRatio: 0.62, speed: 0.00021 },
      { color: [254, 215, 148], alpha: 0.25, radiusRatio: 0.54, speed: 0.00027 },
      { color: [216, 138, 248], alpha: 0.22, radiusRatio: 0.58, speed: 0.00029 }
    ],
    particlePalette: [
      '#fffdf7',
      '#ffe5b4',
      '#fdba74',
      '#fecdd3',
      '#fb7185',
      '#f5d0fe'
    ]
  }
};

export class ThemeEngine {
  constructor(initialTheme = 'dark-liquid') {
    this.currentThemeId = THEME_PRESETS[initialTheme] ? initialTheme : 'dark-liquid';
    this.listeners = new Set();
  }

  init() {
    this.apply(this.currentThemeId);
  }

  registerTheme(id, presetConfig) {
    THEME_PRESETS[id] = { id, ...presetConfig };
  }

  apply(id) {
    const preset = THEME_PRESETS[id];
    if (!preset) return;

    this.currentThemeId = id;
    document.documentElement.setAttribute('data-theme', id);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && preset.metaThemeColor) {
      metaTheme.setAttribute('content', preset.metaThemeColor);
    }

    for (const listener of this.listeners) {
      listener(preset);
    }
  }

  toggleDawn() {
    const next = this.currentThemeId === 'seher-dawn' ? 'dark-liquid' : 'seher-dawn';
    this.apply(next);
    return next;
  }

  getPreset() {
    return THEME_PRESETS[this.currentThemeId];
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
