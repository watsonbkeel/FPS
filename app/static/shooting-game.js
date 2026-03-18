(() => {
  const page = document.getElementById('shooting-game-page');
  if (!page) {
    return;
  }

  const difficultySelect = page.querySelector('[data-shooting-difficulty]');
  const weaponSelect = page.querySelector('[data-shooting-weapon]');
  const viewButtons = [...page.querySelectorAll('[data-view-mode]')];
  const autoFireToggle = page.querySelector('[data-auto-fire]');
  const canvas = page.querySelector('[data-battle-canvas]');
  const stage = page.querySelector('[data-battle-stage]');
  const reticle = page.querySelector('[data-battle-reticle]');
  const flash = page.querySelector('[data-battle-flash]');
  const startOverlay = page.querySelector('[data-battle-start]');
  const startButton = page.querySelector('[data-battle-start-button]');
  const endOverlay = page.querySelector('[data-battle-end]');
  const replayButton = page.querySelector('[data-battle-replay]');
  const endTitle = page.querySelector('[data-battle-end-title]');
  const endSummary = page.querySelector('[data-battle-end-summary]');
  const scoreEl = page.querySelector('[data-battle-score]');
  const killsEl = page.querySelector('[data-battle-kills]');
  const timerEl = page.querySelector('[data-battle-timer]');
  const integrityEl = page.querySelector('[data-battle-integrity]');
  const alliesEl = page.querySelector('[data-battle-allies]');
  const statusEl = page.querySelector('[data-battle-status]');
  const resultEl = page.querySelector('[data-battle-result]');
  const messageEl = page.querySelector('[data-battle-message]');
  const weaponPill = page.querySelector('[data-battle-weapon-pill]');
  const meterLabel = page.querySelector('[data-battle-meter-label]');
  const meterFill = page.querySelector('[data-battle-meter-fill]');
  const viewLabel = page.querySelector('[data-battle-view-label]');
  const fireButton = page.querySelector('[data-battle-fire]');
  const claimUrl = page.dataset.claimUrl;
  const csrf = page.dataset.csrf;
  const petId = page.dataset.petId;
  const returnUrl = page.dataset.returnUrl;
  const petName = page.dataset.petName || '宠物';
  const ctx = canvas.getContext('2d');

  const difficultyConfig = {
    easy: { duration: 20000, spawnEvery: 1150, enemySpeed: 0.08, integrityDrain: 4, scoreTarget: 160, totalEnemies: 18 },
    normal: { duration: 20000, spawnEvery: 860, enemySpeed: 0.11, integrityDrain: 6, scoreTarget: 210, totalEnemies: 24 },
    hard: { duration: 20000, spawnEvery: 690, enemySpeed: 0.14, integrityDrain: 8, scoreTarget: 250, totalEnemies: 30 },
  };

  const weaponConfig = {
    machine_gun: {
      label: '重机枪',
      meterLabel: '枪管热量',
      fireMode: 'auto',
      fireRate: 90,
      heatPerShot: 7,
      coolPerSecond: 38,
      spread: 0.028,
      damage: 26,
      splash: 0,
      status: '连发压制',
    },
    coastal_cannon: {
      label: '岸防炮',
      meterLabel: '装填进度',
      fireMode: 'single',
      fireRate: 1450,
      heatPerShot: 100,
      coolPerSecond: 64,
      spread: 0.012,
      damage: 85,
      splash: 0.12,
      status: '范围爆破',
    },
  };

  let viewMode = 'first';
  let state = null;
  let rafId = 0;
  let pointer = { x: 0.5, y: 0.58 };
  let pointerDown = false;
  let lastPointerType = 'mouse';
  const prefersTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const keyState = { w: false, a: false, s: false, d: false };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setViewMode(nextMode) {
    viewMode = nextMode;
    viewButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.viewMode === nextMode));
    if (viewLabel) {
      viewLabel.textContent = nextMode === 'first' ? '第一人称阵地' : `${petName} 第三人称防守`;
    }
  }

  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateReticle() {
    const rect = stage.getBoundingClientRect();
    const x = pointer.x * rect.width;
    const y = pointer.y * rect.height;
    reticle.style.left = `${x}px`;
    reticle.style.top = `${y}px`;
  }

  function getCameraProfile() {
    const height = stage.clientHeight;
    const aimBiasX = (pointer.x - 0.5) * 0.12;
    const player = state?.player || { x: 0, z: 0.97 };
    const depthOffset = (player.z - 0.97) * 0.34;
    if (viewMode === 'third') {
      return {
        cameraX: player.x - 0.22 + aimBiasX * 0.22,
        horizon: height * (0.35 + depthOffset * 0.52),
        baseY: height * (0.98 + depthOffset * 0.25),
        cameraLift: 0.03 + depthOffset * 1.1,
      };
    }
    return {
      cameraX: player.x * 0.92 + aimBiasX * 0.04,
      horizon: height * (0.275 + depthOffset * 0.45),
      baseY: height * (0.91 + depthOffset * 0.22),
      cameraLift: depthOffset * 0.9,
    };
  }

  function project(worldX, worldZ, heightRatio = 0) {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const camera = getCameraProfile();
    const depth = clamp(worldZ, 0.04, 1.15);
    const perspective = 0.24 + depth * 0.96;
    const recoilLift = (state?.recoil || 0) * (viewMode === 'third' ? 6 : 10);
    const bob = Math.sin((state?.cameraPhase || 0) * 0.0014) * (viewMode === 'third' ? 3 : 2);
    const screenX = width * 0.5 + (worldX - camera.cameraX) * width * 0.34 * perspective;
    const screenY = camera.baseY - (1 - depth) * (camera.baseY - camera.horizon) - heightRatio * height * 0.16 * perspective - camera.cameraLift * height - recoilLift + bob;
    return { x: screenX, y: screenY, scale: clamp(perspective * 0.68, 0.16, 1.5) };
  }

  function computeIntegrity() {
    const total = state.bunkers.reduce((sum, bunker) => sum + bunker.hp, 0);
    state.integrity = Math.round(total / state.bunkers.length);
  }

  function spawnEnemy() {
    if (state.spawnedEnemies >= state.totalEnemies) {
      return;
    }
    const types = [
      { label: '皮克托突击兵', hp: 48, color: '#52d86f', edge: '#c8ffd2', shadow: '#1c7b35', attackStart: 0.52, holdLine: 0.82, attackRate: 1450, attackDamage: 7, speedBonus: 0, score: 10 },
      { label: '皮克托冲锋兵', hp: 62, color: '#44c961', edge: '#ccffd5', shadow: '#1a6e30', attackStart: 0.5, holdLine: 0.84, attackRate: 1180, attackDamage: 8, speedBonus: 0.02, score: 14 },
      { label: '皮克托火力兵', hp: 74, color: '#5ee67b', edge: '#d7ffe0', shadow: '#226a38', attackStart: 0.48, holdLine: 0.8, attackRate: 980, attackDamage: 10, speedBonus: -0.01, score: 18 },
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    state.spawnedEnemies += 1;
    state.enemies.push({
      id: Math.random().toString(36).slice(2),
      x: -0.9 + Math.random() * 1.8,
      z: 0.08,
      wobble: Math.random() * Math.PI * 2,
      stride: Math.random() * Math.PI * 2,
      hp: type.hp,
      maxHp: type.hp,
      state: 'advance',
      cooldown: 500 + Math.random() * 400,
      dead: false,
      hitFlash: 0,
      deathTimer: 0,
      fallDir: Math.random() > 0.5 ? 1 : -1,
      ...type,
    });
  }

  function freshState(difficulty) {
    return {
      running: false,
      startedAt: 0,
      lastFrame: 0,
      spawnClock: 0,
      totalEnemies: difficulty.totalEnemies,
      spawnedEnemies: 0,
      allyKillCap: Math.floor(difficulty.totalEnemies / 3),
      allyKills: 0,
      playerKills: 0,
      player: { x: 0, z: 0.97, phase: 0 },
      enemies: [],
      bunkers: [
        { lane: 'east', x: -0.72, hp: 100, smoke: 0 },
        { lane: 'center', x: 0, hp: 100, smoke: 0 },
        { lane: 'west', x: 0.72, hp: 100, smoke: 0 },
      ],
      defenders: [
        { name: '东侧炮位', bunker: 0, x: -0.72, z: 0.97, homeX: -0.72, homeZ: 0.97, targetX: -0.72, targetZ: 0.97, cooldown: 280, flash: 0, alive: true, movePhase: 0, moving: false },
        { name: '中路火力', bunker: 1, x: 0, z: 0.95, homeX: 0, homeZ: 0.95, targetX: 0, targetZ: 0.95, cooldown: 0, flash: 0, alive: true, movePhase: 0, moving: false },
        { name: '西侧火力', bunker: 2, x: 0.72, z: 0.97, homeX: 0.72, homeZ: 0.97, targetX: 0.72, targetZ: 0.97, cooldown: 560, flash: 0, alive: true, movePhase: 0, moving: false },
      ],
      projectiles: [],
      sparks: [],
      kills: 0,
      score: 0,
      integrity: 100,
      shots: 0,
      hits: 0,
      meter: 0,
      recoil: 0,
      cameraPhase: 0,
      overheated: false,
      fireCooldown: 0,
      lastMessageAt: 0,
      message: '敌军运输艇正在逼近，友军已进入防守位。',
      claimed: false,
    };
  }

  function registerKill(enemy, source) {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.state = 'down';
    enemy.deathTimer = 420;
    state.kills += 1;
    if (source === 'ally') {
      state.allyKills += 1;
    } else {
      state.playerKills += 1;
      state.score += enemy.score + Math.round((1 - enemy.z) * 12);
    }
    state.sparks.push({ x: enemy.x, z: enemy.z, life: 300 });
  }

  function dealDamage(enemy, amount, source) {
    if (!enemy || enemy.dead) return false;
    const nextHp = enemy.hp - amount;
    if (source === 'ally' && nextHp <= 0 && state.allyKills >= state.allyKillCap) {
      enemy.hp = Math.max(1, enemy.hp - Math.max(6, amount * 0.6));
      enemy.hitFlash = 140;
      return false;
    }
    enemy.hp = nextHp;
    enemy.hitFlash = 160;
    if (enemy.hp <= 0) {
      registerKill(enemy, source);
      return true;
    }
    return false;
  }

  function setMessage(text) {
    state.message = text;
    state.lastMessageAt = performance.now();
    messageEl.textContent = text;
  }

  function setWeapon(nextWeapon, announce = true) {
    if (!weaponConfig[nextWeapon] || weaponSelect.value === nextWeapon) {
      return;
    }
    weaponSelect.value = nextWeapon;
    if (state) {
      state.meter = 0;
      state.overheated = false;
      state.fireCooldown = 0;
    }
    if (announce) {
      setMessage(`已切换到${weaponConfig[nextWeapon].label}。`);
    }
    if (!state?.running) {
      drawWorld();
      updateReticle();
      updateMeter(0);
    }
  }

  function updatePlayerMovement(delta) {
    if (!state?.player) {
      return;
    }
    const speed = delta * 0.00115;
    let moveX = 0;
    let moveZ = 0;
    if (keyState.a) moveX -= 1;
    if (keyState.d) moveX += 1;
    if (keyState.w) moveZ -= 1;
    if (keyState.s) moveZ += 1;

    if (moveX || moveZ) {
      const magnitude = Math.hypot(moveX, moveZ) || 1;
      state.player.x = clamp(state.player.x + (moveX / magnitude) * speed, -0.34, 0.34);
      state.player.z = clamp(state.player.z + (moveZ / magnitude) * speed * 0.95, 0.88, 1.05);
      state.player.phase += delta * 0.018;
    } else {
      state.player.phase *= 0.96;
    }
  }

  function flashShot() {
    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
    state.recoil = Math.min(1, state.recoil + 0.55);
  }

  function applyPlayerShot() {
    const weapon = weaponConfig[weaponSelect.value] || weaponConfig.machine_gun;
    const now = performance.now();
    if (!state.running) return;

    if (weapon.fireMode === 'auto') {
      if (state.overheated || now < state.fireCooldown) {
        return;
      }
      state.meter = clamp(state.meter + weapon.heatPerShot, 0, 100);
      if (state.meter >= 100) {
        state.overheated = true;
        setMessage('枪管过热，先压一下火力。');
      }
    } else {
      if (now < state.fireCooldown) return;
      state.meter = 100;
    }

    state.fireCooldown = now + weapon.fireRate;
    state.shots += 1;
    flashShot();

    const aimX = (pointer.x - 0.5) * 2 + (Math.random() - 0.5) * weapon.spread;
    const aimDepth = clamp(pointer.y * 0.95 + 0.02, 0.12, 1);
    const hits = [];

    for (const enemy of state.enemies) {
      const dx = Math.abs(enemy.x - aimX);
      const dz = Math.abs(enemy.z - aimDepth);
      const threshold = viewMode === 'third' ? 0.15 : 0.12;
      if (dx < threshold + weapon.splash && dz < 0.16 + weapon.splash) {
        hits.push(enemy);
      }
    }

    if (!hits.length) {
      setMessage(weapon.fireMode === 'auto' ? '压住水线，别让敌军冲到沙袋前。' : '岸防炮落点偏了，再预判一点。');
      return;
    }

    state.hits += 1;
    const affected = weapon.fireMode === 'single' ? hits : [hits[0]];
    let killedNow = 0;
    for (const enemy of affected) {
      state.sparks.push({ x: enemy.x, z: enemy.z, life: 220 });
      if (dealDamage(enemy, weapon.damage, 'player')) {
        killedNow += 1;
      }
    }
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    if (killedNow) {
      setMessage(killedNow > 1 ? `连杀 ${killedNow} 名敌军，继续压制。` : '命中有效，海滩压力正在下降。');
    }
  }

  function fireDefenders(delta) {
    for (const ally of state.defenders) {
      if (!ally.alive) continue;
      const bunker = state.bunkers[ally.bunker];
      if (!bunker || bunker.hp <= 0) {
        ally.alive = false;
        continue;
      }
      ally.cooldown -= delta;
      ally.flash = Math.max(0, ally.flash - delta);
      ally.movePhase += delta * 0.015;
      const nearbyThreats = state.enemies.filter((enemy) => !enemy.dead && enemy.z > 0.18);
      let target = null;
      if (nearbyThreats.length) {
        target = nearbyThreats.reduce((best, enemy) => {
          if (!best) return enemy;
          const currentScore = Math.abs(enemy.x - ally.x) - enemy.z * 0.25;
          const bestScore = Math.abs(best.x - ally.x) - best.z * 0.25;
          return currentScore < bestScore ? enemy : best;
        }, null);
        ally.targetX = clamp(target.x, ally.homeX - 0.22, ally.homeX + 0.22);
        ally.targetZ = clamp(0.92 + (target.z - 0.5) * 0.08, ally.homeZ - 0.04, ally.homeZ + 0.04);
      } else {
        ally.targetX = ally.homeX;
        ally.targetZ = ally.homeZ;
      }
      ally.moving = Math.abs(ally.targetX - ally.x) > 0.01 || Math.abs(ally.targetZ - ally.z) > 0.006;
      ally.x += (ally.targetX - ally.x) * 0.08;
      ally.z += (ally.targetZ - ally.z) * 0.08;

      target = state.enemies.find((enemy) => !enemy.dead && Math.abs(enemy.x - ally.x) < 0.42 && enemy.z > 0.18);
      if (target && ally.cooldown <= 0) {
        ally.cooldown = 620 + Math.random() * 240;
        ally.flash = 120;
        dealDamage(target, 18, 'ally');
        state.projectiles.push({ fromX: ally.x, fromZ: ally.z - 0.02, toX: target.x, toZ: target.z, life: 120, team: 'ally' });
      }
    }
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  }

  function updateEnemies(delta, difficulty) {
    const next = [];
    for (const enemy of state.enemies) {
      if (enemy.dead) {
        enemy.deathTimer -= delta;
        enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
        if (enemy.deathTimer > 0) {
          next.push(enemy);
        }
        continue;
      }
      enemy.cooldown -= delta;
      enemy.wobble += delta * 0.006;
      enemy.stride += delta * 0.012;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
      if (enemy.z < enemy.attackStart) {
        enemy.z += (difficulty.enemySpeed + enemy.speedBonus) * (delta / 1000);
        const driftTarget = enemy.x > 0 ? enemy.x - 0.02 : enemy.x + 0.02;
        enemy.x += (driftTarget - enemy.x) * 0.02;
        enemy.state = 'advance';
      } else {
        enemy.state = enemy.z < enemy.holdLine ? 'attack' : 'push';
        if (enemy.z < enemy.holdLine) {
          enemy.z += (difficulty.enemySpeed + enemy.speedBonus) * (delta / 1000) * 0.28;
        }
        if (enemy.cooldown <= 0) {
          enemy.cooldown = enemy.attackRate;
          const targetBunker = state.bunkers.reduce((best, bunker) => {
            if (bunker.hp <= 0) return best;
            if (!best) return bunker;
            return Math.abs(bunker.x - enemy.x) < Math.abs(best.x - enemy.x) ? bunker : best;
          }, null);
          if (targetBunker) {
            targetBunker.hp = clamp(targetBunker.hp - (difficulty.integrityDrain + enemy.attackDamage), 0, 100);
            targetBunker.smoke = 320;
            computeIntegrity();
            const ally = state.defenders.find((item) => item.bunker === state.bunkers.indexOf(targetBunker));
            if (ally && targetBunker.hp <= 0) {
              ally.alive = false;
            }
            state.projectiles.push({ fromX: enemy.x, fromZ: enemy.z, toX: targetBunker.x, toZ: 0.98, life: 150, team: 'enemy' });
            setMessage(`${enemy.label} 已推进到半场并开始射击碉堡。`);
          }
        }
      }
      if (enemy.hp > 0) next.push(enemy);
    }
    state.enemies = next;
    for (const bunker of state.bunkers) {
      bunker.smoke = Math.max(0, bunker.smoke - delta);
    }
  }

  function updateProjectiles(delta) {
    state.projectiles = state.projectiles
      .map((shot) => ({ ...shot, life: shot.life - delta }))
      .filter((shot) => shot.life > 0);
    state.sparks = state.sparks
      .map((spark) => ({ ...spark, life: spark.life - delta }))
      .filter((spark) => spark.life > 0);
  }

  function updateMeter(delta) {
    const weapon = weaponConfig[weaponSelect.value] || weaponConfig.machine_gun;
    state.recoil = Math.max(0, state.recoil - delta * 0.005);
    state.cameraPhase += delta;
    if (weapon.fireMode === 'auto') {
      state.meter = Math.max(0, state.meter - weapon.coolPerSecond * (delta / 1000));
      if (state.overheated && state.meter <= 38) {
        state.overheated = false;
      }
      meterFill.style.width = `${state.meter}%`;
    } else {
      state.meter = Math.max(0, state.meter - weapon.coolPerSecond * (delta / 1000));
      meterFill.style.width = `${100 - state.meter}%`;
    }
    meterLabel.textContent = weapon.meterLabel;
    weaponPill.textContent = `${weapon.label} / ${weapon.status}`;
  }

  function drawWorld() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.56);
    sky.addColorStop(0, '#6d7f8c');
    sky.addColorStop(0.48, '#a0afb8');
    sky.addColorStop(1, '#dac39c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 224, 151, 0.25)';
    ctx.beginPath();
    ctx.arc(width * 0.79, height * 0.15, 62, 0, Math.PI * 2);
    ctx.fill();

    const sea = ctx.createLinearGradient(0, height * 0.18, 0, height * 0.66);
    sea.addColorStop(0, '#70828f');
    sea.addColorStop(0.54, '#42616e');
    sea.addColorStop(1, '#213d47');
    ctx.fillStyle = sea;
    ctx.fillRect(0, height * 0.19, width, height * 0.4);
    ctx.fillStyle = 'rgba(241, 246, 248, 0.74)';
    ctx.fillRect(0, height * 0.51, width, 8);
    const beach = ctx.createLinearGradient(0, height * 0.52, 0, height);
    beach.addColorStop(0, '#d9b88e');
    beach.addColorStop(0.66, '#ab7d4d');
    beach.addColorStop(1, '#674626');
    ctx.fillStyle = beach;
    ctx.fillRect(0, height * 0.52, width, height * 0.48);

    ctx.fillStyle = 'rgba(25, 29, 34, 0.42)';
    for (const boatX of [0.14, 0.38, 0.62, 0.84]) {
      const x = width * boatX;
      const y = height * 0.34;
      ctx.beginPath();
      ctx.moveTo(x - 34, y + 10);
      ctx.lineTo(x + 38, y + 10);
      ctx.lineTo(x + 24, y + 20);
      ctx.lineTo(x - 20, y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 12, y - 10, 24, 12);
    }

    drawBunkers(width, height);

    drawActors(width, height);
    drawPlayer(width, height);
    drawProjectiles(width, height);
  }

  function drawBunkers(width, height) {
    const wallTopLeft = project(-1.08, 0.93, 0);
    const wallTopRight = project(1.08, 0.93, 0);
    const wallBottomLeft = project(-1.18, 1.08, 0);
    const wallBottomRight = project(1.18, 1.08, 0);

    ctx.fillStyle = '#8d6941';
    ctx.beginPath();
    ctx.moveTo(wallTopLeft.x, wallTopLeft.y);
    ctx.lineTo(wallTopRight.x, wallTopRight.y);
    ctx.lineTo(wallBottomRight.x, wallBottomRight.y);
    ctx.lineTo(wallBottomLeft.x, wallBottomLeft.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6f4d2b';
    ctx.beginPath();
    ctx.moveTo(wallTopLeft.x, wallTopLeft.y + 10);
    ctx.lineTo(wallTopRight.x, wallTopRight.y + 10);
    ctx.lineTo(wallBottomRight.x, wallBottomRight.y);
    ctx.lineTo(wallBottomLeft.x, wallBottomLeft.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(54, 35, 17, 0.24)';
    ctx.lineWidth = 1;
    for (let t = 0; t <= 1; t += 0.08) {
      const topX = wallTopLeft.x + (wallTopRight.x - wallTopLeft.x) * t;
      const topY = wallTopLeft.y + (wallTopRight.y - wallTopLeft.y) * t;
      const bottomX = wallBottomLeft.x + (wallBottomRight.x - wallBottomLeft.x) * t;
      const bottomY = wallBottomLeft.y + (wallBottomRight.y - wallBottomLeft.y) * t;
      ctx.beginPath();
      ctx.moveTo(topX, topY + 8);
      ctx.lineTo(bottomX, bottomY);
      ctx.stroke();
    }

    for (let t = 0.02; t <= 0.94; t += 0.12) {
      const topX = wallTopLeft.x + (wallTopRight.x - wallTopLeft.x) * t;
      const topY = wallTopLeft.y + (wallTopRight.y - wallTopLeft.y) * t;
      ctx.fillStyle = '#a57b4f';
      ctx.beginPath();
      ctx.roundRect(topX, topY - 18, 22, 18, 4);
      ctx.fill();
    }

    for (const bunker of state.bunkers) {
      const p = project(bunker.x, 0.95, 0);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(255, 244, 214, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 70, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6941';
      ctx.fillRect(-28, -40, 56, 40);
      ctx.fillStyle = '#6f4d2b';
      ctx.fillRect(-28, -12, 56, 12);
      ctx.fillStyle = '#a57b4f';
      for (let x = -26; x <= 10; x += 18) {
        ctx.fillRect(x, -56, 14, 16);
      }
      if (bunker.smoke > 0) {
        const alpha = clamp(bunker.smoke / 320, 0.1, 0.5);
        ctx.fillStyle = `rgba(78, 78, 78, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, -30, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawRifle(x, y, scale, palette) {
    const s = scale;
    ctx.fillStyle = palette.dark;
    ctx.fillRect(x - 12 * s, y - 3 * s, 20 * s, 6 * s);
    ctx.fillRect(x + 8 * s, y - 2 * s, 18 * s, 3 * s);
    ctx.fillRect(x - 15 * s, y - 3 * s, 5 * s, 9 * s);
    ctx.fillRect(x - 2 * s, y + 2 * s, 4 * s, 8 * s);
    ctx.fillRect(x + 1 * s, y - 6 * s, 5 * s, 3 * s);
    ctx.fillStyle = palette.light;
    ctx.fillRect(x - 9 * s, y - 2 * s, 14 * s, 3 * s);
    ctx.fillRect(x + 8 * s, y - 1 * s, 13 * s, 2 * s);
    ctx.fillRect(x - 11 * s, y + 3 * s, 6 * s, 2 * s);
  }

  function drawPictogramEnemy(scale, actor) {
    const s = scale;
    const armSwing = actor.state === 'advance' || actor.state === 'push' ? Math.sin(actor.stride) * 5 * s : 0;
    const legSwing = actor.state === 'advance' || actor.state === 'push' ? Math.cos(actor.stride) * 4 * s : 0;
    const attackLean = actor.state === 'attack' ? -4 * s : 0;
    ctx.fillStyle = 'rgba(12, 40, 18, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 24 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = actor.shadow;
    ctx.beginPath();
    ctx.arc(3 * s, -50 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-8 * s, -40 * s, 18 * s, 34 * s, 5 * s);
    ctx.fill();
    ctx.fillRect(-18 * s, -24 * s + armSwing, 10 * s, 24 * s);
    ctx.fillRect(10 * s, -24 * s - armSwing * 0.6, 10 * s, 24 * s);
    ctx.fillRect(-9 * s, -4 * s + legSwing, 8 * s, 22 * s);
    ctx.fillRect(2 * s, -4 * s - legSwing, 8 * s, 22 * s);

    ctx.fillStyle = actor.color;
    ctx.beginPath();
    ctx.arc(0, -50 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-10 * s, -40 * s + attackLean, 18 * s, 34 * s, 5 * s);
    ctx.fill();
    ctx.fillRect(-20 * s, -24 * s + armSwing, 10 * s, 24 * s);
    ctx.fillRect(8 * s, -24 * s - armSwing * 0.6, 10 * s, 24 * s);
    ctx.fillRect(-10 * s, -4 * s + legSwing, 8 * s, 22 * s);
    ctx.fillRect(2 * s, -4 * s - legSwing, 8 * s, 22 * s);

    ctx.strokeStyle = actor.edge;
    ctx.lineWidth = Math.max(1.4, 2 * s);
    ctx.strokeRect(-10 * s, -40 * s + attackLean, 18 * s, 34 * s);
    ctx.beginPath();
    ctx.moveTo(0, -66 * s);
    ctx.lineTo(9 * s, -54 * s);
    ctx.lineTo(0, -43 * s);
    ctx.lineTo(-9 * s, -54 * s);
    ctx.closePath();
    ctx.stroke();

    drawRifle(15 * s, -14 * s, s, { dark: actor.shadow, light: actor.edge });
  }

  function drawDefender(scale, ally) {
    const s = scale;
    const recoil = ally.flash > 0 ? 4 * s : 0;
    const runSwing = ally.moving ? Math.sin(ally.movePhase) * 4 * s : 0;
    const runLeg = ally.moving ? Math.cos(ally.movePhase) * 3.5 * s : 0;
    ctx.fillStyle = 'rgba(12, 16, 20, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 24 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c98c';
    ctx.beginPath();
    ctx.arc(0, -48 * s + recoil * 0.2, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20303b';
    ctx.beginPath();
    ctx.roundRect(-12 * s, -38 * s + recoil * 0.1, 24 * s, 34 * s, 7 * s);
    ctx.fill();
    ctx.fillStyle = '#31414d';
    ctx.fillRect(-20 * s, -22 * s + runSwing, 8 * s, 22 * s);
    ctx.fillRect(12 * s, -22 * s - runSwing * 0.7, 8 * s, 22 * s);
    ctx.fillRect(-8 * s, -2 * s + runLeg, 7 * s, 24 * s);
    ctx.fillRect(1 * s, -2 * s - runLeg, 7 * s, 24 * s);
    drawRifle(20 * s, -16 * s, s, { dark: '#28333d', light: '#7d8791' });
    if (ally.flash > 0) {
      ctx.fillStyle = 'rgba(255, 213, 134, 0.9)';
      ctx.beginPath();
      ctx.arc(34 * s, -14 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawActors(width, height) {
    const drawOrder = [];
    for (const ally of state.defenders) drawOrder.push({ team: 'ally', actor: ally, z: 0.96 });
    for (const enemy of state.enemies) drawOrder.push({ team: 'enemy', actor: enemy, z: enemy.z });
    drawOrder.sort((a, b) => a.z - b.z);

    for (const item of drawOrder) {
      if (item.team === 'ally') {
        const p = project(item.actor.x, item.actor.z, 0);
        const scale = (viewMode === 'third' ? 1 : 0.78) * 0.95;
        ctx.save();
        ctx.translate(p.x, p.y);
        drawDefender(scale, item.actor);
        ctx.fillStyle = 'rgba(255, 231, 170, 0.35)';
        ctx.beginPath();
        ctx.arc((item.actor.targetX - item.actor.x) * 180, 34, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const p = project(item.actor.x, item.actor.z, 0);
        const runLift = (item.actor.state === 'advance' || item.actor.state === 'push') ? Math.abs(Math.sin(item.actor.stride)) * 5 * p.scale : 0;
        const lean = item.actor.state === 'attack' ? -0.08 : 0.12;
        const scale = p.scale * 1.18;
        const hitOffset = item.actor.hitFlash > 0 ? Math.sin(item.actor.hitFlash * 0.08) * 3 : 0;
        const fallProgress = item.actor.dead ? 1 - item.actor.deathTimer / 420 : 0;
        ctx.save();
        ctx.translate(p.x, p.y + runLift + hitOffset + fallProgress * 18);
        ctx.rotate(item.actor.dead ? item.actor.fallDir * fallProgress * 1.15 : 0);
        ctx.transform(1, lean, 0, 1, 0, 0);
        ctx.globalAlpha = item.actor.dead ? Math.max(0.18, 1 - fallProgress * 0.65) : 1;
        drawPictogramEnemy(scale, item.actor);
        if (item.actor.state === 'attack') {
          ctx.fillStyle = 'rgba(255, 132, 89, 0.85)';
          ctx.beginPath();
          ctx.arc(34 * scale, -12 * scale, 7 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        if (item.actor.hitFlash > 0) {
          ctx.fillStyle = `rgba(255, 240, 168, ${Math.min(0.7, item.actor.hitFlash / 180)})`;
          ctx.beginPath();
          ctx.arc(0, -24 * scale, 18 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawPlayer(width, height) {
    if (viewMode === 'third') {
      const p = project(state.player.x - 0.08, state.player.z + 0.04, 0);
      const sway = (pointer.x - 0.5) * 18;
      const moveBob = Math.sin(state.player.phase) * 8;
      const lift = moveBob - state.recoil * 8;
      ctx.save();
      ctx.translate(p.x + sway, p.y + lift);
      ctx.fillStyle = '#20303b';
      ctx.beginPath();
      ctx.moveTo(-42, 68);
      ctx.lineTo(42, 68);
      ctx.lineTo(22, -10);
      ctx.lineTo(-22, -10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f0c98c';
      ctx.beginPath();
      ctx.arc(0, -36, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3843';
      ctx.roundRect(-14, -6, 28, 66, 8);
      ctx.fill();
      drawRifle(28, -6, 1.35, { dark: '#23303a', light: '#808890' });
      ctx.restore();
    } else {
      const weapon = weaponSelect.value;
      const lateralShift = state.player.x * width * 0.08;
      const forwardShift = (state.player.z - 0.97) * height * 0.22 - state.recoil * 18;
      ctx.fillStyle = weapon === 'coastal_cannon' ? '#232a31' : '#1d242a';
      if (weapon === 'coastal_cannon') {
        ctx.beginPath();
        ctx.moveTo(width * 0.26 + lateralShift, height);
        ctx.lineTo(width * 0.74 + lateralShift, height);
        ctx.lineTo(width * 0.6 + lateralShift, height * 0.78 + forwardShift);
        ctx.lineTo(width * 0.4 + lateralShift, height * 0.78 + forwardShift);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#303944';
        ctx.fillRect(width * 0.46 + lateralShift, height * 0.43 + forwardShift, width * 0.08, height * 0.35);
        ctx.fillRect(width * 0.43 + lateralShift, height * 0.4 + forwardShift, width * 0.14, height * 0.08);
      } else {
        ctx.beginPath();
        ctx.moveTo(width * 0.58 + lateralShift, height);
        ctx.lineTo(width * 0.96 + lateralShift, height);
        ctx.lineTo(width * 0.84 + lateralShift, height * 0.83 + forwardShift);
        ctx.lineTo(width * 0.7 + lateralShift, height * 0.83 + forwardShift);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2f3843';
        ctx.fillRect(width * 0.71 + lateralShift, height * 0.55 + forwardShift, width * 0.22, height * 0.05);
        ctx.fillRect(width * 0.67 + lateralShift, height * 0.6 + forwardShift, width * 0.07, height * 0.24);
      }
    }
  }

  function drawProjectiles(width, height) {
    for (const shot of state.projectiles) {
      const from = project(shot.fromX, shot.fromZ);
      const to = project(shot.toX, shot.toZ);
      const alpha = clamp(shot.life / 150, 0.2, 1);
      ctx.strokeStyle = shot.team === 'ally' ? `rgba(255, 221, 154, ${alpha})` : `rgba(255, 113, 83, ${alpha})`;
      ctx.lineWidth = shot.team === 'ally' ? 3 : 2.4;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.fillStyle = shot.team === 'ally' ? `rgba(255, 227, 168, ${alpha})` : `rgba(255, 128, 98, ${alpha})`;
      ctx.beginPath();
      ctx.arc(from.x, from.y, shot.team === 'ally' ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(to.x, to.y, shot.team === 'ally' ? 3 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const spark of state.sparks) {
      const p = project(spark.x, spark.z);
      const alpha = clamp(spark.life / 220, 0, 1);
      ctx.fillStyle = `rgba(255, 184, 96, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async function claimReward() {
    if (state.claimed) return;
    state.claimed = true;
    const difficulty = difficultySelect.value;
    const weapon = weaponSelect.value;
    const raw = state.score + state.playerKills * 8 + state.integrity * 0.45 + state.defenders.filter((d) => d.alive).length * 8;
    const accuracyBonus = state.shots ? (state.hits / state.shots) * 15 : 0;
    const score = clamp(Math.round((raw + accuracyBonus) / difficultyConfig[difficulty].scoreTarget * 100), 0, 100);

    const form = new FormData();
    form.set('game_type', 'shooting');
    form.set('difficulty', difficulty);
    form.set('weapon', weapon);
    form.set('score', String(score));
    form.set('csrf_token', csrf);

    const response = await fetch(claimUrl, { method: 'POST', body: form, headers: { 'X-Requested-With': 'fetch' } });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      resultEl.textContent = data.message || '结算失败，请返回控制台重试。';
      return;
    }
    resultEl.textContent = `${data.game_label}结算完成：得分 ${data.score}，获得 ${data.reward} 金币，当前剩余 ${data.coins_after} 金币。`;
    endTitle.textContent = `击退 ${state.kills} 名敌军`; 
    endSummary.textContent = `玩家击倒 ${state.playerKills} / 友军击倒 ${state.allyKills}（上限 ${state.allyKillCap}），防线完整度 ${state.integrity} / 100，结算得分 ${data.score}，奖励 ${data.reward} 金币。`;
  }

  async function finishBattle(reason) {
    state.running = false;
    cancelAnimationFrame(rafId);
    endOverlay.hidden = false;
    setMessage(reason);
    await claimReward();
  }

  function updateHud(remaining) {
    killsEl.textContent = String(state.kills);
    scoreEl.textContent = String(Math.round(state.score));
    timerEl.textContent = `${(remaining / 1000).toFixed(1)}s`;
    integrityEl.textContent = String(Math.round(state.integrity));
    alliesEl.textContent = String(state.defenders.filter((d) => d.alive).length);
    const fireModeText = autoFireToggle?.checked ? '自动开火已开启。' : '手动开火。';
    statusEl.textContent = viewMode === 'first' ? `第一人称：准星更稳定，友军已击退 ${state.allyKills}/${state.allyKillCap}。${fireModeText}` : `${petName} 第三人称：能看到宠物亲自操作火力。${fireModeText}`;
  }

  function tick(timestamp) {
    if (!state.running) return;
    if (!state.startedAt) {
      state.startedAt = timestamp;
      state.lastFrame = timestamp;
    }
    const delta = Math.min(40, timestamp - state.lastFrame);
    state.lastFrame = timestamp;
    const difficulty = difficultyConfig[difficultySelect.value] || difficultyConfig.normal;
    const remaining = Math.max(0, difficulty.duration - (timestamp - state.startedAt));

    state.spawnClock += delta;
    if (state.spawnClock >= difficulty.spawnEvery && state.spawnedEnemies < state.totalEnemies) {
      spawnEnemy();
      if (Math.random() > 0.64 && difficultySelect.value !== 'easy' && state.spawnedEnemies < state.totalEnemies) {
        spawnEnemy();
      }
      state.spawnClock = 0;
    }

    if (pointerDown && (weaponConfig[weaponSelect.value].fireMode === 'auto')) {
      applyPlayerShot();
    }

    if (autoFireToggle?.checked && state.running) {
      applyPlayerShot();
    }

    updatePlayerMovement(delta);
    fireDefenders(delta);
    updateEnemies(delta, difficulty);
    updateProjectiles(delta);
    updateMeter(delta);
    drawWorld();
    updateReticle();
    updateHud(remaining);

    if (state.integrity <= 0) {
      finishBattle('防线被突破，但仍会按当前表现结算。');
      return;
    }
    if (state.spawnedEnemies >= state.totalEnemies && state.enemies.length === 0) {
      finishBattle('敌军已被全部击退，正在提前结算战果。');
      return;
    }
    if (remaining <= 0) {
      finishBattle('20 秒守住了海滩，正在结算战果。');
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function resetBattle() {
    state = freshState(difficultyConfig[difficultySelect.value] || difficultyConfig.normal);
    computeIntegrity();
    endOverlay.hidden = true;
    startOverlay.hidden = false;
    resultEl.textContent = '本页结算后会直接把金币记回宠物和控制台账本。';
    updateHud(difficultyConfig[difficultySelect.value].duration);
    drawWorld();
    updateReticle();
    updateMeter(0);
  }

  function startBattle() {
    state = freshState(difficultyConfig[difficultySelect.value] || difficultyConfig.normal);
    computeIntegrity();
    state.running = true;
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    spawnEnemy();
    spawnEnemy();
    setMessage('敌军开始登陆，友军火力已展开。');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function updatePointerFromEvent(event) {
    const rect = stage.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92);
    pointer.y = clamp((event.clientY - rect.top) / rect.height, 0.18, 0.84);
    updateReticle();
  }

  stage.addEventListener('pointermove', (event) => {
    lastPointerType = event.pointerType || 'mouse';
    updatePointerFromEvent(event);
  });

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    updatePointerFromEvent(event);
    pointerDown = true;
    if ((weaponConfig[weaponSelect.value] || weaponConfig.machine_gun).fireMode === 'single') {
      applyPlayerShot();
    } else {
      applyPlayerShot();
    }
  });

  stage.addEventListener('pointerup', () => {
    pointerDown = false;
  });
  stage.addEventListener('pointerleave', () => {
    pointerDown = false;
  });

  fireButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointerDown = true;
    applyPlayerShot();
  });
  fireButton.addEventListener('pointerup', () => {
    pointerDown = false;
  });
  fireButton.addEventListener('pointerleave', () => {
    pointerDown = false;
  });

  startButton.addEventListener('click', startBattle);
  replayButton.addEventListener('click', startBattle);
  viewButtons.forEach((button) => button.addEventListener('click', () => {
    setViewMode(button.dataset.viewMode || 'first');
    if (!state?.running) {
      drawWorld();
      updateReticle();
    }
  }));
  difficultySelect.addEventListener('change', resetBattle);
  weaponSelect.addEventListener('change', resetBattle);
  autoFireToggle?.addEventListener('change', resetBattle);
  document.addEventListener('keydown', (event) => {
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      return;
    }
    if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', '1', '2'].includes(event.key)) {
      event.preventDefault();
    }
    if (event.key === '1') {
      setWeapon('machine_gun');
      return;
    }
    if (event.key === '2') {
      setWeapon('coastal_cannon');
      return;
    }
    if (event.key === 'w' || event.key === 'W' || event.code === 'KeyW') keyState.w = true;
    if (event.key === 'a' || event.key === 'A' || event.code === 'KeyA') keyState.a = true;
    if (event.key === 's' || event.key === 'S' || event.code === 'KeyS') keyState.s = true;
    if (event.key === 'd' || event.key === 'D' || event.code === 'KeyD') keyState.d = true;
  });
  document.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 'W' || event.code === 'KeyW') keyState.w = false;
    if (event.key === 'a' || event.key === 'A' || event.code === 'KeyA') keyState.a = false;
    if (event.key === 's' || event.key === 'S' || event.code === 'KeyS') keyState.s = false;
    if (event.key === 'd' || event.key === 'D' || event.code === 'KeyD') keyState.d = false;
  });
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (!state?.running) drawWorld();
    updateReticle();
  });

  setViewMode('first');
  if (autoFireToggle) {
    autoFireToggle.checked = prefersTouch;
  }
  resizeCanvas();
  resetBattle();
})();
