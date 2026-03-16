/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useRef, useEffect, useCallback} from 'react';

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

  // Interval-driven mode (fallback when no audio position)
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

    const charDelay = (duration * 1000) / text.length;
    let currentText = '';

    intervalRef.current = setInterval(() => {
      if (charIndexRef.current >= text.length) {
        stopAnimation();
        hasCompletedRef.current = true;
        onComplete?.();
        return;
      }

      currentText += text[charIndexRef.current];
      setDisplayText(currentText);
      charIndexRef.current += 1;
    }, charDelay);
  }, [text, duration, isIdle, shouldStart, onComplete, stopAnimation]);

  useEffect(() => {
    // Skip interval mode when audio-driven
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
