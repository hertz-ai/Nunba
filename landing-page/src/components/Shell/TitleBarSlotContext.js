/* eslint-disable */
/**
 * TitleBarSlotContext — portal slot for the right cluster of NunbaTitleBar.
 *
 * Pattern: NunbaTitleBar renders a `<div ref={slotRef}>` inside its right
 * region and publishes the live element via this Context.  Any consumer
 * (e.g. Demopage's intelligence-preference chip + Audio Only dropdown) can
 * `createPortal(jsx, slotElement)` to relocate its UI into the titlebar
 * without lifting state.
 *
 * Falls back gracefully:
 *   - Browser mode (no pywebview)   → NunbaTitleBar doesn't mount → slot
 *     is null → consumers render INLINE (today's behavior).  Zero regression.
 *   - macOS pywebview                → titlebar not rendered → slot null →
 *     consumers render inline.
 *   - Win+Linux pywebview            → slot is the live <div> → consumers
 *     portal their JSX into the titlebar's right cluster.
 *
 * Why portal vs state-lift: Demopage's chip ties to ~15 other state hooks
 * (mediaMode / intelligencePreference / backendHealth / screenWidth /
 * currentAgent.agent_status / etc.).  Lifting them all to AppShellContext
 * is a 200+ LOC refactor with high regression risk.  Portal moves only the
 * DOM render location, leaving React tree + state ownership untouched.
 */
import React, { createContext, useContext } from 'react';

const TitleBarSlotContext = createContext(null);

export function TitleBarSlotProvider({ slot, children }) {
  return (
    <TitleBarSlotContext.Provider value={slot}>
      {children}
    </TitleBarSlotContext.Provider>
  );
}

/**
 * Returns the live <div> element for the titlebar right slot, or null if
 * the titlebar isn't mounted (browser mode / macOS).  Consumer pattern:
 *
 *   const slot = useTitleBarRightSlot();
 *   if (slot) {
 *     return createPortal(<MyChip />, slot);
 *   }
 *   return <MyChip />;  // inline fallback
 */
export function useTitleBarRightSlot() {
  return useContext(TitleBarSlotContext);
}

export default TitleBarSlotContext;
