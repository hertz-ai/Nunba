/**
 * CanvasParticles - Pool-based particle system for canvas games
 *
 * Pre-allocates 200 particle objects at construction time.
 * Zero garbage collection during gameplay -- all particles are recycled
 * from the pool rather than created/destroyed.
 *
 * Supported shapes: 'circle', 'square', 'star', 'confetti'
 *
 * Usage:
 *   const pool = new ParticlePool();
 *   pool.emit(x, y, 10, { color: '#FF6B6B', shape: 'circle' });
 *   // in animation loop:
 *   pool.update(dt);
 *   pool.render(ctx);
 */

import {kidsColors} from '../kidsTheme';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_PARTICLES = 200;

const CONFETTI_COLORS = [
  kidsColors.red,
  kidsColors.blue,
  kidsColors.green,
  kidsColors.yellow,
  kidsColors.pink,
  kidsColors.purple,
  kidsColors.orange,
  kidsColors.teal,
];

const SPARKLE_COLORS = [
  kidsColors.star,
  kidsColors.starGlow,
  '#FFFFFF',
  kidsColors.yellow,
];

const POP_COLORS = [
  kidsColors.red,
  kidsColors.blue,
  kidsColors.green,
  kidsColors.purple,
  kidsColors.pink,
  kidsColors.orange,
  kidsColors.teal,
  kidsColors.yellow,
];

const SPLASH_COLORS = [
  kidsColors.blue,
  kidsColors.teal,
  kidsColors.accentSecondary,
  '#74B9FF',
  '#81ECEC',
];

const TWO_PI = Math.PI * 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return a random float in [min, max).
 */
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Pick a random element from an array.
 */
function pickRandom(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

// ─── Star path helper ────────────────────────────────────────────────────────

/**
 * Draw a 5-pointed star centred at (0, 0) with the given outer radius.
 * Inner radius is 40% of outer.
 */
function drawStar(ctx, radius) {
  const spikes = 5;
  const inner = radius * 0.4;
  const step = Math.PI / spikes;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : inner;
    const angle = i * step - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

// ─── ParticlePool ────────────────────────────────────────────────────────────

class ParticlePool {
  /**
   * Create a pool with `MAX_PARTICLES` pre-allocated particle objects.
   */
  constructor() {
    /** @type {Array<Object>} */
    this._pool = new Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._pool[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        color: '#FFFFFF',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
        friction: 1,
        shape: 'circle',
      };
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Count of currently active particles.
   * @returns {number}
   */
  get activeCount() {
    let count = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this._pool[i].active) count++;
    }
    return count;
  }

  /**
   * Activate `count` particles from the pool at position (x, y).
   *
   * @param {number} x        - Spawn x coordinate
   * @param {number} y        - Spawn y coordinate
   * @param {number} count    - Number of particles to emit
   * @param {Object} [options] - Per-particle overrides / ranges
   * @param {string}          [options.color]         - Fixed color (or use colorArray)
   * @param {string[]}        [options.colorArray]    - Pick random color per particle
   * @param {string}          [options.shape='circle']
   * @param {number}          [options.size=4]
   * @param {number}          [options.sizeMin]       - Random size lower bound
   * @param {number}          [options.sizeMax]       - Random size upper bound
   * @param {number}          [options.speed=100]     - Base radial speed
   * @param {number}          [options.speedMin]      - Random speed lower bound
   * @param {number}          [options.speedMax]      - Random speed upper bound
   * @param {number}          [options.angleMin=0]    - Emission angle range (radians)
   * @param {number}          [options.angleMax=TWO_PI]
   * @param {number}          [options.life=1]        - Lifetime in seconds
   * @param {number}          [options.lifeMin]       - Random lifetime lower bound
   * @param {number}          [options.lifeMax]       - Random lifetime upper bound
   * @param {number}          [options.gravity=0]
   * @param {number}          [options.friction=1]
   * @param {number}          [options.rotation=0]
   * @param {number}          [options.rotationSpeed=0]
   * @param {number}          [options.rotationSpeedMin]
   * @param {number}          [options.rotationSpeedMax]
   */
  emit(x, y, count, options = {}) {
    const {
      color = null,
      colorArray = null,
      shape = 'circle',
      size = 4,
      sizeMin = null,
      sizeMax = null,
      speed = 100,
      speedMin = null,
      speedMax = null,
      angleMin = 0,
      angleMax = TWO_PI,
      life = 1,
      lifeMin = null,
      lifeMax = null,
      gravity = 0,
      friction = 1,
      rotation = 0,
      rotationSpeed = 0,
      rotationSpeedMin = null,
      rotationSpeedMax = null,
    } = options;

    let emitted = 0;

    for (let i = 0; i < MAX_PARTICLES && emitted < count; i++) {
      const p = this._pool[i];
      if (p.active) continue;

      // Position
      p.x = x;
      p.y = y;

      // Velocity (radial)
      const angle = randRange(angleMin, angleMax);
      const spd =
        speedMin !== null && speedMax !== null
          ? randRange(speedMin, speedMax)
          : speed;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;

      // Lifetime
      const pLife =
        lifeMin !== null && lifeMax !== null
          ? randRange(lifeMin, lifeMax)
          : life;
      p.life = pLife;
      p.maxLife = pLife;

      // Size
      p.size =
        sizeMin !== null && sizeMax !== null
          ? randRange(sizeMin, sizeMax)
          : size;

      // Color
      if (colorArray && colorArray.length > 0) {
        p.color = pickRandom(colorArray);
      } else if (color) {
        p.color = color;
      } else {
        p.color = '#FFFFFF';
      }

      // Appearance
      p.alpha = 1;
      p.shape = shape;
      p.gravity = gravity;
      p.friction = friction;

      // Rotation
      p.rotation = rotation;
      p.rotationSpeed =
        rotationSpeedMin !== null && rotationSpeedMax !== null
          ? randRange(rotationSpeedMin, rotationSpeedMax)
          : rotationSpeed;

      p.active = true;
      emitted++;
    }

    return emitted;
  }

  /**
   * Advance all active particles by `dt` seconds.
   * Particles whose life reaches 0 are deactivated (returned to pool).
   *
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this._pool[i];
      if (!p.active) continue;

      // Reduce life
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      // Physics
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.friction, dt);
      p.vy *= Math.pow(p.friction, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Rotation
      p.rotation += p.rotationSpeed * dt;

      // Alpha fades linearly over lifetime
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  /**
   * Draw all active particles to the given canvas 2D context.
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this._pool[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, TWO_PI);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;

        case 'square':
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
          break;

        case 'star':
          drawStar(ctx, p.size);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;

        case 'confetti': {
          // Confetti is a thin rectangle that tumbles
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
          break;
        }

        default:
          // Fallback to circle
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, TWO_PI);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  /**
   * Deactivate all particles, returning them to the pool.
   */
  reset() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._pool[i].active = false;
    }
  }

  // ── Static Preset Factories ──────────────────────────────────────────────

  /**
   * Multicolor confetti squares tumbling downward with gravity.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} [count=30]
   * @returns {Object} options object for emit()
   */
  static confettiBurst(x, y, count = 30) {
    return {
      x,
      y,
      count,
      options: {
        colorArray: CONFETTI_COLORS,
        shape: 'confetti',
        sizeMin: 3,
        sizeMax: 7,
        speedMin: 80,
        speedMax: 250,
        angleMin: -Math.PI,
        angleMax: 0, // upward hemisphere then gravity pulls down
        lifeMin: 1.0,
        lifeMax: 2.5,
        gravity: 350,
        friction: 0.97,
        rotationSpeedMin: -8,
        rotationSpeedMax: 8,
      },
    };
  }

  /**
   * Gold / white tiny circles radiating outward.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} [count=20]
   * @returns {Object}
   */
  static sparkleBurst(x, y, count = 20) {
    return {
      x,
      y,
      count,
      options: {
        colorArray: SPARKLE_COLORS,
        shape: 'star',
        sizeMin: 2,
        sizeMax: 5,
        speedMin: 60,
        speedMax: 200,
        angleMin: 0,
        angleMax: TWO_PI,
        lifeMin: 0.4,
        lifeMax: 1.0,
        gravity: 0,
        friction: 0.92,
        rotationSpeedMin: -4,
        rotationSpeedMax: 4,
      },
    };
  }

  /**
   * Circular burst outward with various bright colors.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} [count=15]
   * @returns {Object}
   */
  static popExplosion(x, y, count = 15) {
    return {
      x,
      y,
      count,
      options: {
        colorArray: POP_COLORS,
        shape: 'circle',
        sizeMin: 3,
        sizeMax: 8,
        speedMin: 100,
        speedMax: 300,
        angleMin: 0,
        angleMax: TWO_PI,
        lifeMin: 0.5,
        lifeMax: 1.2,
        gravity: 60,
        friction: 0.95,
        rotationSpeed: 0,
      },
    };
  }

  /**
   * Upward splash arc with gravity pulling particles back down.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} [count=12]
   * @returns {Object}
   */
  static splashEffect(x, y, count = 12) {
    return {
      x,
      y,
      count,
      options: {
        colorArray: SPLASH_COLORS,
        shape: 'circle',
        sizeMin: 2,
        sizeMax: 6,
        speedMin: 120,
        speedMax: 280,
        angleMin: -Math.PI * 0.85, // mostly upward
        angleMax: -Math.PI * 0.15,
        lifeMin: 0.6,
        lifeMax: 1.4,
        gravity: 400,
        friction: 0.96,
        rotationSpeed: 0,
      },
    };
  }

  /**
   * Single small trailing particle that fades quickly.
   * Useful for mouse / touch trails.
   *
   * @param {number} x
   * @param {number} y
   * @returns {Object}
   */
  static trailParticle(x, y) {
    return {
      x,
      y,
      count: 1,
      options: {
        color: kidsColors.star,
        shape: 'circle',
        sizeMin: 1.5,
        sizeMax: 3.5,
        speedMin: 10,
        speedMax: 40,
        angleMin: 0,
        angleMax: TWO_PI,
        lifeMin: 0.15,
        lifeMax: 0.35,
        gravity: 0,
        friction: 0.85,
        rotationSpeed: 0,
      },
    };
  }

  // ── Convenience: emit from a preset ──────────────────────────────────────

  /**
   * Helper to emit particles using one of the static preset descriptors.
   *
   *   const preset = ParticlePool.confettiBurst(100, 200);
   *   pool.emitPreset(preset);
   *
   * @param {{ x: number, y: number, count: number, options: Object }} preset
   * @returns {number} Number of particles actually activated
   */
  emitPreset(preset) {
    return this.emit(preset.x, preset.y, preset.count, preset.options);
  }
}

export default ParticlePool;
