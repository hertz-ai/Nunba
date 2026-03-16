import ParticlePool from '../../../../../components/Social/KidsLearning/shared/CanvasParticles';

// ---------------------------------------------------------------------------
// Mock kidsTheme so the module loads without real theme dependencies
// ---------------------------------------------------------------------------
jest.mock('../../../../../components/Social/KidsLearning/kidsTheme', () => ({
  kidsColors: {
    red: '#E74C3C',
    blue: '#0984E3',
    green: '#00B894',
    yellow: '#FDCB6E',
    pink: '#FD79A8',
    purple: '#6C5CE7',
    orange: '#FF6B35',
    teal: '#4ECDC4',
    star: '#FFD700',
    starGlow: '#FFF176',
    starEmpty: '#E0E0E0',
    accentSecondary: '#4ECDC4',
    correct: '#2ECC71',
  },
}));

// ---------------------------------------------------------------------------
// Mock canvas 2D context
// ---------------------------------------------------------------------------
function createMockCtx() {
  return {
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    fillRect: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fillStyle: '',
    globalAlpha: 1,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ParticlePool', () => {
  let pool;

  beforeEach(() => {
    pool = new ParticlePool();
  });

  // ---------- Pool creation ----------

  test('creates pool of 200 particles', () => {
    // Access internal pool to verify pre-allocation count
    expect(pool._pool).toHaveLength(200);
  });

  test('all particles start inactive', () => {
    expect(pool.activeCount).toBe(0);
    pool._pool.forEach((p) => {
      expect(p.active).toBe(false);
    });
  });

  // ---------- emit() ----------

  test('emit() activates the requested number of particles', () => {
    const emitted = pool.emit(100, 200, 10, {color: '#FF0000'});

    expect(emitted).toBe(10);
    expect(pool.activeCount).toBe(10);
  });

  test('emit() sets particle position to the given (x, y)', () => {
    pool.emit(42, 84, 1, {color: '#FF0000'});

    const active = pool._pool.find((p) => p.active);
    expect(active).toBeDefined();
    expect(active.x).toBe(42);
    expect(active.y).toBe(84);
  });

  test('emit() respects colorArray option', () => {
    const colors = ['#AA0000', '#00AA00', '#0000AA'];
    pool.emit(0, 0, 50, {colorArray: colors});

    const activeParticles = pool._pool.filter((p) => p.active);
    activeParticles.forEach((p) => {
      expect(colors).toContain(p.color);
    });
  });

  test('emit() caps at pool size when requesting more than available', () => {
    const emitted = pool.emit(0, 0, 300);
    expect(emitted).toBe(200);
    expect(pool.activeCount).toBe(200);
  });

  test('emit() returns 0 when pool is fully active', () => {
    pool.emit(0, 0, 200);
    const emitted = pool.emit(0, 0, 10);
    expect(emitted).toBe(0);
  });

  // ---------- update(dt) ----------

  test('update(dt) advances particle positions', () => {
    pool.emit(0, 0, 1, {speed: 100, life: 2, gravity: 0, friction: 1});

    const p = pool._pool.find((pp) => pp.active);
    const startX = p.x;
    const startY = p.y;

    pool.update(0.1); // 100ms

    // At least one coordinate should have changed (velocity is radial)
    const moved = p.x !== startX || p.y !== startY;
    expect(moved).toBe(true);
  });

  test('update(dt) deactivates particles whose life expires', () => {
    pool.emit(0, 0, 5, {life: 0.5});
    expect(pool.activeCount).toBe(5);

    // Advance past the lifetime
    pool.update(0.6);
    expect(pool.activeCount).toBe(0);
  });

  test('update(dt) applies gravity to vertical velocity', () => {
    pool.emit(0, 0, 1, {
      speed: 0,
      life: 5,
      gravity: 500,
      friction: 1,
    });

    const p = pool._pool.find((pp) => pp.active);
    // Force horizontal velocity to 0 to isolate gravity
    p.vx = 0;
    p.vy = 0;

    pool.update(0.1);

    // vy should increase due to gravity: vy += gravity * dt = 500 * 0.1 = 50
    expect(p.vy).toBeCloseTo(50, 0);
  });

  test('update(dt) reduces alpha over particle lifetime', () => {
    pool.emit(0, 0, 1, {life: 1});

    const p = pool._pool.find((pp) => pp.active);
    expect(p.alpha).toBe(1);

    pool.update(0.5);

    // Alpha = life / maxLife = 0.5 / 1 = 0.5
    expect(p.alpha).toBeCloseTo(0.5, 1);
  });

  // ---------- render(ctx) ----------

  test('render(ctx) calls canvas draw methods for active particles', () => {
    const ctx = createMockCtx();

    pool.emit(100, 100, 3, {shape: 'circle', life: 2});
    pool.render(ctx);

    // save/restore called once per active particle
    expect(ctx.save).toHaveBeenCalledTimes(3);
    expect(ctx.restore).toHaveBeenCalledTimes(3);
    expect(ctx.translate).toHaveBeenCalledTimes(3);
    expect(ctx.rotate).toHaveBeenCalledTimes(3);

    // Circles use beginPath + arc + fill
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test('render(ctx) does not draw inactive particles', () => {
    const ctx = createMockCtx();

    // Don't emit anything
    pool.render(ctx);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.restore).not.toHaveBeenCalled();
  });

  test('render(ctx) draws square-shaped particles with fillRect', () => {
    const ctx = createMockCtx();

    pool.emit(50, 50, 2, {shape: 'square', life: 2});
    pool.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test('render(ctx) draws confetti-shaped particles with fillRect', () => {
    const ctx = createMockCtx();

    pool.emit(50, 50, 2, {shape: 'confetti', life: 2});
    pool.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test('render(ctx) draws star-shaped particles', () => {
    const ctx = createMockCtx();

    pool.emit(50, 50, 2, {shape: 'star', life: 2});
    pool.render(ctx);

    // Stars use beginPath + moveTo + lineTo + closePath + fill
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  // ---------- reset() ----------

  test('reset() deactivates all particles', () => {
    pool.emit(0, 0, 50, {life: 10});
    expect(pool.activeCount).toBe(50);

    pool.reset();

    expect(pool.activeCount).toBe(0);
  });

  test('reset() allows the pool to emit new particles again', () => {
    pool.emit(0, 0, 200);
    expect(pool.activeCount).toBe(200);

    // Pool is full -- no more can be emitted
    expect(pool.emit(0, 0, 5)).toBe(0);

    pool.reset();

    // Now the pool should be available
    const emitted = pool.emit(0, 0, 5);
    expect(emitted).toBe(5);
    expect(pool.activeCount).toBe(5);
  });

  // ---------- Pool recycling (no GC) ----------

  test('pool recycles particle objects instead of creating new ones', () => {
    // Grab references to the original pool objects
    const originalRefs = pool._pool.map((p) => p);

    // Emit, expire, emit again
    pool.emit(0, 0, 10, {life: 0.1});
    pool.update(0.2); // all expire
    expect(pool.activeCount).toBe(0);

    pool.emit(10, 10, 5, {life: 1});
    expect(pool.activeCount).toBe(5);

    // The pool array should still contain the same object references
    pool._pool.forEach((p, i) => {
      expect(p).toBe(originalRefs[i]);
    });
  });

  test('pool length never changes after construction', () => {
    expect(pool._pool).toHaveLength(200);

    pool.emit(0, 0, 100);
    expect(pool._pool).toHaveLength(200);

    pool.update(5);
    expect(pool._pool).toHaveLength(200);

    pool.reset();
    expect(pool._pool).toHaveLength(200);
  });

  // ---------- Static presets ----------

  test('confettiBurst returns a valid preset config', () => {
    const preset = ParticlePool.confettiBurst(100, 200, 30);

    expect(preset).toHaveProperty('x', 100);
    expect(preset).toHaveProperty('y', 200);
    expect(preset).toHaveProperty('count', 30);
    expect(preset).toHaveProperty('options');
    expect(preset.options).toHaveProperty('shape', 'confetti');
    expect(preset.options).toHaveProperty('colorArray');
    expect(Array.isArray(preset.options.colorArray)).toBe(true);
    expect(preset.options.gravity).toBeGreaterThan(0);
  });

  test('sparkleBurst returns a valid preset config', () => {
    const preset = ParticlePool.sparkleBurst(50, 60, 20);

    expect(preset).toHaveProperty('x', 50);
    expect(preset).toHaveProperty('y', 60);
    expect(preset).toHaveProperty('count', 20);
    expect(preset.options).toHaveProperty('shape', 'star');
    expect(preset.options).toHaveProperty('colorArray');
    expect(Array.isArray(preset.options.colorArray)).toBe(true);
  });

  test('popExplosion returns a valid preset config', () => {
    const preset = ParticlePool.popExplosion(0, 0, 15);

    expect(preset).toHaveProperty('x', 0);
    expect(preset).toHaveProperty('y', 0);
    expect(preset).toHaveProperty('count', 15);
    expect(preset.options).toHaveProperty('shape', 'circle');
    expect(preset.options).toHaveProperty('colorArray');
    expect(Array.isArray(preset.options.colorArray)).toBe(true);
  });

  test('splashEffect returns a valid preset config', () => {
    const preset = ParticlePool.splashEffect(10, 20, 12);

    expect(preset).toHaveProperty('x', 10);
    expect(preset).toHaveProperty('y', 20);
    expect(preset).toHaveProperty('count', 12);
    expect(preset.options).toHaveProperty('shape', 'circle');
    expect(preset.options).toHaveProperty('gravity');
    expect(preset.options.gravity).toBeGreaterThan(0);
  });

  test('trailParticle returns a valid preset config', () => {
    const preset = ParticlePool.trailParticle(5, 5);

    expect(preset).toHaveProperty('x', 5);
    expect(preset).toHaveProperty('y', 5);
    expect(preset).toHaveProperty('count', 1);
    expect(preset.options).toHaveProperty('shape', 'circle');
  });

  test('presets use default count when not specified', () => {
    expect(ParticlePool.confettiBurst(0, 0).count).toBe(30);
    expect(ParticlePool.sparkleBurst(0, 0).count).toBe(20);
    expect(ParticlePool.popExplosion(0, 0).count).toBe(15);
    expect(ParticlePool.splashEffect(0, 0).count).toBe(12);
  });

  // ---------- emitPreset() ----------

  test('emitPreset() emits particles from a static preset', () => {
    const preset = ParticlePool.confettiBurst(100, 200, 10);
    const emitted = pool.emitPreset(preset);

    expect(emitted).toBe(10);
    expect(pool.activeCount).toBe(10);
  });

  test('emitPreset() places particles at the preset coordinates', () => {
    const preset = ParticlePool.sparkleBurst(77, 88, 3);
    pool.emitPreset(preset);

    const active = pool._pool.filter((p) => p.active);
    active.forEach((p) => {
      expect(p.x).toBe(77);
      expect(p.y).toBe(88);
    });
  });
});
