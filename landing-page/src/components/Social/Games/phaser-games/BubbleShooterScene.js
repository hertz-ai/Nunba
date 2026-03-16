import Phaser from 'phaser';

const COLORS = [0xff6b6b, 0x6c63ff, 0x2ecc71, 0xffab00, 0x00b8d9, 0xff69b4];
const BG_COLOR = 0x0f0e17;
const BUBBLE_RADIUS = 16;
const COLS = 12;
const ROWS_INITIAL = 6;
const SHOOT_SPEED = 600;

export default class BubbleShooterScene extends Phaser.Scene {
  constructor() {
    super({key: 'BubbleShooterScene'});
  }

  create() {
    const bridge = this.registry.get('nunbaBridge');
    const config = bridge ? bridge.getConfig() : {};

    this.cameras.main.setBackgroundColor(BG_COLOR);

    this.score = 0;
    this.lives = config.lives || 5;
    this.shotCount = 0;
    this.gameOver = false;
    this.isShooting = false;

    const w = this.scale.width;
    const h = this.scale.height;

    this.gridOffsetX = (w - COLS * BUBBLE_RADIUS * 2) / 2 + BUBBLE_RADIUS;
    this.gridOffsetY = BUBBLE_RADIUS + 10;

    // Grid: each cell holds { graphics, colorIndex } or null
    this.grid = [];
    for (let row = 0; row < 20; row++) {
      this.grid[row] = [];
      for (let col = 0; col < COLS; col++) {
        this.grid[row][col] = null;
      }
    }

    // Fill initial rows
    for (let row = 0; row < ROWS_INITIAL; row++) {
      for (let col = 0; col < COLS; col++) {
        this._addBubbleToGrid(
          row,
          col,
          Phaser.Math.Between(0, COLORS.length - 1)
        );
      }
    }

    // Cannon base
    this.cannonX = w / 2;
    this.cannonY = h - 40;
    this.cannonLine = this.add.graphics();

    // Aim line
    this.aimAngle = -Math.PI / 2;

    // Current bubble to shoot
    this._prepareNextBubble();

    // Score text
    this.scoreText = this.add.text(10, h - 30, 'Score: 0', {
      fontSize: '16px',
      color: '#FFFFFF',
    });

    this.livesText = this.add.text(w - 100, h - 30, `Lives: ${this.lives}`, {
      fontSize: '16px',
      color: '#FF6B6B',
    });

    // Input
    this.input.on('pointermove', (pointer) => {
      if (this.gameOver || this.isShooting) return;
      const dx = pointer.x - this.cannonX;
      const dy = pointer.y - this.cannonY;
      this.aimAngle = Math.atan2(dy, dx);
      // Clamp to shoot upward only
      if (this.aimAngle > -0.1) this.aimAngle = -0.1;
      if (this.aimAngle < -Math.PI + 0.1) this.aimAngle = -Math.PI + 0.1;
    });

    this.input.on('pointerdown', () => {
      if (this.gameOver || this.isShooting) return;
      this._shoot();
    });
  }

  _gridToWorld(row, col) {
    const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
    const x = this.gridOffsetX + col * BUBBLE_RADIUS * 2 + offset;
    const y = this.gridOffsetY + row * BUBBLE_RADIUS * 1.75;
    return {x, y};
  }

  _worldToGrid(x, y) {
    const row = Math.round((y - this.gridOffsetY) / (BUBBLE_RADIUS * 1.75));
    const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
    const col = Math.round(
      (x - this.gridOffsetX - offset) / (BUBBLE_RADIUS * 2)
    );
    return {
      row: Phaser.Math.Clamp(row, 0, 19),
      col: Phaser.Math.Clamp(col, 0, COLS - 1),
    };
  }

  _addBubbleToGrid(row, col, colorIndex) {
    if (row < 0 || row >= 20 || col < 0 || col >= COLS) return;
    const pos = this._gridToWorld(row, col);
    const g = this.add.graphics();
    g.fillStyle(COLORS[colorIndex], 1);
    g.fillCircle(0, 0, BUBBLE_RADIUS - 1);
    g.setPosition(pos.x, pos.y);
    this.grid[row][col] = {graphics: g, colorIndex};
  }

  _prepareNextBubble() {
    this.currentColorIndex = Phaser.Math.Between(0, COLORS.length - 1);
    if (this.currentBubbleGraphics) {
      this.currentBubbleGraphics.destroy();
    }
    this.currentBubbleGraphics = this.add.graphics();
    this.currentBubbleGraphics.fillStyle(COLORS[this.currentColorIndex], 1);
    this.currentBubbleGraphics.fillCircle(0, 0, BUBBLE_RADIUS - 1);
    this.currentBubbleGraphics.setPosition(this.cannonX, this.cannonY);
  }

  _shoot() {
    this.isShooting = true;
    const vx = Math.cos(this.aimAngle) * SHOOT_SPEED;
    const vy = Math.sin(this.aimAngle) * SHOOT_SPEED;

    const bullet = {
      x: this.cannonX,
      y: this.cannonY,
      vx,
      vy,
      colorIndex: this.currentColorIndex,
      graphics: this.currentBubbleGraphics,
    };

    this.currentBubbleGraphics = null;
    this.activeBullet = bullet;
    this.shotCount++;
  }

  _snapBullet(bullet) {
    const {row, col} = this._worldToGrid(bullet.x, bullet.y);

    // Find nearest empty cell
    let targetRow = row;
    let targetCol = col;
    if (this.grid[targetRow] && this.grid[targetRow][targetCol]) {
      // Find nearest empty neighbor
      const neighbors = this._getNeighbors(targetRow, targetCol);
      let found = false;
      for (const [nr, nc] of neighbors) {
        if (
          nr >= 0 &&
          nr < 20 &&
          nc >= 0 &&
          nc < COLS &&
          (!this.grid[nr] || !this.grid[nr][nc])
        ) {
          targetRow = nr;
          targetCol = nc;
          found = true;
          break;
        }
      }
      if (!found) {
        targetRow = Math.min(row + 1, 19);
        targetCol = col;
      }
    }

    bullet.graphics.destroy();
    this._addBubbleToGrid(targetRow, targetCol, bullet.colorIndex);

    // Check matches via BFS
    const matched = this._findMatches(targetRow, targetCol, bullet.colorIndex);
    if (matched.length >= 3) {
      let popped = 0;
      for (const [mr, mc] of matched) {
        if (this.grid[mr][mc]) {
          this.grid[mr][mc].graphics.destroy();
          this.grid[mr][mc] = null;
          popped++;
        }
      }

      // Remove dangling bubbles
      const dangling = this._findDangling();
      for (const [dr, dc] of dangling) {
        if (this.grid[dr][dc]) {
          this.grid[dr][dc].graphics.destroy();
          this.grid[dr][dc] = null;
          popped++;
        }
      }

      this.score += popped * 10;
      this.scoreText.setText(`Score: ${this.score}`);
      const bridge = this.registry.get('nunbaBridge');
      if (bridge) bridge.onScoreUpdate(this.score);
    }

    // Add new row every 10 shots
    if (this.shotCount % 10 === 0) {
      this._addNewRow();
    }

    // Check game over: bubbles in bottom rows
    if (this._checkGameOver()) {
      this._endGame();
      return;
    }

    this.isShooting = false;
    this._prepareNextBubble();
  }

  _getNeighbors(row, col) {
    const even = row % 2 === 0;
    if (even) {
      return [
        [row - 1, col - 1],
        [row - 1, col],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col - 1],
        [row + 1, col],
      ];
    } else {
      return [
        [row - 1, col],
        [row - 1, col + 1],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col],
        [row + 1, col + 1],
      ];
    }
  }

  _findMatches(row, col, colorIndex) {
    const visited = new Set();
    const queue = [[row, col]];
    const matches = [];
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
      const [cr, cc] = queue.shift();
      if (
        cr >= 0 &&
        cr < 20 &&
        cc >= 0 &&
        cc < COLS &&
        this.grid[cr] &&
        this.grid[cr][cc] &&
        this.grid[cr][cc].colorIndex === colorIndex
      ) {
        matches.push([cr, cc]);
        const neighbors = this._getNeighbors(cr, cc);
        for (const [nr, nc] of neighbors) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push([nr, nc]);
          }
        }
      }
    }
    return matches;
  }

  _findDangling() {
    // BFS from top row to find all connected bubbles
    const connected = new Set();
    const queue = [];

    for (let col = 0; col < COLS; col++) {
      if (this.grid[0] && this.grid[0][col]) {
        queue.push([0, col]);
        connected.add(`0,${col}`);
      }
    }

    while (queue.length > 0) {
      const [cr, cc] = queue.shift();
      const neighbors = this._getNeighbors(cr, cc);
      for (const [nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        if (
          !connected.has(key) &&
          nr >= 0 &&
          nr < 20 &&
          nc >= 0 &&
          nc < COLS &&
          this.grid[nr] &&
          this.grid[nr][nc]
        ) {
          connected.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    // Any bubble not connected is dangling
    const dangling = [];
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid[row][col] && !connected.has(`${row},${col}`)) {
          dangling.push([row, col]);
        }
      }
    }
    return dangling;
  }

  _addNewRow() {
    // Shift all rows down by 1
    for (let row = 19; row >= 1; row--) {
      for (let col = 0; col < COLS; col++) {
        this.grid[row][col] = this.grid[row - 1][col];
        if (this.grid[row][col]) {
          const pos = this._gridToWorld(row, col);
          this.grid[row][col].graphics.setPosition(pos.x, pos.y);
        }
      }
    }
    // Fill new top row
    for (let col = 0; col < COLS; col++) {
      this.grid[0][col] = null;
      this._addBubbleToGrid(0, col, Phaser.Math.Between(0, COLORS.length - 1));
    }
  }

  _checkGameOver() {
    const bottomRow = Math.floor(
      (this.scale.height - 80) / (BUBBLE_RADIUS * 1.75)
    );
    for (let row = bottomRow; row < 20; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid[row] && this.grid[row][col]) {
          return true;
        }
      }
    }
    return false;
  }

  _endGame() {
    this.gameOver = true;
    if (this.activeBullet) {
      this.activeBullet.graphics.destroy();
      this.activeBullet = null;
    }

    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this.add
      .text(w / 2, h / 2 - 20, 'GAME OVER', {
        fontSize: '32px',
        color: '#FF6B6B',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h / 2 + 20, `Score: ${this.score}`, {
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5);

    const bridge = this.registry.get('nunbaBridge');
    if (bridge) bridge.onGameComplete(this.score);
  }

  update(_time, delta) {
    if (this.gameOver) return;

    // Draw aim line
    this.cannonLine.clear();
    if (!this.isShooting) {
      this.cannonLine.lineStyle(2, 0x6c63ff, 0.6);
      this.cannonLine.beginPath();
      this.cannonLine.moveTo(this.cannonX, this.cannonY);
      const lineLen = 80;
      this.cannonLine.lineTo(
        this.cannonX + Math.cos(this.aimAngle) * lineLen,
        this.cannonY + Math.sin(this.aimAngle) * lineLen
      );
      this.cannonLine.strokePath();
    }

    // Move active bullet
    if (this.activeBullet) {
      const dt = delta / 1000;
      this.activeBullet.x += this.activeBullet.vx * dt;
      this.activeBullet.y += this.activeBullet.vy * dt;

      // Bounce off walls
      const w = this.scale.width;
      if (this.activeBullet.x <= BUBBLE_RADIUS) {
        this.activeBullet.x = BUBBLE_RADIUS;
        this.activeBullet.vx *= -1;
      }
      if (this.activeBullet.x >= w - BUBBLE_RADIUS) {
        this.activeBullet.x = w - BUBBLE_RADIUS;
        this.activeBullet.vx *= -1;
      }

      this.activeBullet.graphics.setPosition(
        this.activeBullet.x,
        this.activeBullet.y
      );

      // Hit top
      if (this.activeBullet.y <= BUBBLE_RADIUS) {
        this._snapBullet(this.activeBullet);
        this.activeBullet = null;
        return;
      }

      // Collision with existing bubbles
      let hit = false;
      for (let row = 0; row < 20 && !hit; row++) {
        for (let col = 0; col < COLS && !hit; col++) {
          if (this.grid[row][col]) {
            const pos = this._gridToWorld(row, col);
            const dist = Phaser.Math.Distance.Between(
              this.activeBullet.x,
              this.activeBullet.y,
              pos.x,
              pos.y
            );
            if (dist < BUBBLE_RADIUS * 2) {
              this._snapBullet(this.activeBullet);
              this.activeBullet = null;
              hit = true;
            }
          }
        }
      }
    }
  }
}
