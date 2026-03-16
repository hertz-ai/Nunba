import Phaser from 'phaser';

export default class SnakeScene extends Phaser.Scene {
  constructor() {
    super({key: 'SnakeScene'});
  }

  create() {
    const bridge = this.registry.get('nunbaBridge');
    this.bridge = bridge;

    // Grid setup
    this.gridSize = 20;
    this.cellSize = Math.floor(
      Math.min(this.scale.width, this.scale.height) / this.gridSize
    );
    this.offsetX = Math.floor(
      (this.scale.width - this.cellSize * this.gridSize) / 2
    );
    this.offsetY = Math.floor(
      (this.scale.height - this.cellSize * this.gridSize) / 2
    );

    // Game state
    this.score = 0;
    this.foodEaten = 0;
    this.moveInterval = 150; // ms between moves
    this.isGameOver = false;
    this.direction = {x: 1, y: 0};
    this.nextDirection = {x: 1, y: 0};

    // Draw background
    this.cameras.main.setBackgroundColor('#0F0E17');

    // Draw grid lines
    this.drawGrid();

    // Initialize snake at center, length 3, moving right
    const centerX = Math.floor(this.gridSize / 2);
    const centerY = Math.floor(this.gridSize / 2);
    this.snake = [
      {x: centerX, y: centerY},
      {x: centerX - 1, y: centerY},
      {x: centerX - 2, y: centerY},
    ];

    // Graphics objects
    this.snakeGraphics = this.add.graphics();
    this.foodGraphics = this.add.graphics();

    // Spawn initial food
    this.foodPos = null;
    this.spawnFood();

    // Draw initial state
    this.drawSnake();
    this.drawFood();

    // Input — Arrow keys + WASD
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Start movement timer
    this.moveTimer = this.time.addEvent({
      delay: this.moveInterval,
      callback: this.moveSnake,
      callbackScope: this,
      loop: true,
    });

    // Score text
    this.scoreText = this.add.text(
      this.offsetX + 8,
      this.offsetY - 28,
      'Score: 0',
      {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      }
    );
  }

  update() {
    if (this.isGameOver) return;

    // Check direction input — prevent 180-degree reversal
    if (
      (this.cursors.left.isDown || this.wasd.left.isDown) &&
      this.direction.x !== 1
    ) {
      this.nextDirection = {x: -1, y: 0};
    } else if (
      (this.cursors.right.isDown || this.wasd.right.isDown) &&
      this.direction.x !== -1
    ) {
      this.nextDirection = {x: 1, y: 0};
    } else if (
      (this.cursors.up.isDown || this.wasd.up.isDown) &&
      this.direction.y !== 1
    ) {
      this.nextDirection = {x: 0, y: -1};
    } else if (
      (this.cursors.down.isDown || this.wasd.down.isDown) &&
      this.direction.y !== -1
    ) {
      this.nextDirection = {x: 0, y: 1};
    }
  }

  moveSnake() {
    if (this.isGameOver) return;

    // Apply queued direction
    this.direction = {...this.nextDirection};

    // Calculate new head position
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= this.gridSize ||
      newHead.y < 0 ||
      newHead.y >= this.gridSize
    ) {
      this.gameOver();
      return;
    }

    // Self collision (check against all body segments except the tail which will move)
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.gameOver();
        return;
      }
    }

    // Add new head
    this.snake.unshift(newHead);

    // Check if food is eaten
    if (
      this.foodPos &&
      newHead.x === this.foodPos.x &&
      newHead.y === this.foodPos.y
    ) {
      // Grow — don't remove tail
      this.foodEaten += 1;
      this.score = this.foodEaten * 10;
      this.scoreText.setText(`Score: ${this.score}`);

      // Report score to bridge
      if (this.bridge) {
        this.bridge.onScoreUpdate(this.score);
      }

      // Speed up every 5 food eaten
      if (this.foodEaten % 5 === 0 && this.moveInterval > 50) {
        this.moveInterval = Math.max(50, this.moveInterval - 15);
        this.moveTimer.remove();
        this.moveTimer = this.time.addEvent({
          delay: this.moveInterval,
          callback: this.moveSnake,
          callbackScope: this,
          loop: true,
        });
      }

      this.spawnFood();
    } else {
      // Remove tail — no growth
      this.snake.pop();
    }

    // Redraw
    this.drawSnake();
    this.drawFood();
  }

  spawnFood() {
    // Build set of occupied cells
    const occupied = new Set();
    for (const seg of this.snake) {
      occupied.add(`${seg.x},${seg.y}`);
    }

    // Collect all free cells
    const freeCells = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (!occupied.has(`${x},${y}`)) {
          freeCells.push({x, y});
        }
      }
    }

    if (freeCells.length === 0) {
      // Snake fills the entire grid — the player wins
      this.gameOver();
      return;
    }

    this.foodPos = freeCells[Math.floor(Math.random() * freeCells.length)];
  }

  drawGrid() {
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1a1a2e, 0.5);

    for (let i = 0; i <= this.gridSize; i++) {
      // Vertical lines
      const vx = this.offsetX + i * this.cellSize;
      gridGraphics.lineBetween(
        vx,
        this.offsetY,
        vx,
        this.offsetY + this.gridSize * this.cellSize
      );
      // Horizontal lines
      const hy = this.offsetY + i * this.cellSize;
      gridGraphics.lineBetween(
        this.offsetX,
        hy,
        this.offsetX + this.gridSize * this.cellSize,
        hy
      );
    }
  }

  drawSnake() {
    this.snakeGraphics.clear();

    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const px = this.offsetX + seg.x * this.cellSize;
      const py = this.offsetY + seg.y * this.cellSize;
      const padding = 1;

      if (i === 0) {
        // Head — bright accent color
        this.snakeGraphics.fillStyle(0x6c63ff, 1);
      } else {
        // Body — slightly darker
        this.snakeGraphics.fillStyle(0x5a52d5, 1);
      }

      this.snakeGraphics.fillRect(
        px + padding,
        py + padding,
        this.cellSize - padding * 2,
        this.cellSize - padding * 2
      );
    }
  }

  drawFood() {
    this.foodGraphics.clear();

    if (!this.foodPos) return;

    const cx =
      this.offsetX + this.foodPos.x * this.cellSize + this.cellSize / 2;
    const cy =
      this.offsetY + this.foodPos.y * this.cellSize + this.cellSize / 2;
    const radius = (this.cellSize - 4) / 2;

    this.foodGraphics.fillStyle(0xff6b6b, 1);
    this.foodGraphics.fillCircle(cx, cy, radius);
  }

  gameOver() {
    this.isGameOver = true;

    // Stop movement timer
    if (this.moveTimer) {
      this.moveTimer.remove();
    }

    // Report final score to bridge
    if (this.bridge) {
      this.bridge.onGameComplete(this.score);
    }

    // Show Game Over text
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 20, 'Game Over', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#FF6B6B',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 24, `Score: ${this.score}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 60, 'Press SPACE to restart', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0.5);

    // Allow restart with space
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }
}
