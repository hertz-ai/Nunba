
import realtimeService from '../../services/realtimeService';
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
 * Auto-hide: peeks to the corner when idle AND not speaking; any pointer
 * interaction, or speaking, reveals it (taskbar-style).
 */
const SKIN_KEY = 'hart_orb_skin';
const IDLE_MS = 6000;
const ACCENT = '#6C63FF';

function readSkin() {
  try {
    return localStorage.getItem(SKIN_KEY) === 'character' ? 'character' : 'viz';
  } catch (e) {
    return 'viz';
  }
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

export default function VoiceOrbPage() {
  const [skin, setSkin] = useState(readSkin);
  const [speaking, setSpeaking] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const speakTimer = useRef(null);
  const lastInteract = useRef(Date.now());

  const active = speaking;

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
        speakTimer.current = setTimeout(
          () => setSpeaking(false), (secs > 0 ? secs : 3) * 1000 + 250);
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

  // Taskbar-style auto-hide.
  const wake = useCallback(() => { lastInteract.current = Date.now(); setPeeked(false); }, []);
  useEffect(() => {
    const evs = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    evs.forEach((ev) => window.addEventListener(ev, wake, true));
    const id = setInterval(() => {
      if (active) { lastInteract.current = Date.now(); setPeeked(false); return; }
      if (Date.now() - lastInteract.current > IDLE_MS) setPeeked(true);
    }, 1000);
    return () => {
      evs.forEach((ev) => window.removeEventListener(ev, wake, true));
      clearInterval(id);
    };
  }, [active, wake]);

  return (
    <div
      data-testid="voice-orb"
      data-skin={skin}
      data-active={active ? '1' : '0'}
      style={{
        position: 'fixed', right: 18, bottom: 18,
        width: 160, height: 160,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', pointerEvents: 'none',
        transform: peeked ? 'translate(96px, 40px) scale(.5)' : 'none',
        opacity: peeked ? 0.4 : 1,
        transition: 'transform .45s cubic-bezier(.34,1.3,.64,1), opacity .45s ease',
        zIndex: 2147483000,
      }}
    >
      {skin === 'character'
        ? <Character active={active} />
        : <VoiceVisualizer isActive={active} size={140} />}
    </div>
  );
}
