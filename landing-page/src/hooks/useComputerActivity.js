/**
 * useComputerActivity: ONE reducer for the computer-use projection.
 *
 * HARTOS fans `computer_use.update` out per step (phase executing / completed
 * / blocked / failed / stopped) and ONCE more when the run closes, with
 * `run_done: true` (integrations/vlm/activity_stream.finish_run).  Every
 * surface that shows the run (the companion orb, NunbaChat) and every surface
 * that routes guidance to it must read the same state, or they drift: the
 * chat provider kept the last event forever and sent every later message to
 * the GroupChat injector while the orb had already cleared its card.
 *
 * Returns:
 *   activity  the latest event, kept for ACTIVITY_LINGER_MS after the run
 *             closes so the outcome is readable, then null.
 *   liveRun   the event while guidance can still reach the run: it names the
 *             database goal the injector accepts (agent_id), it is not a
 *             disclosure-only copy of someone else's run, and the run has
 *             not closed.  Between steps the run is still live.
 */
import realtimeService from '../services/realtimeService';

import {useEffect, useRef, useState} from 'react';


export const ACTIVITY_LINGER_MS = 5000;

/** A server that predates finish_run never sends run_done; for it, any
 *  non-executing step phase is the best available "the run may be over". */
export function isRunClosed(event) {
  if (!event) return true;
  if (typeof event.run_done === 'boolean') return event.run_done;
  return event.phase !== 'executing';
}

/** The event guidance may be routed to, or null.  Never a `disclosure_only`
 *  copy: HARTOS tells the desktop owner every step of a run ANOTHER user
 *  started (activity_stream._disclosure_copy), and that run is theirs.  When
 *  the owner's copy named the other user's goal, the owner's typed chat went
 *  to that goal's /inject (review of HARTOS de3f89364, CRITICAL).  The
 *  marker is refused on its own, whatever else the copy carries. */
export function liveRunOf(event) {
  return event && event.agent_id && !event.disclosure_only && !isRunClosed(event)
    ? event : null;
}

export default function useComputerActivity() {
  const [activity, setActivity] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const onUpdate = (data) => {
      if (!data?.task_id || !data?.summary) return;
      setActivity(data);
      if (timer.current) clearTimeout(timer.current);
      if (isRunClosed(data)) {
        timer.current = setTimeout(() => setActivity(null), ACTIVITY_LINGER_MS);
      }
    };
    const unsub = realtimeService.on('computer_use.update', onUpdate);
    return () => {
      if (unsub) unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return {activity, liveRun: liveRunOf(activity)};
}
