import Phaser from 'phaser';

const BG_COLOR = 0x0f0e17;
const PLAYER_COLOR = 0x6c63ff;
const OBSTACLE_COLOR = 0xff6b6b;
const GROUND_COLOR = 0x2a2a3a;
const GRAVITY = 900;
const JUMP_VELOCITY = -400;
const INITIAL_SPEED = 200;
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 600;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const GROUND_Y_OFFSET = 50;

export default class RunnerScene extends Phaser.Scene {
  constructor() {
    super({key: 'RunnerScene'});
  }

  create() {
    const bridge = this.registry.get('nunbaBridge');
    this.config = bridge ? bridge.getConfig() : {};

    this.cameras.main.setBackgroundColor(BG_COLOR);

    const w = this.scale.width;
    const h = this.scale.height;

    this.groundY = h - GROUND_Y_OFFSET;
    this.score = 0;
    this.distance = 0;
    this.speed = INITIAL_SPEED;
    this.gameOver = false;
    this.jumpCount = 0;
    this.maxJumps = 2;

    // Background gradient effect using layered rectangles
    for (let i = 0; i < 5; i++) {
      const alpha = 0.03 * (5 - i);
      this.add.rectangle(w / 2, h * (i / 5), w, h / 5, 0x1a1930, alpha);
    }

    // Scrolling background particles
    this.bgParticles = [];
    for (let i = 0; i < 15; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, this.groundY),
        Phaser.Math.Between(1, 2),
        0xffffff,
        0.15
      );
      this.bgParticles.push({
        obj: dot,
        speed: Phaser.Math.Between(30, 80),
      });
    }

    // Ground
    this.groundLine = this.add.graphics();
    this.groundLine.fillStyle(GROUND_COLOR, 1);
    this.groundLine.fillRect(0, this.groundY, w, 3);

    // Player
    this.player = this.add.rectangle(
      80,
      this.groundY - PLAYER_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      PLAYER_COLOR
    );
    this.playerVelocityY = 0;
    this.isOnGround = true;

    // Obstacles
    this.obstacles = [];
    this.obstacleTimer = 0;
    this.nextObstacleDelay = this._randomObstacleDelay();

    // Score text
    this.scoreText = this.add.text(10, 10, 'Distance: 0', {
      fontSize: '18px',
      color: '#FFFFFF',
    });

    this.speedText = this.add.text(10, 35, 'Speed: 1x', {
      fontSize: '14px',
      color: '#6C63FF',
    });

    // Input - jump on spacebar, click, or tap
    this.input.keyboard.on('keydown-SPACE', () => this._jump());
    this.input.on('pointerdown', () => this._jump());
  }

  _jump() {
    if (this.gameOver) return;

    if (this.jumpCount < this.maxJumps) {
      this.playerVelocityY = JUMP_VELOCITY;
      this.isOnGround = false;
      this.jumpCount++;
    }
  }

  _randomObstacleDelay() {
    return Phaser.Math.Between(800, 2000);
  }

  _spawnObstacle() {
    const w = this.scale.width;
    const obstacleHeight = Phaser.Math.Between(20, 60);
    const obstacleWidth = Phaser.Math.Between(15, 30);
    const obstacle = this.add.rectangle(
      w + obstacleWidth,
      this.groundY - obstacleHeight / 2,
      obstacleWidth,
      obstacleHeight,
      OBSTACLE_COLOR
    );
    this.obstacles.push({obj: obstacle, passed: false});
  }

  _checkCollision(playerBounds, obstacleBounds) {
    // Simple AABB with a small tolerance for fairness
    const tolerance = 4;
    return (
      playerBounds.right - tolerance > obstacleBounds.left &&
      playerBounds.left + tolerance < obstacleBounds.right &&
      playerBounds.bottom - tolerance > obstacleBounds.top &&
      playerBounds.top + tolerance < obstacleBounds.bottom
    );
  }

  _endGame() {
    this.gameOver = true;

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this.add
      .text(w / 2, h / 2 - 30, 'GAME OVER', {
        fontSize: '32px',
        color: '#FF6B6B',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h / 2 + 10, `Distance: ${this.score}`, {
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h / 2 + 45, 'Tap to restart', {
        fontSize: '16px',
        color: '#6C63FF',
      })
      .setOrigin(0.5);

    const bridge = this.registry.get('nunbaBridge');
    if (bridge) bridge.onGameComplete(this.score);

    // Allow restart
    this.input.once('pointerdown', () => {
      this.scene.restart();
    });
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }

  update(_time, delta) {
    if (this.gameOver) return;

    const dt = delta / 1000;

    // Increase speed over time
    this.speed = Math.min(this.speed + SPEED_INCREMENT * dt * 10, MAX_SPEED);

    // Update distance/score
    this.distance += this.speed * dt;
    const newScore = Math.floor(this.distance / 10);
    if (newScore !== this.score) {
      this.score = newScore;
      this.scoreText.setText(`Distance: ${this.score}`);
      const bridge = this.registry.get('nunbaBridge');
      if (bridge) bridge.onScoreUpdate(this.score);
    }

    this.speedText.setText(
      `Speed: ${(this.speed / INITIAL_SPEED).toFixed(1)}x`
    );

    // Player gravity and vertical movement
    this.playerVelocityY += GRAVITY * dt;
    this.player.y += this.playerVelocityY * dt;

    // Ground collision
    const playerBottom = this.player.y + PLAYER_HEIGHT / 2;
    if (playerBottom >= this.groundY) {
      this.player.y = this.groundY - PLAYER_HEIGHT / 2;
      this.playerVelocityY = 0;
      this.isOnGround = true;
      this.jumpCount = 0;
    }

    // Ceiling clamp
    if (this.player.y - PLAYER_HEIGHT / 2 < 0) {
      this.player.y = PLAYER_HEIGHT / 2;
      this.playerVelocityY = 0;
    }

    // Spawn obstacles
    this.obstacleTimer += delta;
    if (this.obstacleTimer >= this.nextObstacleDelay) {
      this._spawnObstacle();
      this.obstacleTimer = 0;
      // Decrease delay as speed increases
      this.nextObstacleDelay =
        this._randomObstacleDelay() * (INITIAL_SPEED / this.speed);
    }

    // Move obstacles and check collisions
    const playerBounds = this.player.getBounds();
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.obj.x -= this.speed * dt;

      // Check collision
      const obsBounds = obs.obj.getBounds();
      if (this._checkCollision(playerBounds, obsBounds)) {
        this._endGame();
        return;
      }

      // Remove off-screen obstacles
      if (obs.obj.x + obs.obj.width < 0) {
        obs.obj.destroy();
        this.obstacles.splice(i, 1);
      }
    }

    // Scroll background particles
    for (const particle of this.bgParticles) {
      particle.obj.x -= particle.speed * dt;
      if (particle.obj.x < -5) {
        particle.obj.x = this.scale.width + 5;
        particle.obj.y = Phaser.Math.Between(0, this.groundY);
      }
    }
  }
}
