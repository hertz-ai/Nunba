/**
 * VoiceCapsule — the `voice` surface: tap the orb, speak, see it happen.
 *
 * A glass capsule above the orb with a live waveform (mic amplitude), the
 * partial transcript, the agent's latest reply and the latest INLINE
 * fragment of that turn (a cart, a checkout).  FLOATING fragments float as
 * usual.  Voice and text are equal: "Type instead" swaps the waveform for
 * an input, and a browser without speech goes straight to it.
 */

import {MicGlyph} from './LiquidSheet';
import {FragmentCard, GLASS_SX, SuggestionChips, ThinkingDots, Waveform, enterSx, useVoice} from './shared';

import {Box, IconButton, InputBase, Typography} from '@mui/material';
import React, {useCallback, useEffect, useRef, useState} from 'react';

export default function VoiceCapsule({
  open, onClose, session, state, agentName, onNavigate, sttUrl, locale, onListening, position,
}) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [turnStart, setTurnStart] = useState(0);
  const inputRef = useRef(null);
  const left = position === 'bottom-left';

  const send = useCallback((t) => {
    const v = String(t || '').trim();
    if (!v) return;
    setText('');
    setTurnStart(session.getState().timeline.length);
    session.send(v);
  }, [session]);

  const voice = useVoice({sttUrl, locale, onFinal: send, onListening});

  // Opening the capsule starts listening (the orb tap is the intent).
  useEffect(() => {
    if (!open) {
      voice.stop();
      return;
    }
    if (voice.supported && !typing) voice.start();
    else setTyping(true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typing && inputRef.current) inputRef.current.focus();
  }, [typing]);

  const turn = state.timeline.slice(turnStart);
  const lastReply = [...turn].reverse().find((m) => m.kind === 'msg' && m.role === 'assistant');
  const lastFragment = [...turn].reverse().find((m) => m.kind === 'fragment');
  const heard = [...turn].find((m) => m.kind === 'msg' && m.role === 'user');

  let status = 'Tap the mic and speak';
  if (voice.listening) status = 'Listening…';
  else if (state.thinking) status = 'Working on it…';
  else if (typing) status = 'Type your request';

  if (!open) return null;

  return (
    <Box role="dialog" aria-label={`Voice — ${agentName}`} data-testid="hart-voice"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      sx={{
        ...GLASS_SX, ...enterSx,
        position: 'fixed', zIndex: 2147483000,
        bottom: 'calc(84px + var(--hart-offset-bottom, 0px) + env(safe-area-inset-bottom, 0px))',
        [left ? 'left' : 'right']: 16,
        width: 'min(360px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        p: 2, display: 'flex', flexDirection: 'column', gap: 1.25,
        transformOrigin: left ? 'bottom left' : 'bottom right',
      }}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
        <Typography component="h2" sx={{m: 0, flex: 1, fontSize: 15, fontWeight: 700, color: '#fff'}}>
          {status}
        </Typography>
        {state.transportKind === 'demo' && (
          <Box component="span" sx={{fontSize: 11, fontWeight: 600, px: 0.75, py: '1px', borderRadius: '999px',
            color: 'var(--hart-ink)', background: 'var(--hart-accent-2)'}}>{state.transportLabel}</Box>
        )}
        {voice.method === 'browser' && (
          <Box component="span" title="Your browser's speech service turns speech into text"
            sx={{fontSize: 11, px: 0.75, py: '1px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)'}}>
            Browser speech
          </Box>
        )}
      </Box>

      {!typing && (
        <Box sx={{py: 0.5}}>
          <Waveform amplitude={voice.amplitude} active={voice.listening} height={40} />
          <Typography aria-live="off" sx={{mt: 1, minHeight: 22, textAlign: 'center', fontSize: 15,
            color: voice.partial ? '#fff' : 'rgba(255,255,255,0.72)'}}>
            {voice.partial || (heard ? `“${heard.text}”` : `Try “add 2 milk”`)}
          </Typography>
        </Box>
      )}

      {voice.error && (
        <Typography role="alert" sx={{fontSize: 13, color: '#ffb3c4'}}>{voice.error}</Typography>
      )}

      {state.thinking && !lastReply && <ThinkingDots />}
      {lastReply && (
        <Box sx={{...enterSx}}>
          <Typography component="p" sx={{m: 0, fontSize: 14, color: '#fff', lineHeight: 1.5}}>
            {lastReply.text}
          </Typography>
          {!state.thinking && <SuggestionChips items={lastReply.suggestions} onPick={send} />}
        </Box>
      )}
      {lastFragment && (
        <FragmentCard fragment={lastFragment.fragment} onAction={session.act} onNavigate={onNavigate} />
      )}

      {typing ? (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); send(text); }}
          sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
          <Box sx={{flex: 1, height: 44, display: 'flex', alignItems: 'center', px: 2, borderRadius: '999px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
            '&:focus-within': {borderColor: 'var(--hart-accent)'}}}>
            <InputBase inputRef={inputRef} value={text} onChange={(e) => setText(e.target.value)} fullWidth
              placeholder="e.g. add 2 milk" inputProps={{'aria-label': `Message ${agentName}`, enterKeyHint: 'send'}}
              sx={{color: '#fff', fontSize: 15, '& input::placeholder': {color: 'rgba(255,255,255,0.6)', opacity: 1}}} />
          </Box>
          {voice.supported && (
            <IconButton type="button" aria-label="Speak instead" onClick={() => { setTyping(false); voice.start(); }}
              sx={{width: 44, height: 44, color: '#fff', background: 'rgba(255,255,255,0.08)'}}>
              <MicGlyph />
            </IconButton>
          )}
        </Box>
      ) : (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
          <Box component="button" type="button" onClick={() => { voice.stop(); setTyping(true); }}
            sx={{minHeight: 44, px: 1.5, border: 0, background: 'transparent', color: 'rgba(255,255,255,0.85)',
              font: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', borderRadius: 2,
              '&:focus-visible': {outline: '2px solid var(--hart-accent)'}}}>
            Type instead
          </Box>
          <IconButton onClick={() => (voice.listening ? voice.stop() : voice.start())}
            aria-label={voice.listening ? 'Stop listening' : 'Speak again'}
            aria-pressed={voice.listening ? 'true' : 'false'}
            sx={{width: 56, height: 56, color: 'var(--hart-ink)', background: 'var(--hart-accent)',
              '&:hover': {background: 'var(--hart-accent-strong)'},
              '&:focus-visible': {outline: '2px solid #fff', outlineOffset: 2}}}>
            <MicGlyph size={26} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
