/**
 * Shared pieces of the embed's Liquid UI: session hook, the glass card a
 * fragment sits in, the timeline (messages + inline fragments), suggestion
 * chips, thinking dots, the voice hook and its waveform.
 *
 * Fragments are drawn by the EXISTING AgentOverlay renderers
 * (OverlayContent); nothing here re-implements a card.
 */

import {OverlayContent} from '../../components/AgentOverlay/AgentOverlay';
import useMicAmplitude from '../../hooks/useMicAmplitude';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import {EMBED_GLASS_BACKGROUND} from '../embedTheme';
import {SPRING, SPRING_MS} from '../launcherStyles';

import {Box, Button, Typography} from '@mui/material';
import React, {
  useCallback, useEffect, useRef, useState, useSyncExternalStore,
} from 'react';

export function useSessionState(session) {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}

export const ENTER_KEYFRAMES = {
  '@keyframes hartIn': {
    from: {opacity: 0, transform: 'translateY(12px) scale(0.97)'},
    to: {opacity: 1, transform: 'none'},
  },
};

export const enterSx = {
  ...ENTER_KEYFRAMES,
  animation: `hartIn ${SPRING_MS}ms ${SPRING} both`,
  '@media (prefers-reduced-motion: reduce)': {animation: 'none'},
};

export const GLASS_SX = {
  background: EMBED_GLASS_BACKGROUND,
  backdropFilter: 'var(--hart-glass-filter)',
  WebkitBackdropFilter: 'var(--hart-glass-filter)',
  border: 'var(--hart-glass-border)',
  boxShadow: 'var(--hart-glass-shadow)',
  borderRadius: 'var(--hart-radius)',
  color: '#fff',
};

/** Pass-through transition: the card's own keyframes carry the spring. */
export function SpringIn({children}) {
  return children;
}

export function FragmentCard({fragment, onAction, onNavigate}) {
  return (
    <Box
      data-fragment-type={fragment.type}
      sx={{
        ...GLASS_SX, ...enterSx, p: 2, position: 'relative',
        boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
      }}>
      <OverlayContent
        data={fragment}
        onAction={onAction}
        onDismiss={() => {}}
        navigate={(target) => onNavigate({path: target})}
      />
    </Box>
  );
}

export function ThinkingDots() {
  return (
    <Box role="presentation" sx={{display: 'flex', gap: '6px', py: 0.5,
      '@keyframes hartDot': {'0%, 100%': {opacity: 0.3, transform: 'translateY(0)'}, '50%': {opacity: 1, transform: 'translateY(-3px)'}},
      '& span': {width: 8, height: 8, borderRadius: '50%', background: 'var(--hart-accent)',
        animation: 'hartDot 1s ease-in-out infinite',
        '@media (prefers-reduced-motion: reduce)': {animation: 'none', opacity: 0.7}},
      '& span:nth-of-type(2)': {animationDelay: '150ms'},
      '& span:nth-of-type(3)': {animationDelay: '300ms'},
    }}>
      <span /><span /><span />
    </Box>
  );
}

export function SuggestionChips({items, onPick, disabled}) {
  if (!items || !items.length) return null;
  return (
    <Box role="group" aria-label="Suggestions"
      sx={{display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1}}>
      {items.map((s) => (
        <Box key={s} component="button" type="button" disabled={disabled}
          onClick={() => onPick(s)}
          sx={{
            minHeight: 36, px: 1.5, py: 0.75, borderRadius: '999px', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)',
            color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, textAlign: 'left',
            transition: `transform ${SPRING_MS}ms ${SPRING}, background 150ms ease`,
            '&:hover': {background: 'rgba(255,255,255,0.14)'},
            '&:active': {transform: 'scale(0.96)'},
            '&:focus-visible': {outline: '2px solid var(--hart-accent)', outlineOffset: 2},
            '&:disabled': {opacity: 0.5, cursor: 'default'},
          }}>
          {s}
        </Box>
      ))}
    </Box>
  );
}

function Bubble({msg, onRetry}) {
  const isUser = msg.role === 'user';
  const isError = msg.tone === 'error';
  return (
    <Box sx={{display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', ...enterSx}}>
      <Box sx={{
        maxWidth: '85%', px: 1.75, py: 1.1, borderRadius: '18px',
        borderBottomRightRadius: isUser ? '6px' : '18px',
        borderBottomLeftRadius: isUser ? '18px' : '6px',
        overflowWrap: 'anywhere',
        ...(isUser
          ? {background: 'var(--hart-accent)', color: 'var(--hart-ink)'}
          : {
            background: isError ? 'rgba(255,92,128,0.14)' : 'rgba(255,255,255,0.08)',
            border: msg.isDraft ? '1px dashed var(--hart-accent)'
              : `1px solid ${isError ? 'rgba(255,92,128,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: '#fff',
            opacity: msg.isDraft ? 0.88 : 1,
          }),
      }}>
        <Typography variant="body2" component="p" sx={{m: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-line'}}>
          {msg.text}
        </Typography>
        {msg.isDraft && (
          <Typography variant="caption" component="p" sx={{m: 0, mt: 0.5, color: 'var(--hart-accent)', fontStyle: 'italic'}}>
            draft · refining…
          </Typography>
        )}
        {isError && msg.retryText && (
          <Button size="small" onClick={() => onRetry(msg.retryText)}
            sx={{mt: 0.75, minHeight: 36, color: '#fff', borderColor: 'rgba(255,255,255,0.4)'}} variant="outlined">
            Try again
          </Button>
        )}
      </Box>
    </Box>
  );
}

/** Messages and inline fragments in arrival order (LiquidOverlay's list). */
export function Timeline({state, session, onNavigate, onSend, compact}) {
  const items = compact ? state.timeline.slice(-4) : state.timeline;
  let lastAssistant = -1;
  items.forEach((it, i) => {
    if (it.kind === 'msg' && it.role === 'assistant' && !it.isDraft) lastAssistant = i;
  });
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.25}}>
      {items.map((it, i) => (it.kind === 'fragment'
        ? <FragmentCard key={it.id} fragment={it.fragment} onAction={session.act} onNavigate={onNavigate} />
        : (
          <Box key={it.id}>
            <Bubble msg={it} onRetry={onSend} />
            {i === lastAssistant && !state.thinking && (
              <SuggestionChips items={it.suggestions} onPick={onSend} />
            )}
          </Box>
        )))}
      {state.thinking && !items.some((m) => m.isDraft) && (
        <Box sx={{alignSelf: 'flex-start', px: 1.75, py: 1, borderRadius: '18px', background: 'rgba(255,255,255,0.08)'}}>
          <ThinkingDots />
          <span className="hart-sr">Thinking</span>
        </Box>
      )}
    </Box>
  );
}

// ── Voice ────────────────────────────────────────────────────────────────

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

const MIC_ERRORS = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser settings, or type instead.',
  'service-not-allowed': 'Voice input is not allowed on this page. Type instead.',
  'audio-capture': 'No microphone found. Type instead.',
  network: 'Voice needs a connection right now. Type instead.',
};

/**
 * Voice input: the app's useSpeechRecognition (local streaming STT when an
 * `stt-url` is given, else the browser recognizer) + useMicAmplitude for
 * the waveform.  The first final phrase is the command.
 */
export function useVoice({sttUrl, locale, onFinal, onListening}) {
  const [partial, setPartial] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const amp = useMicAmplitude(2.2);
  const doneRef = useRef(false);
  const stopRef = useRef(() => {});
  const sr = useSpeechRecognition({
    sttUrl: sttUrl || null,
    onPartialResult: (t) => setPartial(t),
    onResult: (t) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setPartial(t);
      stopRef.current();
      onFinal(t);
    },
    onError: (e) => setVoiceError(MIC_ERRORS[e] || "I couldn't hear that. Tap the mic and try again."),
  });
  const supported = !!SR || !!sttUrl;

  const stop = useCallback(() => {
    sr.stopListening();
    amp.stopListening();
  }, [sr, amp]);
  stopRef.current = stop;

  const start = useCallback(async () => {
    doneRef.current = false;
    setVoiceError(null);
    setPartial('');
    if (!supported) {
      setVoiceError("Voice isn't available in this browser. Type your request instead.");
      return;
    }
    amp.startListening();
    await sr.startListening({preferredLanguage: locale || 'en-IN'});
  }, [amp, sr, locale, supported]);

  const listening = sr.isListening;
  useEffect(() => {
    if (onListening) onListening(listening);
  }, [listening, onListening]);
  useEffect(() => () => {
    if (onListening) onListening(false);
  }, [onListening]);

  return {
    start, stop, listening, partial, supported,
    amplitude: amp.amplitude,
    error: voiceError || null,
    method: sr.activeMethod,
  };
}

const BAR_SHAPE = [0.45, 0.8, 1, 0.75, 0.5, 0.85, 0.6];

/** Animated waveform bars driven by live mic amplitude. */
export function Waveform({amplitude, active, height = 36}) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    let raf = requestAnimationFrame(function tick(t) {
      setPhase(t / 180);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);
  const level = active ? Math.max(0.12, Math.min(1, amplitude * 1.4)) : 0.1;
  return (
    <Box aria-hidden="true" sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height}}>
      {BAR_SHAPE.map((k, i) => {
        const wobble = active ? 0.65 + 0.35 * Math.sin(phase + i * 0.9) : 1;
        const s = Math.max(0.12, Math.min(1, level * k * wobble));
        return (
          <Box key={i} sx={{
            width: 5, height, borderRadius: 3,
            background: 'linear-gradient(180deg, var(--hart-accent), var(--hart-accent-2))',
            transform: `scaleY(${s})`, transformOrigin: 'center',
            transition: 'transform 90ms linear',
            opacity: active ? 1 : 0.5,
          }} />
        );
      })}
    </Box>
  );
}
