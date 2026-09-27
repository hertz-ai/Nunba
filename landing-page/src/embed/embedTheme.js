/**
 * embedTheme — host brand tokens -> the embed's accent variables + Nunba
 * theme config.  Dependency-free (no MUI) so the launcher can paint the orb
 * in the host's colours before the UI chunk loads.
 *
 * Input (the `theme` attribute, JSON) is either a Nunba theme config
 * (`{colors:{primary, secondary, ...}}`, merged over DEFAULT_THEME_CONFIG)
 * or McGroce design tokens (`{brand, accent, ...}` / `{"--mg-color-brand"}`),
 * which are mapped onto it.
 *
 * Glass numbers are never taken from the host: they are HART_GLASS
 * (theme/hartGlass.js, mirroring HARTOS theme_service.py).
 */

import {HART_GLASS} from '../theme/hartGlass';
import {DEFAULT_THEME_CONFIG, mergeThemeConfig} from '../theme/themePresets';

// Text on accent-coloured controls.  The embed always renders its accent in
// a light tone (below), so dark ink is the readable choice on it.
export const INK = '#0b1413';

// Glass cards float over LIGHT host pages (McGroce is #f7f8f6); the HART
// glass alone (65% tint) composites to mid-grey there, which fails WCAG AA
// for the cards' 50-70% white text.  One extra layer of the SAME tint at
// this alpha brings the composite to ~#2b2c34 on white (≥4.5:1 for the
// dimmest caption).  Measured by arithmetic, not in a browser.
export const EMBED_LEGIBILITY_UNDERLAY = 0.7;

export const EMBED_GLASS_BACKGROUND =
  `linear-gradient(rgba(${HART_GLASS.tintRgb}, ${EMBED_LEGIBILITY_UNDERLAY}), `
  + `rgba(${HART_GLASS.tintRgb}, ${EMBED_LEGIBILITY_UNDERLAY})), ${HART_GLASS.background}`;

function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

// A floating card drawn OVER the sheet's own timeline (phone tray) needs to
// hide what is under it; same tint, near-opaque.
export const EMBED_TRAY_BACKGROUND = `rgba(${HART_GLASS.tintRgb}, 0.96)`;

/** WCAG relative luminance of a hex colour (null if unparsable). */
export function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function mix(hex, withHex, amount) {
  const a = parseHex(hex);
  const b = parseHex(withHex);
  if (!a || !b) return hex;
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

/** Lighten until INK reads on it at ≥ 7:1 (AAA for button labels). */
export function lightAccent(hex) {
  let c = parseHex(hex) ? hex : DEFAULT_THEME_CONFIG.colors.primary;
  for (let i = 0; i < 12 && (contrastRatio(c, INK) || 0) < 7; i++) {
    c = mix(c, '#ffffff', 0.12);
  }
  return c;
}

function fromMcgTokens(t) {
  const get = (...keys) => keys.map((k) => t[k]).find((v) => typeof v === 'string');
  const brand = get('brand', 'color-brand', '--mg-color-brand', 'primary');
  const accent = get('accent', 'color-accent', '--mg-color-accent', 'secondary');
  if (!brand && !accent) return null;
  const colors = {};
  if (brand) colors.primary = brand;
  if (accent) colors.secondary = accent;
  return {colors};
}

export function parseThemeAttr(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/**
 * @returns {{config:object, accent:string, accentStrong:string,
 *            accent2:string, ink:string}}
 */
export function resolveEmbedTheme(themeAttr) {
  const t = parseThemeAttr(themeAttr);
  const overrides = t.colors ? t : (fromMcgTokens(t) || {});
  const oc = overrides.colors || {};
  // A host that gives only its brand colour gets its own light/dark shades,
  // not the default preset's violet ones.
  const derived = {};
  if (oc.primary && !oc.primary_light) derived.primary_light = mix(oc.primary, '#ffffff', 0.3);
  if (oc.primary && !oc.primary_dark) derived.primary_dark = mix(oc.primary, '#000000', 0.28);
  if (oc.secondary && !oc.secondary_light) derived.secondary_light = mix(oc.secondary, '#ffffff', 0.3);
  if (oc.secondary && !oc.secondary_dark) derived.secondary_dark = mix(oc.secondary, '#000000', 0.28);
  const config = mergeThemeConfig(DEFAULT_THEME_CONFIG, {...overrides, colors: {...derived, ...oc}});
  const accent = lightAccent(config.colors.primary);
  const accent2 = lightAccent(config.colors.secondary || config.colors.primary);
  return {
    config,
    accent,
    accentStrong: mix(accent, '#ffffff', 0.18),
    accent2,
    ink: INK,
  };
}
