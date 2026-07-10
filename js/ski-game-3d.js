/* ============================================================
   DESCENT — 3D ski mode (Three.js, r128)
   Rendered as white line-art on black to match the rest of the
   site (plotter-bot, Classic mode) rather than shaded/lit 3D —
   every mesh uses EdgesGeometry + LineBasicMaterial, no lighting
   needed. Exposed globally as window.Ski3D with .launch()/.stop().
   Swap the geometry builders below (buildPlayerMesh, buildTree,
   buildRock, buildSnowflake) for real models later if wanted —
   everything else (spawn/update/collision/HUD) is independent.
   ============================================================ */

window.Ski3D = (function () {
  let renderer, scene, camera;
  let canvas;
  let raf = null;
  let state = 'idle'; // idle -> playing -> gameover
  let player, playerGroup;
  let obstacles = [], flakes = [], groundLines = [];
  let speed, distance, collected, spawnTimer, elapsed;
  let keys = {};
  let touchX = null;
  let lastT = null;
  let W, H;

  const LANE_HALF = 4.2;
  const PLAYER_Z = 6;
  const SPAWN_Z = -60;
  const DESPAWN_Z = 10;

  function edgeMesh(geometry, color) {
    const edges = new THREE.EdgesGeometry(geometry);
    return new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color || 0xffffff }));
  }

  function buildPlayerMesh() {
    const group = new THREE.Group();

    const body = edgeMesh(new THREE.BoxGeometry(1.1, 1.4, 0.8), 0xffffff);
    body.position.y = 0.9;
    group.add(body);

    const goggles = edgeMesh(new THREE.BoxGeometry(0.9, 0.25, 0.85), 0x000000);
    goggles.position.set(0, 1.15, 0);
    const goggleLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 0.25, 0.85)),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    goggleLine.position.set(0, 1.15, 0);
    group.add(goggleLine);

    const antenna = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 2.1, 0)]),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    group.add(antenna);

    const tip = edgeMesh(new THREE.OctahedronGeometry(0.09), 0x3ddc84);
    tip.position.set(0, 2.15, 0);
    group.add(tip);

    const skiGeo = new THREE.BoxGeometry(0.12, 0.05, 1.6);
    const skiL = edgeMesh(skiGeo, 0xffffff);
    skiL.position.set(-0.35, 0.05, 0.2);
    const skiR = edgeMesh(skiGeo, 0xffffff);
    skiR.position.set(0.35, 0.05, 0.2);
    group.add(skiL, skiR);

    // frosty tuft accents
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tuft = edgeMesh(new THREE.TetrahedronGeometry(0.12), 0xffffff);
      tuft.position.set(Math.cos(a) * 0.6, 1.2 + Math.sin(i) * 0.2, Math.sin(a) * 0.4);
      group.add(tuft);
    }

    return group;
  }

  function buildTree() {
    const group = new THREE.Group();
    const cone = edgeMesh(new THREE.ConeGeometry(0.9, 2.4, 6), 0xffffff);
    cone.position.y = 1.4;
    const trunk = edgeMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6), 0xffffff);
    trunk.position.y = 0.25;
    group.add(cone, trunk);
    return group;
  }

  function buildRock() {
    return edgeMesh(new THREE.IcosahedronGeometry(0.75, 0), 0xffffff);
  }

  function buildSnowflake() {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
      line.rotation.z = (i / 3) * Math.PI;
      line.rotation.x = i === 1 ? Math.PI / 2 : 0;
      group.add(line);
    }
    return group;
  }

  function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 12, 55);

    camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setClearColor(0x000000, 1);

    playerGroup = buildPlayerMesh();
    scene.add(playerGroup);

    // scrolling ground grid — horizontal contour lines receding into fog
    for (let i = 0; i < 24; i++) {
      const z = -i * 4;
      const pts = [new THREE.Vector3(-LANE_HALF - 2, 0, z), new THREE.Vector3(LANE_HALF + 2, 0, z)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      groundLines.push(line);
    }
    // side rails hinting at the slope edges
    [-LANE_HALF - 2, LANE_HALF + 2].forEach(x => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 10), new THREE.Vector3(x, 0, -90)]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }));
      scene.add(line);
    });
  }

  function initState() {
    player = { x: 0, vx: 0 };
    obstacles.forEach(o => scene.remove(o.mesh));
    flakes.forEach(f => scene.remove(f.mesh));
    obstacles = [];
    flakes = [];
    speed = 0.16;
    distance = 0;
    collected = 0;
    spawnTimer = 0;
    elapsed = 0;
  }

  function resize() {
    const parent = canvas.parentElement;
    W = parent.clientWidth;
    H = parent.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  function spawn() {
    const roll = Math.random();
    const x = (Math.random() * 2 - 1) * LANE_HALF;
    if (roll < 0.4) {
      const mesh = buildTree();
      mesh.position.set(x, 0, SPAWN_Z);
      scene.add(mesh);
      obstacles.push({ mesh, r: 0.9 });
    } else if (roll < 0.65) {
      const mesh = buildRock();
      mesh.position.set(x, 0.4, SPAWN_Z);
      scene.add(mesh);
      obstacles.push({ mesh, r: 0.75 });
    } else {
      const mesh = buildSnowflake();
      mesh.position.set(x, 1.1, SPAWN_Z);
      scene.add(mesh);
      flakes.push({ mesh, r: 0.5 });
    }
  }

  function update(dt) {
    elapsed += dt;
    speed = Math.min(0.34, 0.16 + elapsed * 0.0016);
    distance += speed * dt * 240;

    const targetVx = keys.left ? -5.5 : keys.right ? 5.5 : 0;
    player.vx += (targetVx - player.vx) * 0.15;
    if (touchX !== null) player.vx = (touchX - player.x) * 0.24;
    player.x += player.vx * dt;
    player.x = Math.max(-LANE_HALF, Math.min(LANE_HALF, player.x));
    playerGroup.position.x = player.x;
    playerGroup.rotation.z = -player.vx * 0.03;

    camera.position.set(player.x * 0.6, 3.4, PLAYER_Z + 6);
    camera.lookAt(player.x * 0.9, 1.2, PLAYER_Z - 8);

    const dz = speed * dt * 60;
    spawnTimer -= dt;
    const spawnRate = Math.max(0.28, 0.6 - elapsed * 0.01);
    if (spawnTimer <= 0) { spawn(); spawnTimer = spawnRate; }

    for (const o of obstacles) o.mesh.position.z += dz;
    for (const f of flakes) { f.mesh.position.z += dz; f.mesh.rotation.y += dt * 2; }

    for (const line of groundLines) {
      line.position.z += dz;
      if (line.position.z > 12) line.position.z -= 96;
    }

    for (const o of obstacles) {
      const dx = o.mesh.position.x - player.x;
      const dzp = o.mesh.position.z - PLAYER_Z;
      const rr = o.r + 0.55;
      if (dx * dx + dzp * dzp < rr * rr) { triggerGameOver(); return; }
    }
    flakes = flakes.filter(f => {
      const dx = f.mesh.position.x - player.x;
      const dzp = f.mesh.position.z - PLAYER_Z;
      const collisionRadius = f.r + 1.1;
      if (dx * dx + dzp * dzp < collisionRadius * collisionRadius) {
        collected++;
        scene.remove(f.mesh);
        return false;
      }
      return true;
    });

    obstacles = obstacles.filter(o => {
      if (o.mesh.position.z > DESPAWN_Z) { scene.remove(o.mesh); return false; }
      return true;
    });
    flakes = flakes.filter(f => {
      if (f.mesh.position.z > DESPAWN_Z) { scene.remove(f.mesh); return false; }
      return true;
    });
  }

  function updateHUD() {
    const c = document.getElementById('game-hud-collected-3d');
    const d = document.getElementById('game-hud-distance-3d');
    if (c) c.textContent = collected;
    if (d) d.textContent = Math.floor(distance / 10);
  }

  function triggerGameOver() {
    state = 'gameover';
    updateHUD();
    const msg = document.getElementById('game-overlay-msg-3d');
    msg.style.display = 'flex';
    document.getElementById('game-msg-title-3d').textContent = 'WIPEOUT';
    document.getElementById('game-msg-sub-3d').textContent = `Collected ${collected} · Distance ${Math.floor(distance / 10)}m`;
    document.getElementById('game-msg-cta-3d').textContent = 'Press SPACE or tap to try again';
  }

  function loop(t) {
    if (lastT === null) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    if (state === 'playing') {
      update(dt);
      updateHUD();
    }
    renderer.render(scene, camera);

    if (state !== 'stopped') raf = requestAnimationFrame(loop);
  }

  function startRun() {
    initState();
    state = 'playing';
    lastT = null;
    document.getElementById('game-overlay-msg-3d').style.display = 'none';
    updateHUD();
  }

  function handleActivate() {
    if (state === 'idle' || state === 'gameover') startRun();
  }

  function launch() {
    if (!renderer) {
      canvas = document.getElementById('game-canvas-3d');
      initScene();
      wireControls();
    }
    resize();
    state = 'idle';
    initState();
    document.getElementById('game-overlay-msg-3d').style.display = 'flex';
    document.getElementById('game-msg-title-3d').textContent = 'DESCENT';
    document.getElementById('game-msg-sub-3d').textContent = 'Dodge trees & rocks. Collect snowflakes.';
    document.getElementById('game-msg-cta-3d').textContent = 'Press SPACE or tap to start';
    lastT = null;
    if (!raf) raf = requestAnimationFrame(loop);
    renderer.render(scene, camera);
  }

  function stop() {
    state = 'stopped';
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function screenXToWorldX(screenX) {
    const rect = canvas.getBoundingClientRect();
    return ((screenX - rect.left) / rect.width) * (LANE_HALF * 2) - LANE_HALF;
  }

  function wireControls() {
    window.addEventListener('keydown', (e) => {
      const panel = document.getElementById('game-3d-panel');
      if (!panel.classList.contains('active')) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
      if (e.key === ' ') { e.preventDefault(); handleActivate(); }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });

    document.getElementById('game-overlay-msg-3d').addEventListener('click', handleActivate);

    canvas.addEventListener('touchstart', (e) => {
      handleActivate();
      touchX = screenXToWorldX(e.touches[0].clientX);
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => { touchX = screenXToWorldX(e.touches[0].clientX); }, { passive: true });
    canvas.addEventListener('touchend', () => { touchX = null; });

    window.addEventListener('resize', () => {
      if (document.getElementById('game-3d-panel').classList.contains('active') && renderer) resize();
    });
  }

  return { launch, stop };
})();