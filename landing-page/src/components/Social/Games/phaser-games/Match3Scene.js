import Phaser from 'phaser';

const BG_COLOR = 0x0f0e17;
const GEM_COLORS = [0xff6b6b, 0x6c63ff, 0x2ecc71, 0xffab00, 0x00b8d9, 0xff69b4];
const GRID_SIZE = 8;
const GEM_SIZE = 36;
const GEM_PADDING = 4;
const CELL_SIZE = GEM_SIZE + GEM_PADDING;
const ANIMATION_SPEED = 150;

export default class Match3Scene extends Phaser.Scene {
  constructor() {
    super({key: 'Match3Scene'});
  }

  create() {
    const bridge = this.registry.get('nunbaBridge');
    const config = bridge ? bridge.getConfig() : {};

    this.cameras.main.setBackgroundColor(BG_COLOR);

    const w = this.scale.width;
    const h = this.scale.height;

    this.score = 0;
    this.comboMultiplier = 1;
    this.selectedGem = null;
    this.isAnimating = false;
    this.gameOver = false;
    this.timeLimit = (config.timeLimit || 120) * 1000;
    this.timeRemaining = this.timeLimit;

    // Center the grid
    this.gridOffsetX = (w - GRID_SIZE * CELL_SIZE) / 2;
    this.gridOffsetY = (h - GRID_SIZE * CELL_SIZE) / 2 + 20;

    // Grid border
    const borderG = this.add.graphics();
    borderG.lineStyle(2, 0x6c63ff, 0.4);
    borderG.strokeRect(
      this.gridOffsetX - 4,
      this.gridOffsetY - 4,
      GRID_SIZE * CELL_SIZE + 8,
      GRID_SIZE * CELL_SIZE + 8
    );

    // Initialize grid: grid[row][col] = { colorIndex, graphics }
    this.grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const colorIndex = this._randomColorNoMatch(row, col);
        this.grid[row][col] = this._createGem(row, col, colorIndex);
      }
    }

    // Score text
    this.scoreText = this.add.text(10, 10, 'Score: 0', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });

    // Timer text
    this.timerText = this.add
      .text(w - 10, 10, this._formatTime(this.timeRemaining), {
        fontSize: '20px',
        color: '#FFAB00',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);

    // Combo text (hidden initially)
    this.comboText = this.add
      .text(w / 2, this.gridOffsetY - 20, '', {
        fontSize: '18px',
        color: '#2ECC71',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Selection indicator
    this.selectionIndicator = this.add.graphics();

    // Input
    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver || this.isAnimating) return;
      const {row, col} = this._pointerToGrid(pointer.x, pointer.y);
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
      this._handleGemClick(row, col);
    });
  }

  _formatTime(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  _pointerToGrid(px, py) {
    const col = Math.floor((px - this.gridOffsetX) / CELL_SIZE);
    const row = Math.floor((py - this.gridOffsetY) / CELL_SIZE);
    return {row, col};
  }

  _gridToPixel(row, col) {
    return {
      x: this.gridOffsetX + col * CELL_SIZE + CELL_SIZE / 2,
      y: this.gridOffsetY + row * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  _randomColorNoMatch(row, col) {
    let colorIndex;
    let attempts = 0;
    do {
      colorIndex = Phaser.Math.Between(0, GEM_COLORS.length - 1);
      attempts++;
    } while (attempts < 20 && this._wouldMatch(row, col, colorIndex));
    return colorIndex;
  }

  _wouldMatch(row, col, colorIndex) {
    // Check horizontal
    if (
      col >= 2 &&
      this.grid[row][col - 1] &&
      this.grid[row][col - 1].colorIndex === colorIndex &&
      this.grid[row][col - 2] &&
      this.grid[row][col - 2].colorIndex === colorIndex
    ) {
      return true;
    }
    // Check vertical
    if (
      row >= 2 &&
      this.grid[row - 1] &&
      this.grid[row - 1][col] &&
      this.grid[row - 1][col].colorIndex === colorIndex &&
      this.grid[row - 2] &&
      this.grid[row - 2][col] &&
      this.grid[row - 2][col].colorIndex === colorIndex
    ) {
      return true;
    }
    return false;
  }

  _createGem(row, col, colorIndex) {
    const pos = this._gridToPixel(row, col);
    const g = this.add.graphics();
    g.fillStyle(GEM_COLORS[colorIndex], 1);
    g.fillRoundedRect(-GEM_SIZE / 2, -GEM_SIZE / 2, GEM_SIZE, GEM_SIZE, 6);
    // Inner highlight
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(
      -GEM_SIZE / 2 + 3,
      -GEM_SIZE / 2 + 3,
      GEM_SIZE / 2 - 2,
      GEM_SIZE / 3,
      4
    );
    g.setPosition(pos.x, pos.y);
    return {colorIndex, graphics: g};
  }

  _handleGemClick(row, col) {
    if (!this.grid[row][col]) return;

    if (!this.selectedGem) {
      // First selection
      this.selectedGem = {row, col};
      this._drawSelection(row, col);
    } else {
      const sr = this.selectedGem.row;
      const sc = this.selectedGem.col;

      // Check adjacency
      const isAdjacent = Math.abs(sr - row) + Math.abs(sc - col) === 1;

      if (isAdjacent) {
        this._clearSelection();
        this._trySwap(sr, sc, row, col);
      } else {
        // Select new gem
        this.selectedGem = {row, col};
        this._drawSelection(row, col);
      }
    }
  }

  _drawSelection(row, col) {
    this.selectionIndicator.clear();
    const pos = this._gridToPixel(row, col);
    this.selectionIndicator.lineStyle(2, 0xffffff, 0.9);
    this.selectionIndicator.strokeRoundedRect(
      pos.x - CELL_SIZE / 2 + 1,
      pos.y - CELL_SIZE / 2 + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2,
      6
    );
  }

  _clearSelection() {
    this.selectedGem = null;
    this.selectionIndicator.clear();
  }

  _trySwap(r1, c1, r2, c2) {
    this.isAnimating = true;

    // Animate swap
    const pos1 = this._gridToPixel(r1, c1);
    const pos2 = this._gridToPixel(r2, c2);

    const gem1 = this.grid[r1][c1];
    const gem2 = this.grid[r2][c2];

    this.tweens.add({
      targets: gem1.graphics,
      x: pos2.x,
      y: pos2.y,
      duration: ANIMATION_SPEED,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: gem2.graphics,
      x: pos1.x,
      y: pos1.y,
      duration: ANIMATION_SPEED,
      ease: 'Power2',
      onComplete: () => {
        // Swap in grid
        this.grid[r1][c1] = gem2;
        this.grid[r2][c2] = gem1;

        // Check for matches
        const matches = this._findAllMatches();
        if (matches.length > 0) {
          this.comboMultiplier = 1;
          this._processMatches(matches);
        } else {
          // Swap back - invalid move
          this.tweens.add({
            targets: gem2.graphics,
            x: pos2.x,
            y: pos2.y,
            duration: ANIMATION_SPEED,
            ease: 'Power2',
          });
          this.tweens.add({
            targets: gem1.graphics,
            x: pos1.x,
            y: pos1.y,
            duration: ANIMATION_SPEED,
            ease: 'Power2',
            onComplete: () => {
              this.grid[r1][c1] = gem1;
              this.grid[r2][c2] = gem2;
              this.isAnimating = false;
            },
          });
        }
      },
    });
  }

  _findAllMatches() {
    const matched = new Set();

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const c = this.grid[row][col]?.colorIndex;
        if (
          c !== undefined &&
          this.grid[row][col + 1]?.colorIndex === c &&
          this.grid[row][col + 2]?.colorIndex === c
        ) {
          // Extend the match as far as possible
          let end = col + 2;
          while (
            end + 1 < GRID_SIZE &&
            this.grid[row][end + 1]?.colorIndex === c
          ) {
            end++;
          }
          for (let k = col; k <= end; k++) {
            matched.add(`${row},${k}`);
          }
          col = end;
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const c = this.grid[row][col]?.colorIndex;
        if (
          c !== undefined &&
          this.grid[row + 1]?.[col]?.colorIndex === c &&
          this.grid[row + 2]?.[col]?.colorIndex === c
        ) {
          let end = row + 2;
          while (
            end + 1 < GRID_SIZE &&
            this.grid[end + 1]?.[col]?.colorIndex === c
          ) {
            end++;
          }
          for (let k = row; k <= end; k++) {
            matched.add(`${k},${col}`);
          }
          row = end;
        }
      }
    }

    return Array.from(matched).map((key) => {
      const [r, c] = key.split(',').map(Number);
      return {row: r, col: c};
    });
  }

  _processMatches(matches) {
    // Destroy matched gems with animation
    const points = matches.length * 10 * this.comboMultiplier;
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    const bridge = this.registry.get('nunbaBridge');
    if (bridge) bridge.onScoreUpdate(this.score);

    // Show combo text
    if (this.comboMultiplier > 1) {
      this.comboText.setText(`${this.comboMultiplier}x Combo!`);
      this.comboText.setAlpha(1);
      this.tweens.add({
        targets: this.comboText,
        alpha: 0,
        duration: 1000,
        delay: 500,
      });
    }

    // Remove matched gems
    for (const {row, col} of matches) {
      if (this.grid[row][col]) {
        this.tweens.add({
          targets: this.grid[row][col].graphics,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: ANIMATION_SPEED,
          onComplete: () => {
            if (this.grid[row][col]) {
              this.grid[row][col].graphics.destroy();
              this.grid[row][col] = null;
            }
          },
        });
      }
    }

    // After destruction animation, drop and fill
    this.time.delayedCall(ANIMATION_SPEED + 50, () => {
      this._dropGems();
    });
  }

  _dropGems() {
    let dropped = false;
    const tweenPromises = [];

    // For each column, drop gems down
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1;

      // Compact existing gems downward
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (this.grid[row][col]) {
          if (row !== emptyRow) {
            // Move gem from row to emptyRow
            this.grid[emptyRow][col] = this.grid[row][col];
            this.grid[row][col] = null;

            const targetPos = this._gridToPixel(emptyRow, col);
            const tween = this.tweens.add({
              targets: this.grid[emptyRow][col].graphics,
              y: targetPos.y,
              duration: ANIMATION_SPEED,
              ease: 'Bounce.easeOut',
            });
            tweenPromises.push(tween);
            dropped = true;
          }
          emptyRow--;
        }
      }

      // Fill empty cells from top
      for (let row = emptyRow; row >= 0; row--) {
        const colorIndex = Phaser.Math.Between(0, GEM_COLORS.length - 1);
        const gem = this._createGem(row, col, colorIndex);
        // Start above the grid
        gem.graphics.setY(this.gridOffsetY - CELL_SIZE * (emptyRow - row + 1));
        this.grid[row][col] = gem;

        const targetPos = this._gridToPixel(row, col);
        const tween = this.tweens.add({
          targets: gem.graphics,
          y: targetPos.y,
          duration: ANIMATION_SPEED + 50,
          ease: 'Bounce.easeOut',
        });
        tweenPromises.push(tween);
        dropped = true;
      }
    }

    // After all drops, check for chain matches
    const checkDelay = dropped ? ANIMATION_SPEED + 100 : 0;
    this.time.delayedCall(checkDelay, () => {
      const newMatches = this._findAllMatches();
      if (newMatches.length > 0) {
        this.comboMultiplier++;
        this._processMatches(newMatches);
      } else {
        this.comboMultiplier = 1;
        this.isAnimating = false;
      }
    });
  }

  _endGame() {
    this.gameOver = true;
    this.isAnimating = true;

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this.add
      .text(w / 2, h / 2 - 30, 'TIME UP!', {
        fontSize: '32px',
        color: '#FFAB00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h / 2 + 10, `Final Score: ${this.score}`, {
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5);

    const bridge = this.registry.get('nunbaBridge');
    if (bridge) bridge.onGameComplete(this.score);
  }

  update(_time, delta) {
    if (this.gameOver) return;

    // Update timer
    this.timeRemaining -= delta;
    this.timerText.setText(this._formatTime(this.timeRemaining));

    // Change timer color when low
    if (this.timeRemaining <= 10000) {
      this.timerText.setColor('#FF6B6B');
    } else if (this.timeRemaining <= 30000) {
      this.timerText.setColor('#FFAB00');
    }

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this._endGame();
    }
  }
}
