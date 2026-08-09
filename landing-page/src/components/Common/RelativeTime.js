/**
 * RelativeTime.js — self-ticking "5m ago" timestamp for chat bubbles.
 *
 * Problem: chat bubbles render formatTimestamp(message.timestamp) once
 * at mount.  The string "just now" stays "just now" forever until
 * something else triggers a re-render of the parent list (typing,
 * scroll, new message).  User reports the bubble times look flaky
 * and never update.
 *
 * Fix: each instance owns a tiny setInterval that bumps an internal
 * tick counter every TICK_INTERVAL_MS.  React re-renders the
 * component on tick → formatRelative reads Date.now() fresh → label
 * advances "just now" → "1m" → "2m" → "1h" naturally.
 *
 * Scope: only the timestamp <span> re-renders per tick, not the whole
 * message list.  ~50 visible bubbles × 1 setInterval each is fine
 * (browsers handle 1000s of timers without measurable cost; if it
 * ever becomes a hot path, swap to a single shared tick context).
 *
 * Format mirrors the legacy formatTimestamp() in ChatMessageList.js
 * (which is now exported and reused — single source of truth).
 */
import React, {useEffect, useState} from 'react';


// Re-evaluation cadence.  30s is the right knob: a "1m ago" label
// could be off-by-30s when first rendered (we just crossed the
// minute boundary right before render), so 30s ensures every label
// advances within a tick of its semantic transition.
export const TICK_INTERVAL_MS = 30_000;


// Pure formatter — mirrors ChatMessageList.formatTimestamp.  Kept
// inline (NOT a separate util) because it's tied 1:1 to this
// component's semantics; lifting it to utils would split the
// contract across two files.
export function formatRelative(ts, nowMs = Date.now()) {
  if (!ts) return '';
  const d = new Date(ts);
  const diffMs = nowMs - d.getTime();
  if (Number.isNaN(diffMs)) return '';
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


/**
 * useRelativeTick — re-render the caller on the shared relative-time cadence.
 *
 * Extracted from RelativeTime so anything whose OUTPUT is a function of
 * elapsed time can advance on the same clock without standing up a second
 * timer implementation.  First other consumer: SetupProgressCard, which must
 * notice that a finished setup card has gone stale — a verdict that changes
 * with wall-clock time alone, so without a tick it would only update when some
 * unrelated parent re-render happened to fire.  That is exactly the flakiness
 * this module exists to remove (see the header); it must not be re-introduced
 * next door.
 *
 * `dep` is passed straight through as the effect dependency and doubles as the
 * on/off switch: falsy means "nothing time-dependent to show", so no interval
 * is created.  This mirrors the original `[ts]` dependency exactly, which
 * keeps RelativeTime's behaviour bit-for-bit unchanged by the extraction.
 */
export function useRelativeTick(dep) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!dep) return undefined;
    const id = setInterval(() => setTick((n) => (n + 1) % 1_000_000),
      TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dep]);
}


export default function RelativeTime({ts, className, style, ...rest}) {
  useRelativeTick(ts);
  if (!ts) return null;
  return (
    <span className={className} style={style} {...rest}>
      {formatRelative(ts)}
    </span>
  );
}
