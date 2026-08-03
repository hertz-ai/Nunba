import React, { useRef, useEffect, useCallback } from 'react';

/**
 * VoiceVisualizer — Smooth sine-wave circular amplitude with neon glow.
 *
 * Design:
 * - 3 energy bands (bass/mid/treble) drive sine harmonics around the circle
 * - Peaks only go outward (smooth rectifier, never below base radius)
 * - Gradient fill: transparent at base → glowy at peak tips
 * - Neon glow via 3-pass stroke (bloom + mid + sharp)
 * - 60fps, zero shadowBlur, zero canvas filter
 */
const PTS = 180;

// Demopage.js's TTS playback element (#nunba-tts-audio) is a manually
// managed DOM singleton that persists for the whole app session, outside
// React's tree — but VoiceVisualizer mounts/unmounts with every media-mode
// switch (video ↔ audio), since it lives in different ternary branches.
// `createMediaElementSource()` can only ever be called ONCE per audio
// element for its entire lifetime — a second call on an already-claimed
// element throws (silently swallowed below). Closing the AudioContext on
// unmount (as this component used to) made that worse: once closed, the
// element's audio has nowhere left to route and playback goes silent
// FOREVER, in every mode, not just the one that triggered the unmount.
// Caching the {ctx, source, analyser} graph per audio element here — keyed
// by the element itself, outside any single component instance — lets
// every VoiceVisualizer mount reuse the one graph that element is allowed
// to ever have, and nothing ever closes it early.
const _voiceGraphCache = new WeakMap();

const VoiceVisualizer = function({ audioRef, isActive, size, style, canvasMax }) {
  size = size || 200;
  // Per-consumer cap on how much of the parent the orb may fill.  Defaults to
  // 80% (breathing room) for standalone uses (e.g. VoiceOrbPage) so they are
  // UNCHANGED; Demopage's media column passes '100%' so the orb fills the
  // column and matches the idle video's footprint (no empty padding).
  canvasMax = canvasMax || '80%';
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioCtxRef = useRef(null);
  const stateRef = useRef({ bass: 0, mid: 0, treble: 0, bassCur: 0, midCur: 0, trebleCur: 0, time: 0, dir: 1, wasQuiet: false });
  const outerR = useRef(new Float32Array(PTS + 1));

  const lastAudioEl = useRef(null);

  const connectAnalyser = useCallback(function() {
    if (!audioRef || !audioRef.current) return;
    const el = audioRef.current;
    // Already connected to THIS audio element — skip
    if (sourceRef.current && lastAudioEl.current === el) return;
    try {
      // This exact element already has a graph from a PRIOR VoiceVisualizer
      // mount (or a different instance entirely) — reuse it. Attempting
      // ctx.createMediaElementSource(el) again here would throw, since an
      // element can only ever be claimed by one MediaElementSourceNode.
      const cached = _voiceGraphCache.get(el);
      if (cached && cached.ctx.state !== 'closed') {
        audioCtxRef.current = cached.ctx;
        analyserRef.current = cached.analyser;
        sourceRef.current = cached.source;
        lastAudioEl.current = el;
        return;
      }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(ctx.destination);
      const source = ctx.createMediaElementSource(el);
      source.connect(analyser);
      _voiceGraphCache.set(el, { ctx, source, analyser });
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      lastAudioEl.current = el;
    } catch(e) { /* synthetic fallback */ }
  }, [audioRef]);

  useEffect(function() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const baseR = W * 0.25;
    const freqData = new Uint8Array(256);
    const s = stateRef.current;
    const oR = outerR.current;

    if (isActive) connectAnalyser();

    function render() {
      animRef.current = requestAnimationFrame(render);
      s.time += 0.02;
      // Reconnect if audio element changed (new pre-synth line)
      if (isActive && audioRef && audioRef.current && lastAudioEl.current !== audioRef.current) {
        connectAnalyser();
      }
      const an = analyserRef.current;

      if (isActive && an) {
        an.getByteFrequencyData(freqData);
        let bS = 0, mS = 0, tS = 0, len = freqData.length;
        for (var i = 0; i < len; i++) {
          if (i < len * 0.15) bS += freqData[i];
          else if (i < len * 0.5) mS += freqData[i];
          else tS += freqData[i];
        }
        s.bass = bS / (len * 0.15) / 255;
        s.mid = mS / (len * 0.35) / 255;
        s.treble = tS / (len * 0.5) / 255;
      } else if (isActive) {
        // No analyser (Web Speech API) — simulate speech-like energy
        s.bass = 0.25 + 0.15 * Math.sin(s.time * 2.3);
        s.mid = 0.3 + 0.2 * Math.sin(s.time * 3.1 + 0.5);
        s.treble = 0.15 + 0.1 * Math.sin(s.time * 4.7 + 1.2);
      } else {
        s.bass *= 0.95; s.mid *= 0.95; s.treble *= 0.95;
      }

      s.bassCur += (s.bass - s.bassCur) * 0.12;
      s.midCur += (s.mid - s.midCur) * 0.10;
      s.trebleCur += (s.treble - s.trebleCur) * 0.08;
      const energy = s.bassCur * 0.5 + s.midCur * 0.35 + s.trebleCur * 0.15;

      // Flip wave direction on natural speech pauses
      if (isActive) {
        if (energy < 0.03) { s.wasQuiet = true; }
        else if (s.wasQuiet && energy > 0.08) { s.wasQuiet = false; s.dir = -s.dir; }
      }

      const t = s.time;
      const d = s.dir;

      ctx.clearRect(0, 0, W, H);

      // Background glow
      const bg = ctx.createRadialGradient(cx, cy, baseR - 10, cx, cy, baseR + 70);
      bg.addColorStop(0, 'rgba(108,99,255,' + (0.02 + energy * 0.06).toFixed(3) + ')');
      bg.addColorStop(1, 'rgba(10,9,20,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, baseR + 70, 0, Math.PI * 2); ctx.fill();

      // Compute outer ring — peaks only outward
      let maxPeakR = baseR;
      for (var i = 0; i <= PTS; i++) {
        var a = (i / PTS) * Math.PI * 2;
        // Idle breathing — visible but calm
        const idle =
          6 * Math.sin(2 * a + t * 0.6) +
          4 * Math.sin(3 * a - t * 0.45) +
          3 * Math.sin(5 * a + t * 0.7);
        const wave = idle +
          s.bassCur * 55 * Math.sin(2 * a + t * 1.5 * d) +
          s.bassCur * 32 * Math.sin(3 * a - t * 0.8 * d) +
          s.midCur * 40 * Math.sin(4 * a + t * 2.2 * d) +
          s.midCur * 24 * Math.sin(6 * a - t * 1.3 * d) +
          s.trebleCur * 28 * Math.sin(8 * a + t * 3.0 * d) +
          s.trebleCur * 16 * Math.sin(11 * a - t * 1.8 * d);
        const soft = 8;
        const rectified = (wave * wave) / (Math.abs(wave) + soft);
        // Scale amplitude relative to canvas size
        oR[i] = baseR + rectified * (baseR / 100);
        if (oR[i] > maxPeakR) maxPeakR = oR[i];
      }

      // Fill area between base and outer
      ctx.beginPath();
      for (var i = 0; i <= PTS; i++) {
        var a = (i / PTS) * Math.PI * 2;
        const x = cx + Math.cos(a) * oR[i], y = cy + Math.sin(a) * oR[i];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (var i = PTS; i >= 0; i--) {
        var a = (i / PTS) * Math.PI * 2;
        ctx.lineTo(cx + Math.cos(a) * baseR, cy + Math.sin(a) * baseR);
      }
      ctx.closePath();

      if (maxPeakR > baseR + 1) {
        const fg = ctx.createRadialGradient(cx, cy, baseR, cx, cy, maxPeakR);
        fg.addColorStop(0, 'rgba(10,9,20,0)');
        fg.addColorStop(0.3, 'rgba(80,60,220,' + (0.08 + energy * 0.15).toFixed(3) + ')');
        fg.addColorStop(0.7, 'rgba(108,99,255,' + (0.15 + energy * 0.25).toFixed(3) + ')');
        fg.addColorStop(1, 'rgba(150,140,255,' + (0.25 + energy * 0.4).toFixed(3) + ')');
        ctx.fillStyle = fg;
      } else {
        ctx.fillStyle = 'rgba(108,99,255,0.05)';
      }
      ctx.fill();

      // Neon ring — 3 passes
      ctx.globalCompositeOperation = 'lighter';

      drawRing(ctx, cx, cy, oR, 'rgba(108,99,255,' + (0.04 + energy * 0.05).toFixed(3) + ')', 14);
      drawRing(ctx, cx, cy, oR, 'rgba(108,99,255,' + (0.08 + energy * 0.1).toFixed(3) + ')', 6);
      drawRing(ctx, cx, cy, oR, 'rgba(170,165,255,' + (0.5 + energy * 0.5).toFixed(3) + ')', 1.8);

      ctx.globalCompositeOperation = 'source-over';

      // Core — breathing glow + pulsing dot
      const breathe1 = Math.sin(t * 1.2) * 0.3 + Math.sin(t * 1.9) * 0.15;
      const breathe2 = Math.sin(t * 0.8) * 0.2 + Math.cos(t * 1.4) * 0.1;

      const glowR = (8 + energy * 12 + breathe1 * 4) * 3;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      cg.addColorStop(0, 'rgba(200,195,255,' + (0.15 + energy * 0.5 + breathe1 * 0.08).toFixed(3) + ')');
      cg.addColorStop(0.3, 'rgba(108,99,255,' + (0.08 + energy * 0.2 + breathe2 * 0.04).toFixed(3) + ')');
      cg.addColorStop(0.6, 'rgba(80,60,200,' + (0.03 + energy * 0.08 + breathe1 * 0.02).toFixed(3) + ')');
      cg.addColorStop(1, 'rgba(108,99,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

      const coreR = 3 + energy * 6 + breathe1 * 1.5;
      const cg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg2.addColorStop(0, 'rgba(220,215,255,' + (0.3 + energy * 0.5 + breathe2 * 0.1).toFixed(3) + ')');
      cg2.addColorStop(0.5, 'rgba(108,99,255,' + (0.1 + energy * 0.3 + breathe1 * 0.05).toFixed(3) + ')');
      cg2.addColorStop(1, 'rgba(108,99,255,0)');
      ctx.fillStyle = cg2;
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();

      const dotR = 1.5 + energy * 2.5 + Math.sin(t * 2.5) * 0.6;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + energy * 0.7 + breathe2 * 0.1).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fill();
    }

    render();
    return function() { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isActive, connectAnalyser]);

  useEffect(function() {
    return function() {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      // Deliberately NOT closing audioCtxRef here — it's shared (cached in
      // _voiceGraphCache) with whichever audio element it's bound to, which
      // typically outlives this component instance across media-mode
      // switches. Closing it here silenced that element's audio forever
      // (see _voiceGraphCache comment above) since a MediaElementSourceNode
      // can never be recreated once its element has been claimed.
    };
  }, []);

  return React.createElement('div', {
    style: Object.assign({
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
    }, style || {}),
  },
    React.createElement('canvas', {
      ref: canvasRef,
      width: size * 2, height: size * 2,
      // The backing store above is SQUARE (size*2 x size*2). Whatever shape the
      // CSS box takes, the browser stretches that square into it — so a
      // non-square box does not crop the orb, it draws it as an ellipse.
      //
      // Keeping the box square is therefore the whole job, and `aspectRatio`
      // ALONE does not do it: per CSS sizing, aspect-ratio is ignored when both
      // width and height are definite. The previous revision set
      // `width: size, height: size, aspectRatio: '1 / 1'` and was inert —
      // measured 2026-08-04 at a 1920x1080 viewport, WITH that aspectRatio
      // live in the shipped bundle: width 479 (maxWidth clamped it to the
      // media column), height 538 (`size` = min(.28vw, .68vh) = 537.6,
      // unclamped because maxHeight resolves against a tall column) ->
      // aspect 0.890, a visible vertical ellipse.
      //
      // So exactly one axis is declared and the other is derived: width takes
      // the cap, `height: auto` + aspect-ratio follows it. maxHeight is gone on
      // purpose — a second independent cap is what broke squareness in the
      // first place, and the vertical bound already lives in `size` itself
      // (Demopage passes min(innerWidth*.28, innerHeight*.68)).
      //
      // #592's "LARGER" half was already delivered by 72780cd4 (479px here vs
      // the old 160-200px cap); this is the "SQUARE" half.
      // Guarded by cypress/e2e/voice-orb-landscape.cy.js, which measures
      // getBoundingClientRect and fails on aspect != 1 +/- 0.08.
      style: {
        width: size, maxWidth: canvasMax,
        height: 'auto', aspectRatio: '1 / 1',
      },
    }),
    isActive ? React.createElement('div', {
      style: {
        marginTop: 4, textAlign: 'center',
        fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700,
        background: 'linear-gradient(90deg,#6C63FF,#00D2FF)', WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.7,
      },
    }, 'Speaking') : null
  );
};

function drawRing(ctx, cx, cy, oR, color, lw) {
  ctx.beginPath();
  for (let i = 0; i <= PTS; i++) {
    const a = (i / PTS) * Math.PI * 2;
    const x = cx + Math.cos(a) * oR[i], y = cy + Math.sin(a) * oR[i];
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export default VoiceVisualizer;
