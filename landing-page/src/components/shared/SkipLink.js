import React from 'react';

/**
 * "Skip to main content" link (WCAG 2.4.1 Bypass Blocks).
 *
 * Off-screen until it receives keyboard focus, then shown in the top-left
 * corner so a keyboard user can jump past the titlebar and banners straight
 * to <main id="main-content"> in App.js.  It was dropped from App.js in
 * c9090a39 with no stated reason; this restores it unchanged in behaviour.
 */
export const SKIP_LINK_TARGET_ID = 'main-content';

const HIDDEN_CSS =
  'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
const SHOWN_CSS =
  'position:fixed;top:8px;left:8px;z-index:9999;padding:8px 16px;background:#5B54E0;color:#fff;border-radius:4px;font-size:16px;font-weight:600;text-decoration:none;width:auto;height:auto;overflow:visible;';

export default function SkipLink() {
  return (
    <a
      href={`#${SKIP_LINK_TARGET_ID}`}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        zIndex: 9999,
      }}
      onFocus={(e) => {
        e.target.style.cssText = SHOWN_CSS;
      }}
      onBlur={(e) => {
        e.target.style.cssText = HIDDEN_CSS;
      }}
    >
      Skip to main content
    </a>
  );
}
