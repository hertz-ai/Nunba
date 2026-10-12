/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useRef, useEffect, useCallback} from 'react';

// Tick cadence for the clock-driven mode. The index is computed from elapsed
// time on every tick, so this only bounds how often the DOM updates; it never
// sets the typing speed.
const TICK_MS = 50;

const TypeWriterForSubtitle = ({
  text,
  duration,
  isIdle,
  shouldStart = true,
  onComplete,
  audioPosition, // ms — current playback position (audio-driven mode)
  audioDuration, // ms — total audio duration (audio-driven mode)
}) => {
  const [displayText, setDisplayText] = useState('');
  const charIndexRef = useRef(0);
  const intervalRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const prevTextRef = useRef(text);
  const prevDurationRef = useRef(duration);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Audio-driven mode: character index follows audio progress ratio
  useEffect(() => {
    if (
      audioPosition == null ||
      audioDuration == null ||
      !text ||
      audioDuration <= 0
    )
      return;
    if (isIdle || !shouldStart) return;

    const ratio = Math.min(audioPosition / audioDuration, 1);
    const targetIdx = Math.floor(ratio * text.length);
    if (targetIdx > charIndexRef.current) {
      charIndexRef.current = targetIdx;
      setDisplayText(text.slice(0, targetIdx));
    }
    if (ratio >= 1 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setDisplayText(text);
      onComplete?.();
    }
  }, [audioPosition, audioDuration, text, isIdle, shouldStart, onComplete]);

  // Clock-driven mode (fallback when no audio position).
  //
  // The index is where the clock says it should be, never one step per tick.
  // The first version appended one character per setInterval tick, so a late
  // tick (busy main thread, software WebKit on the HART OS node) stretched the
  // subtitle past its own audio and made the reply read as "slow typing".
  // Computing the index from elapsed time means a late tick catches up.
  const startAnimation = useCallback(() => {
    if (
      hasCompletedRef.current ||
      !text ||
      duration <= 0 ||
      isIdle ||
      !shouldStart
    ) {
      return;
    }

    stopAnimation();

    const charDelay = Math.max(1, (duration * 1000) / text.length);
    // Resume from the current index (a duration refinement mid-line keeps the
    // characters already shown instead of blanking the subtitle).
    const started = Date.now() - charIndexRef.current * charDelay;

    intervalRef.current = setInterval(() => {
      const idx = Math.min(
        text.length,
        Math.floor((Date.now() - started) / charDelay),
      );
      if (idx > charIndexRef.current) {
        charIndexRef.current = idx;
        setDisplayText(text.slice(0, idx));
      }
      if (idx >= text.length) {
        stopAnimation();
        hasCompletedRef.current = true;
        onComplete?.();
      }
    }, Math.min(charDelay, TICK_MS));
  }, [text, duration, isIdle, shouldStart, onComplete, stopAnimation]);

  useEffect(() => {
    // Skip the clock mode when audio-driven
    if (audioPosition != null && audioDuration != null) return;

    if (text !== prevTextRef.current) {
      charIndexRef.current = 0;
      hasCompletedRef.current = false;
      setDisplayText('');
      prevTextRef.current = text;

      if (shouldStart && !isIdle) {
        startAnimation();
      }
    } else if (
      Math.abs(duration - prevDurationRef.current) >
      prevDurationRef.current * 0.1
    ) {
      prevDurationRef.current = duration;
      if (shouldStart && !isIdle && !hasCompletedRef.current) {
        startAnimation();
      }
    }

    return stopAnimation;
  }, [
    text,
    shouldStart,
    isIdle,
    startAnimation,
    stopAnimation,
    audioPosition,
    audioDuration,
  ]);

  if (isIdle || !shouldStart) {
    return <div>{text}</div>;
  }

  return <div>{displayText}</div>;
};

export default TypeWriterForSubtitle;
