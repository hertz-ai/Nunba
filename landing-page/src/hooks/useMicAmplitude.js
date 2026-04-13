/**
 * useMicAmplitude - Web Audio API Microphone Amplitude Hook
 *
 * Web equivalent of the React Native useMicAmplitude hook.
 * Uses AudioContext + AnalyserNode + getByteFrequencyData() to stream
 * real-time microphone amplitude values (0-1) and decibel estimates.
 *
 * @param {number} [sensitivity=1.0] - Multiplier applied to raw amplitude (clamped 0-1)
 * @returns {{ amplitude: number, decibels: number, isListening: boolean, startListening: () => Promise<void>, stopListening: () => Promise<void> }}
 */

import {useState, useEffect, useRef, useCallback} from 'react';

export default function useMicAmplitude(sensitivity = 1.0) {
  const [amplitude, setAmplitude] = useState(0);
  const [decibels, setDecibels] = useState(-160);
  const [isListening, setIsListening] = useState(false);

  const mountedRef = useRef(true);
  const sensitivityRef = useRef(sensitivity);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const dataArrayRef = useRef(null);

  sensitivityRef.current = sensitivity;

  // Continuous amplitude polling via requestAnimationFrame
  const poll = useCallback(() => {
    if (!mountedRef.current || !analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Compute RMS amplitude from frequency data (0-255 range)
    const data = dataArrayRef.current;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const scaled = Math.min(rms * sensitivityRef.current, 1.0);

    // Convert to approximate decibels (-160 silence, 0 max)
    const db = rms > 0 ? 20 * Math.log10(rms) : -160;

    if (mountedRef.current) {
      setAmplitude(scaled);
      setDecibels(Math.max(db, -160));
    }

    rafRef.current = requestAnimationFrame(poll);
  }, []);

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('useMicAmplitude: getUserMedia not available');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      streamRef.current = stream;
      dataArrayRef.current = dataArray;

      if (mountedRef.current) {
        setIsListening(true);
        rafRef.current = requestAnimationFrame(poll);
      }
    } catch (err) {
      console.warn('useMicAmplitude: failed to start:', err.message);
    }
  }, [poll]);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (_) {}
      audioCtxRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    if (mountedRef.current) {
      setIsListening(false);
      setAmplitude(0);
      setDecibels(-160);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) try { sourceRef.current.disconnect(); } catch (_) {}
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch (_) {}
    };
  }, []);

  return {amplitude, decibels, isListening, startListening, stopListening};
}
