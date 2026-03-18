(() => {
  const actionDefs = [
    { className: 'action-wave', label: '主动打招呼', message: '正在朝你挥挥手' },
    { className: 'action-stretch', label: '伸懒腰', message: '伸了个大大的懒腰' },
    { className: 'action-walk', label: '走来走去', message: '在控制台里走来走去' },
    { className: 'action-face', label: '做鬼脸', message: '突然做了个鬼脸逗你开心' },
  ];

  const gameConfigs = {
    shooting: {
      easy: {
        label: '简单',
        duration: 20000,
        spawnEvery: 940,
        enemySpeed: 0.12,
        aimAssist: 74,
        scoreTarget: 140,
      },
      normal: {
        label: '标准',
        duration: 20000,
        spawnEvery: 760,
        enemySpeed: 0.16,
        aimAssist: 62,
        scoreTarget: 170,
      },
      hard: {
        label: '困难',
        duration: 20000,
        spawnEvery: 620,
        enemySpeed: 0.2,
        aimAssist: 54,
        scoreTarget: 205,
      },
    },
  };

  const weaponConfig = {
    machine_gun: {
      label: '重机枪',
      scoreBonus: 0,
      status: '重机枪适合压制登陆士兵，按住可持续扫射，但会积热。',
      scopeClass: 'weapon-machine-gun',
      fireMode: 'auto',
      fireRate: 100,
      damage: 34,
      splashRadius: 0,
      spread: 20,
      heatPerShot: 7,
      coolPerSecond: 42,
      meterLabel: '枪管热量',
      meterCopy: '持续扫射',
    },
    coastal_cannon: {
      label: '岸防炮',
      scoreBonus: 1,
      status: '岸防炮装填较慢，但一发能清掉密集登陆点。',
      scopeClass: 'weapon-coastal-cannon',
      fireMode: 'single',
      fireRate: 1450,
      damage: 120,
      splashRadius: 86,
      spread: 8,
      heatPerShot: 100,
      coolPerSecond: 68,
      meterLabel: '装填进度',
      meterCopy: '重炮打击',
    },
  };

  let modalRefs = null;

  function queryAllWithSelf(root, selector) {
    const matches = [];
    if (root instanceof Element && root.matches(selector)) {
      matches.push(root);
    }
    if (root && root.querySelectorAll) {
      matches.push(...root.querySelectorAll(selector));
    }
    return matches;
  }

  function initActionLoops(root) {
    queryAllWithSelf(root, '.pet-card-showcase .pet-portrait').forEach((portrait, index) => {
      if (portrait.dataset.actionLoopReady === 'true') {
        return;
      }
      portrait.dataset.actionLoopReady = 'true';

      const badge = portrait.querySelector('.pet-action-badge');
      const moodNote = portrait.querySelector('.pet-mood-note');
      const baseMessage = portrait.dataset.baseMessage || '';
      const isPassive = portrait.classList.contains('state-sleeping') || portrait.classList.contains('state-sick');
      let actionIndex = Number(portrait.dataset.actionSeed || index) % actionDefs.length;

      if (isPassive) {
        if (badge) {
          badge.textContent = portrait.classList.contains('state-sleeping') ? '正在休息' : '需要照顾';
        }
        if (moodNote) {
          moodNote.textContent = baseMessage;
        }
        return;
      }

      const applyAction = () => {
        actionDefs.forEach((item) => portrait.classList.remove(item.className));
        const current = actionDefs[actionIndex];
        portrait.classList.add(current.className);
        if (badge) {
          badge.textContent = current.label;
        }
        if (moodNote) {
          moodNote.textContent = `${baseMessage} - ${current.message}`;
        }
      };

      const loop = () => {
        if (!document.body.contains(portrait)) {
          return;
        }
        applyAction();
        window.setTimeout(() => {
          actionIndex = (actionIndex + 1) % actionDefs.length;
          loop();
        }, 2600 + index * 220);
      };

      loop();
    });
  }

  function updateWalletSummary(totalCoins) {
    const totalElement = document.querySelector('.dashboard-total-coins');
    if (totalElement) {
      totalElement.textContent = String(totalCoins);
    }
  }

  function updateCoinLog(data) {
    const logSection = document.querySelector('#dashboard-coin-log-section');
    if (!logSection) {
      return;
    }

    let list = document.querySelector('#dashboard-coin-log-list');
    if (!list) {
      const emptyMessage = logSection.querySelector('p');
      if (emptyMessage) {
        emptyMessage.remove();
      }
      list = document.createElement('ul');
      list.id = 'dashboard-coin-log-list';
      list.className = 'event-list';
      logSection.appendChild(list);
    }

    const item = document.createElement('li');
    const deltaClass = data.reward > 0 ? 'coin-plus' : data.reward < 0 ? 'coin-minus' : 'coin-flat';
    const signed = data.reward > 0 ? `+${data.reward}` : `${data.reward}`;
    item.innerHTML = `<strong>${data.pet_name} / ${data.event_type}</strong><span>${data.message}</span><span class="coin-change ${deltaClass}">${signed} 金币</span>`;
    list.prepend(item);
    while (list.children.length > 12) {
      list.removeChild(list.lastElementChild);
    }
  }

  function updateCardEconomy(petId, data) {
    const card = document.querySelector(`[data-pet-card][data-pet-id="${petId}"]`);
    if (!card) {
      return;
    }

    const statCoins = card.querySelector('.stat-coins');
    const currentValue = card.querySelector('.wallet-current-value');
    const deltaValue = card.querySelector('.wallet-delta-value');
    let notice = card.querySelector('.card-notice');

    if (statCoins) {
      statCoins.textContent = `金币 ${data.coins_after}`;
    }
    if (currentValue) {
      currentValue.textContent = String(data.coins_after);
    }
    if (deltaValue) {
      deltaValue.textContent = `+${data.reward} 金币`;
      deltaValue.className = 'wallet-delta-value coin-change coin-plus';
    }
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'card-notice notice-success';
      const portrait = card.querySelector('.pet-portrait');
      if (portrait) {
        portrait.insertAdjacentElement('afterend', notice);
      }
    }
    notice.className = 'card-notice notice-success';
    notice.textContent = data.message;
  }

  function ensureModal() {
    if (modalRefs) {
      return modalRefs;
    }

    const modal = document.getElementById('dashboard-game-modal');
    if (!modal) {
      return null;
    }

    const panel = modal.querySelector('[data-game-panel]');
    const title = modal.querySelector('#game-modal-title');
    const subtitle = modal.querySelector('#game-modal-subtitle');
    const difficulty = modal.querySelector('[data-game-difficulty]');
    const weaponWrap = modal.querySelector('[data-weapon-wrap]');
    const weapon = modal.querySelector('[data-game-weapon]');
    const weaponLabel = modal.querySelector('[data-shooting-weapon-label]');
    const weaponVisual = modal.querySelector('[data-shooting-weapon-visual]');
    const defenseCanvas = modal.querySelector('[data-defense-canvas]');
    const defenseTimer = modal.querySelector('[data-defense-timer]');
    const defenseKills = modal.querySelector('[data-defense-kills]');
    const defenseScore = modal.querySelector('[data-defense-score]');
    const defenseWeaponTitle = modal.querySelector('[data-defense-weapon-title]');
    const defenseWeaponState = modal.querySelector('[data-defense-weapon-state]');
    const defenseMeterLabel = modal.querySelector('[data-defense-meter-label]');
    const defenseMeterFill = modal.querySelector('[data-defense-meter-fill]');
    const defenseFeedback = modal.querySelector('[data-defense-feedback]');
    const defenseFireButton = modal.querySelector('[data-defense-fire]');
    const defenseFlash = modal.querySelector('[data-defense-flash]');
    const defenseStart = modal.querySelector('[data-defense-start]');
    const defenseStartButton = modal.querySelector('[data-defense-start-button]');
    const defenseEnd = modal.querySelector('[data-defense-end]');
    const defenseEndTitle = modal.querySelector('[data-defense-end-title]');
    const defenseEndSummary = modal.querySelector('[data-defense-end-summary]');
    const defenseReplay = modal.querySelector('[data-defense-replay]');
    const result = modal.querySelector('[data-game-result]');

    const refs = {
      modal,
      panel,
      title,
      subtitle,
      difficulty,
      weaponWrap,
      weapon,
      weaponLabel,
      weaponVisual,
      defenseCanvas,
      defenseTimer,
      defenseKills,
      defenseScore,
      defenseWeaponTitle,
      defenseWeaponState,
      defenseMeterLabel,
      defenseMeterFill,
      defenseFeedback,
      defenseFireButton,
      defenseFlash,
      defenseStart,
      defenseStartButton,
      defenseEnd,
      defenseEndTitle,
      defenseEndSummary,
      defenseReplay,
      result,
      activeGame: 'shooting',
      cleanup: null,
      openedBy: null,
    };

    const closeModal = () => {
      if (refs.cleanup) {
        refs.cleanup();
        refs.cleanup = null;
      }
      modal.hidden = true;
      document.body.classList.remove('game-modal-open');
      refs.openedBy = null;
    };

    const setResult = (text, statusClass = 'info') => {
      if (!refs.result) {
        return;
      }
      refs.result.textContent = text;
      refs.result.className = `mini-game-result result-${statusClass}`;
    };

    const stopGame = () => {
      if (refs.cleanup) {
        refs.cleanup();
        refs.cleanup = null;
      }
    };

    const updateWeaponLabel = () => {
      const weaponDef = weaponConfig[refs.weapon.value] || weaponConfig.machine_gun;
      if (refs.weaponLabel) {
        refs.weaponLabel.textContent = weaponDef.label;
      }
      if (refs.defenseWeaponTitle) {
        refs.defenseWeaponTitle.textContent = weaponDef.label;
      }
      if (refs.defenseWeaponState) {
        refs.defenseWeaponState.textContent = weaponDef.meterCopy;
      }
      if (refs.defenseMeterLabel) {
        refs.defenseMeterLabel.textContent = weaponDef.meterLabel;
      }
      if (refs.defenseFireButton) {
        refs.defenseFireButton.textContent = refs.weapon.value === 'machine_gun' ? '按住开火' : '点按轰击';
      }
      if (refs.weaponVisual) {
        refs.weaponVisual.classList.toggle('weapon-machine-gun-active', refs.weapon.value === 'machine_gun');
        refs.weaponVisual.classList.toggle('weapon-coastal-cannon-active', refs.weapon.value === 'coastal_cannon');
      }
    };

    const renderDefensePreview = () => {
      const field = modal.querySelector('[data-shooting-field]');
      const canvas = refs.defenseCanvas;
      if (!field || !canvas) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const width = rect.width;
      const height = rect.height;
      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.56);
      sky.addColorStop(0, '#647786');
      sky.addColorStop(0.48, '#97a9b6');
      sky.addColorStop(1, '#d8c49f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 220, 152, 0.28)';
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.16, 54, 0, Math.PI * 2);
      ctx.fill();
      const sea = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.62);
      sea.addColorStop(0, '#647b89');
      sea.addColorStop(0.55, '#3e6070');
      sea.addColorStop(1, '#294956');
      ctx.fillStyle = sea;
      ctx.fillRect(0, height * 0.22, width, height * 0.34);
      ctx.fillStyle = 'rgba(243, 247, 249, 0.8)';
      ctx.fillRect(0, height * 0.49, width, 7);
      const beach = ctx.createLinearGradient(0, height * 0.5, 0, height);
      beach.addColorStop(0, '#d6b78d');
      beach.addColorStop(0.68, '#b18250');
      beach.addColorStop(1, '#77512f');
      ctx.fillStyle = beach;
      ctx.fillRect(0, height * 0.5, width, height * 0.5);
      ctx.fillStyle = 'rgba(27, 31, 35, 0.48)';
      for (const boatX of [0.18, 0.44, 0.74]) {
        const x = width * boatX;
        const y = height * 0.34;
        ctx.beginPath();
        ctx.moveTo(x - 32, y + 8);
        ctx.lineTo(x + 36, y + 8);
        ctx.lineTo(x + 22, y + 18);
        ctx.lineTo(x - 18, y + 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 10, y - 10, 20, 12);
      }
      const enemies = [
        { x: width * 0.26, y: height * 0.63, scale: 0.76 },
        { x: width * 0.48, y: height * 0.73, scale: 1.02 },
        { x: width * 0.68, y: height * 0.66, scale: 0.84 },
      ];
      for (const enemy of enemies) {
        const bodyH = 38 * enemy.scale;
        const bodyW = 18 * enemy.scale;
        const legH = 22 * enemy.scale;
        const headR = 8 * enemy.scale;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.fillStyle = '#20303a';
        ctx.strokeStyle = 'rgba(255, 244, 222, 0.22)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -bodyH * 0.74, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-bodyW / 2, -bodyH * 0.54, bodyW, bodyH);
        ctx.fillRect(-bodyW * 1.05, -bodyH * 0.26, bodyW * 0.42, bodyH * 0.72);
        ctx.fillRect(bodyW * 0.63, -bodyH * 0.26, bodyW * 0.42, bodyH * 0.72);
        ctx.fillRect(-bodyW * 0.4, bodyH * 0.42, bodyW * 0.34, legH);
        ctx.fillRect(bodyW * 0.06, bodyH * 0.42, bodyW * 0.34, legH);
        ctx.fillStyle = '#f0c98c';
        ctx.fillRect(bodyW * 0.45, -bodyH * 0.1, bodyW * 1.15, bodyW * 0.24);
        ctx.restore();
      }
      ctx.fillStyle = '#2c231d';
      ctx.fillRect(width * 0.08, height * 0.82, width * 0.84, height * 0.18);
      if (refs.weapon.value === 'coastal_cannon') {
        ctx.fillStyle = '#131820';
        ctx.beginPath();
        ctx.moveTo(width * 0.27, height * 0.98);
        ctx.lineTo(width * 0.73, height * 0.98);
        ctx.lineTo(width * 0.6, height * 0.82);
        ctx.lineTo(width * 0.4, height * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#202831';
        ctx.fillRect(width * 0.454, height * 0.44, width * 0.092, height * 0.38);
        ctx.fillStyle = '#49535e';
        ctx.fillRect(width * 0.44, height * 0.42, width * 0.12, height * 0.08);
      } else {
        ctx.fillStyle = '#121820';
        ctx.beginPath();
        ctx.moveTo(width * 0.56, height * 0.98);
        ctx.lineTo(width * 0.92, height * 0.98);
        ctx.lineTo(width * 0.84, height * 0.86);
        ctx.lineTo(width * 0.66, height * 0.86);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#252e37';
        ctx.fillRect(width * 0.67, height * 0.58, width * 0.06, height * 0.28);
        ctx.fillRect(width * 0.71, height * 0.52, width * 0.21, height * 0.05);
      }
    };

    const setActiveGame = () => {
      refs.activeGame = 'shooting';
      stopGame();
      if (refs.weaponWrap) {
        refs.weaponWrap.hidden = false;
      }
      if (refs.defenseStart) {
        refs.defenseStart.hidden = false;
      }
      if (refs.defenseEnd) {
        refs.defenseEnd.hidden = true;
      }
      if (refs.defenseStartButton) {
        refs.defenseStartButton.disabled = false;
      }
      updateWeaponLabel();
      renderDefensePreview();
      setResult('守住 20 秒海滩防线，按击倒士兵数量和战场表现结算金币。', 'info');
    };

    const claimReward = async (gameType, score) => {
      const payload = new URLSearchParams();
      payload.set('game_type', gameType);
      payload.set('difficulty', refs.difficulty.value);
      payload.set('score', String(score));
      payload.set('csrf_token', refs.panel.dataset.csrf || '');
      if (gameType === 'shooting') {
        payload.set('weapon', refs.weapon.value);
      }
      const response = await fetch(`/pets/${refs.panel.dataset.petId}/mini-games/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
        credentials: 'same-origin',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || '小游戏结算失败');
      }
      updateCardEconomy(refs.panel.dataset.petId, data);
      updateWalletSummary(data.total_coins);
      updateCoinLog(data);
      setResult(`${data.game_label}结算完成：得分 ${data.score}，获得 ${data.reward} 金币，当前剩余 ${data.coins_after} 金币。`, 'success');
    };

    const startShooting = () => {
      stopGame();
      const config = gameConfigs.shooting[refs.difficulty.value] || gameConfigs.shooting.normal;
      const weaponDef = weaponConfig[refs.weapon.value] || weaponConfig.machine_gun;
      const field = modal.querySelector('[data-shooting-field]');
      const status = modal.querySelector('[data-game-status="shooting"]');
      const scope = modal.querySelector('[data-scope-overlay]');
      const canvas = refs.defenseCanvas;
      const meterFill = refs.defenseMeterFill;
      const timerValue = refs.defenseTimer;
      const killsValue = refs.defenseKills;
      const scoreValue = refs.defenseScore;
      const feedback = refs.defenseFeedback;
      const fireButton = refs.defenseFireButton;
      const flash = refs.defenseFlash;
      if (!field || !status || !scope || !canvas || !meterFill || !timerValue || !killsValue || !scoreValue || !feedback || !fireButton || !flash) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      let rafId = 0;
      let spawnClock = 0;
      const state = {
        running: true,
        enemies: [],
        explosions: [],
        tracers: [],
        pointer: { x: 0, y: 0 },
        kills: 0,
        rawScore: 0,
        shots: 0,
        hits: 0,
        heat: 0,
        overheated: false,
        pointerDown: false,
        activePointerId: null,
        lastTime: 0,
        startedAt: 0,
        lastShotAt: -1000,
        feedbackUntil: 0,
        feedbackText: '敌军运输艇正在逼近，压住海滩登陆线。',
        combo: 0,
        lastKillAt: 0,
      };

      field.classList.add('is-aiming', weaponDef.scopeClass);
      updateWeaponLabel();
      status.textContent = `${weaponDef.status} 20 秒内击退越多士兵得分越高。`;
      if (refs.defenseStart) {
        refs.defenseStart.hidden = true;
      }
      if (refs.defenseEnd) {
        refs.defenseEnd.hidden = true;
      }
      if (refs.defenseStartButton) {
        refs.defenseStartButton.disabled = true;
      }

      const resizeCanvas = () => {
        const rect = field.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const updateScopePos = (x, y) => {
        const rect = field.getBoundingClientRect();
        const nextX = clamp(x, 12, rect.width - 12);
        const nextY = clamp(y, 12, rect.height - 12);
        state.pointer.x = nextX;
        state.pointer.y = nextY;
        scope.style.left = `${nextX}px`;
        scope.style.top = `${nextY}px`;
      };

      const setFeedback = (text, duration = 700) => {
        state.feedbackText = text;
        state.feedbackUntil = performance.now() + duration;
        feedback.textContent = text;
      };

      const updateHud = (remainingMs) => {
        killsValue.textContent = String(state.kills);
        scoreValue.textContent = String(Math.round(state.rawScore));
        timerValue.textContent = `${(remainingMs / 1000).toFixed(1)}s`;
        const meterValue = refs.weapon.value === 'machine_gun' ? state.heat : Math.max(0, 100 - state.heat);
        meterFill.style.width = `${clamp(meterValue, 0, 100)}%`;
        if (performance.now() > state.feedbackUntil) {
          feedback.textContent = weaponDef.status;
        }
      };

      const getEnemyScreen = (enemy, width, height) => {
        const horizonY = height * 0.24;
        const shoreY = height * 0.5;
        const frontY = height * 0.9;
        const progress = clamp(enemy.progress, 0, 1);
        const y = shoreY + progress * (frontY - shoreY);
        const scale = 0.58 + progress * 1.22;
        const drift = Math.sin(enemy.seed + progress * 5.4) * enemy.wobble * (1 - progress * 0.35);
        const x = enemy.lane * width + drift;
        return { x, y, scale, horizonY };
      };

      const spawnEnemy = () => {
        const elite = Math.random() > 0.74;
        state.enemies.push({
          lane: 0.18 + Math.random() * 0.64,
          progress: 0.02,
          speed: config.enemySpeed * (0.84 + Math.random() * 0.48),
          hp: elite ? 78 : 52,
          maxHp: elite ? 78 : 52,
          seed: Math.random() * Math.PI * 2,
          wobble: 12 + Math.random() * 26,
          label: elite ? '突击兵' : '登陆兵',
          scoreValue: elite ? 16 : 10,
        });
      };

      const addExplosion = (x, y, radius) => {
        state.explosions.push({ x, y, radius, life: 0.28, maxLife: 0.28 });
      };

      const addTracer = (x, y) => {
        state.tracers.push({ x, y, life: 0.14, maxLife: 0.14 });
      };

      const registerKill = (enemy) => {
        const now = performance.now();
        state.combo = now - state.lastKillAt < 900 ? state.combo + 1 : 1;
        state.lastKillAt = now;
        state.kills += 1;
        const bonus = Math.round(enemy.scoreValue + (1 - clamp(enemy.progress, 0, 1)) * 10 + Math.min(3, state.combo) * 2);
        state.rawScore += bonus;
        setFeedback(`击倒 ${enemy.label} +${bonus}`, 680);
      };

      const applyShot = () => {
        const now = performance.now();
        if (!state.running) {
          return;
        }
        if (refs.weapon.value === 'machine_gun') {
          if (state.overheated) {
            setFeedback('枪管过热，先压一下枪温。', 520);
            return;
          }
          if (now - state.lastShotAt < weaponDef.fireRate) {
            return;
          }
          state.heat = clamp(state.heat + weaponDef.heatPerShot, 0, 100);
          if (state.heat >= 100) {
            state.overheated = true;
            setFeedback('重机枪过热，暂时无法连发。', 820);
          }
        } else {
          if (state.heat > 0) {
            setFeedback('岸防炮正在装填。', 420);
            return;
          }
          if (now - state.lastShotAt < weaponDef.fireRate) {
            return;
          }
          state.heat = 100;
        }

        state.lastShotAt = now;
        state.shots += 1;
        flash.classList.remove('is-active');
        void flash.offsetWidth;
        flash.classList.add('is-active');

        const rect = field.getBoundingClientRect();
        const spreadX = (Math.random() - 0.5) * weaponDef.spread;
        const spreadY = (Math.random() - 0.5) * weaponDef.spread * 0.6;
        const shotX = clamp(state.pointer.x + spreadX, 0, rect.width);
        const shotY = clamp(state.pointer.y + spreadY, 0, rect.height);
        addTracer(shotX, shotY);

        const hitCandidates = [];
        for (const enemy of state.enemies) {
          const screen = getEnemyScreen(enemy, rect.width, rect.height);
          const radius = 14 + screen.scale * 18 + config.aimAssist;
          const distance = Math.hypot(screen.x - shotX, screen.y - shotY);
          if (distance <= radius + weaponDef.splashRadius) {
            hitCandidates.push({ enemy, distance, screen });
          }
        }

        if (!hitCandidates.length) {
          setFeedback(refs.weapon.value === 'machine_gun' ? '扫射压制，准星再往水线收一点。' : '炮弹落空，预判敌军登陆点。', 480);
          return;
        }

        state.hits += 1;
        hitCandidates.sort((a, b) => a.distance - b.distance);
        const affected = refs.weapon.value === 'coastal_cannon' ? hitCandidates : [hitCandidates[0]];
        let killsNow = 0;
        for (const entry of affected) {
          entry.enemy.hp -= refs.weapon.value === 'coastal_cannon' ? Math.max(40, weaponDef.damage - entry.distance * 0.6) : weaponDef.damage;
          if (entry.enemy.hp <= 0) {
            killsNow += 1;
            addExplosion(entry.screen.x, entry.screen.y, refs.weapon.value === 'coastal_cannon' ? 64 : 26);
            registerKill(entry.enemy);
          }
        }
        state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
        if (refs.weapon.value === 'coastal_cannon') {
          setFeedback(killsNow > 1 ? `岸防炮直击，清掉 ${killsNow} 名士兵。` : '岸防炮命中海滩登陆点。', 720);
        }
      };

      const updateEnemies = (deltaSeconds) => {
        for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
          const enemy = state.enemies[index];
          enemy.progress += enemy.speed * deltaSeconds;
          if (enemy.progress >= 1.03) {
            state.enemies.splice(index, 1);
            state.rawScore = Math.max(0, state.rawScore - 6);
            setFeedback('有敌军冲过滩头线，赶快补火力。', 620);
          }
        }
        for (let index = state.explosions.length - 1; index >= 0; index -= 1) {
          state.explosions[index].life -= deltaSeconds;
          if (state.explosions[index].life <= 0) {
            state.explosions.splice(index, 1);
          }
        }
        for (let index = state.tracers.length - 1; index >= 0; index -= 1) {
          state.tracers[index].life -= deltaSeconds;
          if (state.tracers[index].life <= 0) {
            state.tracers.splice(index, 1);
          }
        }
        if (refs.weapon.value === 'machine_gun') {
          state.heat = Math.max(0, state.heat - weaponDef.coolPerSecond * deltaSeconds);
          if (state.overheated && state.heat <= 35) {
            state.overheated = false;
            setFeedback('枪管恢复，可以继续扫射。', 460);
          }
        } else {
          state.heat = Math.max(0, state.heat - weaponDef.coolPerSecond * deltaSeconds);
        }
      };

      const drawScene = () => {
        const width = field.clientWidth;
        const height = field.clientHeight;
        ctx.clearRect(0, 0, width, height);

        const sky = ctx.createLinearGradient(0, 0, 0, height * 0.5);
        sky.addColorStop(0, '#74889a');
        sky.addColorStop(0.5, '#98aab9');
        sky.addColorStop(1, '#d4c5a4');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height * 0.5);

        ctx.fillStyle = 'rgba(255, 226, 166, 0.26)';
        ctx.beginPath();
        ctx.arc(width * 0.78, height * 0.16, 54, 0, Math.PI * 2);
        ctx.fill();

        const sea = ctx.createLinearGradient(0, height * 0.22, 0, height * 0.62);
        sea.addColorStop(0, '#607889');
        sea.addColorStop(0.6, '#35576a');
        sea.addColorStop(1, '#274858');
        ctx.fillStyle = sea;
        ctx.fillRect(0, height * 0.22, width, height * 0.35);

        ctx.fillStyle = 'rgba(235, 241, 245, 0.72)';
        ctx.fillRect(0, height * 0.49, width, 6);

        const beach = ctx.createLinearGradient(0, height * 0.52, 0, height);
        beach.addColorStop(0, '#d4b289');
        beach.addColorStop(0.65, '#b58858');
        beach.addColorStop(1, '#805b39');
        ctx.fillStyle = beach;
        ctx.fillRect(0, height * 0.52, width, height * 0.48);

        ctx.fillStyle = 'rgba(24, 29, 34, 0.45)';
        for (const boatX of [0.18, 0.46, 0.74]) {
          const x = width * boatX;
          const y = height * 0.34;
          ctx.beginPath();
          ctx.moveTo(x - 26, y + 6);
          ctx.lineTo(x + 32, y + 6);
          ctx.lineTo(x + 20, y + 16);
          ctx.lineTo(x - 18, y + 16);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(x - 8, y - 8, 16, 10);
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 30, y + 18);
          ctx.quadraticCurveTo(x - 4, y + 24, x + 28, y + 18);
          ctx.stroke();
        }

        const enemies = [...state.enemies].sort((a, b) => a.progress - b.progress);
        for (const enemy of enemies) {
          const screen = getEnemyScreen(enemy, width, height);
          const bodyH = 40 * screen.scale;
          const bodyW = 17 * screen.scale;
          const legH = 22 * screen.scale;
          const headR = 9 * screen.scale;
          ctx.fillStyle = 'rgba(255, 223, 167, 0.12)';
          ctx.beginPath();
          ctx.ellipse(screen.x, screen.y + bodyH * 0.1, bodyW * 1.35, bodyH * 1.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(screen.x, screen.y);
          ctx.fillStyle = enemy.maxHp > 60 ? '#31444f' : '#4b6676';
          ctx.strokeStyle = 'rgba(255, 235, 204, 0.22)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, -bodyH * 0.72, headR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#516674';
          ctx.fillRect(-bodyW / 2, -bodyH * 0.56, bodyW, bodyH);
          ctx.fillRect(-bodyW * 1.05, -bodyH * 0.32, bodyW * 0.44, bodyH * 0.78);
          ctx.fillRect(bodyW * 0.61, -bodyH * 0.32, bodyW * 0.44, bodyH * 0.78);
          ctx.fillRect(-bodyW * 0.42, bodyH * 0.42, bodyW * 0.4, legH);
          ctx.fillRect(bodyW * 0.02, bodyH * 0.42, bodyW * 0.4, legH);
          ctx.fillStyle = '#f0c98c';
          ctx.fillRect(bodyW * 0.45, -bodyH * 0.12, bodyW * 1.15, bodyW * 0.26);
          if (enemy.maxHp > 60) {
            ctx.fillStyle = 'rgba(255, 112, 81, 0.9)';
            ctx.fillRect(-bodyW * 0.9, -bodyH * 1.18, bodyW * 1.8, 4);
          }
          ctx.restore();

          if (enemy.progress < 0.26) {
            ctx.strokeStyle = 'rgba(255,255,255,0.24)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screen.x - 16, screen.y + 10);
            ctx.quadraticCurveTo(screen.x, screen.y + 24, screen.x + 18, screen.y + 12);
            ctx.stroke();
          }

          const markerY = screen.y - bodyH * 1.26;
          ctx.strokeStyle = enemy.maxHp > 60 ? 'rgba(255, 122, 92, 0.92)' : 'rgba(255, 210, 118, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screen.x, markerY);
          ctx.lineTo(screen.x + 8, markerY + 8);
          ctx.lineTo(screen.x, markerY + 16);
          ctx.lineTo(screen.x - 8, markerY + 8);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(screen.x, markerY + 16);
          ctx.lineTo(screen.x, markerY + 24);
          ctx.stroke();
        }

        for (const tracer of state.tracers) {
          const alpha = tracer.life / tracer.maxLife;
          ctx.strokeStyle = `rgba(255, 207, 129, ${alpha})`;
          ctx.lineWidth = refs.weapon.value === 'coastal_cannon' ? 3.5 : 2;
          ctx.beginPath();
          ctx.moveTo(width * 0.5, height * 0.95);
          ctx.lineTo(tracer.x, tracer.y);
          ctx.stroke();
        }

        for (const explosion of state.explosions) {
          const progress = 1 - explosion.life / explosion.maxLife;
          ctx.fillStyle = `rgba(255, 182, 84, ${0.4 * (1 - progress)})`;
          ctx.beginPath();
          ctx.arc(explosion.x, explosion.y, explosion.radius * progress, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 229, 169, ${0.9 * (1 - progress)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(explosion.x, explosion.y, explosion.radius * (0.45 + progress), 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#2c231d';
        ctx.fillRect(width * 0.08, height * 0.82, width * 0.84, height * 0.18);
        ctx.fillStyle = '#4e3a2c';
        for (let i = 0; i < 8; i += 1) {
          ctx.beginPath();
          ctx.roundRect(width * (0.1 + i * 0.1), height * 0.8, width * 0.08, height * 0.08, 8);
          ctx.fill();
        }
        ctx.fillStyle = '#12161c';
        if (refs.weapon.value === 'coastal_cannon') {
          ctx.beginPath();
          ctx.moveTo(width * 0.28, height * 0.98);
          ctx.lineTo(width * 0.72, height * 0.98);
          ctx.lineTo(width * 0.58, height * 0.82);
          ctx.lineTo(width * 0.42, height * 0.82);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1f242b';
          ctx.fillRect(width * 0.462, height * 0.48, width * 0.076, height * 0.36);
          ctx.fillStyle = '#343c46';
          ctx.fillRect(width * 0.442, height * 0.44, width * 0.116, height * 0.08);
          ctx.fillStyle = '#7f5d44';
          ctx.fillRect(width * 0.484, height * 0.84, width * 0.03, height * 0.07);
        } else {
          ctx.beginPath();
          ctx.moveTo(width * 0.6, height * 0.98);
          ctx.lineTo(width * 0.9, height * 0.98);
          ctx.lineTo(width * 0.82, height * 0.86);
          ctx.lineTo(width * 0.66, height * 0.86);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#232a31';
          ctx.fillRect(width * 0.68, height * 0.62, width * 0.05, height * 0.26);
          ctx.fillRect(width * 0.71, height * 0.56, width * 0.18, height * 0.04);
          ctx.fillStyle = '#3a434d';
          ctx.fillRect(width * 0.7, height * 0.58, width * 0.07, height * 0.05);
        }
      };

      const finishAll = async () => {
        state.running = false;
        window.cancelAnimationFrame(rafId);
        field.removeEventListener('pointermove', onPointerMove);
        field.removeEventListener('pointerdown', onFieldPointerDown);
        field.removeEventListener('pointerup', stopFiring);
        field.removeEventListener('pointercancel', stopFiring);
        field.removeEventListener('pointerleave', stopFiring);
        fireButton.removeEventListener('pointerdown', onFireButtonDown);
        fireButton.removeEventListener('pointerup', stopFiring);
        fireButton.removeEventListener('pointercancel', stopFiring);
        fireButton.removeEventListener('pointerleave', stopFiring);
        window.removeEventListener('resize', resizeCanvas);
        field.classList.remove('is-aiming', 'weapon-machine-gun', 'weapon-coastal-cannon');
        const accuracy = state.shots ? state.hits / state.shots : 0;
        const finalScore = clamp(Math.round((state.rawScore / config.scoreTarget) * 100 + accuracy * 10 + state.kills * 1.5 + weaponDef.scoreBonus), 0, 100);
        if (refs.defenseEndTitle) {
          refs.defenseEndTitle.textContent = `击退 ${state.kills} 名士兵`;
        }
        if (refs.defenseEndSummary) {
          refs.defenseEndSummary.textContent = `命中率 ${Math.round(accuracy * 100)}%，战地评分 ${finalScore}。结算后可立即再来一局。`;
        }
        if (refs.defenseEnd) {
          refs.defenseEnd.hidden = false;
        }
        if (refs.defenseStartButton) {
          refs.defenseStartButton.disabled = false;
        }
        status.textContent = `20 秒结束：击倒 ${state.kills} 名士兵，命中率 ${Math.round(accuracy * 100)}%，战地评分 ${finalScore}`;
        try {
          await claimReward('shooting', finalScore);
        } catch (error) {
          setResult(error.message, 'error');
        }
      };

      const tick = (time) => {
        if (!state.running) {
          return;
        }
        if (!state.lastTime) {
          state.lastTime = time;
          state.startedAt = time;
        }
        const delta = Math.min(42, time - state.lastTime);
        const deltaSeconds = delta / 1000;
        state.lastTime = time;
        const elapsed = time - state.startedAt;
        const remaining = Math.max(0, config.duration - elapsed);

        spawnClock += delta;
        const jitteredSpawn = config.spawnEvery * (0.88 + Math.random() * 0.18);
        if (spawnClock >= jitteredSpawn) {
          spawnEnemy();
          if (Math.random() > 0.75 && refs.difficulty.value !== 'easy') {
            spawnEnemy();
          }
          spawnClock = 0;
        }

        if (state.pointerDown && (!state.overheated || refs.weapon.value === 'coastal_cannon')) {
          applyShot();
        }

        updateEnemies(deltaSeconds);
        updateHud(remaining);
        drawScene();

        if (remaining <= 0) {
          finishAll();
          return;
        }
        rafId = window.requestAnimationFrame(tick);
      };

      const onPointerMove = (event) => {
        const rect = field.getBoundingClientRect();
        updateScopePos(event.clientX - rect.left, event.clientY - rect.top);
      };

      const onFieldPointerDown = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }
        event.preventDefault();
        onPointerMove(event);
        state.activePointerId = event.pointerId;
        if (refs.weapon.value === 'machine_gun') {
          state.pointerDown = true;
        }
        applyShot();
      };

      const onFireButtonDown = (event) => {
        event.preventDefault();
        if (refs.weapon.value === 'machine_gun') {
          state.pointerDown = true;
        }
        applyShot();
      };

      const stopFiring = () => {
        state.pointerDown = false;
      };

      resizeCanvas();
      updateScopePos(field.clientWidth / 2, field.clientHeight * 0.66);
      updateHud(config.duration);
      field.addEventListener('pointermove', onPointerMove);
      field.addEventListener('pointerdown', onFieldPointerDown);
      field.addEventListener('pointerup', stopFiring);
      field.addEventListener('pointercancel', stopFiring);
      field.addEventListener('pointerleave', stopFiring);
      fireButton.addEventListener('pointerdown', onFireButtonDown);
      fireButton.addEventListener('pointerup', stopFiring);
      fireButton.addEventListener('pointercancel', stopFiring);
      fireButton.addEventListener('pointerleave', stopFiring);
      window.addEventListener('resize', resizeCanvas);
      field.addEventListener('contextmenu', (event) => event.preventDefault(), { once: true });
      spawnEnemy();
      spawnEnemy();
      rafId = window.requestAnimationFrame(tick);
      refs.cleanup = () => {
        state.running = false;
        window.cancelAnimationFrame(rafId);
        field.removeEventListener('pointermove', onPointerMove);
        field.removeEventListener('pointerdown', onFieldPointerDown);
        field.removeEventListener('pointerup', stopFiring);
        field.removeEventListener('pointercancel', stopFiring);
        field.removeEventListener('pointerleave', stopFiring);
        fireButton.removeEventListener('pointerdown', onFireButtonDown);
        fireButton.removeEventListener('pointerup', stopFiring);
        fireButton.removeEventListener('pointercancel', stopFiring);
        fireButton.removeEventListener('pointerleave', stopFiring);
        window.removeEventListener('resize', resizeCanvas);
        field.classList.remove('is-aiming', 'weapon-machine-gun', 'weapon-coastal-cannon');
        if (refs.defenseStart) {
          refs.defenseStart.hidden = false;
        }
        if (refs.defenseEnd) {
          refs.defenseEnd.hidden = true;
        }
        if (refs.defenseStartButton) {
          refs.defenseStartButton.disabled = false;
        }
        renderDefensePreview();
      };
    };

    refs.startGame = () => {
      startShooting();
    };

    modal.querySelectorAll('[data-game-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });
    refs.weapon.addEventListener('change', updateWeaponLabel);
    if (refs.defenseStartButton) {
      refs.defenseStartButton.addEventListener('click', () => refs.startGame());
    }
    if (refs.defenseReplay) {
      refs.defenseReplay.addEventListener('click', () => refs.startGame());
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });

    refs.open = (button) => {
      refs.panel.dataset.petId = button.dataset.petId || '';
      refs.panel.dataset.csrf = button.dataset.csrf || '';
      refs.panel.dataset.petName = button.dataset.petName || '';
      refs.title.textContent = `${button.dataset.petName || '宠物'}的小游戏房间`;
      refs.subtitle.textContent = '20 秒守住海滩防线，切换重机枪或岸防炮击退登陆士兵。';
      refs.openedBy = button;
      modal.hidden = false;
      document.body.classList.add('game-modal-open');
      setActiveGame();
    };

    refs.close = closeModal;
    modalRefs = refs;
    return refs;
  }

  function initDashboard(root = document) {
    initActionLoops(root);
  }

  let lastScrollY = 0;
  let shouldRestoreScroll = false;
  document.body.addEventListener('htmx:beforeRequest', (event) => {
    const elt = event.target || event.detail?.elt;
    if (elt && elt.closest && elt.closest('.dashboard-care-grid, .dashboard-mini-game-entry, [data-pet-card]')) {
      lastScrollY = window.scrollY;
      shouldRestoreScroll = true;
    }
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    if (!shouldRestoreScroll) {
      return;
    }
    const target = (event.detail && event.detail.target) || event.target;
    if (target && target.closest && (target.closest('[data-pet-card]') || target.id === 'dashboard-wallet-summary' || target.id === 'dashboard-coin-log-section')) {
      window.scrollTo({ top: lastScrollY, behavior: 'auto' });
      shouldRestoreScroll = false;
    }
  });

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-game-open]');
    if (openButton) {
      const refs = ensureModal();
      if (refs) {
        refs.open(openButton);
      }
    }

    const toggleBtn = event.target.closest('[data-config-toggle]');
    if (toggleBtn) {
      const selector = toggleBtn.dataset.configToggle;
      if (selector) {
        const card = toggleBtn.closest('[data-pet-card]') || document;
        const panel = card.querySelector(selector);
        if (panel) {
          const willOpen = !panel.classList.contains('is-active');
          const siblings = panel.parentElement?.querySelectorAll('.config-panel') || [];
          siblings.forEach((node) => node.classList.remove('is-active'));
          card.querySelectorAll('[data-config-toggle]').forEach((button) => {
            button.classList.remove('is-active');
            button.setAttribute('aria-expanded', 'false');
          });
          if (willOpen) {
            panel.classList.add('is-active');
            toggleBtn.classList.add('is-active');
            toggleBtn.setAttribute('aria-expanded', 'true');
          }
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    initDashboard(document);
    ensureModal();
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    initDashboard(event.target);
  });
})();
