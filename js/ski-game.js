/* ============================================================
   GAME MODE — ski slalom mini-game
   Placeholder geometry for the yeti-bot / trees / rocks /
   snowflakes — swap drawPlayer(), drawTree(), drawRock(), and
   drawSnowflake() for real sprite images later without touching
   the game loop, spawning, or collision logic below them.
   ============================================================ */

(function () {
  let canvas, ctx, W, H;
  let raf = null;
  let state = 'idle'; // idle -> playing -> gameover
  let player, obstacles, flakes, particles;
  let speed, distance, collected, spawnTimer, elapsed;
  let keys = {};
  let touchX = null;

  const PLAYER_W = 34, PLAYER_H = 46;
  const LANE_MARGIN = 40;

  function initState() {
    player = { x: 0, vx: 0, wobble: 0 };
    obstacles = [];
    flakes = [];
    particles = [];
    speed = 3.6;
    distance = 0;
    collected = 0;
    spawnTimer = 0;
    elapsed = 0;
    player.x = W / 2;
  }

  function resize() {
    W = canvas.parentElement.clientWidth;
    H = canvas.parentElement.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- PLACEHOLDER SPRITES (swap these for real art later) ----------

  function drawPlayer(x, y, lean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean * 0.15);

    // skis
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, 20); ctx.lineTo(-14, 30);
    ctx.moveTo(14, 20); ctx.lineTo(14, 30);
    ctx.stroke();

    // body (rounded rect, matches nav-logo/plotter-bot language)
    ctx.fillStyle = '#ffffff';
    roundRect(-13, -18, 26, 32, 6);
    ctx.fill();

    // frosty tufts
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rx = 13 + Math.sin(i * 3.1) * 2;
      const px = Math.cos(a) * rx, py = -3 + Math.sin(a) * 18;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * 4, py + Math.sin(a) * 4);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // goggles
    ctx.fillStyle = '#000000';
    roundRect(-11, -8, 22, 7, 2);
    ctx.fill();
    ctx.fillStyle = '#3ddc84';
    ctx.beginPath();
    ctx.arc(8, -4.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // antenna
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(0, -26);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -28, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3ddc84';
    ctx.fill();

    ctx.restore();
  }

  function drawTree(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -34); ctx.lineTo(16, -8); ctx.lineTo(9, -8);
    ctx.lineTo(20, 10); ctx.lineTo(-20, 10); ctx.lineTo(-9, -8); ctx.lineTo(-16, -8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, 10); ctx.lineTo(-4, 20); ctx.lineTo(4, 20); ctx.lineTo(4, 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawRock(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 8); ctx.lineTo(-14, -6); ctx.lineTo(-2, -12);
    ctx.lineTo(12, -8); ctx.lineTo(18, 4); ctx.lineTo(10, 10); ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawSnowflake(x, y, r, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -r);
      ctx.moveTo(0, -r * 0.5); ctx.lineTo(r * 0.28, -r * 0.7);
      ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 0.28, -r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- GAME LOGIC ----------

  function spawnObstacleOrFlake() {
    const roll = Math.random();
    const x = LANE_MARGIN + Math.random() * (W - LANE_MARGIN * 2);
    if (roll < 0.38) {
      obstacles.push({ type: 'tree', x, y: -40, scale: 0.8 + Math.random() * 0.5, r: 15 });
    } else if (roll < 0.62) {
      obstacles.push({ type: 'rock', x, y: -40, scale: 0.8 + Math.random() * 0.4, r: 16 });
    } else {
      flakes.push({ x, y: -30, r: 9, spin: Math.random() * Math.PI });
    }
  }

  function update(dt) {
    elapsed += dt;
    distance += speed * dt * 40;
    speed = Math.min(10.5, 5.2 + elapsed * 0.05);   

    // player movement
    const targetVx = keys.left ? -4.2 : keys.right ? 4.2 : 0;
    player.vx += (targetVx - player.vx) * 0.18;
    if (touchX !== null) {
      player.vx = (touchX - player.x) * 0.12;
    }
    player.x += player.vx;
    player.x = Math.max(LANE_MARGIN, Math.min(W - LANE_MARGIN, player.x));

    spawnTimer -= dt;
    const spawnRate = Math.max(0.3, 0.65 - elapsed * 0.01);
    if (spawnTimer <= 0) {
      spawnObstacleOrFlake();
      spawnTimer = spawnRate;
    }

    const scroll = speed * dt * 60;
    for (const o of obstacles) o.y += scroll;
    for (const f of flakes) { f.y += scroll * 0.9; f.spin += dt; }
    for (const p of particles) { p.y += scroll * 0.9; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);

    // collisions: obstacles
    for (const o of obstacles) {
      const dx = o.x - player.x, dy = o.y - (H - 90);
      const rr = (o.r * o.scale) + PLAYER_W * 0.32;
      if (dx * dx + dy * dy < rr * rr) {
        triggerGameOver();
        return;
      }
    }
    // collisions: flakes
    flakes = flakes.filter(f => {
      const dx = f.x - player.x, dy = f.y - (H - 90);
      if (dx * dx + dy * dy < (f.r + 16) * (f.r + 16)) {
        collected++;
        for (let i = 0; i < 6; i++) {
          particles.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 3, life: 0.4 });
        }
        return false;
      }
      return true;
    });

    obstacles = obstacles.filter(o => o.y < H + 60);
    flakes = flakes.filter(f => f.y < H + 40);
  }

  function triggerGameOver() {
    state = 'gameover';
    updateHUD();
    document.getElementById('game-overlay-msg').style.display = 'flex';
    document.getElementById('game-msg-title').textContent = 'WIPEOUT';
    document.getElementById('game-msg-sub').textContent = `Collected ${collected} · Distance ${Math.floor(distance / 10)}m`;
    document.getElementById('game-msg-cta').textContent = 'Press SPACE or tap to try again';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // subtle scrolling slope lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const lineSpacing = 60;
    const offset = (distance * 0.6) % lineSpacing;
    for (let i = -1; i < H / lineSpacing + 1; i++) {
      const y = i * lineSpacing + offset;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + 14);
      ctx.stroke();
    }

    for (const o of obstacles) {
      if (o.type === 'tree') drawTree(o.x, o.y, o.scale);
      else drawRock(o.x, o.y, o.scale);
    }
    for (const f of flakes) drawSnowflake(f.x, f.y, f.r, f.spin);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.4);
      ctx.beginPath();
      ctx.arc(p.x + p.vx * 10, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (state === 'playing') {
      drawPlayer(player.x, H - 90, player.vx);
    }
  }

  function updateHUD() {
    document.getElementById('game-hud-collected').textContent = collected;
    document.getElementById('game-hud-distance').textContent = Math.floor(distance / 10);
  }

  let lastT = null;
  function loop(t) {
    if (lastT === null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    if (state === 'playing') {
      update(dt);
      updateHUD();
    }
    draw();

    if (state !== 'stopped') raf = requestAnimationFrame(loop);
  }

  function startGame() {
    initState();
    state = 'playing';
    lastT = null;
    document.getElementById('game-overlay-msg').style.display = 'none';
    updateHUD();
  }

  function stopGame() {
    state = 'stopped';
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function openOverlay() {
    const overlay = document.getElementById('game-overlay');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    resize();
    state = 'idle';
    document.getElementById('game-overlay-msg').style.display = 'flex';
    document.getElementById('game-msg-title').textContent = 'GAME MODE';
    document.getElementById('game-msg-sub').textContent = 'Dodge trees & rocks. Collect snowflakes.';
    document.getElementById('game-msg-cta').textContent = 'Press SPACE or tap to start';
    lastT = null;
    if (!raf) raf = requestAnimationFrame(loop);
    initState();
    draw();
  }

  function closeOverlay() {
    const overlay = document.getElementById('game-overlay');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    stopGame();
  }

  function handleActivate() {
    if (state === 'idle' || state === 'gameover') startGame();
  }

  document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const toggle = document.getElementById('game-mode-toggle');
    const closeBtn = document.getElementById('game-close-btn');
    const overlay = document.getElementById('game-overlay');
    const msgLayer = document.getElementById('game-overlay-msg');

    toggle.addEventListener('click', openOverlay);
    closeBtn.addEventListener('click', closeOverlay);
    msgLayer.addEventListener('click', handleActivate);

    window.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
      if (e.key === ' ') { e.preventDefault(); handleActivate(); }
      if (e.key === 'Escape') closeOverlay();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });

    canvas.addEventListener('touchstart', (e) => {
      handleActivate();
      touchX = e.touches[0].clientX;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    canvas.addEventListener('touchend', () => { touchX = null; });

    window.addEventListener('resize', () => {
      if (overlay.classList.contains('open')) resize();
    });
  });
})();