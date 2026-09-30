/**
 * LiquidSheet — the web port of Hevolve_React_Native
 * components/shared/LiquidOverlay.js.
 *
 *   mobile   bottom sheet at 85% of the viewport (RN SHEET_HEIGHT), drag
 *            handle, swipe down / tap the scrim / Esc to close
 *   desktop  a floating glass side panel docked to the orb's side
 *
 * Header (agent avatar, name, subtitle, close), a ServerDrivenUI
 * `dynamic_layout` header (SocialLiquidUI, as LiquidOverlay does), the
 * timeline of messages and INLINE fragments, thinking dots, and an input
 * bar with voice.  Draft bubbles are replaced in place by speculation_id.
 */

import {FragmentCard, GLASS_SX, SuggestionChips, Timeline, Waveform, useVoice} from './shared';
import {surfaceConfig} from './surfaceConfig';

import {SocialLiquidUI} from '../../components/shared/LiquidUI';
import {SPRING, SPRING_MS} from '../launcherStyles';

import {Box, IconButton, InputBase, Typography} from '@mui/material';
import React, {useCallback, useEffect, useRef, useState} from 'react';

const SHEET_WIDTH = 420;

function CloseGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z" />
    </svg>
  );
}

function SendGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
    </svg>
  );
}

export function MicGlyph({size = 20}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const node = ref.current;
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const f = Array.from(node.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return;
      const root = node.getRootNode();
      const current = root.activeElement;
      if (e.shiftKey && current === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && current === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [ref, active]);
}

export default function LiquidSheet({
  open, onClose, session, state, surface, agentName, isDesktop, onNavigate,
  sttUrl, locale, onListening, position, shadowRoot,
}) {
  const cfg = surfaceConfig(surface, agentName);
  const [text, setText] = useState('');
  const [drag, setDrag] = useState(0);
  const sheetRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  const left = position === 'bottom-left';

  const send = useCallback((t) => {
    const v = String(t || '').trim();
    if (!v) return;
    setText('');
    session.send(v);
  }, [session]);

  const voice = useVoice({sttUrl, locale, onFinal: send, onListening});

  // Focus: the input on desktop; the dialog itself on touch, so opening the
  // sheet does not throw up the keyboard over it.
  useEffect(() => {
    if (!open) {
      if (voice.listening) voice.stop();
      return undefined;
    }
    const t = setTimeout(() => {
      if (isDesktop && inputRef.current) inputRef.current.focus();
      else if (sheetRef.current) sheetRef.current.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open, isDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusTrap(sheetRef, open && !isDesktop);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Keep the newest item in view.
  const count = state.timeline.length;
  useEffect(() => {
    const el = listRef.current;
    if (!el || !open) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      try {
        el.scrollTo({top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth'});
      } catch {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [count, state.thinking, open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  // Swipe-down to dismiss (mobile).
  // Capture only once the finger actually drags, and never from a control:
  // capturing on pointerdown would steal the close button's click.
  const onPointerDown = (e) => {
    if (isDesktop || (e.target.closest && e.target.closest('button'))) return;
    dragRef.current = {y: e.clientY, t: performance.now(), id: e.pointerId, el: e.currentTarget, captured: false};
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (!d.captured && dy > 6) {
      d.captured = true;
      try { d.el.setPointerCapture(d.id); } catch { /* noop */ }
    }
    if (d.captured) setDrag(Math.max(0, dy));
  };
  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.y;
    const v = dy / Math.max(1, performance.now() - dragRef.current.t);
    dragRef.current = null;
    setDrag(0);
    if (dy > 110 || v > 0.9) onClose();
  };

  // Desktop: the panel springs up out of the orb; mobile: the sheet rises.
  const hidden = isDesktop ? 'translateY(14px) scale(0.96)' : 'translateY(105%)';
  const shown = drag ? `translateY(${drag}px)` : 'none';
  const empty = state.timeline.length === 0;
  const demo = state.transportKind === 'demo';

  return (
    <>
      {!isDesktop && (
        <Box aria-hidden="true" onClick={onClose}
          sx={{
            position: 'fixed', inset: 0, zIndex: 2147482999,
            background: 'rgba(8,10,14,0.55)',
            opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
            transition: `opacity ${SPRING_MS}ms ease`,
          }} />
      )}
      <Box
        ref={sheetRef}
        role="dialog"
        aria-modal={isDesktop ? 'false' : 'true'}
        aria-label={`${cfg.title} — ${cfg.subtitle}`}
        aria-hidden={open ? undefined : 'true'}
        inert={open ? undefined : ''}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-testid="hart-sheet"
        data-open={open ? 'true' : 'false'}
        sx={{
          ...GLASS_SX,
          position: 'fixed', zIndex: 2147483000, outline: 'none',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          visibility: open ? 'visible' : 'hidden',
          transform: open ? shown : hidden,
          opacity: isDesktop && !open ? 0 : 1,
          transformOrigin: left ? 'bottom left' : 'bottom right',
          transition: drag ? 'none'
            : `transform ${SPRING_MS + 60}ms ${SPRING}, opacity ${SPRING_MS}ms ease, visibility 0s linear ${open ? '0s' : `${SPRING_MS + 60}ms`}`,
          '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
          ...(isDesktop
            ? {
              // Sits above the orb (16 inset + 56 orb + 12 gap) so the orb
              // stays visible as the close control.
              bottom: 'calc(84px + var(--hart-offset-bottom, 0px))',
              height: 'min(720px, calc(100vh - 100px - var(--hart-offset-bottom, 0px)))',
              width: SHEET_WIDTH, maxWidth: 'calc(100vw - 32px)',
              [left ? 'left' : 'right']: 16,
            }
            : {
              left: 0, right: 0, bottom: 0, height: '85vh', maxHeight: '85dvh',
              borderRadius: '20px 20px 0 0', borderBottom: 'none',
            }),
        }}>
        {/* Header (drag area on mobile) */}
        <Box
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          sx={{px: 2, pt: isDesktop ? 1.5 : 1, pb: 1.25, touchAction: isDesktop ? 'auto' : 'none', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
          {!isDesktop && (
            <Box aria-hidden="true" sx={{width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)', mx: 'auto', mb: 1}} />
          )}
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1.25}}>
            <Box aria-hidden="true" sx={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
              background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.7), transparent 40%), var(--hart-accent)',
              color: 'var(--hart-ink)', fontWeight: 800, fontSize: 17,
            }}>
              {(agentName || 'N').charAt(0).toUpperCase()}
            </Box>
            <Box sx={{flex: 1, minWidth: 0}}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0}}>
                <Typography component="h2" sx={{m: 0, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.3, minWidth: 0}} noWrap>
                  {cfg.title}
                </Typography>
                {demo && (
                  <Box component="span" sx={{flexShrink: 0, fontSize: 11, fontWeight: 700, px: 0.75, py: '1px', borderRadius: '999px',
                    color: 'var(--hart-ink)', background: 'var(--hart-accent-2)', whiteSpace: 'nowrap'}}>
                    {state.transportLabel}
                  </Box>
                )}
              </Box>
              <Typography component="p" sx={{m: 0, fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.35}}>
                {cfg.subtitle}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label={`Close ${cfg.title}`}
              sx={{width: 44, height: 44, color: '#fff', background: 'rgba(255,255,255,0.08)',
                '&:hover': {background: 'rgba(255,255,255,0.16)'},
                '&:focus-visible': {outline: '2px solid var(--hart-accent)', outlineOffset: 2}}}>
              <CloseGlyph />
            </IconButton>
          </Box>
        </Box>

        {!online && state.transportKind === 'gateway' && (
          <Box role="status" sx={{px: 2, py: 0.75, fontSize: 13, background: 'rgba(255,171,0,0.16)', color: '#ffe3a3', flexShrink: 0}}>
            You&rsquo;re offline. I&rsquo;ll be back when your connection is.
          </Box>
        )}

        {/* Timeline */}
        <Box ref={listRef} data-testid="hart-timeline"
          sx={{flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, py: 1.5,
            display: 'flex', flexDirection: 'column', gap: 1.25}}>
          {state.layout && (
            <Box sx={{...GLASS_SX, p: 1.5, boxShadow: 'none'}}>
              <SocialLiquidUI layout={state.layout} data={state.layoutData} keyframesRoot={shadowRoot}
                onAction={(name, payload) => {
                  if (name === 'navigate' && payload && payload.path) onNavigate({path: payload.path});
                  else session.act(name, payload);
                }} />
            </Box>
          )}
          {empty && !state.layout && (
            <Box sx={{m: 'auto', py: 2, width: '100%'}}>
              {cfg.welcome && (
                <SocialLiquidUI layout={cfg.welcome} data={{}} keyframesRoot={shadowRoot} sx={{background: 'transparent', p: 0}} />
              )}
              <Box sx={{display: 'flex', justifyContent: 'center'}}>
                <SuggestionChips items={cfg.suggestions} onPick={send} />
              </Box>
            </Box>
          )}
          {!empty && (
            <Timeline state={state} session={session} onNavigate={onNavigate} onSend={send} />
          )}
        </Box>

        {/* Input bar — thumb zone */}
        <Box component="form" onSubmit={(e) => { e.preventDefault(); send(text); }}
          sx={{flexShrink: 0, px: 1.5, pt: 1, pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid rgba(255,255,255,0.08)'}}>
          {voice.error && (
            <Typography role="alert" sx={{fontSize: 12.5, color: '#ffb3c4', px: 0.5, pb: 0.75}}>{voice.error}</Typography>
          )}
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <IconButton type="button" onClick={() => (voice.listening ? voice.stop() : voice.start())}
              aria-label={voice.listening ? 'Stop listening' : 'Speak your request'}
              aria-pressed={voice.listening ? 'true' : 'false'}
              sx={{width: 44, height: 44, flexShrink: 0,
                color: voice.listening ? 'var(--hart-ink)' : '#fff',
                background: voice.listening ? 'var(--hart-accent)' : 'rgba(255,255,255,0.08)',
                '&:hover': {background: voice.listening ? 'var(--hart-accent-strong)' : 'rgba(255,255,255,0.16)'},
                '&:focus-visible': {outline: '2px solid var(--hart-accent)', outlineOffset: 2}}}>
              <MicGlyph />
            </IconButton>
            <Box sx={{flex: 1, minWidth: 0, height: 44, display: 'flex', alignItems: 'center', px: 2,
              borderRadius: '999px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
              '&:focus-within': {borderColor: 'var(--hart-accent)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--hart-accent) 30%, transparent)'}}}>
              {voice.listening ? (
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%'}}>
                  <Waveform amplitude={voice.amplitude} active height={22} />
                  <Typography noWrap sx={{fontSize: 14, color: 'rgba(255,255,255,0.85)'}}>
                    {voice.partial || 'Listening…'}
                  </Typography>
                </Box>
              ) : (
                <InputBase inputRef={inputRef} value={text} onChange={(e) => setText(e.target.value)}
                  placeholder={cfg.placeholder} fullWidth
                  inputProps={{'aria-label': `Message ${agentName}`, enterKeyHint: 'send', autoComplete: 'off'}}
                  sx={{color: '#fff', fontSize: 15, '& input::placeholder': {color: 'rgba(255,255,255,0.6)', opacity: 1}}} />
              )}
            </Box>
            <IconButton type="submit" aria-label="Send" disabled={!text.trim() || voice.listening}
              sx={{width: 44, height: 44, flexShrink: 0, color: 'var(--hart-ink)', background: 'var(--hart-accent)',
                transition: `transform ${SPRING_MS}ms ${SPRING}, opacity 150ms ease`,
                '&:hover': {background: 'var(--hart-accent-strong)'},
                '&:active': {transform: 'scale(0.92)'},
                '&.Mui-disabled': {background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)'},
                '&:focus-visible': {outline: '2px solid #fff', outlineOffset: 2}}}>
              <SendGlyph />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </>
  );
}

export {FragmentCard};
