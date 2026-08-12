// Bounce's Big Adventure - a cute & simple 2D platformer
// Pure vanilla JS + Canvas. No external packages used.
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMessage = document.getElementById("overlay-message");
  const restartBtn = document.getElementById("restart-btn");

  const GRAVITY = 0.6;
  const MOVE_SPEED = 4;
  const JUMP_VELOCITY = -12.5;
  const WORLD_WIDTH = canvas.width;
  const WORLD_HEIGHT = canvas.height;
  const START_LIVES = 3;

  // --- Level layout -------------------------------------------------------
  const platforms = [
    { x: 0, y: 410, w: 800, h: 40 }, // ground
    { x: 140, y: 330, w: 120, h: 20 },
    { x: 320, y: 270, w: 120, h: 20 },
    { x: 480, y: 340, w: 100, h: 20 },
    { x: 610, y: 230, w: 140, h: 20 },
    { x: 40, y: 250, w: 90, h: 20 },
  ];

  const START_POS = { x: 50, y: 200 };

  function makeCoins() {
    return [
      { x: 175, y: 295, r: 10, taken: false },
      { x: 370, y: 235, r: 10, taken: false },
      { x: 515, y: 305, r: 10, taken: false },
      { x: 115, y: 215, r: 10, taken: false },
      { x: 660, y: 195, r: 10, taken: false },
      { x: 700, y: 195, r: 10, taken: false },
    ];
  }

  const goal = { x: 730, y: 170, w: 30, h: 60 };

  function makeEnemy() {
    return {
      x: 340,
      y: 246,
      w: 30,
      h: 24,
      minX: 325,
      maxX: 400,
      dir: 1,
      speed: 1.6,
      alive: true,
    };
  }

  // --- Game state ----------------------------------------------------------
  let player, coins, enemy, score, lives, keys, gameOver, won, invulnerable;

  function resetGame() {
    player = {
      x: START_POS.x,
      y: START_POS.y,
      w: 28,
      h: 32,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
    };
    coins = makeCoins();
    enemy = makeEnemy();
    score = 0;
    lives = START_LIVES;
    gameOver = false;
    won = false;
    invulnerable = 0;
    updateHud();
    hideOverlay();
  }

  function updateHud() {
    scoreEl.textContent = `⭐ Score: ${score}`;
    livesEl.textContent = "❤️".repeat(Math.max(lives, 0)) || "💀";
  }

  function showOverlay(title, message) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  // --- Input -----------------------------------------------------------------
  keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
  restartBtn.addEventListener("click", () => {
    resetGame();
    requestAnimationFrame(loop);
  });

  function isJumpPressed() {
    return keys["ArrowUp"] || keys["KeyW"] || keys["Space"];
  }
  function isLeftPressed() {
    return keys["ArrowLeft"] || keys["KeyA"];
  }
  function isRightPressed() {
    return keys["ArrowRight"] || keys["KeyD"];
  }

  // --- Collision helpers -------------------------------------------------
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function resolvePlatformCollisions() {
    player.onGround = false;
    for (const p of platforms) {
      const prevBottom = player.y + player.h - player.vy;
      const withinX = player.x + player.w > p.x && player.x < p.x + p.w;
      // Landing on top of a platform (only when falling and previously above it)
      if (
        withinX &&
        player.vy >= 0 &&
        prevBottom <= p.y + 1 &&
        player.y + player.h >= p.y &&
        player.y + player.h <= p.y + p.h + player.vy + 1
      ) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
    // World bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > WORLD_WIDTH) player.x = WORLD_WIDTH - player.w;
  }

  function respawnPlayer() {
    player.x = START_POS.x;
    player.y = START_POS.y;
    player.vx = 0;
    player.vy = 0;
    invulnerable = 90; // frames of brief invulnerability
  }

  function loseLife() {
    lives -= 1;
    updateHud();
    if (lives <= 0) {
      gameOver = true;
      showOverlay("Game Over 💥", `Final Score: ${score}. Better luck next time!`);
    } else {
      respawnPlayer();
    }
  }

  // --- Update loop ---------------------------------------------------------
  function update() {
    if (gameOver || won) return;

    // Horizontal movement
    player.vx = 0;
    if (isLeftPressed()) {
      player.vx = -MOVE_SPEED;
      player.facing = -1;
    }
    if (isRightPressed()) {
      player.vx = MOVE_SPEED;
      player.facing = 1;
    }
    player.x += player.vx;

    // Jumping / gravity
    if (isJumpPressed() && player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
    }
    player.vy += GRAVITY;
    player.y += player.vy;

    resolvePlatformCollisions();

    // Fell off the world
    if (player.y > WORLD_HEIGHT + 50) {
      loseLife();
      return;
    }

    // Coin pickups
    for (const c of coins) {
      if (c.taken) continue;
      const dx = player.x + player.w / 2 - c.x;
      const dy = player.y + player.h / 2 - c.y;
      if (Math.hypot(dx, dy) < c.r + 16) {
        c.taken = true;
        score += 10;
        updateHud();
      }
    }

    // Enemy movement (simple back-and-forth patrol)
    if (enemy.alive) {
      enemy.x += enemy.speed * enemy.dir;
      if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
        enemy.dir *= -1;
      }

      if (invulnerable === 0 && rectsOverlap(player, enemy)) {
        const stomping = player.vy > 0 && player.y + player.h - player.vy <= enemy.y + 6;
        if (stomping) {
          enemy.alive = false;
          player.vy = JUMP_VELOCITY * 0.6; // little bounce
          score += 20;
          updateHud();
        } else {
          loseLife();
          return;
        }
      }
    }

    if (invulnerable > 0) invulnerable -= 1;

    // Goal check
    if (rectsOverlap(player, goal)) {
      won = true;
      showOverlay("You Win! 🎉", `Final Score: ${score}. Great job, Bounce!`);
    }
  }

  // --- Drawing -------------------------------------------------------------
  function drawBackgroundDecor() {
    // Sun
    ctx.fillStyle = "#fff6b0";
    ctx.beginPath();
    ctx.arc(730, 60, 34, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    ctx.fillStyle = "#ffffffcc";
    drawCloud(120, 70);
    drawCloud(430, 50);
    drawCloud(260, 110);
  }

  function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.arc(x + 18, y - 8, 18, 0, Math.PI * 2);
    ctx.arc(x + 36, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlatforms() {
    for (const p of platforms) {
      ctx.fillStyle = "#8bd66b";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#6bb84e";
      ctx.fillRect(p.x, p.y + p.h - 6, p.w, 6);
    }
  }

  function drawCoins() {
    for (const c of coins) {
      if (c.taken) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = "#ffd23f";
      ctx.strokeStyle = "#e6a700";
      ctx.lineWidth = 2;
      drawStar(0, 0, 5, c.r, c.r / 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStar(cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  function drawGoal() {
    // Flag pole
    ctx.fillStyle = "#a9a9a9";
    ctx.fillRect(goal.x + goal.w / 2 - 2, goal.y, 4, goal.h);
    // Flag
    ctx.fillStyle = won ? "#4caf50" : "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(goal.x + goal.w / 2 + 2, goal.y + 4);
    ctx.lineTo(goal.x + goal.w / 2 + 26, goal.y + 12);
    ctx.lineTo(goal.x + goal.w / 2 + 2, goal.y + 22);
    ctx.closePath();
    ctx.fill();
  }

  function drawEnemy() {
    if (!enemy.alive) return;
    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    // Slime body
    ctx.fillStyle = "#c66bd6";
    ctx.beginPath();
    ctx.ellipse(0, 4, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(-6, 0, 4, 0, Math.PI * 2);
    ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(-6 + enemy.dir * 1.5, 0, 2, 0, Math.PI * 2);
    ctx.arc(6 + enemy.dir * 1.5, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    const blink = invulnerable > 0 && Math.floor(invulnerable / 6) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.4;

    // Ears
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-8 * player.facing, -18, 5, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(8 * player.facing, -18, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffc4dd";
    ctx.beginPath();
    ctx.ellipse(-8 * player.facing, -18, 2.5, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(8 * player.facing, -18, 2.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 2, player.w / 2, player.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(4 * player.facing, -2, 2.2, 0, Math.PI * 2);
    ctx.arc(-4 * player.facing, -2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.arc(0, 4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawBackgroundDecor();
    drawPlatforms();
    drawGoal();
    drawCoins();
    drawEnemy();
    drawPlayer();
  }

  // --- Main loop -------------------------------------------------------------
  function loop() {
    update();
    draw();
    if (!gameOver && !won) {
      requestAnimationFrame(loop);
    }
  }

  resetGame();
  requestAnimationFrame(loop);
})();
