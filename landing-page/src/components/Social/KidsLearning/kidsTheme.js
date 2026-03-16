/**
 * Kids Learning Zone - Theme Configuration for Web
 *
 * Comprehensive, bright, kid-friendly color palette that works within
 * the existing dark MUI theme but provides vibrant colors for the learning zone.
 * Supports the Dynamic Liquid Agentic UI design system.
 *
 * Includes: colors, spacing, borderRadius, fontSizes, shadows, transitions,
 * category map, MUI theme overrides, animations, and utility functions.
 */

// ─── Core Color Palette ───────────────────────────────────────────────────────

export const kidsColors = {
  // Backgrounds
  background: '#FFF9E6',
  backgroundSecondary: '#FFF3E0',
  backgroundTertiary: '#FFF3E0',
  card: '#FFFFFF',
  cardHover: '#F5F5F5',
  cardShadow: '#636E72',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(108, 92, 231, 0.35)',

  // Surfaces (for light-mode game zone)
  surface: '#FAFAFA',
  surfaceLight: '#F7F5FF',
  surfacePink: '#FFF0F3',
  surfaceBlue: '#EDF7FF',
  surfaceGreen: '#E6FFF5',
  surfaceYellow: '#FFF9E6',
  bgGradient: 'linear-gradient(135deg, #f8f0ff 0%, #e8f4fd 50%, #fff5f5 100%)',

  // Text
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  textMuted: '#B2BEC3',
  textOnDark: '#FFFFFF',

  // Primary accents
  accent: '#FF6B35',
  accentLight: '#FF8A5C',
  accentSecondary: '#4ECDC4',
  secondary: '#FF6584',

  // Named colors for option buttons, game elements
  blue: '#0984E3',
  pink: '#FD79A8',
  orange: '#FF6B35',
  green: '#00B894',
  purple: '#6C5CE7',
  yellow: '#FDCB6E',
  teal: '#4ECDC4',
  red: '#E74C3C',

  // Category colors
  english: '#FF6B6B',
  math: '#4ECDC4',
  lifeSkills: '#FFE66D',
  science: '#A29BFE',
  creativity: '#FD79A8',

  // Category gradients (CSS linear-gradient format)
  gradientEnglish: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
  gradientMath: 'linear-gradient(135deg, #4ECDC4, #00B894)',
  gradientLifeSkills: 'linear-gradient(135deg, #FFE66D, #FDCB6E)',
  gradientScience: 'linear-gradient(135deg, #A29BFE, #6C5CE7)',
  gradientCreativity: 'linear-gradient(135deg, #FD79A8, #E84393)',

  // Game feedback (bright & visible for kids)
  correct: '#2ECC71',
  correctLight: '#D4EFDF',
  correctBg: 'rgba(46, 204, 113, 0.25)',
  incorrect: '#E74C3C',
  incorrectLight: '#FADBD8',
  incorrectBg: 'rgba(231, 76, 60, 0.25)',
  star: '#FFD700',
  starGlow: '#F9CA24',
  streak: '#E17055',
  streakFire: '#FF4500',

  // Bright palette for game elements
  palette: [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DFE6E9',
    '#FD79A8',
    '#6C5CE7',
    '#55EFC4',
    '#81ECEC',
    '#74B9FF',
    '#A29BFE',
  ],

  // Level stars
  starBronze: '#E17055',
  starSilver: '#B2BEC3',
  starGold: '#FDCB6E',
  starFilled: '#FFD166',
  starEmpty: '#E0E0E0',

  // Primary aliases (used across components)
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#4834D4',

  // MUI palette aliases
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#0984E3',

  // Borders
  border: '#E0E0E0',
  borderFocus: '#6C5CE7',

  // Header gradient
  gradientHeader: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
  gradientSuccess: 'linear-gradient(135deg, #00B894, #55EFC4)',
  gradientPrimary: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
  gradientCorrect: 'linear-gradient(135deg, #2ECC71 0%, #55EFC4 100%)',
  gradientIncorrect: 'linear-gradient(135deg, #E74C3C 0%, #FAB1A0 100%)',
  gradientWarm: 'linear-gradient(135deg, #F39C12 0%, #FDCB6E 100%)',
  gradientCool: 'linear-gradient(135deg, #0984E3 0%, #74B9FF 100%)',
  gradientCard:
    'linear-gradient(145deg, rgba(30, 20, 60, 0.9) 0%, rgba(45, 34, 85, 0.7) 100%)',
  gradientCelebration:
    'linear-gradient(135deg, #FDCB6E 0%, #F39C12 30%, #E17055 60%, #FD79A8 100%)',

  // Difficulty colors
  difficultyEasy: '#00B894',
  difficultyMedium: '#FDCB6E',
  difficultyHard: '#FF6B6B',

  // Hint/banner backgrounds
  hintBg: '#FFF9E6',
  warmBg: '#FFF0E0',

  // Transparent overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayDark: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(255,255,255,0.9)',

  // Shadows (lighter for white card backgrounds)
  shadowPrimary: '0 4px 20px rgba(108, 92, 231, 0.2)',
  shadowCorrect: '0 4px 20px rgba(46, 204, 113, 0.25)',
  shadowIncorrect: '0 4px 20px rgba(231, 76, 60, 0.25)',
  shadowCard: '0 4px 24px rgba(108, 92, 231, 0.12)',
  shadowElevated: '0 8px 32px rgba(108, 92, 231, 0.18)',

  // Glow effects (brighter for kids visibility)
  glowPrimary: '0 0 24px rgba(108, 92, 231, 0.6)',
  glowCorrect: '0 0 24px rgba(46, 204, 113, 0.6)',
  glowIncorrect: '0 0 24px rgba(231, 76, 60, 0.6)',

  // Option opacity constants (hex suffixes for ${color}XX patterns)
  optionBgOpacity: '25', // 14.5% — visible on white backgrounds
  optionBorderOpacity: '80', // 50% — clear borders
  optionHoverOpacity: '40', // 25% — obvious hover feedback
};

// ─── Spacing (px values for CSS) ──────────────────────────────────────────────

export const kidsSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Border Radius ────────────────────────────────────────────────────────────

export const kidsBorderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  full: '9999px',
  pill: '9999px',
};

export const kidsRadius = kidsBorderRadius;

// ─── Font Sizes (px for CSS) ──────────────────────────────────────────────────

export const kidsFontSizes = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
  display: 48,
};

// ─── Font Weights ─────────────────────────────────────────────────────────────

export const kidsFontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

// ─── Box Shadows (CSS format) ─────────────────────────────────────────────────

export const kidsShadows = {
  card: '0px 4px 20px rgba(108, 99, 255, 0.10)',
  cardHover: '0px 8px 30px rgba(108, 99, 255, 0.18)',
  button: '0px 4px 8px rgba(108, 92, 231, 0.20)',
  buttonHover: '0px 6px 12px rgba(108, 92, 231, 0.30)',
  fab: '0 6px 24px rgba(108, 99, 255, 0.35)',
  float: '0px 6px 12px rgba(0, 0, 0, 0.15)',
  modal: '0px 8px 24px rgba(0, 0, 0, 0.20)',
  none: 'none',
};

// ─── Transitions (for fluid / liquid UI) ──────────────────────────────────────

export const kidsTransitions = {
  fast: 'all 0.15s ease-in-out',
  normal: 'all 0.25s ease-in-out',
  slow: 'all 0.4s ease-in-out',
  bounce: 'all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  liquid: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ─── Animations (MUI sx-compatible keyframes) ────────────────────────────────

export const kidsAnimations = {
  fadeInUp: {
    '@keyframes fadeInUp': {
      '0%': {opacity: 0, transform: 'translateY(24px)'},
      '100%': {opacity: 1, transform: 'translateY(0)'},
    },
  },
  fadeInScale: {
    '@keyframes fadeInScale': {
      '0%': {opacity: 0, transform: 'scale(0.85)'},
      '100%': {opacity: 1, transform: 'scale(1)'},
    },
  },
  pulse: {
    '@keyframes pulse': {
      '0%, 100%': {transform: 'scale(1)'},
      '50%': {transform: 'scale(1.05)'},
    },
  },
  wiggle: {
    '@keyframes wiggle': {
      '0%, 100%': {transform: 'rotate(0deg)'},
      '25%': {transform: 'rotate(-3deg)'},
      '75%': {transform: 'rotate(3deg)'},
    },
  },
  float: {
    '@keyframes float': {
      '0%, 100%': {transform: 'translateY(0)'},
      '50%': {transform: 'translateY(-8px)'},
    },
  },
  celebrate: {
    '@keyframes celebrate': {
      '0%': {transform: 'scale(1) rotate(0deg)', opacity: 1},
      '50%': {transform: 'scale(1.3) rotate(5deg)', opacity: 0.9},
      '100%': {transform: 'scale(1) rotate(0deg)', opacity: 1},
    },
  },
  shimmer: {
    '@keyframes shimmer': {
      '0%': {backgroundPosition: '-200% 0'},
      '100%': {backgroundPosition: '200% 0'},
    },
  },
  ripple: {
    '@keyframes ripple': {
      '0%': {transform: 'scale(0)', opacity: 0.6},
      '100%': {transform: 'scale(2.5)', opacity: 0},
    },
  },
  bounce: {
    '@keyframes bounce': {
      '0%, 100%': {transform: 'translateY(0)'},
      '40%': {transform: 'translateY(-16px)'},
      '60%': {transform: 'translateY(-8px)'},
    },
  },
  heartCrack: {
    '@keyframes heartCrack': {
      '0%': {transform: 'scale(1.3)', opacity: 1, filter: 'none'},
      '50%': {transform: 'scale(1.4) rotate(5deg)', filter: 'brightness(1.3)'},
      '100%': {transform: 'scale(0.9)', opacity: 0.2, filter: 'grayscale(1)'},
    },
  },
  drawLine: {
    '@keyframes drawLine': {
      '0%': {strokeDashoffset: 500},
      '100%': {strokeDashoffset: 0},
    },
  },
  popIn: {
    '@keyframes popIn': {
      '0%': {transform: 'scale(0)', opacity: 0},
      '60%': {transform: 'scale(1.2)', opacity: 1},
      '100%': {transform: 'scale(1)', opacity: 1},
    },
  },
  dropPop: {
    '@keyframes dropPop': {
      '0%': {transform: 'scale(1.3)'},
      '50%': {transform: 'scale(0.9)'},
      '100%': {transform: 'scale(1)'},
    },
  },
  bouncingArrow: {
    '@keyframes bouncingArrow': {
      '0%, 100%': {transform: 'translateY(0)'},
      '50%': {transform: 'translateY(8px)'},
    },
  },
  sparkle: {
    '@keyframes sparkle': {
      '0%': {transform: 'scale(0) rotate(0deg)', opacity: 0},
      '50%': {transform: 'scale(1) rotate(180deg)', opacity: 1},
      '100%': {transform: 'scale(0) rotate(360deg)', opacity: 0},
    },
  },
};

// ─── Number Pad Colors (colorful pastel circles for counting games) ──────────

export const numPadColors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DFE6E9',
  '#FD79A8',
  '#6C5CE7',
  '#55EFC4',
  '#74B9FF',
];

// ─── Shared Style Mixins ──────────────────────────────────────────────────────

export const kidsMixins = {
  glassCard: {
    background: kidsColors.cardBg,
    backdropFilter: 'blur(16px)',
    border: `1px solid ${kidsColors.cardBorder}`,
    borderRadius: '20px',
    boxShadow: kidsColors.shadowCard,
  },
  liquidButton: {
    borderRadius: '16px',
    fontWeight: 700,
    textTransform: 'none',
    transition: kidsTransitions.liquid,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: kidsColors.shadowElevated,
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
};

// ─── Category Map ─────────────────────────────────────────────────────────────

export const CATEGORY_MAP = {
  english: {
    color: kidsColors.english,
    gradient: kidsColors.gradientEnglish,
    icon: 'MenuBook',
    emoji: '📖',
    label: 'English',
  },
  math: {
    color: kidsColors.math,
    gradient: kidsColors.gradientMath,
    icon: 'Calculate',
    emoji: '🔢',
    label: 'Math',
  },
  lifeSkills: {
    color: kidsColors.lifeSkills,
    gradient: kidsColors.gradientLifeSkills,
    icon: 'FavoriteBorder',
    emoji: '🌱',
    label: 'Life Skills',
  },
  science: {
    color: kidsColors.science,
    gradient: kidsColors.gradientScience,
    icon: 'Science',
    emoji: '🔬',
    label: 'Science',
  },
  creativity: {
    color: kidsColors.creativity,
    gradient: kidsColors.gradientCreativity,
    icon: 'Palette',
    emoji: '🎨',
    label: 'Creative',
  },
};

export const CATEGORIES = [
  {
    key: 'all',
    label: 'All',
    color: kidsColors.accent,
    icon: 'Apps',
    emoji: '🌈',
  },
  {
    key: 'english',
    label: 'English',
    color: kidsColors.english,
    icon: 'MenuBook',
    emoji: '📖',
  },
  {
    key: 'math',
    label: 'Math',
    color: kidsColors.math,
    icon: 'Calculate',
    emoji: '🔢',
  },
  {
    key: 'lifeSkills',
    label: 'Life Skills',
    color: kidsColors.lifeSkills,
    icon: 'FavoriteBorder',
    emoji: '🌱',
  },
  {
    key: 'science',
    label: 'Science',
    color: kidsColors.science,
    icon: 'Science',
    emoji: '🔬',
  },
  {
    key: 'creativity',
    label: 'Creative',
    color: kidsColors.creativity,
    icon: 'Palette',
    emoji: '🎨',
  },
];

// ─── MUI Theme Overrides for Kids Zone ────────────────────────────────────────

export const kidsMuiOverrides = {
  palette: {
    mode: 'light',
    primary: {
      main: kidsColors.accent,
      light: kidsColors.accentLight,
      contrastText: kidsColors.textOnDark,
    },
    secondary: {
      main: kidsColors.accentSecondary,
      contrastText: kidsColors.textOnDark,
    },
    success: {
      main: kidsColors.correct,
      light: kidsColors.correctLight,
    },
    error: {
      main: kidsColors.incorrect,
      light: kidsColors.incorrectLight,
    },
    warning: {
      main: kidsColors.star,
    },
    background: {
      default: kidsColors.background,
      paper: kidsColors.card,
    },
    text: {
      primary: kidsColors.textPrimary,
      secondary: kidsColors.textSecondary,
    },
  },
  shape: {
    borderRadius: kidsBorderRadius.md,
  },
  typography: {
    fontFamily: '"Nunito", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: kidsFontWeights.extrabold,
      fontSize: kidsFontSizes.display,
    },
    h2: {fontWeight: kidsFontWeights.bold, fontSize: kidsFontSizes.xxl},
    h3: {fontWeight: kidsFontWeights.bold, fontSize: kidsFontSizes.xl},
    h4: {fontWeight: kidsFontWeights.bold, fontSize: kidsFontSizes.lg},
    h5: {fontWeight: kidsFontWeights.semibold, fontSize: kidsFontSizes.lg},
    h6: {fontWeight: kidsFontWeights.semibold, fontSize: kidsFontSizes.md},
    body1: {fontSize: kidsFontSizes.md},
    body2: {fontSize: kidsFontSizes.md},
    caption: {fontSize: kidsFontSizes.sm},
    button: {
      fontWeight: kidsFontWeights.bold,
      fontSize: kidsFontSizes.md,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: kidsBorderRadius.lg,
          minHeight: 48,
          padding: '12px 24px',
          fontSize: kidsFontSizes.md,
          boxShadow: kidsShadows.button,
          transition: kidsTransitions.bounce,
          '&:hover': {
            boxShadow: kidsShadows.buttonHover,
            transform: 'translateY(-2px) scale(1.02)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.97)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: kidsBorderRadius.lg,
          boxShadow: kidsShadows.card,
          transition: kidsTransitions.normal,
          '&:hover': {
            boxShadow: kidsShadows.cardHover,
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: kidsBorderRadius.full,
          fontWeight: kidsFontWeights.semibold,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: kidsBorderRadius.lg,
        },
      },
    },
  },
};

// ─── Utility Functions ────────────────────────────────────────────────────────

export const getCategoryColor = (category) => {
  return CATEGORY_MAP[category]?.color || kidsColors.accent;
};

export const getCategoryGradient = (category) => {
  return CATEGORY_MAP[category]?.gradient || kidsColors.gradientHeader;
};

export const getDifficultyColor = (difficulty) => {
  if (difficulty <= 1) return kidsColors.difficultyEasy;
  if (difficulty <= 2) return kidsColors.difficultyMedium;
  return kidsColors.difficultyHard;
};

export const getDifficultyLabel = (difficulty) => {
  if (difficulty <= 1) return 'Easy';
  if (difficulty <= 2) return 'Medium';
  return 'Hard';
};

export default {
  kidsColors,
  kidsAnimations,
  kidsMixins,
  kidsShadows,
  kidsRadius,
};
