/**
 * HART glass — the ONE definition of the frosted-glass look.
 *
 * This is CSS in a webview.  It renders identically on Windows, macOS and
 * Linux, so there is nothing here to fork per platform: one set of numbers,
 * every surface.  Before this module the same look was written out three
 * times with three different sets of numbers (the HART OS shell, the
 * floating companion window, the agent overlay cards), and they drifted.
 *
 * ── Where the numbers come from ──────────────────────────────────────────
 * HARTOS `integrations/agent_engine/theme_service.py` is the source of truth.
 * `ThemeService.get_active_theme()`'s `shell` block (theme_service.py:131-132)
 * carries the runtime defaults and `get_css_variables()` emits them as CSS
 * custom properties (theme_service.py:452-463):
 *
 *     --hart-blur           20px        shell.blur_radius
 *     --hart-saturation     180%        shell.saturation
 *     --hart-radius         16px        shell.border_radius
 *     --hart-panel-opacity  0.65        shell.panel_opacity
 *     --hart-glass-rgb      18,19,28    shell.glass_rgb
 *
 * The shell then paints `.glass` from those vars.  Two stylesheets declare
 * the rule — the inline one in `liquid_ui_service.py:3353` and the linked
 * `static/hartResponsive.css:171`, which the shell loads LAST
 * (liquid_ui_service.py:3762), so at equal specificity the stylesheet's
 * border and box-shadow are what actually render:
 *
 *     border:      1px solid var(--hart-glass-border)   rgba(255,255,255,0.09)
 *     box-shadow:  0 26px 76px rgba(0,0,0,0.52),
 *                  inset 0 1px 0 rgba(255,255,255,0.06)
 *
 * NOTE: `hartResponsive.css:117-120` also carries FALLBACKS (30px / 165% /
 * 20px) for a shell rendered before the theme vars are emitted.  Those are a
 * safety net, not the design — the emitted values above win at runtime and
 * are the ones mirrored here.
 *
 * ── Keeping this in step ─────────────────────────────────────────────────
 * If the HARTOS defaults move, move them here in the same change.  This is
 * data only: no React, no MUI, no component.  Anything that needs the look
 * spreads one of the surface objects below.
 *
 * Lives beside the other design tokens (socialTokens.js, themePresets.js)
 * rather than inside them: socialTokens is MUI-coupled (its glass mixins are
 * `(theme) => ({...})` functions over `theme.palette` via `alpha`) and scoped
 * to the social UI, so the canonical constants get their own dependency-free
 * module that those files can import FROM.
 */

// ── The canonical numbers, written once ──────────────────────────────────
const BLUR_PX = 20;
const SATURATION_PCT = 180;
const RADIUS_PX = 16;
const PANEL_OPACITY = 0.65;
const TINT_RGB = '18, 19, 28';
const BORDER_COLOR = 'rgba(255,255,255,0.09)';
const ELEVATION_SHADOW =
  '0 26px 76px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.06)';

/**
 * The raw values, for anything that needs a number rather than a CSS string
 * (the companion's window-shape maths, a theme preset's config block).
 */
export const HART_GLASS = Object.freeze({
  blur: BLUR_PX,
  saturation: SATURATION_PCT,
  radius: RADIUS_PX,
  panelOpacity: PANEL_OPACITY,
  tintRgb: TINT_RGB,
  borderColor: BORDER_COLOR,
  // Derived — every one of these is built from the constants above, so the
  // numbers exist exactly once.
  background: `rgba(${TINT_RGB}, ${PANEL_OPACITY})`,
  backdropFilter: `blur(${BLUR_PX}px) saturate(${SATURATION_PCT}%)`,
  border: `1px solid ${BORDER_COLOR}`,
  boxShadow: ELEVATION_SHADOW,
});

/**
 * Ready to spread into a style / sx object.  `borderRadius` is a px STRING
 * on purpose: MUI's `sx` multiplies a bare number by `theme.shape.border
 * Radius`, so '16px' is the only spelling that means 16 device-independent
 * pixels in both an inline style and an sx prop.
 */
export const HART_GLASS_SURFACE = Object.freeze({
  background: HART_GLASS.background,
  backdropFilter: HART_GLASS.backdropFilter,
  WebkitBackdropFilter: HART_GLASS.backdropFilter,
  border: HART_GLASS.border,
  borderRadius: `${RADIUS_PX}px`,
  boxShadow: HART_GLASS.boxShadow,
});

/**
 * ── The one documented exception: the floating companion's corner radius ──
 *
 * The companion window's radius is NOT cosmetic.  VoiceOrbPage's `shapeFor()`
 * hands this number to the desktop bridge as the `r` of the rect the window
 * is clipped to (`on_companion_presence` -> `desktop/platform_utils.
 * set_window_shape` -> `CreateRoundRectRgn` + `SetWindowRgn`), so it is the
 * shape the OS cuts the window to, not just a CSS corner.
 *
 * `tests/test_restart_minimize.py::test_shape_box_maps_the_pages_css_rect_to_
 * window_pixels` pins that mapping: a 220x310 css card at r=24 on a 150%
 * display must produce the region (0, 0, 330, 465, 72, 72).  Aligning this to
 * the canonical 16 would change the physical region the window is cut to and
 * break that pinned mapping, so the companion keeps 24 and says why.
 * Correctness of the window shape beats visual uniformity.
 *
 * Everything else about the companion's glass — blur, saturation, tint,
 * border, shadow — is the canonical set above.
 */
export const COMPANION_CARD_RADIUS = 24;

export const COMPANION_GLASS_SURFACE = Object.freeze({
  ...HART_GLASS_SURFACE,
  borderRadius: `${COMPANION_CARD_RADIUS}px`,
});

export default HART_GLASS;
