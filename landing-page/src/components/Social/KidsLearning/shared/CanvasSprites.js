/**
 * CanvasSprites.js
 *
 * Canvas drawing helpers for kids games.
 * Every draw function takes a CanvasRenderingContext2D `ctx` as its first
 * argument, followed by shape-specific parameters.
 *
 * Colors default to values from kidsTheme where appropriate.
 */

import {kidsColors} from '../kidsTheme';

// ─── Primitive Shapes ────────────────────────────────────────────────────────

/**
 * Draw a rectangle with rounded corners.
 */
export function drawRoundedRect(
  ctx,
  x,
  y,
  w,
  h,
  radius = 8,
  fillColor = kidsColors.cardBg || '#FFFFFF',
  strokeColor = null,
  strokeWidth = 0
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/**
 * Draw a filled / stroked circle.
 */
export function drawCircle(
  ctx,
  x,
  y,
  radius,
  fillColor = kidsColors.primary || '#6C5CE7',
  strokeColor = null,
  strokeWidth = 0
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

// ─── Decorative Shapes ───────────────────────────────────────────────────────

/**
 * Draw a multi-pointed star.
 *
 * @param {number} points  Number of outer points (default 5).
 */
export function drawStar(
  ctx,
  cx,
  cy,
  outerR,
  innerR,
  points = 5,
  fillColor = kidsColors.star || kidsColors.starFilled || '#FFD700',
  strokeColor = null
) {
  const step = Math.PI / points;

  ctx.beginPath();
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + i * step;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Draw a balloon with an oval body, small triangular knot and a hanging string.
 */
export function drawBalloon(
  ctx,
  cx,
  cy,
  radius,
  color = kidsColors.accent || '#FF6B35',
  stringLength = 40
) {
  ctx.save();

  // --- Oval balloon body ---
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 0.85, radius, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Highlight / shine
  ctx.beginPath();
  ctx.ellipse(
    cx - radius * 0.25,
    cy - radius * 0.35,
    radius * 0.2,
    radius * 0.3,
    -Math.PI / 6,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();

  // --- Triangular knot at bottom ---
  const knotTop = cy + radius;
  const knotSize = radius * 0.18;
  ctx.beginPath();
  ctx.moveTo(cx, knotTop);
  ctx.lineTo(cx - knotSize, knotTop + knotSize * 1.6);
  ctx.lineTo(cx + knotSize, knotTop + knotSize * 1.6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // --- String ---
  const stringStart = knotTop + knotSize * 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, stringStart);
  ctx.quadraticCurveTo(
    cx + radius * 0.3,
    stringStart + stringLength * 0.5,
    cx,
    stringStart + stringLength
  );
  ctx.strokeStyle = kidsColors.textSecondary || '#7F8C8D';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ─── Game UI Elements ────────────────────────────────────────────────────────

/**
 * Draw a horizontal health / progress bar with rounded ends.
 *
 * @param {number} percent  0-100
 */
export function drawHealthBar(
  ctx,
  x,
  y,
  width,
  height,
  percent,
  bgColor = kidsColors.starEmpty || '#E0E0E0',
  fgColor = kidsColors.correct || '#2ECC71'
) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = height / 2;

  // Background track
  drawRoundedRect(ctx, x, y, width, height, r, bgColor);

  // Foreground fill
  const fillWidth = (width * clamped) / 100;
  if (fillWidth > 0) {
    drawRoundedRect(ctx, x, y, Math.max(fillWidth, height), height, r, fgColor);
  }
}

/**
 * Draw a dark circular hole with a radial gradient (for whack-a-mole style games).
 */
export function drawHole(ctx, cx, cy, radius) {
  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    radius * 0.15,
    cx,
    cy,
    radius
  );
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.7, '#2d2d44');
  gradient.addColorStop(1, '#3d3d5c');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Subtle rim highlight
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Draw a colored block with a centered text label (for block-breaker / matching games).
 */
export function drawBlock(
  ctx,
  x,
  y,
  w,
  h,
  color = kidsColors.primary || '#6C5CE7',
  label = '',
  fontSize = 16
) {
  drawRoundedRect(ctx, x, y, w, h, 8, color);

  if (label) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px "Nunito", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
}

/**
 * Draw a rectangular gate with a label and a colored border that turns green
 * (correct) or red (incorrect).
 */
export function drawGate(
  ctx,
  x,
  y,
  w,
  h,
  color = kidsColors.surfaceLight || '#F7F5FF',
  label = '',
  isCorrect = null
) {
  // Determine border color based on correctness
  let borderColor = kidsColors.border || '#E0E0E0';
  if (isCorrect === true) {
    borderColor = kidsColors.correct || '#2ECC71';
  } else if (isCorrect === false) {
    borderColor = kidsColors.incorrect || kidsColors.error || '#E74C3C';
  }

  drawRoundedRect(ctx, x, y, w, h, 10, color, borderColor, 3);

  if (label) {
    ctx.fillStyle = kidsColors.textPrimary || '#2C3E50';
    ctx.font = `bold 16px "Nunito", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
}

/**
 * Draw a rounded-rect button with a slight drop shadow and centered label.
 */
export function drawButton(
  ctx,
  x,
  y,
  w,
  h,
  label = '',
  color = kidsColors.primary || '#6C5CE7',
  fontSize = 18
) {
  ctx.save();

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  drawRoundedRect(ctx, x, y, w, h, 12, color);

  // Reset shadow so text is not blurred
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (label) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px "Nunito", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  ctx.restore();
}

// ─── Text Helpers ────────────────────────────────────────────────────────────

/**
 * Draw text with configurable style options.
 */
export function drawText(
  ctx,
  text,
  x,
  y,
  {
    fontSize = 16,
    fontWeight = 'bold',
    color = kidsColors.textPrimary || '#333',
    align = 'center',
    baseline = 'middle',
  } = {}
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${fontWeight} ${fontSize}px "Nunito", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draw an emoji character at the given position.
 */
export function drawEmoji(ctx, emoji, x, y, size = 32) {
  ctx.save();
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
  ctx.restore();
}

// ─── Hit-Testing Utilities ───────────────────────────────────────────────────

/**
 * Returns true if the point (x, y) is inside the axis-aligned rectangle
 * defined by (rx, ry, rw, rh).
 */
export function hitTestRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

/**
 * Returns true if the point (x, y) is inside the circle at (cx, cy) with
 * the given radius.
 */
export function hitTestCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}
