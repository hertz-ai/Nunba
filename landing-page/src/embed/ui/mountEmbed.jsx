/**
 * mountEmbed — the lazily-loaded Liquid UI of <hart-agent>.
 *
 * Providers: an Emotion cache whose styles live INSIDE the element's shadow
 * root (host CSS cannot leak in, embed CSS cannot leak out), and the Nunba
 * MUI theme built from the host's brand tokens (theme/themeBuilder via
 * embedTheme).  Portals render into the shadow root too.
 *
 * Surfaces:
 *   assistant / merchant-onboarding / marketing -> LiquidSheet
 *   voice                                        -> VoiceCapsule
 *   overlay                                      -> floating stack only
 * One element per session draws the FLOATING fragment stack (the existing
 * AgentOverlay manager, fed by the session instead of realtimeService).
 */

import LiquidSheet from './LiquidSheet';
import {GLASS_SX, SpringIn, enterSx, useSessionState} from './shared';
import VoiceCapsule from './VoiceCapsule';

import AgentOverlay from '../../components/AgentOverlay/AgentOverlay';
import buildMuiTheme from '../../theme/themeBuilder';
import {pageSheets} from '../embedSession';
import {EMBED_TRAY_BACKGROUND, INK} from '../embedTheme';

import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, {useCallback, useMemo, useSyncExternalStore} from 'react';

// Height of the sheet's input bar (8 + 44 + 12 px): the floating tray sits
// just above it while a phone sheet is open.
const INPUT_BAR = 64;
import {createRoot} from 'react-dom/client';

const SHEET_SURFACES = new Set(['assistant', 'merchant-onboarding', 'marketing']);

function embedMuiTheme(themeInfo, portalContainer) {
  const base = buildMuiTheme(themeInfo.config);
  return createTheme(base, {
    palette: {primary: {main: themeInfo.accent, contrastText: INK}},
    components: {
      MuiButton: {styleOverrides: {containedPrimary: {color: INK}}},
      MuiPopover: {defaultProps: {container: portalContainer}},
      MuiPopper: {defaultProps: {container: portalContainer}},
      MuiModal: {defaultProps: {container: portalContainer}},
    },
  });
}

function FloatingStack({session, state, hasOrb, position, isDesktop, onNavigate}) {
  const left = position === 'bottom-left';
  const panelOpen = state.openSheets.length > 0;
  // An INLINE fragment's summary toast (RN parity) is for when the timeline
  // is out of sight; with a sheet open the card itself is right there.
  const subscribe = useCallback((handler) => session.subscribeStack((f) => {
    if (f._summaryOf && session.getState().openSheets.length > 0) return;
    handler(f);
  }), [session]);
  const navigate = useCallback((target) => onNavigate({path: target}), [onNavigate]);
  const side = left ? 'left' : 'right';
  // Phone + open sheet: the orb is tucked away, so the stack becomes a tray
  // above the sheet's input bar — in the thumb zone, clear of the header.
  const inSheet = panelOpen && !isDesktop;
  const openElsewhere = useSyncExternalStore(pageSheets.subscribe, pageSheets.getSnapshot, pageSheets.getSnapshot)
    .some((uid) => uid !== session.uid);
  const containerSx = {
    // Another session's sheet owns a phone screen; its cards wait here.
    visibility: openElsewhere && !isDesktop ? 'hidden' : 'visible',
    zIndex: 2147483002,
    top: 'auto',
    bottom: inSheet
      ? `calc(${INPUT_BAR + 8}px + env(safe-area-inset-bottom, 0px))`
      : `calc(${hasOrb ? 84 : 16}px + var(--hart-offset-bottom, 0px) + env(safe-area-inset-bottom, 0px))`,
    right: 'auto', left: 'auto',
    [side]: panelOpen && isDesktop ? 452 : 16,
    width: {xs: 'calc(100% - 32px)', sm: 340},
    maxHeight: inSheet ? '60vh' : '80vh',
    overflowY: 'auto',
    flexDirection: 'column-reverse',
  };
  return (
    <AgentOverlay
      subscribe={subscribe}
      onAction={session.act}
      navigate={navigate}
      containerSx={containerSx}
      cardSx={{...GLASS_SX, ...enterSx, ...(inSheet ? {background: EMBED_TRAY_BACKGROUND} : {})}}
      cardTransition={SpringIn}
    />
  );
}

function EmbedApp(props) {
  const {
    session, surface, open, agentName, position, onClose, onNavigate,
    elementId, sttUrl, locale, onListening, shadowRoot,
  } = props;
  const state = useSessionState(session);
  const isDesktop = useMediaQuery('(min-width: 768px)', {noSsr: true});
  const drawsFloating = state.floatingOwner === elementId;
  const common = {
    session, state, agentName, onNavigate, sttUrl, locale, onListening, position, shadowRoot, onClose, isDesktop,
  };
  return (
    <>
      {SHEET_SURFACES.has(surface) && <LiquidSheet {...common} open={open} surface={surface} />}
      {surface === 'voice' && <VoiceCapsule {...common} open={open} />}
      {drawsFloating && (
        <FloatingStack session={session} state={state} hasOrb={surface !== 'overlay' || session.orbCount() > 0}
          position={position} isDesktop={isDesktop} onNavigate={onNavigate} />
      )}
    </>
  );
}

function Providers({props, cache}) {
  const {theme: themeInfo, container} = props;
  const muiTheme = useMemo(() => embedMuiTheme(themeInfo, container), [themeInfo, container]);
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={muiTheme}>
        <EmbedApp {...props} />
      </ThemeProvider>
    </CacheProvider>
  );
}

export function mountEmbed(props) {
  const cache = createCache({key: 'hart', container: props.shadowRoot, prepend: true});
  const root = createRoot(props.container);
  let current = props;
  const render = () => root.render(<Providers props={current} cache={cache} />);
  render();
  return {
    update(next) {
      current = next;
      render();
    },
    unmount() {
      root.unmount();
    },
  };
}
