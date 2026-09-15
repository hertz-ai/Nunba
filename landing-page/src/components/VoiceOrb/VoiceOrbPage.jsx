
import realtimeService from '../../services/realtimeService';
import { ConsentPromptOverlay } from '../AgentOverlay/AgentOverlay';
import VoiceVisualizer from '../VoiceVisualizer';

import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * VoiceOrbPage — the floating conversational presence, surfaced on every HART
 * surface from ONE place: rendered standalone (transparent) so the HART OS glass
 * shell can host it as an always-on-top floating iframe and the desktop
 * companion window can load it directly.
 *
 * Visualiser-first (admin-toggleable skin):
 *   - 'viz'       (default) -> the EXISTING <VoiceVisualizer/>, untouched.
 *   - 'character'           -> a minimal face that brightens while speaking.
 * Skin is read from localStorage 'hart_orb_skin' (written by the admin page),
 * and updates live via the cross-document `storage` event.
 *
 * Voice state: a passive presence must NOT open the mic itself (privacy +
 * double-mic), so the orb reflects the one real, cross-surface signal it
 * legitimately has — the agent SPEAKING, via the canonical realtimeService
 * 'tts' push (generated_audio_url). It does NOT play the audio (the chat
 * surface already does — playing it twice would echo); the clip's metadata
 * duration sizes the speaking window. A "listening" indicator would need a real
 * cross-surface broadcast that doesn't exist yet, so it is intentionally not
 * faked.
 *
 * Auto-hide: idle AND not speaking is "away"; any pointer interaction, or
 * speaking, brings it back.  In the HART OS shell "away" is a corner peek
 * (translate, taskbar-style).
 *
 * In the desktop companion window the page owns the presence and the window
 * follows it (on_companion_presence(state, shape), app.py):
 *   'hidden' -> idle: no window at all;
 *   'orb'    -> an agent is speaking (or just stopped): the window is cut to
 *               the orb's own rect, a floating disc and nothing else;
 *   'shown'  -> the owner reached for it (pointer / keys), or an agent is
 *               asking for consent: the whole card, with rounded corners.
 * Owner 2026-09-15: the floating window exists only while an agent wants to
 * talk, and morphs from the orb to the card on demand.  A HARTOS consent ask
 * (type 'consent.request' on the agent.ui.update channel) is an agent
 * wanting to talk, and the one thing an autonomous agent stops for (owner
 * (c): "if it is autonomous it shd auto ask"), so the page shows
 * AgentOverlay's own consent card in the orb's place and holds the window
 * open until it is answered.  Measured 2026-09-15: that card was mounted in
 * Demopage alone, so an ask reached the main window only, and the floating
 * window built for exactly this stayed hidden.  `shape` is the CSS
 * rect to keep (x, y, w, h, corner radius r, viewport vw/vh); the bridge
 * clips the window to it.  That clipping is the only way to get the look
 * here: measured that day with the install's own pywebview, a transparent
 * window is a transparent WebView2 over an OPAQUE form (the "see-through"
 * area painted Control grey or WebView2's #202020), so the page paints its
 * own opaque card and the window shape does the rest.  Also measured on
 * 89096d49: the corner peek (translate + scale(.5)) inside the 220x310
 * window read as an opaque black rectangle with the orb shrunk to a dot --
 * the visualiser measures its box with getBoundingClientRect, which includes
 * the ancestor scale, so every shrink re-measured smaller until the canvas
 * was 1px.  The companion never applies the peek transform.
 */
const SKIN_KEY = 'hart_orb_skin';
const IDLE_MS = 6000;
const ACCENT = '#6C63FF';
const CARD_BG = '#0F0E17';
const CARD_RADIUS = 24;

function readSkin() {
  try {
    return localStorage.getItem(SKIN_KEY) === 'character' ? 'character' : 'viz';
  } catch (e) {
    return 'viz';
  }
}

// True inside the pywebview companion window.  pywebview puts `window.pywebview`
// on the document at creation; `.api` fills in at 'pywebviewready'.
function inCompanion() {
  try {
    return !!window.pywebview;
  } catch (e) {
    return false;
  }
}

// Call a companion bridge method when running inside the pywebview companion
// window (desktop); a safe no-op everywhere else (HART OS shell / browser).
function companionApi(method, ...args) {
  try {
    const api = window.pywebview && window.pywebview.api;
    if (api && typeof api[method] === 'function') api[method](...args);
  } catch (e) {
    /* not in the pywebview companion — no-op */
  }
}

// The window shape for a presence state, in CSS px of this page.
//   'shown' -> the whole card with rounded corners;
//   'orb'   -> the circle inscribed in the orb's own box: the visualiser's
//              square canvas, else its root (the character face), else the
//              wrapper.  An unmeasurable box (0 size) falls back to the card
//              rather than to nothing.
function shapeFor(state, orbBox) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const card = { x: 0, y: 0, w: vw, h: vh, r: CARD_RADIUS, vw, vh };
  if (state === 'shown') return card;
  if (state !== 'orb') return null;
  const box = orbBox && orbBox.current;
  const target = box && (box.querySelector('canvas') || box.firstElementChild || box);
  const r = target && target.getBoundingClientRect();
  if (!r || !(r.width > 0) || !(r.height > 0)) return card;
  const d = Math.min(r.width, r.height);
  return {
    x: r.left + (r.width - d) / 2, y: r.top + (r.height - d) / 2,
    w: d, h: d, r: d / 2, vw, vh,
  };
}

// Curious character SVG — eyes follow the cursor, mouth animates while the agent
// speaks, periodic blink. Ported from the desktop companion (nanba-companion.html)
// so the orb is the SINGLE source of the character; the static companion retires.
const CHAR_CSS = `
.hart-char { width: 104px; height: 124px; position: relative;
  animation: hartFloat 3s ease-in-out infinite;
  filter: drop-shadow(0 6px 16px rgba(108,99,255,0.35)); }
.hart-char .char-body { fill: url(#hartBodyGrad); }
.hart-char .char-eye { fill: #fff; }
.hart-char .char-pupil { fill: #1a1a2e; transition: cx .12s ease-out, cy .12s ease-out; }
.hart-char .char-highlight { fill: rgba(255,255,255,0.35); }
.hart-char .char-mouth { fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; }
.hart-char .char-antenna { stroke: #9B94FF; stroke-width: 2.5; fill: none; stroke-linecap: round; }
.hart-char .char-antenna-tip { fill: #FF6B6B; }
.hart-char .char-cheek { fill: rgba(255,107,107,0.25); }
.hart-char .char-eyelid { fill: url(#hartBodyGrad); opacity: 0; }
.hart-char.blink .char-eyelid { animation: hartBlink .15s ease-in-out; }
.hart-char.speaking .char-mouth { animation: hartSpeak .25s ease-in-out infinite alternate; }
.hart-char.speaking .char-antenna-tip { animation: hartTip .6s ease-in-out infinite alternate; }
@keyframes hartFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes hartBlink { 0%,100% { opacity: 0; } 40%,60% { opacity: 1; } }
@keyframes hartSpeak { 0% { d: path('M 32 72 Q 42 76 52 72'); } 100% { d: path('M 32 72 Q 42 82 52 72'); } }
@keyframes hartTip { 0% { r: 5; fill: #FF6B6B; } 100% { r: 7; fill: #6C63FF; } }
`;

function Character({ active }) {
  const rootRef = useRef(null);
  const pupilL = useRef(null);
  const pupilR = useRef(null);
  const [blink, setBlink] = useState(false);

  // Eyes follow the cursor. Listener is window-level because the orb container
  // is pointer-events:none (so it never blocks the desktop behind it).
  useEffect(() => {
    function onMove(e) {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 90)) * 3;
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 120)) * 2;
      if (pupilL.current) { pupilL.current.setAttribute('cx', 30 + dx); pupilL.current.setAttribute('cy', 50 + dy); }
      if (pupilR.current) { pupilR.current.setAttribute('cx', 54 + dx); pupilR.current.setAttribute('cy', 50 + dy); }
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Periodic blink (3–7s).
  useEffect(() => {
    let t;
    const loop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
      t = setTimeout(loop, 3000 + Math.random() * 4000);
    };
    t = setTimeout(loop, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{CHAR_CSS}</style>
      <div
        ref={rootRef}
        className={'hart-char' + (active ? ' speaking' : '') + (blink ? ' blink' : '')}
        aria-label="HART voice"
      >
        <svg viewBox="0 0 84 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hartBodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ACCENT} />
              <stop offset="100%" stopColor="#9B94FF" />
            </linearGradient>
          </defs>
          <path className="char-antenna" d="M 42 22 Q 42 5 54 2" />
          <circle className="char-antenna-tip" cx="54" cy="2" r="5" />
          <ellipse className="char-body" cx="42" cy="58" rx="36" ry="38" />
          <ellipse className="char-cheek" cx="18" cy="62" rx="8" ry="5" />
          <ellipse className="char-cheek" cx="66" cy="62" rx="8" ry="5" />
          <ellipse className="char-eye" cx="30" cy="50" rx="9" ry="11" />
          <circle className="char-pupil" ref={pupilL} cx="30" cy="50" r="4.5" />
          <circle className="char-highlight" cx="33" cy="46" r="2" />
          <ellipse className="char-eyelid" cx="30" cy="50" rx="9" ry="11" />
          <ellipse className="char-eye" cx="54" cy="50" rx="9" ry="11" />
          <circle className="char-pupil" ref={pupilR} cx="54" cy="50" r="4.5" />
          <circle className="char-highlight" cx="57" cy="46" r="2" />
          <ellipse className="char-eyelid" cx="54" cy="50" rx="9" ry="11" />
          <path className="char-mouth" d="M 32 72 Q 42 78 52 72" />
        </svg>
      </div>
    </>
  );
}

// Quick-prompt input bar — the same send path the static companion used:
// prefer the pywebview bridge (window.pywebview.api.on_companion_prompt, so the
// main app owns the HARTOS dispatch), fall back to POST /chat (browser/debug).
function InputBar() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const replyTimer = useRef(null);

  const showReply = useCallback((msg) => {
    setReply(msg);
    if (replyTimer.current) clearTimeout(replyTimer.current);
    if (msg) replyTimer.current = setTimeout(() => setReply(''), 9000);
  }, []);

  const submit = useCallback(async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    showReply('Thinking…');
    try {
      let answer;
      const api = window.pywebview && window.pywebview.api;
      if (api && api.on_companion_prompt) {
        answer = await api.on_companion_prompt(t);
      } else {
        // /chat's contract names the prompt `text` (chat_route docstring);
        // `message` is the /custom_gpt alias and /chat answers it with 400.
        const r = await fetch('/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({text: t, source: 'companion_input_bar'}),
        });
        const d = r.ok ? await r.json() : null;
        answer = (d && (d.response || d.message || d.text)) || 'OK';
      }
      showReply(typeof answer === 'string' && answer ? answer : 'Done');
      setText('');
    } catch (e) {
      showReply('Could not reach the agent.');
    } finally {
      setBusy(false);
    }
  }, [text, busy, showReply]);

  useEffect(
    () => () => { if (replyTimer.current) clearTimeout(replyTimer.current); },
    [],
  );

  return (
    <div style={{width: '100%', maxWidth: 220, WebkitAppRegion: 'no-drag'}}>
      {reply ? (
        <div
          style={{
            margin: '0 auto 8px',
            maxWidth: 200,
            padding: '8px 12px',
            background: 'rgba(15,14,23,0.92)',
            border: '1px solid rgba(108,99,255,0.5)',
            borderRadius: 12,
            color: '#e8e8e8',
            fontSize: 12,
            lineHeight: 1.4,
            textAlign: 'center',
            maxHeight: 120,
            overflow: 'auto',
          }}
        >
          {reply}
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(15,14,23,0.88)',
          border: '1px solid rgba(108,99,255,0.45)',
          borderRadius: 18,
          padding: '4px 6px 4px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask HART…"
          aria-label="Quick prompt"
          maxLength={500}
          disabled={busy}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 0,
            outline: 'none',
            color: '#e8e8e8',
            fontSize: 11,
            padding: '4px 0',
          }}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Send prompt"
          style={{
            width: 22,
            height: 22,
            border: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C63FF, #9B94FF)',
            color: '#fff',
            fontSize: 12,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          &#10148;
        </button>
      </form>
    </div>
  );
}

export default function VoiceOrbPage() {
  const [skin, setSkin] = useState(readSkin);
  const [speaking, setSpeaking] = useState(false);
  const hosted = useRef(inCompanion());
  // Hosted: born away (no window) until an agent speaks or the owner acts.
  const [presence, setPresence] = useState(hosted.current ? 'hidden' : 'shown');
  const speakTimer = useRef(null);
  const lastInteract = useRef(hosted.current ? 0 : Date.now());
  // When the agent last stopped speaking: the orb lingers one idle window
  // after a clip so consecutive sentences do not blink the window.
  const lastSpoke = useRef(0);
  const orbBox = useRef(null);
  // HARTOS consent asks waiting for the owner, oldest first; one card at a
  // time.  Keyed by msg_id while on screen, the way AgentOverlay does it: a
  // gate that waits re-sends the same ask every 3 s, and after "Not now" it
  // may show again.
  const [asks, setAsks] = useState([]);
  const asking = asks.length > 0;

  const active = speaking;

  useEffect(() => {
    function onAgentUi(payload) {
      if (!payload || payload.type !== 'consent.request') return;
      setAsks((prev) => (payload.msg_id && prev.some((a) => a.msg_id === payload.msg_id)
        ? prev : [...prev, payload]));
    }
    return realtimeService.on('agent.ui.update', onAgentUi);
  }, []);
  const answerAsk = useCallback(() => setAsks((prev) => prev.slice(1)), []);

  // Skin follows the admin setting, live across documents.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === SKIN_KEY) setSkin(readSkin());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Reflect agent speaking from the canonical 'tts' push WITHOUT playing audio.
  useEffect(() => {
    function onTts(data) {
      const url = data && (data.generated_audio_url || data.audio_url);
      if (!url) return;
      setSpeaking(true);
      if (speakTimer.current) clearTimeout(speakTimer.current);
      // Probe duration silently (metadata only) so the speaking window matches
      // the clip; never call play() here (the chat surface owns playback).
      const probe = new Audio();
      probe.preload = 'metadata';
      const finish = (secs) => {
        speakTimer.current = setTimeout(() => {
          lastSpoke.current = Date.now();
          setSpeaking(false);
        }, (secs > 0 ? secs : 3) * 1000 + 250);
      };
      probe.onloadedmetadata = () => finish(isFinite(probe.duration) ? probe.duration : 3);
      probe.onerror = () => finish(3);
      try { probe.src = url; } catch (e) { finish(3); }
    }
    realtimeService.on('tts', onTts);
    return () => {
      realtimeService.off('tts', onTts);
      if (speakTimer.current) clearTimeout(speakTimer.current);
    };
  }, []);

  // Presence: an ask waiting for the owner, or the owner reaching for it,
  // wins ('shown'), then the agent talking ('orb', lingering one idle window
  // past the clip), else idle ('hidden').  Decided on every change of
  // speaking or asking and once a second, like a taskbar's auto-hide.
  useEffect(() => {
    const decide = () => {
      const now = Date.now();
      const interacting = asking || now - lastInteract.current < IDLE_MS;
      const lingering = now - lastSpoke.current < IDLE_MS;
      const next = interacting ? 'shown' : (active || lingering) ? 'orb' : 'hidden';
      setPresence((prev) => (prev === next ? prev : next));
    };
    const wake = () => { lastInteract.current = Date.now(); decide(); };
    const evs = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    evs.forEach((ev) => window.addEventListener(ev, wake, true));
    decide();
    const id = setInterval(decide, 1000);
    return () => {
      evs.forEach((ev) => window.removeEventListener(ev, wake, true));
      clearInterval(id);
    };
  }, [active, asking]);

  // Hosted: the window follows the page's state and shape.  Sent on every
  // change, again at 'pywebviewready' (`.api` may not exist when the first
  // state is decided), and on resize (app.py sizes the window once loaded;
  // a shape mapped against the old size would be stale).
  useEffect(() => {
    if (!hosted.current) return undefined;
    const send = () => companionApi('on_companion_presence', presence, shapeFor(presence, orbBox));
    send();
    window.addEventListener('pywebviewready', send);
    window.addEventListener('resize', send);
    return () => {
      window.removeEventListener('pywebviewready', send);
      window.removeEventListener('resize', send);
    };
  }, [presence]);

  // Idle = away.  The shell keeps the corner peek; the companion window
  // hides instead (see the module docstring for why a scaled peek cannot
  // live there).
  const peeked = presence === 'hidden';
  const shellPeek = peeked && !hosted.current;

  return (
    <div
      data-testid="voice-orb"
      data-skin={skin}
      data-active={active ? '1' : '0'}
      data-away={peeked ? '1' : '0'}
      data-presence={presence}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 10px 14px',
        // Hosted, the window cannot be see-through (module docstring), so the
        // page paints the card itself and the window shape cuts it out.
        background: hosted.current ? CARD_BG : 'transparent',
        borderRadius: hosted.current ? CARD_RADIUS : 0,
        // Drag the frameless companion window by the orb body; the input bar
        // opts out (no-drag, in InputBar) so it stays interactive.
        WebkitAppRegion: 'drag',
        transform: shellPeek ? 'translate(118px, 46px) scale(.5)' : undefined,
        opacity: shellPeek ? 0.4 : 1,
        transition: 'transform .45s cubic-bezier(.34,1.3,.64,1), opacity .45s ease',
        overflow: 'hidden',
      }}
    >
      {asking ? (
        // The ask in the orb's place: AgentOverlay's own card, answered
        // through the one consent API.  Scrolls inside the 220x310 card; the
        // buttons opt out of window drag so they take the click.
        <div
          data-testid="companion-consent"
          style={{
            flex: '1 1 auto', alignSelf: 'stretch', minHeight: 0,
            overflow: 'auto', color: '#fff', fontSize: 12,
            WebkitAppRegion: 'no-drag',
          }}
        >
          <ConsentPromptOverlay data={asks[0]} onDismiss={answerAsk} />
        </div>
      ) : (
        <div
          ref={orbBox}
          onClick={() => companionApi('on_companion_click')}
          onDoubleClick={() => companionApi('on_companion_dblclick')}
          title="Open Nunba"
          style={{
            flex: '1 1 auto',
            // Full width, so the visualiser measures the page's width and not
            // its own canvas (alignItems:center would shrink-wrap this box to
            // the canvas, and the 80% cap then shrinks the canvas on every
            // measure).
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            // Clickable (-> bring the main app forward); no-drag so the click
            // registers. Empty areas of the root stay draggable.
            WebkitAppRegion: 'no-drag',
            cursor: 'pointer',
          }}
        >
          {skin === 'character'
            ? <Character active={active} />
            : <VoiceVisualizer isActive={active} size={140} />}
        </div>
      )}
      <InputBar />
    </div>
  );
}
