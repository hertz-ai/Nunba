import Phaser from 'phaser';

const BG_COLOR = 0x0f0e17;
const BIRD_COLOR = 0xffab00;
const PIPE_COLOR = 0x2ecc71;
const GROUND_COLOR = 0x2a2a3a;
const GRAVITY = 600;
const FLAP_VELOCITY = -250;
const INITIAL_PIPE_SPEED = 150;
const SPEED_INCREMENT = 0.3;
const MAX_SPEED = 350;
const PIPE_WIDTH = 50;
const GAP_HEIGHT = 130;
const PIPE_SPAWN_INTERVAL = 1800;
const BIRD_SIZE = 20;

export default class FlappyScene extends Phaser.Scene {
  constructor() {
    super({key: 'FlappyScene'});
  }

  create() {
    const bridge = this.registry.get('nunbaBridge');
    this.config = bridge ? bridge.getConfig() : {};

    this.cameras.main.setBackgroundColor(BG_COLOR);

    const w = this.scale.width;
    const h = this.scale.height;

    this.groundY = h - 30;
    this.score = 0;
    this.pipeSpeed = INITIAL_PIPE_SPEED;
    this.gameOver = false;
    this.started = false;
    this.birdVelocityY = 0;

    // Background subtle gradient layers
    for (let i = 0; i < 4; i++) {
      this.add.rectangle(
        w / 2,
        h * (i / 4) + h / 8,
        w,
        h / 4,
        0x141326,
        0.3 - i * 0.05
      );
    }

    // Background stars
    for (let i = 0; i < 20; i++) {
      this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, this.groundY - 20),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.05, 0.2)
      );
    }

    // Ground
    this.add.rectangle(
      w / 2,
      this.groundY + (h - this.groundY) / 2,
      w,
      h - this.groundY,
      GROUND_COLOR
    );
    this.add.rectangle(w / 2, this.groundY, w, 2, 0x6c63ff, 0.5);

    // Bird
    this.bird = this.add.graphics();
    this.bird.fillStyle(BIRD_COLOR, 1);
    this.bird.fillCircle(0, 0, BIRD_SIZE / 2);
    // Eye
    this.bird.fillStyle(0xffffff, 1);
    this.bird.fillCircle(5, -4, 4);
    this.bird.fillStyle(0x0f0e17, 1);
    this.bird.fillCircle(6, -4, 2);
    this.bird.setPosition(w * 0.25, h / 2);

    this.birdX = w * 0.25;
    this.birdY = h / 2;

    // Pipes
    this.pipes = [];
    this.pipeTimer = 0;

    // Score text
    this.scoreText = this.add
      .text(w / 2, 30, '0', {
        fontSize: '36px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Start prompt
    this.startText = this.add
      .text(w / 2, h / 2 + 50, 'Tap or press SPACE to start', {
        fontSize: '16px',
        color: '#6C63FF',
      })
      .setOrigin(0.5);

    // Input
    this.input.keyboard.on('keydown-SPACE', () => this._flap());
    this.input.on('pointerdown', () => this._flap());
  }

  _flap() {
    if (this.gameOver) return;

    if (!this.started) {
      this.started = true;
      this.startText.setVisible(false);
    }

    this.birdVelocityY = FLAP_VELOCITY;
  }

  _spawnPipe() {
    const w = this.scale.width;
    const minGapY = 80;
    const maxGapY = this.groundY - GAP_HEIGHT - 80;
    const gapY = Phaser.Math.Between(minGapY, maxGapY);

    // Top pipe
    const topPipe = this.add.graphics();
    topPipe.fillStyle(PIPE_COLOR, 1);
    topPipe.fillRect(0, 0, PIPE_WIDTH, gapY);
    // Cap
    topPipe.fillStyle(PIPE_COLOR, 0.8);
    topPipe.fillRect(-3, gapY - 15, PIPE_WIDTH + 6, 15);
    topPipe.setPosition(w, 0);

    // Bottom pipe
    const bottomPipeY = gapY + GAP_HEIGHT;
    const bottomPipeHeight = this.groundY - bottomPipeY;
    const bottomPipe = this.add.graphics();
    bottomPipe.fillStyle(PIPE_COLOR, 1);
    bottomPipe.fillRect(0, 0, PIPE_WIDTH, bottomPipeHeight);
    // Cap
    bottomPipe.fillStyle(PIPE_COLOR, 0.8);
    bottomPipe.fillRect(-3, 0, PIPE_WIDTH + 6, 15);
    bottomPipe.setPosition(w, bottomPipeY);

    this.pipes.push({
      topPipe,
      bottomPipe,
      x: w,
      gapY,
      gapBottom: bottomPipeY,
      scored: false,
    });
  }

  _checkCollision(pipe) {
    const birdLeft = this.birdX - BIRD_SIZE / 2;
    const birdRight = this.birdX + BIRD_SIZE / 2;
    const birdTop = this.birdY - BIRD_SIZE / 2;
    const birdBottom = this.birdY + BIRD_SIZE / 2;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;

    // Check horizontal overlap
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      // Check if bird is in the gap
      if (birdTop < pipe.gapY || birdBottom > pipe.gapBottom) {
        return true;
      }
    }

    return false;
  }

  _endGame() {
    this.gameOver = true;

    const w = this.scale.width;
    const h = this.scale.height;

    // Flash effect
    const flash = this.add
      .rectangle(w / 2, h / 2, w, h, 0xffffff, 0.3)
      .setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
    });

    // Game over overlay
    this.time.delayedCall(300, () => {
      this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setDepth(20);
      this.add
        .text(w / 2, h / 2 - 40, 'GAME OVER', {
          fontSize: '32px',
          color: '#FF6B6B',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(21);

      this.add
        .text(w / 2, h / 2 + 5, `Score: ${this.score}`, {
          fontSize: '24px',
          color: '#FFFFFF',
        })
        .setOrigin(0.5)
        .setDepth(21);

      this.add
        .text(w / 2, h / 2 + 45, 'Tap to restart', {
          fontSize: '16px',
          color: '#6C63FF',
        })
        .setOrigin(0.5)
        .setDepth(21);

      const bridge = this.registry.get('nunbaBridge');
      if (bridge) bridge.onGameComplete(this.score);

      // Allow restart after a short delay
      this.time.delayedCall(500, () => {
        this.input.once('pointerdown', () => this.scene.restart());
        this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
      });
    });
  }

  update(_time, delta) {
    if (this.gameOver) return;
    if (!this.started) {
      // Idle bobbing animation
      this.birdY = this.scale.height / 2 + Math.sin(_time / 300) * 10;
      this.bird.setPosition(this.birdX, this.birdY);
      return;
    }

    const dt = delta / 1000;

    // Increase speed gradually
    this.pipeSpeed = Math.min(this.pipeSpeed + SPEED_INCREMENT * dt, MAX_SPEED);

    // Bird physics
    this.birdVelocityY += GRAVITY * dt;
    this.birdY += this.birdVelocityY * dt;

    // Rotate bird based on velocity
    const rotation = Phaser.Math.Clamp(this.birdVelocityY / 400, -0.5, 0.8);
    this.bird.setPosition(this.birdX, this.birdY);
    this.bird.setRotation(rotation);

    // Hit ceiling
    if (this.birdY - BIRD_SIZE / 2 <= 0) {
      this.birdY = BIRD_SIZE / 2;
      this.birdVelocityY = 0;
    }

    // Hit ground
    if (this.birdY + BIRD_SIZE / 2 >= this.groundY) {
      this.birdY = this.groundY - BIRD_SIZE / 2;
      this._endGame();
      return;
    }

    // Spawn pipes
    this.pipeTimer += delta;
    if (this.pipeTimer >= PIPE_SPAWN_INTERVAL) {
      this._spawnPipe();
      this.pipeTimer = 0;
    }

    // Move pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.x -= this.pipeSpeed * dt;
      pipe.topPipe.setX(pipe.x);
      pipe.bottomPipe.setX(pipe.x);

      // Check collision
      if (this._checkCollision(pipe)) {
        this._endGame();
        return;
      }

      // Score when pipe passes the bird
      if (!pipe.scored && pipe.x + PIPE_WIDTH < this.birdX) {
        pipe.scored = true;
        this.score++;
        this.scoreText.setText(`${this.score}`);

        const bridge = this.registry.get('nunbaBridge');
        if (bridge) bridge.onScoreUpdate(this.score);

        // Score flash effect
        this.tweens.add({
          targets: this.scoreText,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 100,
          yoyo: true,
        });
      }

      // Remove off-screen pipes
      if (pipe.x + PIPE_WIDTH < -10) {
        pipe.topPipe.destroy();
        pipe.bottomPipe.destroy();
        this.pipes.splice(i, 1);
      }
    }
  }
}
