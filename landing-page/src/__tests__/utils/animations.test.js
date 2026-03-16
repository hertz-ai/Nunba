import {
  keyframes,
  durations,
  easings,
  animFadeInUp,
  animScaleIn,
  animSlideIn,
  animFadeInDown,
  hoverLift,
  hoverGlow,
  pressDown,
  shimmerBg,
  staggerChildren,
  prefersReducedMotion,
} from '../../utils/animations';

describe('animations.js', () => {
  describe('keyframes', () => {
    const expectedKeyframes = [
      'fadeInUp',
      'fadeInDown',
      'fadeInScale',
      'slideInLeft',
      'slideInRight',
      'slideInUp',
      'pulse',
      'shimmer',
      'glow',
      'rippleOut',
      'scaleIn',
      'scaleOut',
      'breathe',
      'bounceIn',
      'float',
      'dotBounce',
    ];

    it.each(expectedKeyframes)('exports %s keyframe definition', (name) => {
      expect(keyframes[name]).toBeDefined();
      const kfKey = Object.keys(keyframes[name])[0];
      expect(kfKey).toMatch(/^@keyframes/);
    });

    it('each keyframe has 0% and 100% (or equivalent) entries', () => {
      Object.entries(keyframes).forEach(([name, def]) => {
        const kfKey = Object.keys(def)[0];
        const frames = def[kfKey];
        const keys = Object.keys(frames);
        const hasStart = keys.some((k) => k.includes('0%'));
        const hasEnd = keys.some((k) => k.includes('100%'));
        expect(hasStart).toBe(true);
        expect(hasEnd).toBe(true);
      });
    });
  });

  describe('durations', () => {
    it('exports all duration tokens as positive numbers', () => {
      expect(durations.instant).toBeGreaterThan(0);
      expect(durations.fast).toBeGreaterThan(0);
      expect(durations.normal).toBeGreaterThan(0);
      expect(durations.slow).toBeGreaterThan(0);
      expect(durations.pageTransition).toBeGreaterThan(0);
    });

    it('durations are in ascending order', () => {
      expect(durations.instant).toBeLessThan(durations.fast);
      expect(durations.fast).toBeLessThan(durations.normal);
      expect(durations.normal).toBeLessThan(durations.slow);
    });
  });

  describe('easings', () => {
    it('exports valid CSS cubic-bezier strings', () => {
      Object.values(easings).forEach((easing) => {
        expect(easing).toMatch(/^cubic-bezier\(/);
      });
    });

    it('exports all expected easing curves', () => {
      expect(easings.snappy).toBeDefined();
      expect(easings.bounce).toBeDefined();
      expect(easings.smooth).toBeDefined();
      expect(easings.decelerate).toBeDefined();
      expect(easings.spring).toBeDefined();
    });
  });

  describe('composable sx presets', () => {
    it('animFadeInUp returns sx with animation when reduced motion is off', () => {
      if (prefersReducedMotion) return; // Skip if OS has reduced motion
      const sx = animFadeInUp(100);
      expect(sx.animation).toBeDefined();
      expect(sx.animation).toContain('fadeInUp');
      expect(sx.animation).toContain('100ms');
    });

    it('animFadeInUp(0) has 0ms delay', () => {
      if (prefersReducedMotion) return;
      const sx = animFadeInUp(0);
      expect(sx.animation).toContain('0ms both');
    });

    it('animScaleIn returns sx with scaleIn animation', () => {
      if (prefersReducedMotion) return;
      const sx = animScaleIn(50);
      expect(sx.animation).toContain('scaleIn');
    });

    it('animSlideIn direction left uses slideInLeft', () => {
      if (prefersReducedMotion) return;
      const sx = animSlideIn('left');
      expect(sx.animation).toContain('slideInLeft');
    });

    it('animSlideIn direction right uses slideInRight', () => {
      if (prefersReducedMotion) return;
      const sx = animSlideIn('right');
      expect(sx.animation).toContain('slideInRight');
    });

    it('animFadeInDown returns sx with fadeInDown animation', () => {
      if (prefersReducedMotion) return;
      const sx = animFadeInDown();
      expect(sx.animation).toContain('fadeInDown');
    });
  });

  describe('hover/press presets', () => {
    it('hoverLift has hover transform', () => {
      if (prefersReducedMotion) return;
      expect(hoverLift['&:hover']).toBeDefined();
      expect(hoverLift['&:hover'].transform).toContain('translateY');
    });

    it('hoverGlow has hover boxShadow', () => {
      if (prefersReducedMotion) return;
      expect(hoverGlow['&:hover']).toBeDefined();
      expect(hoverGlow['&:hover'].boxShadow).toBeDefined();
    });

    it('pressDown has active transform', () => {
      if (prefersReducedMotion) return;
      expect(pressDown['&:active']).toBeDefined();
      expect(pressDown['&:active'].transform).toContain('scale');
    });

    it('shimmerBg has animation', () => {
      if (prefersReducedMotion) return;
      expect(shimmerBg.animation).toContain('shimmer');
    });
  });

  describe('staggerChildren', () => {
    it('returns correct array of delays', () => {
      expect(staggerChildren(5, 50)).toEqual([0, 50, 100, 150, 200]);
    });

    it('returns empty array for count 0', () => {
      expect(staggerChildren(0, 50)).toEqual([]);
    });

    it('handles default base delay', () => {
      const result = staggerChildren(3);
      expect(result).toEqual([0, 50, 100]);
    });

    it('returns single 0 for count 1', () => {
      expect(staggerChildren(1, 100)).toEqual([0]);
    });
  });
});
