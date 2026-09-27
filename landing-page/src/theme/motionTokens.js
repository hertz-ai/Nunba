/**
 * Motion tokens — the ONE set of easing curves and durations.
 *
 * Dependency-free on purpose (like ./hartGlass): the <hart-agent> embed's
 * launcher paints its orb before React/MUI load and needs the same spring
 * as the app, so the numbers cannot live only in socialTokens (which pulls
 * in @mui/material/styles).  socialTokens re-exports these unchanged, so
 * every existing `import {EASINGS} from '../theme/socialTokens'` keeps
 * working and the values exist exactly once.
 */

export const EASINGS = {
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

export const DURATIONS = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
};
