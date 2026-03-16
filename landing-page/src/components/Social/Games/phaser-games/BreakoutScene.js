import Phaser from 'phaser';

export default class BreakoutScene extends Phaser.Scene {
  constructor() {
    super({key: 'BreakoutScene'});
  }

  init(data) {
    this.lives = (data && data.lives) || 3;
    this.score = 0;
    this.brickCount = 0;
    this.ballLaunched = false;
  }

  create() {
    const {width, height} = this.scale;
    this.cameras.main.setBackgroundColor('#0F0E17');

    this.bridge = this.registry.get('nunbaBridge');

    // --- Paddle ---
    this.paddle = this.add.rectangle(width / 2, height - 30, 80, 14, 0xffffff);
    this.paddle.setOrigin(0.5, 0.5);
    // Round the paddle corners visually
    this.paddle.setStrokeStyle(0);
    this.physics.add.existing(this.paddle, true); // static body
    this.paddle.body.setSize(80, 14);

    // --- Ball ---
    this.ball = this.add.circle(width / 2, height - 44, 6, 0xffffff);
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(6);
    this.ball.body.setBounce(1, 1);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.onWorldBounds = true;

    // Detect when ball hits bottom
    this.physics.world.on('worldbounds', (body, up, down) => {
      if (down) {
        this.loseLife();
      }
    });

    // --- Bricks ---
    const rowColors = [0xff6b6b, 0xffab00, 0x2ecc71, 0x00b8d9, 0x6c63ff];
    const cols = 8;
    const rows = 5;
    const brickWidth = 48;
    const brickHeight = 16;
    const brickPadding = 6;
    const totalBricksWidth = cols * (brickWidth + brickPadding) - brickPadding;
    const offsetX = (width - totalBricksWidth) / 2 + brickWidth / 2;
    const offsetY = 50;

    this.bricks = this.physics.add.staticGroup();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * (brickWidth + brickPadding);
        const y = offsetY + row * (brickHeight + brickPadding);
        const brick = this.add.rectangle(
          x,
          y,
          brickWidth,
          brickHeight,
          rowColors[row]
        );
        this.physics.add.existing(brick, true);
        brick.body.setSize(brickWidth, brickHeight);
        this.bricks.add(brick);
        this.brickCount++;
      }
    }

    // --- Colliders ---
    this.physics.add.collider(
      this.ball,
      this.paddle,
      this.hitPaddle,
      null,
      this
    );
    this.physics.add.collider(
      this.ball,
      this.bricks,
      this.hitBrick,
      null,
      this
    );

    // --- Score & Lives text ---
    this.scoreText = this.add.text(12, 10, 'Score: 0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });

    this.livesText = this.add
      .text(width - 12, 10, 'Lives: ' + this.lives, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

    // --- Input ---
    this.cursors = this.input.keyboard.createCursorKeys();

    // Launch ball on click/tap
    this.input.on('pointerdown', () => {
      if (!this.ballLaunched) {
        this.launchBall();
      }
    });

    // Also launch on space
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.ballLaunched) {
        this.launchBall();
      }
    });

    // Place ball on paddle initially
    this.resetBall();
  }

  update() {
    const {width} = this.scale;
    const pointer = this.input.activePointer;

    // Move paddle to pointer/touch X position
    if (pointer.isDown || pointer.wasTouch) {
      this.paddle.x = Phaser.Math.Clamp(pointer.x, 40, width - 40);
    }

    // Keyboard controls
    if (this.cursors.left.isDown) {
      this.paddle.x = Math.max(40, this.paddle.x - 6);
    } else if (this.cursors.right.isDown) {
      this.paddle.x = Math.min(width - 40, this.paddle.x + 6);
    }

    // Update paddle static body position
    this.paddle.body.updateFromGameObject();

    // If ball not launched, keep it on top of paddle
    if (!this.ballLaunched) {
      this.ball.x = this.paddle.x;
      this.ball.y = this.paddle.y - 14;
      this.ball.body.reset(this.ball.x, this.ball.y);
    }
  }

  launchBall() {
    this.ballLaunched = true;
    // Launch at an angle
    const angle = Phaser.Math.Between(-45, 45);
    const speed = 250;
    const vx = speed * Math.sin(Phaser.Math.DegToRad(angle));
    const vy = -speed * Math.cos(Phaser.Math.DegToRad(angle));
    this.ball.body.setVelocity(vx, vy);
  }

  hitPaddle(ball, paddle) {
    // Adjust ball X velocity based on where it hit the paddle
    const diff = ball.x - paddle.x;
    const normalized = diff / 40; // paddle half-width
    const speed = ball.body.speed || 250;
    ball.body.setVelocityX(normalized * speed * 0.75);

    // Ensure ball always moves upward after paddle hit
    if (ball.body.velocity.y > 0) {
      ball.body.setVelocityY(-Math.abs(ball.body.velocity.y));
    }
  }

  hitBrick(ball, brick) {
    brick.destroy();
    this.brickCount--;
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    // Report score to bridge
    if (this.bridge && typeof this.bridge.onScoreUpdate === 'function') {
      this.bridge.onScoreUpdate(this.score);
    }

    // Check win condition
    if (this.brickCount <= 0) {
      this.ballLaunched = false;
      this.ball.body.setVelocity(0, 0);

      this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'YOU WIN!', {
          fontSize: '28px',
          fontFamily: 'monospace',
          color: '#2ECC71',
        })
        .setOrigin(0.5);

      if (this.bridge && typeof this.bridge.onGameComplete === 'function') {
        this.bridge.onGameComplete({
          won: true,
          score: this.score,
          livesRemaining: this.lives,
        });
      }
    }
  }

  resetBall() {
    this.ballLaunched = false;
    this.ball.body.setVelocity(0, 0);
    this.ball.x = this.paddle.x;
    this.ball.y = this.paddle.y - 14;
    this.ball.body.reset(this.ball.x, this.ball.y);
  }

  loseLife() {
    this.lives--;
    this.livesText.setText('Lives: ' + this.lives);

    if (this.lives <= 0) {
      // Game over
      this.ballLaunched = false;
      this.ball.body.setVelocity(0, 0);

      this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER', {
          fontSize: '28px',
          fontFamily: 'monospace',
          color: '#FF6B6B',
        })
        .setOrigin(0.5);

      this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2 + 36,
          'Score: ' + this.score,
          {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffffff',
          }
        )
        .setOrigin(0.5);

      if (this.bridge && typeof this.bridge.onGameComplete === 'function') {
        this.bridge.onGameComplete({
          won: false,
          score: this.score,
          livesRemaining: 0,
        });
      }
    } else {
      this.resetBall();
    }
  }
}
