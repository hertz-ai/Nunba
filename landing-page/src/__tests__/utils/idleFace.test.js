/**
 * A broken video never leaves video mode faceless (owner 27 Nov: "the container is not there").
 */
import {afterVideoError, isFailedIdle, sameMediaUrl} from '../../utils/idleFace';

const BASE = 'http://127.0.0.1:5000/agents/x';

describe('idleFace.afterVideoError', () => {
  it("leaves a live reply's own stream to the live player", () => {
    const failedIdle = new Set();
    expect(afterVideoError({failedSrc: 'blob:http://127.0.0.1:5000/1', idleUrl: '/i.mp4',
      liveUrl: 'blob:http://127.0.0.1:5000/1', failedIdle, base: BASE})).toEqual({ignore: true});
    expect(failedIdle.size).toBe(0);
  });

  it('a failed idle video drops to the portrait and is never tried again', () => {
    const failedIdle = new Set();
    const next = afterVideoError({failedSrc: 'http://127.0.0.1:5000/avatar/idle/7.mp4',
      idleUrl: '/avatar/idle/7.mp4', liveUrl: null, failedIdle, base: BASE});
    expect(next).toEqual({clearIdle: true, videoUrl: null});
    expect(isFailedIdle('/avatar/idle/7.mp4', failedIdle, BASE)).toBe(true);
    expect(isFailedIdle('http://127.0.0.1:5000/avatar/idle/7.mp4', failedIdle, BASE)).toBe(true);
  });

  it('a failed reply clip goes back to the idle face', () => {
    const next = afterVideoError({failedSrc: 'https://cdn.test/reply.mp4', idleUrl: '/i.mp4',
      liveUrl: null, failedIdle: new Set(), base: BASE});
    expect(next).toEqual({clearIdle: false, videoUrl: '/i.mp4'});
  });

  it('a failed reply clip with a failed or no idle face goes to the portrait', () => {
    const failedIdle = new Set(['http://127.0.0.1:5000/i.mp4']);
    expect(afterVideoError({failedSrc: 'https://cdn.test/r.mp4', idleUrl: '/i.mp4', liveUrl: null,
      failedIdle, base: BASE}).videoUrl).toBeNull();
    expect(afterVideoError({failedSrc: 'https://cdn.test/r.mp4', idleUrl: null, liveUrl: null,
      failedIdle: new Set(), base: BASE}).videoUrl).toBeNull();
  });

  it('compares a relative idle link with the element\'s absolute src', () => {
    expect(sameMediaUrl('/a.mp4', 'http://127.0.0.1:5000/a.mp4', BASE)).toBe(true);
    expect(sameMediaUrl('/a.mp4', 'http://127.0.0.1:5000/b.mp4', BASE)).toBe(false);
    expect(sameMediaUrl(null, '/a.mp4', BASE)).toBe(false);
  });
});
