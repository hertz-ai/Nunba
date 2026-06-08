
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

function MicCharacter({ active }) {
  // Brightens + scales up while the agent speaks. A passive orb has no honest
  // live amplitude (it must not open the mic), so this is a clean speak/idle
  // state, not a fake meter.
  return (
    <div
      style={{
        width: 96, height: 96, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #9B94FF, ' + ACCENT + ' 70%)',
        boxShadow: (active ? '0 0 42px ' : '0 0 10px ') + ACCENT + ', inset 0 -6px 14px rgba(0,0,0,0.25)',
        transform: active ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform .25s cubic-bezier(.34,1.4,.64,1), box-shadow .3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      }}
      aria-label="HART voice"
    >
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0f0e17', display: 'block' }} />
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0f0e17', display: 'block' }} />
    </div>
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
        ? <MicCharacter active={active} />
        : <VoiceVisualizer isActive={active} size={140} />}
    </div>
  );
}
