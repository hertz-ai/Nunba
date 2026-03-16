import {
  drawRoundedRect,
  drawText,
  drawEmoji,
  drawCircle,
  drawStar,
  drawBalloon,
  drawHealthBar,
  drawHole,
  drawBlock,
  drawGate,
  drawButton,
  hitTestRect,
  hitTestCircle,
} from '../../../../../components/Social/KidsLearning/shared/CanvasSprites';

// ---------------------------------------------------------------------------
// Mock kidsTheme
// ---------------------------------------------------------------------------
jest.mock('../../../../../components/Social/KidsLearning/kidsTheme', () => ({
  kidsColors: {
    primary: '#6C5CE7',
    cardBg: '#FFFFFF',
    accent: '#FF6B35',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C8D',
    star: '#FFD700',
    starFilled: '#FFD700',
    starEmpty: '#E0E0E0',
    correct: '#2ECC71',
    incorrect: '#E74C3C',
    error: '#E74C3C',
    border: '#E0E0E0',
    surfaceLight: '#F7F5FF',
  },
}));

// ---------------------------------------------------------------------------
// Mock canvas 2D context factory
// ---------------------------------------------------------------------------
function createMockCtx() {
  return {
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arcTo: jest.fn(),
    arc: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
    fillRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanvasSprites - drawing functions', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  // ---------- drawRoundedRect ----------

  describe('drawRoundedRect', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawRoundedRect(ctx, 10, 20, 100, 50, 8, '#FFF', null, 0);
      }).not.toThrow();

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });

    test('applies fill color', () => {
      drawRoundedRect(ctx, 0, 0, 80, 40, 4, '#FF0000');

      expect(ctx.fill).toHaveBeenCalled();
    });

    test('applies optional stroke when strokeColor and strokeWidth are given', () => {
      drawRoundedRect(ctx, 0, 0, 80, 40, 4, '#FFF', '#000', 2);

      expect(ctx.stroke).toHaveBeenCalled();
    });

    test('does not stroke when strokeColor is null', () => {
      drawRoundedRect(ctx, 0, 0, 80, 40, 4, '#FFF', null, 0);

      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    test('does not fill when fillColor is null/falsy', () => {
      drawRoundedRect(ctx, 0, 0, 80, 40, 4, null);

      expect(ctx.fill).not.toHaveBeenCalled();
    });

    test('uses arcTo for rounded corners', () => {
      drawRoundedRect(ctx, 0, 0, 100, 60, 10, '#FFF');

      // 4 corners = 4 arcTo calls
      expect(ctx.arcTo).toHaveBeenCalledTimes(4);
    });
  });

  // ---------- drawCircle ----------

  describe('drawCircle', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawCircle(ctx, 50, 50, 25, '#FF0000');
      }).not.toThrow();

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('applies optional stroke', () => {
      drawCircle(ctx, 50, 50, 25, '#FF0000', '#000', 3);

      expect(ctx.stroke).toHaveBeenCalled();
    });

    test('does not stroke when strokeColor is null', () => {
      drawCircle(ctx, 50, 50, 25, '#FF0000', null, 0);

      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  // ---------- drawStar ----------

  describe('drawStar', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawStar(ctx, 100, 100, 20, 10, 5, '#FFD700');
      }).not.toThrow();

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('draws correct number of points (moveTo + lineTo calls)', () => {
      drawStar(ctx, 100, 100, 20, 10, 5, '#FFD700');

      // 5-pointed star: 10 vertices total, 1 moveTo + 9 lineTo
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(9);
    });

    test('applies optional stroke', () => {
      drawStar(ctx, 100, 100, 20, 10, 5, '#FFD700', '#AA0000');

      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  // ---------- drawBalloon ----------

  describe('drawBalloon', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawBalloon(ctx, 100, 100, 30, '#FF0000', 40);
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.ellipse).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('draws the balloon string with quadraticCurveTo', () => {
      drawBalloon(ctx, 100, 100, 30, '#FF0000', 40);

      expect(ctx.quadraticCurveTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  // ---------- drawHealthBar ----------

  describe('drawHealthBar', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawHealthBar(ctx, 10, 10, 200, 20, 75);
      }).not.toThrow();

      // Draws background and foreground rounded rects
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('draws only background track when percent is 0', () => {
      drawHealthBar(ctx, 10, 10, 200, 20, 0);

      // beginPath called once for background rect only
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('clamps percent to 0-100 range', () => {
      expect(() => {
        drawHealthBar(ctx, 0, 0, 100, 10, -20);
      }).not.toThrow();

      expect(() => {
        drawHealthBar(ctx, 0, 0, 100, 10, 150);
      }).not.toThrow();
    });
  });

  // ---------- drawHole ----------

  describe('drawHole', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawHole(ctx, 100, 100, 30);
      }).not.toThrow();

      expect(ctx.createRadialGradient).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('draws rim highlight stroke', () => {
      drawHole(ctx, 100, 100, 30);

      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  // ---------- drawBlock ----------

  describe('drawBlock', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawBlock(ctx, 10, 20, 80, 40, '#6C5CE7', 'ABC', 16);
      }).not.toThrow();

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('renders label text when provided', () => {
      drawBlock(ctx, 10, 20, 80, 40, '#6C5CE7', 'Hello');

      expect(ctx.fillText).toHaveBeenCalledWith(
        'Hello',
        10 + 80 / 2,
        20 + 40 / 2
      );
    });

    test('does not render text when label is empty', () => {
      drawBlock(ctx, 10, 20, 80, 40, '#6C5CE7', '');

      // fillText should not have been called (fill is for the rect shape)
      expect(ctx.fillText).not.toHaveBeenCalled();
    });
  });

  // ---------- drawGate ----------

  describe('drawGate', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawGate(ctx, 0, 0, 100, 60);
      }).not.toThrow();

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('renders label text when provided', () => {
      drawGate(ctx, 0, 0, 100, 60, '#FFF', 'Gate');

      expect(ctx.fillText).toHaveBeenCalledWith('Gate', 50, 30);
    });
  });

  // ---------- drawButton ----------

  describe('drawButton', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawButton(ctx, 20, 30, 120, 40, 'Click Me', '#6C5CE7', 18);
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    test('renders button label text', () => {
      drawButton(ctx, 20, 30, 120, 40, 'Play');

      expect(ctx.fillText).toHaveBeenCalledWith(
        'Play',
        20 + 120 / 2,
        30 + 40 / 2
      );
    });

    test('does not render text when label is empty', () => {
      drawButton(ctx, 20, 30, 120, 40, '');

      expect(ctx.fillText).not.toHaveBeenCalled();
    });
  });

  // ---------- drawText ----------

  describe('drawText', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawText(ctx, 'Hello World', 100, 200);
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith('Hello World', 100, 200);
    });

    test('handles fontSize option', () => {
      drawText(ctx, 'Big', 50, 50, {fontSize: 32});

      expect(ctx.font).toContain('32px');
    });

    test('handles fontWeight option', () => {
      drawText(ctx, 'Light', 50, 50, {fontWeight: '300'});

      expect(ctx.font).toContain('300');
    });

    test('handles color option', () => {
      drawText(ctx, 'Red', 50, 50, {color: '#FF0000'});

      expect(ctx.fillStyle).toBe('#FF0000');
    });

    test('handles align option', () => {
      drawText(ctx, 'Left', 50, 50, {align: 'left'});

      expect(ctx.textAlign).toBe('left');
    });

    test('handles baseline option', () => {
      drawText(ctx, 'Top', 50, 50, {baseline: 'top'});

      expect(ctx.textBaseline).toBe('top');
    });

    test('uses default options when none provided', () => {
      drawText(ctx, 'Default', 10, 20);

      expect(ctx.fillText).toHaveBeenCalledWith('Default', 10, 20);
      expect(ctx.textAlign).toBe('center');
      expect(ctx.textBaseline).toBe('middle');
      expect(ctx.font).toContain('bold');
      expect(ctx.font).toContain('16px');
    });
  });

  // ---------- drawEmoji ----------

  describe('drawEmoji', () => {
    test('calls ctx methods without throwing', () => {
      expect(() => {
        drawEmoji(ctx, '\u{1F60A}', 50, 50, 32);
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
    });

    test('sets font size from the size parameter', () => {
      drawEmoji(ctx, '\u{2B50}', 50, 50, 48);

      expect(ctx.font).toContain('48px');
    });

    test('centers the emoji text', () => {
      drawEmoji(ctx, '\u{1F680}', 100, 200, 32);

      expect(ctx.textAlign).toBe('center');
      expect(ctx.textBaseline).toBe('middle');
      expect(ctx.fillText).toHaveBeenCalledWith('\u{1F680}', 100, 200);
    });
  });
});

// ---------------------------------------------------------------------------
// Hit-testing
// ---------------------------------------------------------------------------

describe('CanvasSprites - hit test utilities', () => {
  // ---------- hitTestRect ----------

  describe('hitTestRect', () => {
    test('returns true for a point inside the rectangle', () => {
      // Rectangle at (10, 10) with width 100, height 50
      expect(hitTestRect(50, 30, 10, 10, 100, 50)).toBe(true);
    });

    test('returns true for a point on the edge of the rectangle', () => {
      expect(hitTestRect(10, 10, 10, 10, 100, 50)).toBe(true); // top-left corner
      expect(hitTestRect(110, 60, 10, 10, 100, 50)).toBe(true); // bottom-right corner
    });

    test('returns false for a point outside the rectangle', () => {
      expect(hitTestRect(5, 5, 10, 10, 100, 50)).toBe(false); // above-left
      expect(hitTestRect(200, 200, 10, 10, 100, 50)).toBe(false); // far away
      expect(hitTestRect(50, 70, 10, 10, 100, 50)).toBe(false); // below
    });

    test('returns false for a point just outside each edge', () => {
      // rect at (10, 10, 100, 50) => x: [10,110], y: [10,60]
      expect(hitTestRect(9, 30, 10, 10, 100, 50)).toBe(false); // left of rect
      expect(hitTestRect(111, 30, 10, 10, 100, 50)).toBe(false); // right of rect
      expect(hitTestRect(50, 9, 10, 10, 100, 50)).toBe(false); // above rect
      expect(hitTestRect(50, 61, 10, 10, 100, 50)).toBe(false); // below rect
    });
  });

  // ---------- hitTestCircle ----------

  describe('hitTestCircle', () => {
    test('returns true for a point inside the circle', () => {
      // Circle centered at (100, 100), radius 50
      expect(hitTestCircle(100, 100, 100, 100, 50)).toBe(true); // center
      expect(hitTestCircle(120, 110, 100, 100, 50)).toBe(true); // inside
    });

    test('returns true for a point exactly on the circumference', () => {
      // Point at (150, 100) is exactly on the edge: distance = 50 = radius
      expect(hitTestCircle(150, 100, 100, 100, 50)).toBe(true);
    });

    test('returns false for a point outside the circle', () => {
      expect(hitTestCircle(200, 200, 100, 100, 50)).toBe(false);
      expect(hitTestCircle(151, 100, 100, 100, 50)).toBe(false); // just past edge
    });

    test('works with zero-radius circle', () => {
      expect(hitTestCircle(0, 0, 0, 0, 0)).toBe(true); // point ON the center
      expect(hitTestCircle(1, 0, 0, 0, 0)).toBe(false); // one pixel away
    });

    test('handles negative coordinates', () => {
      expect(hitTestCircle(-5, -5, -10, -10, 10)).toBe(true);
      expect(hitTestCircle(100, 100, -10, -10, 10)).toBe(false);
    });
  });
});
