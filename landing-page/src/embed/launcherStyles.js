/**
 * launcherStyles — the shadow-root stylesheet for <hart-agent>'s shell:
 * the liquid-glass orb, its states, the live regions and the one motion
 * language every embed surface uses.
 *
 * Motion: ONE spring (EASINGS.spring) at DURATIONS.normal for everything
 * that enters or leaves — orb press, sheet, floating fragments — exported
 * as --hart-spring / --hart-dur so the React surfaces use the same curve.
 * prefers-reduced-motion turns every animation and transition off.
 */

import {EMBED_GLASS_BACKGROUND} from './embedTheme';

import {HART_GLASS} from '../theme/hartGlass';
import {DURATIONS, EASINGS} from '../theme/motionTokens';

export const SPRING = EASINGS.spring;
export const SPRING_MS = DURATIONS.normal;

export function launcherCss() {
  return `
:host {
  all: initial;
  display: contents;
  --hart-spring: ${EASINGS.spring};
  --hart-ease: ${EASINGS.smooth};
  --hart-dur: ${DURATIONS.normal}ms;
  --hart-dur-fast: ${DURATIONS.fast}ms;
  --hart-glass-bg: ${EMBED_GLASS_BACKGROUND};
  --hart-glass-filter: ${HART_GLASS.backdropFilter};
  --hart-glass-border: ${HART_GLASS.border};
  --hart-glass-shadow: ${HART_GLASS.boxShadow};
  --hart-radius: ${HART_GLASS.radius}px;
  --hart-orb: 56px;
  --hart-inset: 16px;
  --hart-offset-bottom: 0px;
}
:host([hidden]) { display: none; }
.hart-root {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
:where(.hart-root, .hart-root *, .hart-root *::before, .hart-root *::after) { box-sizing: border-box; }
.hart-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.hart-dock {
  position: fixed;
  z-index: 2147483000;
  bottom: calc(var(--hart-inset) + var(--hart-offset-bottom) + env(safe-area-inset-bottom, 0px));
  right: calc(var(--hart-inset) + env(safe-area-inset-right, 0px));
  display: flex; align-items: center; gap: 10px;
  flex-direction: row-reverse;
}
.hart-dock[hidden] { display: none; }
.hart-root[data-position="bottom-left"] .hart-dock {
  right: auto;
  left: calc(var(--hart-inset) + env(safe-area-inset-left, 0px));
  flex-direction: row;
}
.hart-orb {
  position: relative;
  width: var(--hart-orb); height: var(--hart-orb);
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.45);
  padding: 0; margin: 0; cursor: pointer;
  color: #fff;
  background:
    radial-gradient(circle at 32% 26%, rgba(255,255,255,0.75) 0, rgba(255,255,255,0) 38%),
    radial-gradient(circle at 70% 80%, var(--hart-accent-2, #ff9494) 0, transparent 55%),
    radial-gradient(circle at 50% 50%, var(--hart-accent, #9b94ff) 0, var(--hart-accent-deep, #4a42cc) 100%);
  box-shadow:
    0 12px 32px -6px color-mix(in srgb, var(--hart-accent, #9b94ff) 55%, transparent),
    0 2px 6px rgba(0,0,0,0.18),
    inset 0 -6px 14px rgba(0,0,0,0.18),
    inset 0 2px 6px rgba(255,255,255,0.55);
  overflow: hidden;
  transform: translateZ(0) scale(1);
  transition: transform var(--hart-dur) var(--hart-spring), box-shadow var(--hart-dur) var(--hart-ease);
  outline: none;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}
.hart-halo {
  /* breathing lives on a wrapper so the button's own hover/press spring
     is never overridden by the idle animation */
  position: relative; display: inline-block; border-radius: 50%;
  animation: hart-breathe 4.8s var(--hart-ease) infinite;
}
.hart-orb::before {
  /* the liquid: a slow conic swirl under the glass */
  content: ""; position: absolute; inset: -30%;
  background: conic-gradient(from 0deg,
    transparent 0deg, rgba(255,255,255,0.28) 60deg, transparent 120deg,
    color-mix(in srgb, var(--hart-accent-2, #ff9494) 60%, transparent) 200deg, transparent 280deg);
  animation: hart-swirl 9s linear infinite;
  mix-blend-mode: soft-light;
}
.hart-orb::after {
  /* specular rim */
  content: ""; position: absolute; inset: 3px; border-radius: 50%;
  border-top: 1px solid rgba(255,255,255,0.7);
  opacity: 0.8; pointer-events: none;
}
.hart-orb:hover { transform: translateZ(0) scale(1.06); }
.hart-orb:active { transform: translateZ(0) scale(0.92); }
.hart-orb:focus-visible {
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--hart-accent-deep, #4a42cc);
}
.hart-orb .hart-glyph {
  position: relative; z-index: 1;
  display: grid; place-items: center; width: 100%; height: 100%;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
  transition: transform var(--hart-dur) var(--hart-spring), opacity var(--hart-dur-fast) var(--hart-ease);
}
.hart-orb svg { width: 26px; height: 26px; }
.hart-orb .hart-glyph-close { position: absolute; inset: 0; opacity: 0; transform: rotate(-90deg) scale(0.6); }
.hart-root[data-open="true"] .hart-orb .hart-glyph-main { opacity: 0; transform: rotate(90deg) scale(0.6); }
.hart-root[data-open="true"] .hart-orb .hart-glyph-close { opacity: 1; transform: none; }
.hart-root[data-state="thinking"] .hart-orb::before { animation-duration: 1.4s; }
.hart-root[data-state="thinking"] .hart-halo { animation: hart-think 1.2s var(--hart-ease) infinite; }
.hart-root[data-state="loading"] .hart-orb .hart-ring,
.hart-root[data-state="thinking"] .hart-orb .hart-ring {
  opacity: 1; animation: hart-spin 0.9s linear infinite;
}
.hart-ring {
  position: absolute; inset: 2px; border-radius: 50%; z-index: 2;
  border: 2px solid transparent; border-top-color: rgba(255,255,255,0.95);
  opacity: 0; transition: opacity var(--hart-dur-fast) var(--hart-ease);
  pointer-events: none;
}
.hart-ripple {
  position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  border: 2px solid var(--hart-accent, #9b94ff); opacity: 0;
}
.hart-root[data-state="listening"] .hart-halo { animation: none; }
.hart-root[data-state="listening"] .hart-ripple { animation: hart-ripple 1.6s var(--hart-ease) infinite; }
.hart-root[data-state="listening"] .hart-ripple.r2 { animation-delay: 0.8s; }
.hart-root[data-state="error"] .hart-halo { animation: hart-shake 0.42s var(--hart-ease) 1; }
.hart-badge {
  position: absolute; top: 2px; right: 2px; z-index: 3;
  min-width: 14px; height: 14px; border-radius: 7px;
  background: #ff5c80; border: 2px solid #fff;
  transform: scale(0); transition: transform var(--hart-dur) var(--hart-spring);
}
.hart-root[data-unread="true"] .hart-badge { transform: scale(1); }
.hart-label {
  pointer-events: none;
  padding: 8px 14px; border-radius: 999px;
  background: var(--hart-glass-bg);
  -webkit-backdrop-filter: var(--hart-glass-filter); backdrop-filter: var(--hart-glass-filter);
  border: var(--hart-glass-border);
  box-shadow: 0 8px 24px rgba(0,0,0,0.22);
  font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap;
  opacity: 0; transform: translateX(8px) scale(0.96);
  transition: opacity var(--hart-dur-fast) var(--hart-ease), transform var(--hart-dur) var(--hart-spring);
}
.hart-root[data-position="bottom-left"] .hart-label { transform: translateX(-8px) scale(0.96); }
@media (hover: hover) and (pointer: fine) {
  .hart-dock:hover .hart-label, .hart-orb:focus-visible + .hart-label { opacity: 1; transform: none; }
}
.hart-root[data-open="true"] .hart-label { opacity: 0 !important; }
.hart-tip {
  position: absolute; bottom: calc(100% + 10px); right: 0;
  max-width: min(280px, calc(100vw - 32px));
  padding: 10px 12px; border-radius: 12px;
  background: var(--hart-glass-bg); border: var(--hart-glass-border);
  -webkit-backdrop-filter: var(--hart-glass-filter); backdrop-filter: var(--hart-glass-filter);
  color: #fff; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.hart-root[data-position="bottom-left"] .hart-tip { right: auto; left: 0; }
@media (max-width: 767px) {
  /* the mobile sheet has its own close button; the orb would cover Send */
  .hart-root[data-open="true"]:not([data-surface="voice"]) .hart-dock,
  .hart-root[data-elsewhere="true"] .hart-dock {
    opacity: 0; pointer-events: none; transform: scale(0.6);
    transition: opacity var(--hart-dur-fast) var(--hart-ease), transform var(--hart-dur) var(--hart-spring);
  }
}
@keyframes hart-breathe { 0%, 100% { transform: translateZ(0) scale(1); } 50% { transform: translateZ(0) scale(1.035); } }
@keyframes hart-think { 0%, 100% { transform: translateZ(0) scale(1); } 50% { transform: translateZ(0) scale(0.96); } }
@keyframes hart-swirl { to { transform: rotate(360deg); } }
@keyframes hart-spin { to { transform: rotate(360deg); } }
@keyframes hart-ripple { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(1.8); } }
@keyframes hart-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@media (prefers-reduced-motion: reduce) {
  .hart-root *, .hart-root *::before, .hart-root *::after {
    animation: none !important; transition: none !important; scroll-behavior: auto !important;
  }
}
@media (forced-colors: active) {
  .hart-orb { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
}
`;
}

export const ICONS = {
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5zm6.5 11l.95 2.55L22 17l-2.55.95L18.5 20.5l-.95-2.55L15 17l2.55-.95.95-2.55z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 4h16l1 5a3 3 0 0 1-2 2.83V20H5v-8.17A3 3 0 0 1 3 9l1-5zm3 16h4v-5H7v5zm6-5v3h4v-3h-4z"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 10v4a1 1 0 0 0 1 1h2l4 4V5L6 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.06A7 7 0 0 1 14 18.74v2.06A9 9 0 0 0 14 3.2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/></svg>',
};
