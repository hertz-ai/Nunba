/**
 * Kids Learning Zone — Theme constants
 * Bright, kid-friendly colours used across all KidsLearning components.
 */

export const kidsColors = {
  /* Primary palette */
  primary: '#6C63FF', // vibrant purple
  primaryLight: '#A5A0FF',
  secondary: '#FF6584', // playful pink
  accent: '#FFD166', // sunny yellow
  success: '#06D6A0', // minty green
  error: '#EF476F', // coral red
  info: '#118AB2', // ocean blue
  warning: '#FFB347', // warm orange

  /* Category colours */
  english: '#6C63FF',
  math: '#FF6584',
  lifeSkills: '#06D6A0',
  science: '#118AB2',
  creative: '#FFD166',

  /* Backgrounds */
  bgGradient: 'linear-gradient(135deg, #f8f0ff 0%, #e8f4fd 50%, #fff5f5 100%)',
  cardBg: '#FFFFFF',
  surfaceLight: '#F7F5FF',
  surfacePink: '#FFF0F3',
  surfaceBlue: '#EDF7FF',
  surfaceGreen: '#E6FFF5',
  surfaceYellow: '#FFF9E6',

  /* Text */
  textPrimary: '#2D2B55',
  textSecondary: '#6B6B8D',
  textMuted: '#A0A0B8',

  /* Misc */
  starFilled: '#FFD166',
  starEmpty: '#E0E0E0',
  overlay: 'rgba(0,0,0,0.45)',
};

export const kidsShadows = {
  card: '0 4px 20px rgba(108,99,255,0.10)',
  cardHover: '0 8px 30px rgba(108,99,255,0.18)',
  fab: '0 6px 24px rgba(108,99,255,0.35)',
};

export const kidsRadius = {
  sm: '12px',
  md: '16px',
  lg: '24px',
  pill: '9999px',
};

export const CATEGORIES = [
  {key: 'all', label: 'All', color: kidsColors.primary, icon: '\u{1F308}'},
  {
    key: 'english',
    label: 'English',
    color: kidsColors.english,
    icon: '\u{1F4D6}',
  },
  {key: 'math', label: 'Math', color: kidsColors.math, icon: '\u{1F522}'},
  {
    key: 'lifeSkills',
    label: 'Life Skills',
    color: kidsColors.lifeSkills,
    icon: '\u{1F331}',
  },
  {
    key: 'science',
    label: 'Science',
    color: kidsColors.science,
    icon: '\u{1F52C}',
  },
  {
    key: 'creative',
    label: 'Creative',
    color: kidsColors.creative,
    icon: '\u{1F3A8}',
  },
];

export default kidsColors;
