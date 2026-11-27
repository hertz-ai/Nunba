/**
 * Live talking avatar for a spoken reply.
 *
 * On a video turn of an agent with a face, the reply's TTS bundle (WAMP or SSE, the same
 * push that carries its audio) also carries `generated_video_url`: one live fragmented MP4
 * (H.264 + AAC) of the agent's portrait speaking the reply, made by the AvatarForcing model
 * while it plays (HARTOS avatarforcing_tool.add_live_avatar; Nunba serves it at
 * /avatar/live/<sid>.mp4), and `video_seconds`, its length. It plays here through Media
 * Source Extensions in the agent's own <video> element.
 *
 * Playback starts (and resumes after a stall) only when what is buffered covers the rest of
 * the reply at the speed the stream is arriving, so a busy GPU costs a short start delay,
 * not a pause mid-sentence. The speed is measured from the buffer itself; before there is a
 * measurement, the speed this browser saw last time is used. When the face cannot keep up
 * (no data within NO_DATA_S, or a start delay past MAX_START_WAIT_S), the reply is heard
 * instead: onFail, and the caller plays its audio.
 *
 * One reply plays at a time: starting one stops the last, and stopLiveAvatar() (which the
 * page's one stop, useTTS.stop, calls) stops it. Whenever a reply ends before the server
 * finished it, the server is told (DELETE), so it stops generating.
 */

const TYPES = [
  'video/mp4; codecs="avc1.42C01E, mp4a.40.2"',
  'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
  'video/mp4; codecs="avc1.4D401E, mp4a.40.2"',
];
const RATE_KEY = 'nunba_avatar_rate';
export const NO_DATA_S = 8;
export const MAX_START_WAIT_S = 6;

let current = null; // the one live reply

function rememberedRate() {
  try {
    const r = parseFloat(localStorage.getItem(RATE_KEY));
    return r > 0 ? r : null;
  } catch (e) {
    return null;
  }
}

function rememberRate(r) {
  try {
    localStorage.setItem(RATE_KEY, String(r));
  } catch (e) {
    /* a preference only */
  }
}

/**
 * Seconds of buffer needed ahead of the playhead to play the rest without stalling.
 * remaining: seconds of the reply not yet buffered; rate: seconds of video arriving per
 * second (null = unknown, hold); ended: the whole stream is buffered.
 */
export function neededAhead(remaining, rate, ended) {
  if (ended || remaining <= 0) return 0.02;
  if (rate == null) return Infinity;
  const eff = rate * 0.85;
  return (eff >= 1 ? 0 : remaining * (1 / eff - 1)) + 0.3;
}

/** Stop the live reply, if one is playing. True when there was one. */
export function stopLiveAvatar() {
  if (!current) return false;
  current.stop();
  return true;
}

/**
 * A player for one reply's live stream, or null when this browser cannot play it (the
 * caller then plays the reply's audio). Stops the reply playing before it.
 *
 * Returns {url, attach(videoEl, {onEnd, onFail, onStop}), stop(), attached, active}: `url`
 * goes into the video element's src (React state), then attach() feeds the stream and runs
 * playback. Exactly one callback runs once attached: onEnd when the reply played to its end
 * (or as far as it arrived), onFail when nothing of it could be played (the caller plays the
 * reply's audio instead), onStop when stop() ended it first. onEnd gets {natural}: true when
 * the element reached its 'ended' (its own onEnded handler runs too).
 */
export function startLiveAvatar({streamUrl, seconds}) {
  if (!streamUrl || !window.MediaSource) return null;
  const type = TYPES.find((t) => MediaSource.isTypeSupported(t));
  if (!type) return null;
  stopLiveAvatar();
  const totalS = seconds || 0;
  const ms = new MediaSource();
  const url = URL.createObjectURL(ms);
  const abort = new AbortController();
  let finished = false;
  let timer = null;
  let video = null;
  let listeners = [];
  let serverDone = false; // the whole stream arrived
  let streamDone = false; // ... and is closed in the MediaSource
  let opened = false;     // our MediaSource is the element's source now
  let played = false;
  let allowPlay = false;  // only the buffer rule starts playback
  let callbacks = {};
  let endedNaturally = false; // played to its 'ended' (the page's own onEnded runs too)

  const tellServer = () => {
    if (!serverDone) fetch(streamUrl, {method: 'DELETE', keepalive: true}).catch(() => {});
  };

  const finish = (which) => {
    if (finished) return;
    finished = true;
    player.active = false;
    if (timer) clearInterval(timer);
    timer = null;
    if (video) {
      video.pause();
      video.muted = true; // the element goes back to the (silent) idle video
    }
    listeners.forEach(([ev, fn]) => video && video.removeEventListener(ev, fn));
    listeners = [];
    tellServer();
    abort.abort();
    URL.revokeObjectURL(url);
    if (current === player) current = null;
    const cb = callbacks[which] || (which === 'onStop' && !player.attached ? player.onEarlyStop : null);
    if (cb) cb({natural: endedNaturally});
  };

  const player = {
    url,
    attached: false,
    active: true,
    onEarlyStop: null, // the caller's stop handler while nothing is attached yet
    attach(v, cbs = {}) {
      if (!v || finished) return;
      player.attached = true;
      callbacks = cbs;
      video = v;
      v.autoplay = false;
      v.pause(); // the element's autoplay would start before the buffer rule allows
      v.muted = false; // the stream carries the reply's speech
      const t0 = performance.now();
      let firstData = null;
      let refused = 0;
      const samples = []; // [ms, buffered end in s], from the first data on
      const bufferedEnd = () => (v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0);
      const rate = () => {
        const now = performance.now();
        while (samples.length > 2 && now - samples[0][0] > 3000) samples.shift();
        const a = samples[0];
        // Up to the last sample where the buffer grew: video lands a block at a time, and the
        // quiet just before the next block is not the generator slowing down.
        let z = samples[samples.length - 1];
        for (let k = samples.length - 1; k > 0 && samples[k][1] === samples[k - 1][1]; k--) z = samples[k - 1];
        if (!a || z[0] - a[0] < 800) return rememberedRate();
        return (z[1] - a[1]) / ((z[0] - a[0]) / 1000);
      };
      const fail = () => finish(played ? 'onEnd' : 'onFail');
      const on = (ev, fn) => {
        v.addEventListener(ev, fn);
        listeners.push([ev, fn]);
      };
      on('ended', () => { endedNaturally = true; finish('onEnd'); });
      on('playing', () => { played = true; });
      // A play() from anyone else (a canplay listener left by the idle video) is undone.
      on('play', () => { if (!allowPlay) v.pause(); });
      // Events from the element's previous source arrive late; only ours count.
      on('error', () => { if (opened) fail(); });
      on('emptied', () => { if (opened && v.src !== url) fail(); });

      timer = setInterval(() => {
        if (finished) return;
        if (!v.isConnected) { player.stop(); return; } // the page removed the element
        const e = bufferedEnd();
        const now = performance.now();
        if (e <= 0) {
          // Nothing yet (the face crop and the first block run first): wait up to NO_DATA_S.
          if ((now - t0) / 1000 > NO_DATA_S) fail(); // the face is not coming
          return;
        }
        if (firstData === null) firstData = now;
        // The speed is measured from the first data on, never across the wait for it.
        samples.push([now, e]);
        const ahead = Math.max(0, e - v.currentTime);
        const r = rate();
        const need = neededAhead(Math.max(0, totalS - e), r, streamDone);
        if (!played && (now - firstData) / 1000 > 1.5 && r != null && need - ahead > MAX_START_WAIT_S) {
          fail(); // it cannot keep up: heard now beats seen much later
          return;
        }
        if (v.paused && ahead > 0 && ahead >= need) {
          allowPlay = true;
          v.play().then(() => { refused = 0; }).catch(() => {
            refused += 1;
            if (refused >= 5) fail(); // a browser that will not play it: heard instead
          });
        } else if (!v.paused && ahead < 0.04 && !streamDone) {
          allowPlay = false;
          v.pause();
        }
      }, 100);

      const run = async () => {
        if (ms.readyState !== 'open') await new Promise((r) => ms.addEventListener('sourceopen', r, {once: true}));
        opened = true;
        const sb = ms.addSourceBuffer(type);
        const q = [];
        const closeStream = () => {
          if (finished) return;
          if (bufferedEnd() <= 0) { fail(); return; } // nothing playable came
          if (ms.readyState === 'open' && !sb.updating) ms.endOfStream();
          streamDone = true;
        };
        const pump = () => {
          if (sb.updating || finished) return;
          if (q.length) sb.appendBuffer(q.shift());
          else if (serverDone && ms.readyState === 'open') {
            closeStream();
            const took = (performance.now() - t0) / 1000;
            if (totalS > 1 && took > 0) rememberRate(totalS / took);
          }
        };
        sb.addEventListener('updateend', pump);
        try {
          const r = await fetch(streamUrl, {cache: 'no-store', signal: abort.signal});
          if (!r.ok) throw new Error(`stream answered ${r.status}`);
          const rd = r.body.getReader();
          for (;;) {
            const {done, value} = await rd.read();
            if (done) { serverDone = true; pump(); break; }
            q.push(value);
            pump();
          }
        } catch (e) {
          if (finished) return;
          console.warn('[LiveAvatar] stream failed:', e && e.message);
          tellServer(); // the relay may still be reading it
          serverDone = true;
          // What arrived plays out and 'ended' follows; with nothing, the caller speaks the audio.
          q.length = 0;
          const decide = () => {
            if (finished) return;
            if (bufferedEnd() > 0.2) closeStream();
            else fail();
          };
          if (sb.updating) sb.addEventListener('updateend', decide, {once: true});
          else decide();
        }
      };
      run().catch((e) => {
        if (finished) return;
        console.warn('[LiveAvatar] player failed:', e && e.message);
        fail();
      });
    },
    stop() {
      finish('onStop');
    },
  };
  current = player;
  return player;
}
