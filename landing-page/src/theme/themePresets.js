/**
 * Theme Presets & Default Config
 *
 * 8 curated dark-mode presets. The first ("hart-default") exactly matches
 * the current static theme so existing users see zero visual change.
 */

// ── Default Theme Config (matches current theme.js exactly) ─────────────────

export const DEFAULT_THEME_CONFIG = {
  id: 'hart-default',
  name: 'HART Default',
  description: 'Deep navy with aspiration violet accents',
  colors: {
    background: '#0F0E17',
    paper: '#1A1932',
    surface_elevated: '#232148',
    surface_overlay: '#2D2B55',
    primary: '#6C63FF',
    primary_light: '#9B94FF',
    primary_dark: '#4A42CC',
    secondary: '#FF6B6B',
    secondary_light: '#FF9494',
    secondary_dark: '#CC5555',
    accent: '#2ECC71',
    accent_light: '#A8E6CF',
    text_primary: '#FFFFFE',
    text_secondary: 'rgba(255,255,254,0.72)',
    divider: 'rgba(255,255,255,0.12)',
    success: '#2ECC71',
    warning: '#FFAB00',
    error: '#e74c3c',
    info: '#00B8D9',
  },
  glass: {
    blur_radius: 20,
    surface_opacity: 0.85,
    elevated_opacity: 0.92,
    border_opacity: 0.08,
  },
  animations: {
    glassmorphism: {enabled: true, intensity: 70},
    gradients: {enabled: true, intensity: 50},
    liquid_motion: {enabled: true, intensity: 60},
  },
  font: {family: 'Inter', size: 13},
  shell: {panel_opacity: 0.65, blur_radius: 20, border_radius: 16},
  metadata: {is_preset: true, is_ai_generated: false},
};

// ── Curated Presets ─────────────────────────────────────────────────────────

export const THEME_PRESETS = [
  DEFAULT_THEME_CONFIG,
  {
    id: 'midnight-black',
    name: 'Midnight Black',
    description: 'True OLED black with ice-blue highlights',
    colors: {
      background: '#000000',
      paper: '#0A0A0F',
      surface_elevated: '#141420',
      surface_overlay: '#1E1E2E',
      primary: '#00B8D9',
      primary_light: '#79E2F2',
      primary_dark: '#008DA8',
      secondary: '#7C4DFF',
      secondary_light: '#B388FF',
      secondary_dark: '#5E35B1',
      accent: '#00E5FF',
      accent_light: '#80F0FF',
      text_primary: '#E8E8E8',
      text_secondary: 'rgba(232,232,232,0.65)',
      divider: 'rgba(255,255,255,0.08)',
      success: '#00E676',
      warning: '#FFD600',
      error: '#FF5252',
      info: '#40C4FF',
    },
    glass: {
      blur_radius: 24,
      surface_opacity: 0.75,
      elevated_opacity: 0.88,
      border_opacity: 0.06,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 80},
      gradients: {enabled: true, intensity: 60},
      liquid_motion: {enabled: true, intensity: 70},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.55, blur_radius: 24, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Deep sea gradients with coral accents',
    colors: {
      background: '#0B1426',
      paper: '#112240',
      surface_elevated: '#1A3358',
      surface_overlay: '#234570',
      primary: '#64B5F6',
      primary_light: '#90CAF9',
      primary_dark: '#1E88E5',
      secondary: '#FF8A65',
      secondary_light: '#FFAB91',
      secondary_dark: '#E64A19',
      accent: '#4DD0E1',
      accent_light: '#80DEEA',
      text_primary: '#E3F2FD',
      text_secondary: 'rgba(227,242,253,0.72)',
      divider: 'rgba(100,181,246,0.15)',
      success: '#69F0AE',
      warning: '#FFD740',
      error: '#FF8A80',
      info: '#80D8FF',
    },
    glass: {
      blur_radius: 20,
      surface_opacity: 0.8,
      elevated_opacity: 0.9,
      border_opacity: 0.1,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 65},
      gradients: {enabled: true, intensity: 55},
      liquid_motion: {enabled: true, intensity: 60},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.6, blur_radius: 20, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Deep forest with amber firelight',
    colors: {
      background: '#0A1F0A',
      paper: '#142814',
      surface_elevated: '#1E3A1E',
      surface_overlay: '#2A4E2A',
      primary: '#66BB6A',
      primary_light: '#A5D6A7',
      primary_dark: '#388E3C',
      secondary: '#FFB74D',
      secondary_light: '#FFD54F',
      secondary_dark: '#F57C00',
      accent: '#81C784',
      accent_light: '#C8E6C9',
      text_primary: '#E8F5E9',
      text_secondary: 'rgba(232,245,233,0.72)',
      divider: 'rgba(102,187,106,0.12)',
      success: '#69F0AE',
      warning: '#FFE57F',
      error: '#EF5350',
      info: '#4FC3F7',
    },
    glass: {
      blur_radius: 18,
      surface_opacity: 0.82,
      elevated_opacity: 0.9,
      border_opacity: 0.08,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 60},
      gradients: {enabled: true, intensity: 45},
      liquid_motion: {enabled: true, intensity: 55},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.6, blur_radius: 18, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    description: 'Warm amber dusk with rose highlights',
    colors: {
      background: '#1A0F0A',
      paper: '#2D1B12',
      surface_elevated: '#3E2518',
      surface_overlay: '#4F3020',
      primary: '#FF8A65',
      primary_light: '#FFAB91',
      primary_dark: '#E64A19',
      secondary: '#F48FB1',
      secondary_light: '#F8BBD0',
      secondary_dark: '#C2185B',
      accent: '#FFD54F',
      accent_light: '#FFE082',
      text_primary: '#FFF3E0',
      text_secondary: 'rgba(255,243,224,0.72)',
      divider: 'rgba(255,138,101,0.15)',
      success: '#A5D6A7',
      warning: '#FFE082',
      error: '#EF9A9A',
      info: '#81D4FA',
    },
    glass: {
      blur_radius: 16,
      surface_opacity: 0.8,
      elevated_opacity: 0.88,
      border_opacity: 0.1,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 55},
      gradients: {enabled: true, intensity: 50},
      liquid_motion: {enabled: true, intensity: 60},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.6, blur_radius: 16, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    description: 'Cyberpunk vibes with electric neon',
    colors: {
      background: '#0D0015',
      paper: '#1A0030',
      surface_elevated: '#2A0050',
      surface_overlay: '#3A0068',
      primary: '#E040FB',
      primary_light: '#EA80FC',
      primary_dark: '#AA00FF',
      secondary: '#00E5FF',
      secondary_light: '#80F0FF',
      secondary_dark: '#00B8D4',
      accent: '#76FF03',
      accent_light: '#B2FF59',
      text_primary: '#F3E5F5',
      text_secondary: 'rgba(243,229,245,0.72)',
      divider: 'rgba(224,64,251,0.15)',
      success: '#76FF03',
      warning: '#FFEA00',
      error: '#FF1744',
      info: '#18FFFF',
    },
    glass: {
      blur_radius: 24,
      surface_opacity: 0.7,
      elevated_opacity: 0.85,
      border_opacity: 0.12,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 85},
      gradients: {enabled: true, intensity: 70},
      liquid_motion: {enabled: true, intensity: 75},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.5, blur_radius: 24, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Elegant rose with warm gold tones',
    colors: {
      background: '#1A0F14',
      paper: '#2D1B25',
      surface_elevated: '#3E2535',
      surface_overlay: '#4F3045',
      primary: '#F48FB1',
      primary_light: '#F8BBD0',
      primary_dark: '#C2185B',
      secondary: '#FFD54F',
      secondary_light: '#FFE082',
      secondary_dark: '#FFA000',
      accent: '#CE93D8',
      accent_light: '#E1BEE7',
      text_primary: '#FCE4EC',
      text_secondary: 'rgba(252,228,236,0.72)',
      divider: 'rgba(244,143,177,0.15)',
      success: '#A5D6A7',
      warning: '#FFE082',
      error: '#EF9A9A',
      info: '#B3E5FC',
    },
    glass: {
      blur_radius: 20,
      surface_opacity: 0.82,
      elevated_opacity: 0.9,
      border_opacity: 0.1,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 65},
      gradients: {enabled: true, intensity: 50},
      liquid_motion: {enabled: true, intensity: 55},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.6, blur_radius: 20, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    description: 'Cool silver-white with ice accents',
    colors: {
      background: '#0E1621',
      paper: '#162433',
      surface_elevated: '#1E3044',
      surface_overlay: '#263D55',
      primary: '#B0BEC5',
      primary_light: '#CFD8DC',
      primary_dark: '#78909C',
      secondary: '#80CBC4',
      secondary_light: '#B2DFDB',
      secondary_dark: '#00897B',
      accent: '#B3E5FC',
      accent_light: '#E1F5FE',
      text_primary: '#ECEFF1',
      text_secondary: 'rgba(236,239,241,0.72)',
      divider: 'rgba(176,190,197,0.15)',
      success: '#A5D6A7',
      warning: '#FFE082',
      error: '#EF9A9A',
      info: '#80D8FF',
    },
    glass: {
      blur_radius: 28,
      surface_opacity: 0.78,
      elevated_opacity: 0.88,
      border_opacity: 0.1,
    },
    animations: {
      glassmorphism: {enabled: true, intensity: 75},
      gradients: {enabled: true, intensity: 45},
      liquid_motion: {enabled: true, intensity: 50},
    },
    font: {family: 'Inter', size: 13},
    shell: {panel_opacity: 0.55, blur_radius: 28, border_radius: 16},
    metadata: {is_preset: true, is_ai_generated: false},
  },
];

/**
 * Deep-merge a partial config onto a base config.
 * Only merges plain objects; arrays and primitives are replaced.
 */
export function mergeThemeConfig(base, overrides) {
  const result = {...base};
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = mergeThemeConfig(base[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

/**
 * Find a preset by id, or return DEFAULT_THEME_CONFIG.
 */
export function getPresetById(id) {
  return THEME_PRESETS.find((p) => p.id === id) || DEFAULT_THEME_CONFIG;
}
