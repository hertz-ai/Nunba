/**
 * The orb's frame budget.
 *
 * Measured on the HART OS node (generation 22, 2026-10-12, software-painted
 * WebKit on a 2012 Ivy Bridge): the assistant panel holding the orb AT REST
 * cost the web process 96% of a core; closing the panel took it to 3%. The
 * loop drew a fresh frame with four radial gradients on every animation frame,
 * resting or not. The resting breath is a slow sine; 12 frames a second draw
 * it as smoothly as 60.
 *
 * jsdom has no canvas, so the draw loop itself cannot run here (the breathing
 * guard says the same). What this pins is the ONE policy the loop consults,
 * driven through the component's own export, plus the wiring that makes the
 * policy the only way a frame is scheduled and keeps the breath's tempo
 * independent of the frame rate.
 */
import { IDLE_FRAME_MS, nextFramePolicy } from '../../components/VoiceVisualizer';

import fs from 'fs';
import path from 'path';

describe('nextFramePolicy', () => {
  test('speech gets every animation frame', () => {
    expect(nextFramePolicy({ isActive: true, hidden: false, reducedMotion: false }))
      .toEqual({ mode: 'raf', delayMs: 0 });
  });

  test('the resting orb breathes at no more than 12.5 frames a second', () => {
    const p = nextFramePolicy({ isActive: false, hidden: false, reducedMotion: false });
    expect(p.mode).toBe('timeout');
    expect(p.delayMs).toBe(IDLE_FRAME_MS);
    expect(1000 / p.delayMs).toBeLessThanOrEqual(12.5);
  });

  test('a hidden or off-screen canvas earns no frame, resting or speaking', () => {
    expect(nextFramePolicy({ isActive: false, hidden: true, reducedMotion: false }).mode).toBe('none');
    expect(nextFramePolicy({ isActive: true, hidden: true, reducedMotion: false }).mode).toBe('none');
  });

  test('reduced motion means one still frame', () => {
    expect(nextFramePolicy({ isActive: false, hidden: false, reducedMotion: true }).mode).toBe('none');
    expect(nextFramePolicy({ isActive: true, hidden: false, reducedMotion: true }).mode).toBe('none');
  });
});

describe('the loop is wired through the policy', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'components', 'VoiceVisualizer.jsx'), 'utf8');

  test('render() schedules its next frame through scheduleNext, never a bare rAF', () => {
    const renderStart = src.indexOf('function render() {');
    expect(renderStart).toBeGreaterThan(0);
    expect(src.slice(renderStart, renderStart + 80)).toContain('scheduleNext();');
    // The only requestAnimationFrame(render) calls live inside scheduleNext.
    const schedStart = src.indexOf('function scheduleNext() {');
    const schedEnd = src.indexOf('if (isActive) connectAnalyser();', schedStart);
    const inside = src.slice(schedStart, schedEnd);
    const outside = src.slice(0, schedStart) + src.slice(schedEnd);
    expect((inside.match(/requestAnimationFrame\(render\)/g) || []).length).toBe(2);
    expect(outside).not.toMatch(/requestAnimationFrame\(render\)/);
  });

  test('hidden and off-screen canvases stop the loop and resume on return', () => {
    expect(src).toContain("document.addEventListener('visibilitychange', onVisibility)");
    expect(src).toContain("document.removeEventListener('visibilitychange', onVisibility)");
    expect(src).toContain('new IntersectionObserver(');
    expect(src).toContain('io.observe(canvas)');
    expect(src).toContain('if (io) io.disconnect();');
  });

  test("the breath's tempo is wall-clock, not per-frame", () => {
    expect(src).not.toMatch(/s\.time \+= 0\.02;/);
    expect(src).toContain('s.time += dt * 1.2;');
    expect(src).toContain('Math.min(0.1, (nowMs - s.lastMs) / 1000)');
  });
});
