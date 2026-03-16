/**
 * Animation React Hooks for Nunba
 *
 * Provides hooks for IntersectionObserver-based reveal animations,
 * staggered list animations, reduced motion detection, and value-change pulses.
 *
 * Usage:
 *   import { useInView, useStaggeredList, useReducedMotion, usePulse } from '../hooks/useAnimations';
 */

import {useState, useEffect, useRef, useMemo, useCallback} from 'react';

// ─── useReducedMotion ────────────────────────────────────────────────────────

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// ─── useInView ───────────────────────────────────────────────────────────────

export function useInView(options = {}) {
  const {threshold = 0.1, rootMargin = '0px', triggerOnce = true} = options;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback: if IntersectionObserver never fires (e.g. pywebview with
    // overflow constraints), force visibility after 400ms so cards are never
    // permanently invisible.
    const fallback = setTimeout(() => {
      setInView(true);
      setHasAnimated(true);
    }, 400);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setInView(true);
          setHasAnimated(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      {threshold, rootMargin}
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return {ref, inView, hasAnimated};
}

// ─── useStaggeredList ────────────────────────────────────────────────────────

export function useStaggeredList(items, delayMs = 50) {
  const reduced = useReducedMotion();

  return useMemo(() => {
    if (reduced || !items) return [];
    return items.map((_, i) => ({
      animationDelay: `${i * delayMs}ms`,
      animationFillMode: 'both',
    }));
  }, [items, delayMs, reduced]);
}

// ─── usePulse ────────────────────────────────────────────────────────────────

export function usePulse(triggerValue) {
  const [pulsing, setPulsing] = useState(false);
  const prevValue = useRef(triggerValue);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (prevValue.current !== triggerValue) {
      setPulsing(true);
      const timer = setTimeout(() => setPulsing(false), 300);
      prevValue.current = triggerValue;
      return () => clearTimeout(timer);
    }
  }, [triggerValue, reduced]);

  const pulseSx = useMemo(() => {
    if (!pulsing) return {};
    return {
      '@keyframes valuePulse': {
        '0%': {transform: 'scale(1)'},
        '50%': {transform: 'scale(1.2)'},
        '100%': {transform: 'scale(1)'},
      },
      animation: 'valuePulse 300ms ease-out',
    };
  }, [pulsing]);

  return pulseSx;
}

// ─── useAnimatedMount ────────────────────────────────────────────────────────

export function useAnimatedMount() {
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return reduced ? true : mounted;
}

// ─── useScrollDirection ──────────────────────────────────────────────────────

export function useScrollDirection() {
  const [direction, setDirection] = useState('up');
  const lastY = useRef(0);

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setDirection(y > lastY.current ? 'down' : 'up');
    lastY.current = y;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return direction;
}
