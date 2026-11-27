/**
 * The agent page's idle face (owner 27 Nov: "I visually see in the nunba desktop the container is not
 * there"; "Face agents open in video"), page level (review rv_page).  Demopage is too large to render
 * in a unit test, so each piece is cut out of Demopage.js and run as written, the way the other
 * Demopage tests do: the video error handler, the agent switch, and the opening-mode effect.
 */
import fs from 'fs';
import path from 'path';
import {afterVideoError, idleLinkOf} from '../../utils/idleFace';
import {openingMode} from '../../utils/agentMediaMode';

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

function cut(start, end) {
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return SRC.slice(a, b);
}

function run(code, scope, ret) {
  const names = Object.keys(scope);
  // eslint-disable-next-line no-new-func
  return new Function(...names, `${code}\n${ret ? `return ${ret};` : ''}`)(...names.map((n) => scope[n]));
}

const ERROR_HANDLER = cut('  const handleVideoError = (e) => {', '\n  const handleMediaEnded') ;
const IDLE_EFFECT = cut('    const switched = idleAgentKeyRef.current !== openedAgentKey;',
  '    // eslint-disable-next-line react-hooks/exhaustive-deps');
const PERSIST = cut('    if (agentDefaultModeRef.current) {\n      agentDefaultModeRef.current = false;',
  '  }, [mediaMode]);');
const OPENING = cut('    if (!openedAgentKey || forcedModeRef.current) return;',
  '    // eslint-disable-next-line react-hooks/exhaustive-deps');

const IDLE_A = '/avatar/idle/1.mp4';
const AGENT_A = {prompt_id: 1, name: 'A', teacher_avatar_id: 7,
  fillers: [{type: 'idle', video_link: 'http://192.168.0.10:5000/avatar/idle/1.mp4', page_link: IDLE_A}]};
const AGENT_B = {prompt_id: 2, name: 'B'};  // a voice agent: no face, no idle filler

describe('Demopage idle face (page level)', () => {
  it('a broken idle video never hides the element; it drops to the portrait and is not retried', () => {
    const calls = {idle: [], video: []};
    const failed = new Set();
    const handler = run(ERROR_HANDLER, {
      afterVideoError,
      idleVideoUrlRef: {current: IDLE_A},
      liveAvatarRef: {current: null},
      failedIdleUrlsRef: {current: failed},
      setIdleVideoUrl: (v) => calls.idle.push(v),
      setVideoUrl: (v) => calls.video.push(v),
    }, 'handleVideoError');
    // The element's src is the idle link made absolute against THE PAGE's origin (jsdom's here, the
    // desktop's loopback in Nunba), as the browser does: a fixed origin would not be the same clip.
    const target = {src: new URL(IDLE_A, window.location.href).href, style: {}};
    handler({target});
    expect(target.style.display).toBeUndefined();
    expect(calls.idle).toEqual([null]);
    expect(calls.video).toEqual([null]);
    expect(idleLinkOf(AGENT_A, failed)).toBeNull();  // the page's own base: the failed link stays out
  });

  // ONE effect, keyed on the open agent, sets the idle face for every way an agent opens (rv_page
  // F1/F2: the list, an @mention, the saved restore, the orphan, the default, the route, a create).
  function idleEffect({key, link, mode = 'video', lastKey, lastIdle = null, playing}) {
    const out = {idle: [], video: playing};
    const keyRef = {current: lastKey};
    run(IDLE_EFFECT, {
      idleAgentKeyRef: keyRef, openedAgentKey: key, openedIdleLink: link, mediaMode: mode,
      idleVideoUrlRef: {current: lastIdle},
      setIdleVideoUrl: (v) => out.idle.push(v),
      setVideoUrl: (f) => { out.video = typeof f === 'function' ? f(out.video) : f; },
    });
    return {...out, key: keyRef.current};
  }

  it("opening an agent shows its own idle face, or none, never the last agent's", () => {
    const A = idleLinkOf(AGENT_A, new Set(), 'http://127.0.0.1:5000/');
    expect(A).toBe(IDLE_A);  // the page's own link, not the phone's
    let got = idleEffect({key: '2', link: idleLinkOf(AGENT_B), lastKey: '1', lastIdle: A, playing: A});
    expect(got.idle).toEqual([null]);
    expect(got.video).toBeNull();  // B has no face: A's does not stay
    expect(got.key).toBe('2');
    got = idleEffect({key: '1', link: A, lastKey: '2', playing: null});
    expect(got.idle).toEqual([A]);
    expect(got.video).toBe(A);
  });

  it('a voice-mode open keeps the face for later but shows no video', () => {
    const got = idleEffect({key: '1', link: IDLE_A, mode: 'audio', lastKey: '2', playing: null});
    expect(got.idle).toEqual([IDLE_A]);
    expect(got.video).toBeNull();
  });

  it("the same agent's face arriving later replaces an idle face, never a reply that is playing", () => {
    const live = 'http://127.0.0.1:5000/avatar/live/abcdef012345.mp4';
    expect(idleEffect({key: '1', link: IDLE_A, lastKey: '1', lastIdle: null, playing: live}).video)
      .toBe(live);
    expect(idleEffect({key: '1', link: IDLE_A, lastKey: '1', lastIdle: '/old.mp4', playing: '/old.mp4'})
      .video).toBe(IDLE_A);
    expect(idleEffect({key: '1', link: IDLE_A, lastKey: '1', playing: null}).video).toBe(IDLE_A);
  });

  it("the page saves the person's mode, and skips the one an agent opened in by its default", () => {
    localStorage.clear();
    const ref = {current: true};
    run(PERSIST, {agentDefaultModeRef: ref, localStorage, mediaMode: 'video'});
    expect(localStorage.getItem('nunba_media_mode')).toBeNull();
    expect(ref.current).toBe(false);  // only that one change is skipped
    run(PERSIST, {agentDefaultModeRef: ref, localStorage, mediaMode: 'text'});
    expect(localStorage.getItem('nunba_media_mode')).toBe('text');
  });

  it('a face agent opens in video by its default, which is not saved as the person\'s mode', () => {
    localStorage.clear();
    const changed = [];
    const defaultRef = {current: false};
    run(OPENING, {
      openedAgentKey: '1', forcedModeRef: {current: false}, openingMode, currentAgent: AGENT_A,
      mediaMode: 'audio', agentDefaultModeRef: defaultRef,
      changeMediaMode: (mode, opts) => changed.push([mode, opts]),
    });
    expect(changed).toEqual([['video', {remember: false}]]);
    expect(defaultRef.current).toBe(true);  // the persist effect skips this one change
  });

  it('a text-mode link is never overridden by an agent default', () => {
    const changed = [];
    run(OPENING, {
      openedAgentKey: '1', forcedModeRef: {current: true}, openingMode, currentAgent: AGENT_A,
      mediaMode: 'text', agentDefaultModeRef: {current: false},
      changeMediaMode: (mode, opts) => changed.push([mode, opts]),
    });
    expect(changed).toEqual([]);
  });
});
