/**
 * TypedText: the letter-by-letter line the HART ceremony speaks in.
 *
 * Time-based, not tick-based. The first version advanced ONE character per
 * setInterval tick and gave every character its own <span> with a 300 ms
 * opacity fade plus a 20 ms per-character stagger. Each tick re-rendered every
 * span of the line, so a 120-character line was about 120 renders of 120 nodes,
 * and whenever the main thread was busy (the particle canvas behind it,
 * software WebKit on the HART OS node) a tick came late and the line crawled:
 * the owner read it as "letter by letter typing is slow" on generation 19,
 * 2026-10-12.
 *
 * Now the visible length is a function of ELAPSED TIME (Date.now() minus the
 * start), so a late tick catches up instead of falling further behind, and the
 * line renders as one visible text node plus one hidden remainder, so the
 * layout never jumps while it types. `delay` keeps its meaning: milliseconds
 * per character.
 */
import { Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

export const COMPLETE_HOLD_MS = 300;

/** How many characters the clock says are visible after `elapsedMs`. */
export function visibleCount(elapsedMs, perCharMs, length) {
  if (!length || length <= 0) return 0;
  const per = perCharMs > 0 ? perCharMs : 1;
  const n = Math.floor(Math.max(0, elapsedMs) / per) + 1;
  return n > length ? length : n;
}

export default function TypedText({ text, delay = 40, onComplete, sx = {} }) {
  const [visible, setVisible] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!text) return undefined;
    setVisible(0);
    const perChar = delay > 0 ? delay : 1;
    const started = Date.now();
    let timer = null;
    const tick = () => {
      const n = visibleCount(Date.now() - started, perChar, text.length);
      setVisible(n);
      if (n >= text.length) {
        timer = setTimeout(() => {
          if (onCompleteRef.current) onCompleteRef.current();
        }, COMPLETE_HOLD_MS);
        return;
      }
      timer = setTimeout(tick, perChar);
    };
    timer = setTimeout(tick, perChar);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [text, delay]);

  if (!text) return null;

  const shown = text.slice(0, visible);
  const rest = text.slice(visible);
  return (
    <Typography sx={sx} data-typed-done={rest ? undefined : 'true'}>
      <span data-typed="visible">{shown}</span>
      <span data-typed="rest" aria-hidden="true" style={{ visibility: 'hidden' }}>{rest}</span>
    </Typography>
  );
}
