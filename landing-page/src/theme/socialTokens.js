/**
 * Social Platform Design Tokens
 *
 * Single source of truth for all social UI styling.
 * Replaces 110+ hardcoded hex values with semantic, reusable tokens.
 *
 * Usage:
 *   import { socialTokens, INTENT_COLORS, GRADIENTS } from '../theme/socialTokens';
 *   sx={{ ...socialTokens.glass.surface(theme) }}
 *   sx={{ background: GRADIENTS.primary }}
 */

import {alpha} from '@mui/material/styles';

// ── Intent Category Colors ────────────────────────────────────────────────────

export const INTENT_COLORS = {
  community: '#FF6B6B',
  environment: '#2ECC71',
  education: '#6C63FF',
  health: '#00B8D9',
  equity: '#FFAB00',
  technology: '#7C4DFF',
};

export const INTENT_ICONS = {
  community: 'People',
  environment: 'Park',
  education: 'School',
  health: 'FavoriteBorder',
  equity: 'Balance',
  technology: 'Memory',
};

export const INTENT_LABELS = {
  community: 'Community',
  environment: 'Environment',
  education: 'Education',
  health: 'Health & Wellbeing',
  equity: 'Social Equity',
  technology: 'Tech for Good',
};

// ── Gradient Presets ──────────────────────────────────────────────────────────

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #6C63FF, #9B94FF)',
  primaryHover: 'linear-gradient(135deg, #5A52E0, #8A83F0)',
  accent: 'linear-gradient(135deg, #FF6B6B, #FF9494)',
  growth: 'linear-gradient(135deg, #2ECC71, #A8E6CF)',
  brand: 'linear-gradient(135deg, #6C63FF 0%, #FF6B6B 50%, #2ECC71 100%)',
  brandWide: 'linear-gradient(90deg, #6C63FF, #FF6B6B, #2ECC71)',
  hart: 'linear-gradient(135deg, #FF6B6B, #6C63FF)',
  hartActive: 'linear-gradient(135deg, #FF6B6B 0%, #E855A0 50%, #6C63FF 100%)',
  surface: 'linear-gradient(180deg, rgba(108,99,255,0.05), transparent)',
  shimmer:
    'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',

  // Intent category gradients
  intentCommunity: 'linear-gradient(135deg, #FF6B6B, #FF9494)',
  intentEnvironment: 'linear-gradient(135deg, #2ECC71, #A8E6CF)',
  intentEducation: 'linear-gradient(135deg, #6C63FF, #9B94FF)',
  intentHealth: 'linear-gradient(135deg, #00B8D9, #79E2F2)',
  intentEquity: 'linear-gradient(135deg, #FFAB00, #FFD740)',
  intentTechnology: 'linear-gradient(135deg, #7C4DFF, #B388FF)',
};

// Map intent_category → gradient key
export const INTENT_GRADIENT_MAP = {
  community: GRADIENTS.intentCommunity,
  environment: GRADIENTS.intentEnvironment,
  education: GRADIENTS.intentEducation,
  health: GRADIENTS.intentHealth,
  equity: GRADIENTS.intentEquity,
  technology: GRADIENTS.intentTechnology,
};

// ── Border Radius Scale ───────────────────────────────────────────────────────

// NOTE: Values are strings ('Xpx') so MUI sx prop doesn't multiply by theme spacing.
// Use directly: borderRadius: RADIUS.lg  →  '16px'
export const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  pill: '9999px',
};

// ── Shadow Presets ────────────────────────────────────────────────────────────

export const SHADOWS = {
  card: '0 4px 24px rgba(108, 99, 255, 0.08)',
  cardHover:
    '0 12px 40px rgba(108, 99, 255, 0.15), 0 0 0 1px rgba(108,99,255,0.08)',
  fab: '0 8px 32px rgba(108, 99, 255, 0.3)',
  float: '0 8px 32px rgba(0,0,0,0.2)',
  glow: '0 0 24px rgba(108, 99, 255, 0.4)',
  inset: 'inset 0 1px 0 rgba(255,255,255,0.05)',
};

// ── Spacing Tokens ────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ── Easing Curves ─────────────────────────────────────────────────────────────

export const EASINGS = {
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// ── Duration Tokens ───────────────────────────────────────────────────────────

export const DURATIONS = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
};

// ── Glassmorphism Mixins (theme-dependent) ────────────────────────────────────

export const socialTokens = {
  glass: {
    /** Standard surface glass — use for cards, tab bars, nav items */
    surface: (theme) => {
      const g = theme.custom?.glass || {};
      const glassEnabled =
        theme.custom?.animations?.glassmorphism?.enabled !== false;
      const blur = g.blur_radius ?? 20;
      const opacity = g.surface_opacity ?? 0.85;
      return {
        background: alpha(
          theme.palette.background.paper,
          glassEnabled ? opacity : 1
        ),
        backdropFilter: glassEnabled ? `blur(${blur}px)` : 'none',
        WebkitBackdropFilter: glassEnabled ? `blur(${blur}px)` : 'none',
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      };
    },
    /** Elevated glass — use for dialogs, modals, floating panels */
    elevated: (theme) => {
      const g = theme.custom?.glass || {};
      const glassEnabled =
        theme.custom?.animations?.glassmorphism?.enabled !== false;
      const blur = g.blur_radius ? g.blur_radius + 4 : 24;
      const opacity = g.elevated_opacity ?? 0.92;
      return {
        background: alpha(
          theme.palette.background.paper,
          glassEnabled ? opacity : 1
        ),
        backdropFilter: glassEnabled ? `blur(${blur}px)` : 'none',
        WebkitBackdropFilter: glassEnabled ? `blur(${blur}px)` : 'none',
        border: `1px solid ${alpha(theme.palette.common.white, g.border_opacity ?? 0.08)}`,
        boxShadow: SHADOWS.float,
      };
    },
    /** Subtle glass — use for hover states, secondary containers */
    subtle: (theme) => {
      const g = theme.custom?.glass || {};
      const glassEnabled =
        theme.custom?.animations?.glassmorphism?.enabled !== false;
      const blur = g.blur_radius ? Math.max(0, g.blur_radius - 8) : 12;
      return {
        background: alpha(
          theme.palette.common.white,
          glassEnabled ? 0.03 : 0.06
        ),
        backdropFilter: glassEnabled ? `blur(${blur}px)` : 'none',
        WebkitBackdropFilter: glassEnabled ? `blur(${blur}px)` : 'none',
        border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
      };
    },
  },

  /** Get intent color by category name */
  intentColor: (category) => INTENT_COLORS[category] || INTENT_COLORS.education,

  /** Get intent gradient by category name */
  intentGradient: (category) =>
    INTENT_GRADIENT_MAP[category] || GRADIENTS.primary,

  /** Accent bar sx for left-side intent indicator */
  intentBar: (category) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: '4px 0 0 4px',
    background: INTENT_GRADIENT_MAP[category] || GRADIENTS.primary,
  }),

  /** Hover lift preset */
  hoverLift: {
    transition: `transform ${DURATIONS.fast}ms ${EASINGS.smooth}, box-shadow ${DURATIONS.fast}ms ${EASINGS.smooth}`,
    willChange: 'transform',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: SHADOWS.cardHover,
    },
    '&:active': {
      transform: 'translateY(0) scale(0.99)',
    },
  },

  /** Press down preset */
  pressDown: {
    transition: `transform ${DURATIONS.instant}ms ${EASINGS.snappy}`,
    '&:active': {
      transform: 'scale(0.97)',
    },
  },

  /** Horizontal scroll with fade-edge affordance (momentum + hidden scrollbar) */
  scrollFade: {
    display: 'flex',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {display: 'none'},
    WebkitOverflowScrolling: 'touch',
    maskImage:
      'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
    WebkitMaskImage:
      'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
  },

  /** Horizontal scroll with snap — for carousels */
  scrollSnapX: {
    display: 'flex',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {display: 'none'},
    WebkitOverflowScrolling: 'touch',
    '& > *': {scrollSnapAlign: 'start'},
  },

  /** FAB position — bottom-nav + safe-area aware */
  fabPosition: {
    position: 'fixed',
    right: {xs: 16, md: 24},
    bottom: {xs: 'calc(80px + env(safe-area-inset-bottom, 0px))', md: 80},
    zIndex: 1050,
  },

  /**
   * Resonance-driven visual evolution — CSS-only progressive enhancement.
   * Returns sx props based on user's Resonance level.
   *
   * @param {number} level — Resonance level (1-99+)
   * @returns {Object} sx-compatible style overrides
   */
  resonanceGlow: (level) => {
    if (!level || level < 6) return {}; // Level 1-5: static (default)

    if (level < 11) {
      // Level 6-10: subtle glow on interactions
      return {
        '&:hover': {
          boxShadow: '0 0 16px rgba(108,99,255,0.2)',
        },
        '&:active': {
          boxShadow: '0 0 24px rgba(108,99,255,0.35)',
        },
      };
    }

    if (level < 21) {
      // Level 11-20: animated glow pulse
      return {
        boxShadow: '0 0 8px rgba(108,99,255,0.1)',
        '&:hover': {
          boxShadow: '0 0 24px rgba(108,99,255,0.3)',
        },
        transition: 'box-shadow 0.3s ease',
      };
    }

    // Level 21+: animated accent border + glow
    return {
      boxShadow: '0 0 12px rgba(108,99,255,0.15)',
      border: '1px solid rgba(108,99,255,0.25)',
      '&:hover': {
        boxShadow:
          '0 0 32px rgba(108,99,255,0.4), 0 0 0 1px rgba(108,99,255,0.3)',
      },
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
    };
  },

  /**
   * HART ripple — visual resonance based on HART count on a post.
   * Posts with more HARTs glow brighter — you can *see* what resonates.
   *
   * @param {number} count — Number of HARTs (upvotes) on the post
   * @returns {Object} sx-compatible style overrides
   */
  hartRipple: (count) => {
    if (!count || count < 1) return {};

    if (count < 11) {
      // 1-10 HARTs: subtle warm border glow
      return {
        boxShadow: '0 0 8px rgba(255, 107, 107, 0.1)',
      };
    }

    if (count < 51) {
      // 11-50 HARTs: pulsing warm glow
      return {
        boxShadow: '0 0 12px rgba(255, 107, 107, 0.2)',
        animation: 'hartPulse 2s ease-in-out infinite',
        '@keyframes hartPulse': {
          '0%, 100%': {boxShadow: '0 0 12px rgba(255, 107, 107, 0.2)'},
          '50%': {boxShadow: '0 0 20px rgba(255, 107, 107, 0.35)'},
        },
      };
    }

    if (count < 101) {
      // 51-100 HARTs: gradient border sweep
      return {
        boxShadow:
          '0 0 16px rgba(255, 107, 107, 0.25), 0 0 0 1px rgba(108, 99, 255, 0.2)',
        animation: 'hartGlow 3s ease-in-out infinite',
        '@keyframes hartGlow': {
          '0%, 100%': {
            boxShadow:
              '0 0 16px rgba(255, 107, 107, 0.25), 0 0 0 1px rgba(108, 99, 255, 0.2)',
          },
          '50%': {
            boxShadow:
              '0 0 24px rgba(108, 99, 255, 0.3), 0 0 0 1px rgba(255, 107, 107, 0.3)',
          },
        },
      };
    }

    // 100+ HARTs: full resonance aura
    return {
      boxShadow:
        '0 0 24px rgba(255, 107, 107, 0.3), 0 0 0 1px rgba(108, 99, 255, 0.25)',
      animation: 'hartAura 2.5s ease-in-out infinite',
      '@keyframes hartAura': {
        '0%, 100%': {
          boxShadow:
            '0 0 24px rgba(255, 107, 107, 0.3), 0 0 0 1px rgba(108, 99, 255, 0.25)',
        },
        '33%': {
          boxShadow:
            '0 0 32px rgba(108, 99, 255, 0.35), 0 0 0 2px rgba(255, 107, 107, 0.2)',
        },
        '66%': {
          boxShadow:
            '0 0 28px rgba(255, 107, 107, 0.35), 0 0 0 1px rgba(46, 204, 113, 0.2)',
        },
      },
    };
  },

  /**
   * Resonance avatar border — animated ring for high-level users.
   * @param {number} level
   * @returns {Object} sx props for avatar wrapper
   */
  resonanceAvatar: (level) => {
    if (!level || level < 11) return {};

    if (level < 21) {
      return {
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: '50%',
        p: '2px',
      };
    }

    // Level 21+: gradient animated border
    return {
      background: GRADIENTS.brand,
      borderRadius: '50%',
      p: '2px',
      '& > *': {
        borderRadius: '50%',
      },
    };
  },
};

export default socialTokens;
