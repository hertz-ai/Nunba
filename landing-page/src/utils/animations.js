/**
 * Centralized Animation System for Nunba
 *
 * Provides MUI-compatible keyframes, duration tokens, easing curves,
 * composable sx presets, and stagger helpers. All animations respect
 * prefers-reduced-motion automatically.
 *
 * Usage:
 *   import { animFadeInUp, hoverLift, durations, easings } from '../utils/animations';
 *   <Box sx={{ ...animFadeInUp(100), ...hoverLift }} />
 */

// ─── Reduced Motion Detection ────────────────────────────────────────────────

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// ─── Duration Tokens (ms) ────────────────────────────────────────────────────

export const durations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  pageTransition: 400,
};

// ─── Easing Curves ───────────────────────────────────────────────────────────

export const easings = {
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// ─── MUI-Compatible Keyframe Definitions ─────────────────────────────────────

export const keyframes = {
  fadeInUp: {
    '@keyframes fadeInUp': {
      '0%': {opacity: 0, transform: 'translateY(20px)'},
      '100%': {opacity: 1, transform: 'translateY(0)'},
    },
  },
  fadeInDown: {
    '@keyframes fadeInDown': {
      '0%': {opacity: 0, transform: 'translateY(-20px)'},
      '100%': {opacity: 1, transform: 'translateY(0)'},
    },
  },
  fadeInScale: {
    '@keyframes fadeInScale': {
      '0%': {opacity: 0, transform: 'scale(0.85)'},
      '100%': {opacity: 1, transform: 'scale(1)'},
    },
  },
  slideInLeft: {
    '@keyframes slideInLeft': {
      '0%': {opacity: 0, transform: 'translateX(-24px)'},
      '100%': {opacity: 1, transform: 'translateX(0)'},
    },
  },
  slideInRight: {
    '@keyframes slideInRight': {
      '0%': {opacity: 0, transform: 'translateX(24px)'},
      '100%': {opacity: 1, transform: 'translateX(0)'},
    },
  },
  slideInUp: {
    '@keyframes slideInUp': {
      '0%': {opacity: 0, transform: 'translateY(16px)'},
      '100%': {opacity: 1, transform: 'translateY(0)'},
    },
  },
  pulse: {
    '@keyframes pulse': {
      '0%, 100%': {transform: 'scale(1)'},
      '50%': {transform: 'scale(1.05)'},
    },
  },
  shimmer: {
    '@keyframes shimmer': {
      '0%': {backgroundPosition: '-200% 0'},
      '100%': {backgroundPosition: '200% 0'},
    },
  },
  glow: {
    '@keyframes glow': {
      '0%, 100%': {boxShadow: '0 0 4px rgba(108, 99, 255, 0.2)'},
      '50%': {boxShadow: '0 0 16px rgba(108, 99, 255, 0.4)'},
    },
  },
  rippleOut: {
    '@keyframes rippleOut': {
      '0%': {transform: 'scale(0)', opacity: 0.6},
      '100%': {transform: 'scale(2.5)', opacity: 0},
    },
  },
  scaleIn: {
    '@keyframes scaleIn': {
      '0%': {opacity: 0, transform: 'scale(0.8)'},
      '100%': {opacity: 1, transform: 'scale(1)'},
    },
  },
  scaleOut: {
    '@keyframes scaleOut': {
      '0%': {opacity: 1, transform: 'scale(1)'},
      '100%': {opacity: 0, transform: 'scale(0.8)'},
    },
  },
  breathe: {
    '@keyframes breathe': {
      '0%, 100%': {transform: 'scale(1)', opacity: 1},
      '50%': {transform: 'scale(1.03)', opacity: 0.85},
    },
  },
  bounceIn: {
    '@keyframes bounceIn': {
      '0%': {opacity: 0, transform: 'scale(0.3)'},
      '50%': {transform: 'scale(1.05)'},
      '70%': {transform: 'scale(0.95)'},
      '100%': {opacity: 1, transform: 'scale(1)'},
    },
  },
  float: {
    '@keyframes float': {
      '0%, 100%': {transform: 'translateY(0)'},
      '50%': {transform: 'translateY(-8px)'},
    },
  },
  dotBounce: {
    '@keyframes dotBounce': {
      '0%, 80%, 100%': {transform: 'scale(0.6)', opacity: 0.4},
      '40%': {transform: 'scale(1)', opacity: 1},
    },
  },
};

// ─── Composable sx Presets ───────────────────────────────────────────────────

function anim(
  name,
  duration = durations.normal,
  easing = easings.smooth,
  delay = 0
) {
  if (prefersReducedMotion) return {};
  return {
    ...keyframes[name],
    animation: `${name} ${duration}ms ${easing} ${delay}ms both`,
  };
}

export function animFadeInUp(delay = 0) {
  return anim('fadeInUp', durations.normal, easings.decelerate, delay);
}

export function animFadeInDown(delay = 0) {
  return anim('fadeInDown', durations.normal, easings.decelerate, delay);
}

export function animScaleIn(delay = 0) {
  return anim('scaleIn', durations.fast, easings.bounce, delay);
}

export function animFadeInScale(delay = 0) {
  return anim('fadeInScale', durations.normal, easings.bounce, delay);
}

export function animSlideIn(direction = 'left', delay = 0) {
  const name = direction === 'right' ? 'slideInRight' : 'slideInLeft';
  return anim(name, durations.normal, easings.decelerate, delay);
}

export function animSlideInUp(delay = 0) {
  return anim('slideInUp', durations.normal, easings.decelerate, delay);
}

export function animBounceIn(delay = 0) {
  return anim('bounceIn', durations.slow, easings.spring, delay);
}

// ─── Hover/Press sx Presets ──────────────────────────────────────────────────

export const hoverLift = prefersReducedMotion
  ? {}
  : {
      transition: `transform ${durations.fast}ms ${easings.smooth}, box-shadow ${durations.fast}ms ${easings.smooth}`,
      willChange: 'transform',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      },
      '&:active': {
        transform: 'translateY(0)',
      },
    };

export const hoverGlow = prefersReducedMotion
  ? {}
  : {
      transition: `box-shadow ${durations.fast}ms ${easings.smooth}`,
      '&:hover': {
        boxShadow: '0 0 12px rgba(108, 99, 255, 0.3)',
      },
    };

/** Parametric glow — pass any CSS color string */
export function hoverGlowColor(color = 'rgba(108, 99, 255, 0.3)') {
  if (prefersReducedMotion) return {};
  return {
    transition: `box-shadow ${durations.fast}ms ${easings.smooth}`,
    '&:hover': {boxShadow: `0 0 12px ${color}`},
  };
}

export const pressDown = prefersReducedMotion
  ? {}
  : {
      transition: `transform ${durations.instant}ms ${easings.snappy}`,
      '&:active': {
        transform: 'scale(0.97)',
      },
    };

export const shimmerBg = prefersReducedMotion
  ? {}
  : {
      ...keyframes.shimmer,
      background:
        'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite linear',
    };

// ─── Stagger Helper ──────────────────────────────────────────────────────────

export function staggerChildren(count, baseDelay = 50) {
  return Array.from({length: count}, (_, i) => i * baseDelay);
}

// ─── Re-export for convenience ───────────────────────────────────────────────

export {prefersReducedMotion};
