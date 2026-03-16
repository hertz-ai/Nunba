import Phaser from 'phaser';

export default class PongScene extends Phaser.Scene {
  constructor() {
    super({key: 'PongScene'});
  }

  init(data) {
    this.targetScore = (data && data.target_score) || 11;
    this.aiMode = data && data.ai_mode !== undefined ? data.ai_mode : true;
    this.p1Score = 0;
    this.p2Score = 0;
    this.ballBaseSpeed = 200;
    this.ballSpeedIncrement = 15;
    this.ballServed = false;
  }

  create() {
    const {width, height} = this.scale;
    this.cameras.main.setBackgroundColor('#0F0E17');

    this.bridge = this.registry.get('nunbaBridge');

    // --- Dotted center line ---
    const lineGraphics = this.add.graphics();
    lineGraphics.lineStyle(2, 0x444444, 0.6);
    const dashLength = 8;
    const gapLength = 8;
    let y = 0;
    while (y < height) {
      lineGraphics.moveTo(width / 2, y);
      lineGraphics.lineTo(width / 2, Math.min(y + dashLength, height));
      y += dashLength + gapLength;
    }
    lineGraphics.strokePath();

    // --- Paddles ---
    const paddleWidth = 10;
    const paddleHeight = 80;

    this.leftPaddle = this.add.rectangle(
      20,
      height / 2,
      paddleWidth,
      paddleHeight,
      0xffffff
    );
    this.physics.add.existing(this.leftPaddle, true);
    this.leftPaddle.body.setSize(paddleWidth, paddleHeight);

    this.rightPaddle = this.add.rectangle(
      width - 20,
      height / 2,
      paddleWidth,
      paddleHeight,
      0xffffff
    );
    this.physics.add.existing(this.rightPaddle, true);
    this.rightPaddle.body.setSize(paddleWidth, paddleHeight);

    // --- Ball ---
    this.ball = this.add.circle(width / 2, height / 2, 6, 0xffffff);
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(6);
    this.ball.body.setBounce(1, 1);
    this.ball.body.setCollideWorldBounds(true, 0, 1, false);
    // Only bounce off top and bottom, not left/right
    this.physics.world.setBoundsCollision(false, false, true, true);

    // --- Colliders ---
    this.physics.add.collider(
      this.ball,
      this.leftPaddle,
      this.hitPaddle,
      null,
      this
    );
    this.physics.add.collider(
      this.ball,
      this.rightPaddle,
      this.hitPaddle,
      null,
      this
    );

    // --- Score display ---
    this.scoreText = this.add
      .text(width / 2, 20, '0  —  0', {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    // --- Input ---
    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
    };

    // Serve on click/tap or space
    this.input.on('pointerdown', () => {
      if (!this.ballServed) {
        this.serveBall();
      }
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.ballServed) {
        this.serveBall();
      }
    });

    // Instruction text
    this.instructionText = this.add
      .text(width / 2, height / 2 + 30, 'Click or press SPACE to serve', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5);

    this.resetBall();
  }

  update() {
    const {height} = this.scale;
    const paddleSpeed = 5;
    const halfPaddle = 40;

    // --- Left paddle (Player 1): W/S keys ---
    if (this.keys.w.isDown) {
      this.leftPaddle.y = Math.max(halfPaddle, this.leftPaddle.y - paddleSpeed);
    } else if (this.keys.s.isDown) {
      this.leftPaddle.y = Math.min(
        height - halfPaddle,
        this.leftPaddle.y + paddleSpeed
      );
    }
    this.leftPaddle.body.updateFromGameObject();

    // --- Right paddle (Player 2 or AI) ---
    if (this.aiMode) {
      const aiSpeed = 3;
      if (this.rightPaddle.y < this.ball.y - 10) {
        this.rightPaddle.y = Math.min(
          height - halfPaddle,
          this.rightPaddle.y + aiSpeed
        );
      } else if (this.rightPaddle.y > this.ball.y + 10) {
        this.rightPaddle.y = Math.max(halfPaddle, this.rightPaddle.y - aiSpeed);
      }
    } else {
      if (this.keys.up.isDown) {
        this.rightPaddle.y = Math.max(
          halfPaddle,
          this.rightPaddle.y - paddleSpeed
        );
      } else if (this.keys.down.isDown) {
        this.rightPaddle.y = Math.min(
          height - halfPaddle,
          this.rightPaddle.y + paddleSpeed
        );
      }
    }
    this.rightPaddle.body.updateFromGameObject();

    // --- Check if ball passed left or right edge ---
    if (this.ballServed) {
      if (this.ball.x < -10) {
        // P2 scores
        this.p2Score++;
        this.onScoreChange();
      } else if (this.ball.x > this.scale.width + 10) {
        // P1 scores
        this.p1Score++;
        this.onScoreChange();
      }
    }
  }

  serveBall() {
    this.ballServed = true;
    if (this.instructionText) {
      this.instructionText.destroy();
      this.instructionText = null;
    }

    // Random direction
    const dirX = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    const angle = Phaser.Math.Between(-30, 30);
    const vx =
      this.ballBaseSpeed * dirX * Math.cos(Phaser.Math.DegToRad(angle));
    const vy = this.ballBaseSpeed * Math.sin(Phaser.Math.DegToRad(angle));
    this.ball.body.setVelocity(vx, vy);
  }

  resetBall() {
    const {width, height} = this.scale;
    this.ballServed = false;
    this.ball.body.setVelocity(0, 0);
    this.ball.x = width / 2;
    this.ball.y = height / 2;
    this.ball.body.reset(width / 2, height / 2);
  }

  hitPaddle(ball, paddle) {
    // Increase speed slightly
    const currentVx = ball.body.velocity.x;
    const currentVy = ball.body.velocity.y;
    const speed = Math.sqrt(currentVx * currentVx + currentVy * currentVy);
    const newSpeed = speed + this.ballSpeedIncrement;
    const angle = Math.atan2(currentVy, currentVx);

    // Adjust angle based on where ball hit paddle
    const diff = (ball.y - paddle.y) / 40; // normalized -1 to 1
    const newAngle = angle + diff * 0.3;

    ball.body.setVelocity(
      newSpeed *
        Math.cos(newAngle) *
        (currentVx > 0 ? 1 : -1) *
        (currentVx > 0 ? 1 : 1),
      newSpeed * Math.sin(newAngle)
    );

    // Ensure ball moves away from the paddle it just hit
    if (paddle === this.leftPaddle && ball.body.velocity.x < 0) {
      ball.body.velocity.x *= -1;
    } else if (paddle === this.rightPaddle && ball.body.velocity.x > 0) {
      ball.body.velocity.x *= -1;
    }
  }

  onScoreChange() {
    this.scoreText.setText(this.p1Score + '  \u2014  ' + this.p2Score);

    // Report score to bridge
    if (this.bridge && typeof this.bridge.onScoreUpdate === 'function') {
      this.bridge.onScoreUpdate({
        p1: this.p1Score,
        p2: this.p2Score,
      });
    }

    // Check win condition
    if (this.p1Score >= this.targetScore || this.p2Score >= this.targetScore) {
      this.ballServed = false;
      this.ball.body.setVelocity(0, 0);

      const winner = this.p1Score >= this.targetScore ? 'Player 1' : 'Player 2';
      const winColor = this.p1Score >= this.targetScore ? '#2ECC71' : '#FF6B6B';

      this.add
        .text(this.scale.width / 2, this.scale.height / 2, winner + ' Wins!', {
          fontSize: '28px',
          fontFamily: 'monospace',
          color: winColor,
        })
        .setOrigin(0.5);

      if (this.bridge && typeof this.bridge.onGameComplete === 'function') {
        this.bridge.onGameComplete({
          winner: winner,
          p1Score: this.p1Score,
          p2Score: this.p2Score,
        });
      }
    } else {
      // Reset for next serve
      this.resetBall();
    }
  }
}
