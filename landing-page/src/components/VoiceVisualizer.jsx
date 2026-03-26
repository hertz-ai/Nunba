import React, { useRef, useEffect, useCallback } from 'react';

/**
 * VoiceVisualizer — Futuristic neon circular amplitude visualizer.
 *
 * A buttery-smooth circular waveform that pulses with AI speech.
 * Multiple concentric neon rings morph with audio amplitude.
 * Particle field orbits the center. Deep glow halos.
 *
 * Props:
 *   audioRef  — ref to the <audio> element
 *   isActive  — true when AI is speaking
 *   size      — diameter in px (default 200)
 *   style     — optional container style
 */
const VoiceVisualizer = ({ audioRef, isActive, size = 200, style }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioCtxRef = useRef(null);
  const particlesRef = useRef([]);
  const phaseRef = useRef(0);

  const connectAnalyser = useCallback(() => {
    if (!audioRef?.current || sourceRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch {
      // Synthetic mode fallback
    }
  }, [audioRef]);

  // Initialize particles
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 60; i++) {
      pts.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.4 + Math.random() * 0.3,
        speed: 0.002 + Math.random() * 0.004,
        size: 0.5 + Math.random() * 1.5,
        brightness: 0.3 + Math.random() * 0.7,
        hueOffset: Math.random() * 60 - 30,
      });
    }
    particlesRef.current = pts;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(cx, cy) * 0.9;

    if (!isActive) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      drawIdle(ctx, W, H, cx, cy, maxR, phaseRef);
      // Keep idle breathing animation
      const idleLoop = () => {
        if (isActive) return;
        phaseRef.current += 0.02;
        drawIdle(ctx, W, H, cx, cy, maxR, phaseRef);
        animRef.current = requestAnimationFrame(idleLoop);
      };
      animRef.current = requestAnimationFrame(idleLoop);
      return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }

    connectAnalyser();
    const analyser = analyserRef.current;
    const bufLen = analyser ? analyser.frequencyBinCount : 128;
    const freqData = new Uint8Array(bufLen);
    const waveData = new Uint8Array(bufLen);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      phaseRef.current += 0.015;
      const t = phaseRef.current;

      if (analyser) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(waveData);
      } else {
        for (let i = 0; i < bufLen; i++) {
          freqData[i] = Math.floor(60 + 140 * Math.abs(
            Math.sin(t * 1.5 + i * 0.15) * Math.cos(t * 0.7 + i * 0.08)
          ));
          waveData[i] = 128 + Math.floor(80 * Math.sin(t * 2 + i * 0.12));
        }
      }

      // Average levels
      const bass = avg(freqData, 0, 8) / 255;
      const mid = avg(freqData, 8, 40) / 255;
      const high = avg(freqData, 40, bufLen) / 255;
      const overall = (bass * 0.5 + mid * 0.35 + high * 0.15);

      // ── Clear with deep fade trail ──
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(10, 9, 20, ${0.2 + (1 - overall) * 0.15})`;
      ctx.fillRect(0, 0, W, H);

      // ── Deep background halo ──
      const haloR = maxR * (0.8 + overall * 0.4);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0, `rgba(108, 99, 255, ${0.06 + overall * 0.08})`);
      halo.addColorStop(0.4, `rgba(138, 43, 226, ${0.03 + overall * 0.04})`);
      halo.addColorStop(1, 'rgba(10, 9, 20, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // ── Neon ring layers (3 concentric morphing rings) ──
      const rings = [
        { r: 0.55, amp: 0.12, freq: freqData, color: [108, 99, 255], width: 2.5, glow: 25, speed: 1 },
        { r: 0.42, amp: 0.08, freq: freqData, color: [0, 210, 255], width: 1.8, glow: 18, speed: -0.7 },
        { r: 0.68, amp: 0.15, freq: freqData, color: [180, 60, 255], width: 2, glow: 20, speed: 0.5 },
      ];

      ctx.globalCompositeOperation = 'lighter';

      for (const ring of rings) {
        const baseR = maxR * ring.r;
        const points = 128;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2;
          const fi = Math.floor((i / points) * (ring.freq.length - 1));
          const v = ring.freq[fi] / 255;
          const morphed = baseR + v * maxR * ring.amp +
            Math.sin(a * 3 + t * ring.speed) * maxR * 0.02 * (1 + overall) +
            Math.sin(a * 7 + t * ring.speed * 1.5) * maxR * 0.008;
          const x = cx + Math.cos(a) * morphed;
          const y = cy + Math.sin(a) * morphed;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const [r, g, b] = ring.color;
        const alpha = 0.5 + overall * 0.5;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = ring.width + overall * 1.5;
        ctx.shadowBlur = ring.glow + overall * 20;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.6 + overall * 0.4})`;
        ctx.stroke();
      }

      // ── Waveform ring (time domain — butter smooth) ──
      const waveR = maxR * 0.35;
      ctx.beginPath();
      for (let i = 0; i <= bufLen; i++) {
        const a = (i / bufLen) * Math.PI * 2;
        const v = (waveData[i % bufLen] - 128) / 128;
        const r = waveR + v * maxR * 0.1;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(255, 107, 107, ${0.4 + overall * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 12 + overall * 15;
      ctx.shadowColor = `rgba(255, 107, 107, ${0.5 + overall * 0.3})`;
      ctx.stroke();

      // ── Orbiting particles ──
      ctx.shadowBlur = 0;
      for (const p of particlesRef.current) {
        p.angle += p.speed * (1 + overall * 2);
        const pr = maxR * p.radius * (0.9 + overall * 0.3);
        const px = cx + Math.cos(p.angle) * pr;
        const py = cy + Math.sin(p.angle) * pr;
        const alpha = p.brightness * (0.3 + overall * 0.7);
        const sz = p.size * (1 + overall * 1.5);
        ctx.fillStyle = `rgba(${180 + p.hueOffset}, ${160 + p.hueOffset * 0.5}, 255, ${alpha})`;
        ctx.shadowBlur = sz * 4;
        ctx.shadowColor = `rgba(108, 99, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Center core ──
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

      // Outer pulse glow
      const pulseR = maxR * 0.18 * (1 + overall * 0.5 + Math.sin(t * 2) * 0.05);
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 2);
      coreGlow.addColorStop(0, `rgba(108, 99, 255, ${0.15 + overall * 0.2})`);
      coreGlow.addColorStop(0.5, `rgba(108, 99, 255, ${0.05 + overall * 0.08})`);
      coreGlow.addColorStop(1, 'rgba(108, 99, 255, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR * 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
      inner.addColorStop(0, `rgba(200, 195, 255, ${0.6 + overall * 0.4})`);
      inner.addColorStop(0.3, `rgba(108, 99, 255, ${0.4 + overall * 0.4})`);
      inner.addColorStop(1, 'rgba(108, 99, 255, 0)');
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.fill();

      // Hot white center
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + overall * 0.6})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5 + overall * 3, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isActive, connectAnalyser]);

  // Cleanup
  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current?.state !== 'closed') {
      try { audioCtxRef.current?.close(); } catch { /* */ }
    }
  }, []);

  return (
    <div style={{
      width: size, height: size, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: isActive ? 'drop-shadow(0 0 30px rgba(108,99,255,0.4))' : 'none',
      transition: 'filter 0.5s ease',
      ...style,
    }}>
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size, borderRadius: '50%' }}
      />
      {isActive && (
        <div style={{
          position: 'absolute', bottom: -12, left: '50%',
          transform: 'translateX(-50%)', fontSize: 9, letterSpacing: 3,
          textTransform: 'uppercase', fontWeight: 700,
          background: 'linear-gradient(90deg, #6C63FF, #00D2FF, #B43CE6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'neonPulse 2s ease-in-out infinite',
        }}>
          Speaking
        </div>
      )}
      <style>{`
        @keyframes neonPulse {
          0%, 100% { opacity: 0.7; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.5); }
        }
      `}</style>
    </div>
  );
};

function avg(arr, start, end) {
  let sum = 0;
  const len = Math.min(end, arr.length) - start;
  for (let i = start; i < Math.min(end, arr.length); i++) sum += arr[i];
  return len > 0 ? sum / len : 0;
}

function drawIdle(ctx, W, H, cx, cy, maxR, phaseRef) {
  const t = phaseRef.current;
  ctx.fillStyle = 'rgba(10, 9, 20, 0.08)';
  ctx.fillRect(0, 0, W, H);

  // Breathing neon ring
  const breathe = 0.5 + Math.sin(t) * 0.1;
  const r = maxR * breathe;

  ctx.globalCompositeOperation = 'lighter';

  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(108, 99, 255, ${0.08 + Math.sin(t) * 0.04})`;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(108, 99, 255, 0.3)';
  ctx.stroke();

  // Second ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 210, 255, ${0.05 + Math.sin(t * 1.3) * 0.03})`;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(0, 210, 255, 0.2)';
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  // Core
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15);
  coreGlow.addColorStop(0, `rgba(108, 99, 255, ${0.12 + Math.sin(t) * 0.05})`);
  coreGlow.addColorStop(1, 'rgba(108, 99, 255, 0)');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Center dot
  ctx.fillStyle = `rgba(180, 175, 255, ${0.25 + Math.sin(t) * 0.1})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
}

export default VoiceVisualizer;
