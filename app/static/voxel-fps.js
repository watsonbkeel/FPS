import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const page = document.getElementById('voxel-fps-page');
if (!page) {
  throw new Error('方块战场页面容器不存在');
}

const stage = page.querySelector('[data-voxel-stage]');
const canvas = page.querySelector('[data-voxel-canvas]');
const overlay = page.querySelector('[data-voxel-overlay]');
const gameOverOverlay = page.querySelector('[data-voxel-gameover]');
const respawnOverlay = page.querySelector('[data-voxel-respawn]');
const pauseOverlay = page.querySelector('[data-voxel-pause]');
const modePanel = page.querySelector('[data-voxel-mode-panel]');
const roomBrowser = page.querySelector('[data-voxel-room-browser]');
const lobbyPanel = page.querySelector('[data-voxel-lobby-panel]');
const startButton = page.querySelector('[data-voxel-start]');
const openRoomsButton = page.querySelector('[data-voxel-open-rooms]');
const roomBackButton = page.querySelector('[data-voxel-room-back]');
const roomRefreshButton = page.querySelector('[data-voxel-room-refresh]');
const roomCreateButton = page.querySelector('[data-voxel-room-create]');
const lobbyLeaveButton = page.querySelector('[data-voxel-lobby-leave]');
const lobbyStartButton = page.querySelector('[data-voxel-lobby-start]');
const restartButton = page.querySelector('[data-voxel-restart]');
const returnModeButton = page.querySelector('[data-voxel-return-mode]');
const forceRestartButton = page.querySelector('[data-voxel-force-restart]');
const resumeButton = page.querySelector('[data-voxel-resume]');
const pauseExitButton = page.querySelector('[data-voxel-pause-exit]');
const fullscreenButton = page.querySelector('[data-voxel-fullscreen]');
const timerEl = page.querySelector('[data-voxel-timer]');
const healthEl = page.querySelector('[data-voxel-health]');
const killsEl = page.querySelector('[data-voxel-kills]');
const friendlyEl = page.querySelector('[data-voxel-friendly]');
const enemyEl = page.querySelector('[data-voxel-enemy]');
const weaponEl = page.querySelector('[data-voxel-weapon]');
const stanceEl = page.querySelector('[data-voxel-stance]');
const statusEl = page.querySelector('[data-voxel-status]');
const resultEl = page.querySelector('[data-voxel-result]');
const endKillsEl = page.querySelector('[data-voxel-end-kills]');
const endTimeEl = page.querySelector('[data-voxel-end-time]');
const endCoinsEl = page.querySelector('[data-voxel-end-coins]');
const endTitleEl = page.querySelector('[data-voxel-end-title]');
const endSummaryEl = page.querySelector('[data-voxel-end-summary]');
const endRedKillsEl = page.querySelector('[data-voxel-end-red-kills]');
const endBlueKillsEl = page.querySelector('[data-voxel-end-blue-kills]');
const endMvpEl = page.querySelector('[data-voxel-end-mvp]');
const respawnTitleEl = page.querySelector('[data-voxel-respawn-title]');
const respawnSummaryEl = page.querySelector('[data-voxel-respawn-summary]');
const pauseTitleEl = page.querySelector('[data-voxel-pause-title]');
const pauseSummaryEl = page.querySelector('[data-voxel-pause-summary]');
const hitMarker = page.querySelector('[data-hit-marker]');
const scopeOverlay = page.querySelector('[data-voxel-scope-overlay]');
const damageScreen = page.querySelector('[data-voxel-damage-screen]');
const killfeed = page.querySelector('[data-voxel-killfeed]');
const labelLayer = page.querySelector('[data-voxel-label-layer]');
const roomListEl = page.querySelector('[data-voxel-room-list]');
const lobbyTitleEl = page.querySelector('[data-voxel-lobby-title]');
const lobbySubtitleEl = page.querySelector('[data-voxel-lobby-subtitle]');
const lobbyRoomCodeEl = page.querySelector('[data-voxel-lobby-room-code]');
const redTeamEl = page.querySelector('[data-voxel-team-red]');
const blueTeamEl = page.querySelector('[data-voxel-team-blue]');
const mobileControls = page.querySelector('[data-voxel-mobile-controls]');
const stickZone = page.querySelector('[data-voxel-stick-zone]');
const stickThumb = page.querySelector('[data-voxel-stick-thumb]');
const mobileFireButton = page.querySelector('[data-voxel-mobile-fire]');
const mobilePauseButton = page.querySelector('[data-voxel-mobile-pause]');
const mobileCrouchButton = page.querySelector('[data-voxel-mobile-crouch]');
const mobileJumpButton = page.querySelector('[data-voxel-mobile-jump]');
const mobileScopeButton = page.querySelector('[data-voxel-mobile-scope]');
const mobileWeaponButtons = [...page.querySelectorAll('[data-voxel-mobile-weapon]')];

const petId = Number(page.dataset.petId || 0);
const petName = page.dataset.petName || '宠物';
const csrfToken = page.dataset.csrf || '';
const claimUrl = page.dataset.claimUrl || '';
const roomBaseUrl = page.dataset.roomBaseUrl || '';
const roomWsTemplate = page.dataset.roomWsTemplate || '';
const userLabel = (page.dataset.userLabel || petName || 'player').split('@', 1)[0];
const matchDurationSeconds = Number(page.dataset.matchDuration || 300) || 300;
const roomSessionStorageKey = `tamapet-voxel-room-${petId}`;

const TEAM_FRIENDLY = 'friendly';
const TEAM_ENEMY = 'enemy';
const ABS_TEAM_RED = 'red';
const ABS_TEAM_BLUE = 'blue';
const ROUND_DURATION = matchDurationSeconds;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_HEAL_PER_SECOND = PLAYER_MAX_HEALTH * 0.03;
const PLAYER_HEIGHT = 1.7;
const PLAYER_HEIGHT_CROUCH = 1.15;
const PLAYER_HEIGHT_PRONE = 0.72;
const PLAYER_RADIUS = 0.35;
const MAP_HALF = 52;
const PLAYER_RESPAWN_MS = 4500;
const BOT_RESPAWN_MS = 5200;
const BASE_FOV = 72;
const PLAYER_STEP_HEIGHT = 1.05;
const PLAYER_JUMP_CLIMB_HEIGHT = 3.15;
const PLAYER_GROUND_EPSILON = 0.06;
const PLAYER_BOUNDARY_MARGIN = 1.9;
const LADDER_CLIMB_SPEED = 4.8;
const LADDER_SLIDE_SPEED = -1.1;
const GRENADE_THROW_SPEED = 12.5;
const GRENADE_BLAST_RADIUS = 8.4;
const GRENADE_MAX_DAMAGE = 128;
const GRENADE_BLAST_DURATION = 320;
const COMMAND_FLAG_THROW_SPEED = 11.2;
const COMMAND_FLAG_DURATION = 10000;

const WEAPON_CONFIG = {
  voxel_rifle: {
    label: '长枪',
    range: 18,
    damage: 34,
    fireDelay: 150,
    scopeEnabled: true,
    scopeLabel: '2x 瞄准镜',
    zoomFov: 36,
    kick: 1,
  },
  voxel_sniper: {
    label: '狙击枪',
    range: 54,
    damage: 88,
    fireDelay: 720,
    scopeEnabled: true,
    scopeLabel: '狙击镜',
    zoomFov: 24,
    kick: 1.6,
  },
  voxel_grenade: {
    label: '手雷',
    range: GRENADE_BLAST_RADIUS,
    damage: GRENADE_MAX_DAMAGE,
    fireDelay: 900,
    scopeEnabled: false,
    zoomFov: BASE_FOV,
    kick: 0.25,
  },
  voxel_command_flag: {
    label: '红旗',
    range: 0,
    damage: 0,
    fireDelay: 850,
    scopeEnabled: false,
    zoomFov: BASE_FOV,
    kick: 0.12,
  },
};

const RED_TEAM_SPAWNS = [
  new THREE.Vector3(0, 0, 18),
  new THREE.Vector3(-20, 0, 36),
  new THREE.Vector3(-8, 0, 30),
  new THREE.Vector3(8, 0, 30),
  new THREE.Vector3(20, 0, 36),
];

const BLUE_TEAM_SPAWNS = [
  new THREE.Vector3(0, 0, -18),
  new THREE.Vector3(-22, 0, -36),
  new THREE.Vector3(-8, 0, -30),
  new THREE.Vector3(6, 0, -32),
  new THREE.Vector3(18, 0, -28),
];

const FRIEND_SPAWNS = RED_TEAM_SPAWNS.slice(1);
const ENEMY_SPAWNS = BLUE_TEAM_SPAWNS;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(stage.clientWidth, stage.clientHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8dc6ff');
scene.fog = new THREE.Fog('#8dc6ff', 28, 140);

const camera = new THREE.PerspectiveCamera(BASE_FOV, stage.clientWidth / stage.clientHeight, 0.1, 180);
camera.position.set(0, PLAYER_HEIGHT, 12);

const controls = new PointerLockControls(camera, document.body);
const playerObject = controls.object;
scene.add(playerObject);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x6a4a2f, 1.05);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(14, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
scene.add(sun);

const mapGroup = new THREE.Group();
scene.add(mapGroup);

const colliders = [];
const coverAnchors = [];
const ladderZones = [];
const botState = [];
const playerShots = [];
const grenadeProjectiles = [];
const grenadeBursts = [];
const commandFlagProjectiles = [];
const teamFlagMarkers = { [ABS_TEAM_RED]: null, [ABS_TEAM_BLUE]: null };
const keyState = { w: false, a: false, s: false, d: false, space: false };

let playerVelocity = new THREE.Vector3();
let playerHealth = PLAYER_MAX_HEALTH;
let playerKills = 0;
let playerAlive = true;
let pointerLocked = false;
let lastFrame = 0;
let elapsed = 0;
let gameRunning = false;
let gamePaused = false;
let gameEnded = false;
let matchPhase = 'idle';
let pauseStartedAt = 0;
let roundStart = 0;
let lastPlayerShot = 0;
let hitMarkerTimer = 0;
let damageFlashTimer = 0;
let earnedCoins = 0;
let respawnTimer = 0;
let mobileLookId = null;
let mobileMoveId = null;
let mobileMoveVector = new THREE.Vector2();
let mobileLookLast = null;
let mobileFireHeld = false;
let cachedMobileMode = window.matchMedia('(hover: none), (pointer: coarse)').matches;
let playerStance = 'stand';
let playerHeight = PLAYER_HEIGHT;
let currentWeapon = 'voxel_rifle';
let scopeActive = false;
let labelElements = new Map();
let absoluteFriendlyTeam = ABS_TEAM_RED;
let teamScores = { [ABS_TEAM_RED]: 0, [ABS_TEAM_BLUE]: 0 };
let actorStats = new Map();
let actorLabels = new Map();
let remotePlayers = new Map();
let multiplayerState = {
  active: false,
  roomId: null,
  playerId: null,
  ws: null,
  room: null,
  isHost: false,
  connected: false,
  phase: 'mode',
  selfTeam: ABS_TEAM_RED,
  humans: [],
  lastStateSentAt: 0,
  lastSnapshotSentAt: 0,
  reconnectTimer: null,
  explicitDisconnect: false,
  claimSent: false,
  claimCompleted: false,
  latestRemaining: ROUND_DURATION,
  teamCommands: { [ABS_TEAM_RED]: null, [ABS_TEAM_BLUE]: null },
};

window.voxelFpsDebug = {
  get playerPosition() {
    const pos = playerObject.position;
    return { x: Number(pos.x.toFixed(3)), y: Number(pos.y.toFixed(3)), z: Number(pos.z.toFixed(3)) };
  },
  get playerAlive() {
    return playerAlive;
  },
  get locked() {
    return pointerLocked;
  },
  get health() {
    return Number(playerHealth.toFixed(2));
  },
  get paused() {
    return gamePaused;
  },
  get respawnTimer() {
    return Math.max(0, Math.ceil(respawnTimer));
  },
  get stance() {
    return playerStance;
  },
  get weapon() {
    return currentWeapon;
  },
  get scopeActive() {
    return scopeActive;
  },
  get fov() {
    return Number(camera.fov.toFixed(2));
  },
  get enemySnapshot() {
    return botState
      .filter((bot) => bot.team === TEAM_ENEMY)
      .map((bot) => ({
        id: bot.id,
        alive: bot.alive,
        hp: bot.hp,
        x: Number(bot.mesh.position.x.toFixed(3)),
        y: Number(bot.mesh.position.y.toFixed(3)),
        z: Number(bot.mesh.position.z.toFixed(3)),
      }));
  },
  get friendlySnapshot() {
    return botState
      .filter((bot) => bot.team === TEAM_FRIENDLY)
      .map((bot) => ({
        id: bot.id,
        alive: bot.alive,
        hp: bot.hp,
        x: Number(bot.mesh.position.x.toFixed(3)),
        y: Number(bot.mesh.position.y.toFixed(3)),
        z: Number(bot.mesh.position.z.toFixed(3)),
        isHuman: Boolean(bot.isHuman),
      }));
  },
  get pitch() {
    return Number(camera.rotation.x.toFixed(3));
  },
  get yaw() {
    return Number(playerObject.rotation.y.toFixed(3));
  },
  get roll() {
    return Number(camera.rotation.z.toFixed(3));
  },
  alignToClosestEnemy() {
    const target = findClosestShootableEnemy();
    if (!target) {
      return null;
    }
    aimPlayerAt(target.aimPoint);
    return {
      id: target.bot.id,
      distance: Number(target.distance.toFixed(3)),
      hp: target.bot.hp,
    };
  },
  peekCenterRay() {
    return getPlayerTargetHits().slice(0, 5).map((hit) => ({
      distance: Number(hit.distance.toFixed(3)),
      botId: hit.bot?.id ?? null,
      objectType: hit.object?.type ?? null,
      hp: hit.bot?.hp ?? null,
    }));
  },
  teleport(x, y, z) {
    playerObject.position.set(x, y, z);
    playerVelocity.set(0, 0, 0);
    return { x: Number(playerObject.position.x.toFixed(3)), y: Number(playerObject.position.y.toFixed(3)), z: Number(playerObject.position.z.toFixed(3)) };
  },
  setView(yaw, pitch = 0) {
    playerObject.rotation.y = yaw;
    camera.rotation.x = Math.max(-1.2, Math.min(1.2, pitch));
    camera.rotation.z = 0;
    return { yaw: Number(playerObject.rotation.y.toFixed(3)), pitch: Number(camera.rotation.x.toFixed(3)) };
  },
  get grenadeCount() {
    return grenadeProjectiles.length;
  },
  get ladderCount() {
    return ladderZones.length;
  },
  forceEnd(win = true) {
    endGame(Boolean(win));
    return true;
  },
};

const raycaster = new THREE.Raycaster();
const collisionBox = new THREE.Box3();
const scratchBox = new THREE.Box3();
const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();

const materialSet = {
  grass: new THREE.MeshStandardMaterial({ color: '#72b15d', flatShading: true }),
  dirt: new THREE.MeshStandardMaterial({ color: '#7a5a32', flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: '#8d8f95', flatShading: true }),
  wall: new THREE.MeshStandardMaterial({ color: '#a98b62', flatShading: true }),
  wallDark: new THREE.MeshStandardMaterial({ color: '#8c6f4c', flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: '#89623c', flatShading: true }),
  roof: new THREE.MeshStandardMaterial({ color: '#8a4438', flatShading: true }),
  rail: new THREE.MeshStandardMaterial({ color: '#bfa680', flatShading: true }),
  blue: new THREE.MeshStandardMaterial({ color: '#4a74c9', flatShading: true }),
  red: new THREE.MeshStandardMaterial({ color: '#c65050', flatShading: true }),
  skin: new THREE.MeshStandardMaterial({ color: '#f1c897', flatShading: true }),
  gun: new THREE.MeshStandardMaterial({ color: '#30353c', flatShading: true }),
  muzzle: new THREE.MeshBasicMaterial({ color: '#ffcb66' }),
};

function addKillfeed(text) {
  const node = document.createElement('div');
  node.className = 'voxel-killfeed-item';
  node.textContent = text;
  killfeed.prepend(node);
  const items = [...killfeed.children];
  items.slice(4).forEach((item) => item.remove());
  window.setTimeout(() => node.remove(), 2200);
}

function setResultMessage(text, tone = 'normal') {
  resultEl.textContent = text;
  resultEl.classList.remove('is-success', 'is-warning');
  if (tone === 'success') resultEl.classList.add('is-success');
  if (tone === 'warning') resultEl.classList.add('is-warning');
}

function setStatus(text) {
  statusEl.textContent = text;
}

function focusGamePage() {
  page.focus({ preventScroll: true });
  window.focus();
}

function roomActionUrl(roomId = '', suffix = '') {
  return roomId ? `${roomBaseUrl}/${roomId}${suffix}` : roomBaseUrl;
}

function buildRoomForm(fields = {}) {
  const form = new FormData();
  form.set('csrf_token', csrfToken);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  });
  return form;
}

async function postRoomAction(url, fields = {}) {
  const response = await fetch(url, {
    method: 'POST',
    body: buildRoomForm(fields),
    headers: { 'X-Requested-With': 'fetch' },
  });
  return response.json();
}

function hideEntryOverlay() {
  overlay.hidden = true;
  modePanel.hidden = true;
  roomBrowser.hidden = true;
  lobbyPanel.hidden = true;
  multiplayerState.phase = 'gameplay';
}

function showOverlayPanel(panelName) {
  matchPhase = 'idle';
  overlay.hidden = false;
  modePanel.hidden = panelName !== 'mode';
  roomBrowser.hidden = panelName !== 'rooms';
  lobbyPanel.hidden = panelName !== 'lobby';
  multiplayerState.phase = panelName;
}

function saveRoomSession() {
  if (!multiplayerState.roomId || !multiplayerState.playerId) return;
  localStorage.setItem(roomSessionStorageKey, JSON.stringify({ roomId: multiplayerState.roomId, playerId: multiplayerState.playerId }));
}

function clearRoomSession() {
  localStorage.removeItem(roomSessionStorageKey);
}

function disconnectRoomSocket(explicit = true) {
  multiplayerState.explicitDisconnect = explicit;
  if (multiplayerState.reconnectTimer) {
    clearTimeout(multiplayerState.reconnectTimer);
    multiplayerState.reconnectTimer = null;
  }
  if (multiplayerState.ws) {
    multiplayerState.ws.close();
  }
  multiplayerState.ws = null;
  multiplayerState.connected = false;
}

function resetMultiplayerLobbyState(clearStorage = true) {
  disconnectRoomSocket(true);
  matchPhase = 'idle';
  multiplayerState.roomId = null;
  multiplayerState.playerId = null;
  multiplayerState.room = null;
  multiplayerState.isHost = false;
  multiplayerState.selfTeam = ABS_TEAM_RED;
  multiplayerState.claimSent = false;
  multiplayerState.claimCompleted = false;
  multiplayerState.active = false;
  multiplayerState.latestRemaining = ROUND_DURATION;
  if (clearStorage) {
    clearRoomSession();
  }
}

function formatRoomSummary(room) {
  return `${room.human_count} 人在线 · 红 ${room.red_count} / 蓝 ${room.blue_count} · 可加入 ${room.open_slots ?? 0} 位`;
}

function renderRoomList(rooms = []) {
  if (!roomListEl) return;
  roomListEl.innerHTML = '';
  if (!rooms.length) {
    const empty = document.createElement('div');
    empty.className = 'voxel-empty-state';
    empty.textContent = '当前还没有可用房间。右侧固定的创建房间入口可以直接开一个新房。';
    roomListEl.append(empty);
    return;
  }
  rooms.forEach((room) => {
    const item = document.createElement('article');
    item.className = 'voxel-room-entry';
    item.innerHTML = `
      <div>
        <strong>${room.title}</strong>
        <div>${formatRoomSummary(room)}</div>
        <small>房主：${room.host_label}</small>
      </div>
      <div class="voxel-room-entry-actions">
        <button type="button" data-room-join="${room.room_id}">进入房间</button>
      </div>
    `;
    roomListEl.append(item);
  });
}

function renderTeamSlots(teamEl, room, team) {
  if (!teamEl) return;
  teamEl.innerHTML = '';
  room.teams[team].forEach((slot, slotIndex) => {
    const slotEl = document.createElement('div');
    const occupied = slot.seat_state === 'occupied';
    const closed = slot.seat_state === 'closed';
    const isSelf = occupied && slot.player_id === room.current_player_id;
    slotEl.className = `voxel-team-slot${slotIndex === 0 ? ' is-captain' : ''}${isSelf ? ' is-self' : ''}${closed ? ' is-closed' : ''}`;
    if (occupied) {
      const title = slot.is_captain ? `${slot.label} · 队长` : slot.label;
      slotEl.innerHTML = `
        <div>
          <strong>${title}</strong>
          <small>${slot.pet_name}</small>
        </div>
        ${slot.is_host ? '<small>房主锁定</small>' : (isSelf ? '<small>你当前在这里</small>' : '<small>已占用</small>')}
      `;
    } else if (closed) {
      slotEl.innerHTML = `
        <div>
          <strong>${slotIndex === 0 ? '队长位' : `位置 ${slotIndex + 1}`}</strong>
          <small>该位置已关闭，不加入真人也不补 Bot</small>
        </div>
        ${room.is_host ? `<button type="button" class="slot-toggle" data-slot-toggle="${team}" data-slot-index="${slotIndex}" data-slot-closed="false">开放位置</button>` : '<small>已关闭</small>'}
      `;
    } else {
      slotEl.innerHTML = `
        <div>
          <strong>${slotIndex === 0 ? '队长位' : `位置 ${slotIndex + 1}`}</strong>
          <small>开放空位，可让真人加入；开局后若仍为空则补 Bot</small>
        </div>
        ${room.is_host ? `<button type="button" class="slot-toggle" data-slot-toggle="${team}" data-slot-index="${slotIndex}" data-slot-closed="true">关闭空位</button>` : `<button type="button" data-team-switch="${team}" data-slot-index="${slotIndex}">加入这里</button>`}
      `;
    }
    teamEl.append(slotEl);
  });
}

function humanDisplayLabel(userId, fallback = userLabel) {
  return userId ? `ID ${userId}` : fallback;
}

function currentRoomSeat() {
  if (!multiplayerState.room) {
    return null;
  }
  const team = multiplayerState.selfTeam;
  const slotIndex = Math.max(0, multiplayerState.room.current_slot_index || 0);
  return multiplayerState.room.teams?.[team]?.[slotIndex] || null;
}

function updateLobbyMeta(room) {
  lobbyRoomCodeEl.textContent = room.room_id;
  renderTeamSlots(redTeamEl, room, ABS_TEAM_RED);
  renderTeamSlots(blueTeamEl, room, ABS_TEAM_BLUE);
  lobbyStartButton.hidden = !room.is_host;
}

function renderLobby(room) {
  if (!room) return;
  lobbyTitleEl.textContent = room.is_host ? '创建房间：配置红蓝两队' : '加入房间：选择你的站位';
  lobbySubtitleEl.textContent = room.is_host
    ? '你固定在红队队长位。你可以把其他空位保持开放，或者关闭为空槽，开始后开放空槽才会补 Bot。'
    : '按顺序进入后你会优先落到蓝队队长位，但你也可以改去任意开放位置。';
  updateLobbyMeta(room);
  showOverlayPanel('lobby');
}

function applyRoomState(room) {
  multiplayerState.room = room;
  multiplayerState.roomId = room.room_id;
  multiplayerState.playerId = room.current_player_id || multiplayerState.playerId;
  multiplayerState.isHost = Boolean(room.is_host);
  multiplayerState.selfTeam = room.current_team || multiplayerState.selfTeam;
  absoluteFriendlyTeam = multiplayerState.selfTeam || ABS_TEAM_RED;
  saveRoomSession();
  if (room.status === 'lobby' && matchPhase === 'idle') {
    renderLobby(room);
  } else {
    updateLobbyMeta(room);
    hideEntryOverlay();
  }
}

async function refreshRoomList(showPanel = false) {
  const response = await fetch(roomBaseUrl, { headers: { 'X-Requested-With': 'fetch' } });
  const data = await response.json();
  if (!data.ok) {
    setResultMessage(data.message || '加载房间列表失败。', 'warning');
    return;
  }
  renderRoomList(data.rooms || []);
  if (showPanel) {
    showOverlayPanel('rooms');
  }
}

function roomWebSocketUrl(roomId, playerId) {
  const relative = roomWsTemplate.replace('__ROOM_ID__', roomId);
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}${relative}?player_id=${encodeURIComponent(playerId)}`;
}

function applyRemoteActorState(playerId, state) {
  const actor = remotePlayers.get(playerId);
  if (!actor) return;
  actor.mesh.position.set(state.x, state.y, state.z);
  actor.mesh.rotation.y = state.yaw;
  actor.hp = state.health;
  actor.alive = state.alive;
  actor.weapon = state.weapon;
  actor.state = state.alive ? 'remote' : 'dead';
  actor.userId = state.user_id || actor.userId;
  actor.label = state.user_id ? humanDisplayLabel(state.user_id, state.label || actor.label) : (state.label || actor.label);
  actor.absoluteTeam = state.team || actor.absoluteTeam;
  actor.team = localTeamForAbsolute(actor.absoluteTeam);
  actorStats.set(actor.id, {
    id: actor.id,
    label: actor.label,
    team: actor.absoluteTeam,
    kills: state.kills || 0,
    deaths: state.deaths || 0,
    isHuman: true,
  });
}

function buildLocalPlayerState() {
  const seat = currentRoomSeat();
  return {
    player_id: multiplayerState.playerId,
    user_id: seat?.user_id || null,
    team: absoluteFriendlyTeam,
    label: humanDisplayLabel(seat?.user_id, userLabel),
    x: playerObject.position.x,
    y: playerObject.position.y,
    z: playerObject.position.z,
    yaw: playerObject.rotation.y,
    pitch: camera.rotation.x,
    health: playerHealth,
    alive: playerAlive,
    weapon: currentWeapon,
    stance: playerStance,
    kills: playerKills,
    deaths: actorStats.get('local-player')?.deaths || 0,
  };
}

function buildHostSnapshot(remaining) {
  return {
    remaining,
    teamScores,
    humans: [
      buildLocalPlayerState(),
      ...[...remotePlayers.values()].map((actor) => ({
        player_id: actor.playerId,
        team: actor.absoluteTeam,
        user_id: actor.userId || null,
        label: actor.label,
        x: actor.mesh.position.x,
        y: actor.mesh.position.y,
        z: actor.mesh.position.z,
        yaw: actor.mesh.rotation.y,
        pitch: 0,
        health: actor.hp,
        alive: actor.alive,
        weapon: actor.weapon,
        stance: 'stand',
        kills: actorStats.get(actor.id)?.kills || 0,
        deaths: actorStats.get(actor.id)?.deaths || 0,
      })),
    ],
    bots: botState.filter((actor) => !actor.isHuman).map((actor) => ({
      id: actor.id,
      x: actor.mesh.position.x,
      y: actor.mesh.position.y,
      z: actor.mesh.position.z,
      yaw: actor.mesh.rotation.y,
      health: actor.hp,
      alive: actor.alive,
      team: actor.absoluteTeam,
      label: actor.label,
      weapon: actor.weapon,
      state: actor.state,
    })),
    mvp: computeMvpLabel(currentLeadingTeam()),
  };
}

function applyHostSnapshot(snapshot) {
  if (typeof snapshot.remaining === 'number') {
    multiplayerState.latestRemaining = snapshot.remaining;
    if (multiplayerState.active) {
      roundStart = performance.now() - (ROUND_DURATION - snapshot.remaining) * 1000;
    }
  }
  teamScores = snapshot.teamScores || teamScores;
  if (Array.isArray(snapshot.humans)) {
    snapshot.humans.forEach((human) => {
      if (human.player_id === multiplayerState.playerId) {
        playerHealth = human.health;
        playerAlive = human.alive;
        playerKills = human.kills || playerKills;
        killsEl.textContent = String(playerKills);
        return;
      }
      applyRemoteActorState(human.player_id, human);
    });
  }
  if (Array.isArray(snapshot.bots)) {
    snapshot.bots.forEach((botSnapshot) => {
      const bot = botState.find((entry) => entry.id === botSnapshot.id && !entry.isHuman);
      if (!bot) return;
      bot.mesh.position.set(botSnapshot.x, botSnapshot.y, botSnapshot.z);
      bot.mesh.rotation.y = botSnapshot.yaw;
      bot.hp = botSnapshot.health;
      bot.alive = botSnapshot.alive;
      bot.weapon = botSnapshot.weapon;
      bot.state = botSnapshot.state;
      bot.absoluteTeam = botSnapshot.team;
      bot.label = botSnapshot.label;
      actorStats.set(bot.id, { id: bot.id, label: bot.label, team: bot.absoluteTeam, kills: actorStats.get(bot.id)?.kills || 0, deaths: actorStats.get(bot.id)?.deaths || 0, isHuman: false });
    });
  }
  if (snapshot.mvp) {
    endMvpEl.textContent = snapshot.mvp;
  }
}

function ensureLabelElement(actorId, text) {
  let el = labelElements.get(actorId);
  if (!el) {
    el = document.createElement('div');
    el.className = 'voxel-player-label';
    labelLayer?.append(el);
    labelElements.set(actorId, el);
  }
  el.textContent = text;
  return el;
}

function updateLabelPositions() {
  labelElements.forEach((element) => {
    element.style.display = 'none';
  });
  if (!multiplayerState.active) {
    return;
  }
  botState.forEach((actor) => {
    if (!actor.alive || actor.absoluteTeam !== absoluteFriendlyTeam) {
      return;
    }
    const label = ensureLabelElement(actor.id, actor.label);
    const screenPosition = actor.mesh.position.clone().add(new THREE.Vector3(0, 2.1, 0)).project(camera);
    if (screenPosition.z < -1 || screenPosition.z > 1) {
      label.style.display = 'none';
      return;
    }
    label.style.display = 'block';
    label.style.left = `${(screenPosition.x * 0.5 + 0.5) * stage.clientWidth}px`;
    label.style.top = `${(-screenPosition.y * 0.5 + 0.5) * stage.clientHeight}px`;
  });
}

function syncMultiplayerState(now, remaining) {
  if (!multiplayerState.active) {
    return;
  }
  if (now - multiplayerState.lastStateSentAt > 90) {
    multiplayerState.lastStateSentAt = now;
    sendRoomSocket('player_state', buildLocalPlayerState());
  }
  if (multiplayerState.isHost && now - multiplayerState.lastSnapshotSentAt > 140) {
    multiplayerState.lastSnapshotSentAt = now;
    sendRoomSocket('host_snapshot', buildHostSnapshot(remaining));
  }
}

function findMyMatchResult(finalPayload) {
  const playerResults = finalPayload.player_results || [];
  return playerResults.find((entry) => entry.player_id === multiplayerState.playerId) || null;
}

async function claimMultiplayerReward(finalPayload) {
  if (!multiplayerState.roomId || !multiplayerState.playerId || multiplayerState.claimSent) {
    return null;
  }
  multiplayerState.claimSent = true;
  const data = await postRoomAction(roomActionUrl(multiplayerState.roomId, '/claim'), { player_id: multiplayerState.playerId });
  if (!data.ok) {
    multiplayerState.claimSent = false;
    setResultMessage(data.message || '联机奖励领取失败。', 'warning');
    return null;
  }
  multiplayerState.claimCompleted = true;
  clearRoomSession();
  endCoinsEl.textContent = String(data.reward ?? 0);
  setResultMessage(`${data.game_label || '方块战场'}联机结算完成：获得 ${data.reward ?? 0} 金币，当前剩余 ${data.coins_after ?? '-'} 金币。`, 'success');
  const localResult = findMyMatchResult(finalPayload);
  notifyExternal({
    earnedCoins: data.reward ?? 0,
    kills: localResult?.kills || playerKills,
    winStatus: Boolean(localResult?.win_status),
    timeAlive: localResult?.time_alive || 0,
  });
  return data;
}

function showRemoteMatchEnd(payload) {
  matchPhase = 'ended';
  gameEnded = true;
  gameRunning = false;
  gamePaused = false;
  controls.unlock();
  gameOverOverlay.hidden = false;
  respawnOverlay.hidden = true;
  pauseOverlay.hidden = true;
  const localResult = findMyMatchResult(payload);
  const isWinner = payload.winner_team === absoluteFriendlyTeam;
  endTitleEl.textContent = `${payload.winner_team === ABS_TEAM_RED ? '红队' : '蓝队'}获胜`;
  endSummaryEl.textContent = payload.summary || '';
  endKillsEl.textContent = String(localResult?.kills || playerKills);
  endTimeEl.textContent = `${localResult?.time_alive || 0}s`;
  endRedKillsEl.textContent = String(payload.red_kills || 0);
  endBlueKillsEl.textContent = String(payload.blue_kills || 0);
  endMvpEl.textContent = payload.mvp || '待定';
  endCoinsEl.textContent = '0';
  setResultMessage(isWinner ? '联机对局已结束：你的队伍获胜。' : '联机对局已结束：你的队伍落败。', isWinner ? 'success' : 'warning');
  claimMultiplayerReward(payload);
}

function handleRoomSocketMessage(data) {
  if (data.type === 'room_state' && data.room) {
    applyRoomState(data.room);
    return;
  }
  if (data.type === 'room_closed') {
    resetMultiplayerLobbyState();
    setResultMessage('房主离开，联机房间已关闭。', 'warning');
    refreshRoomList(true);
    return;
  }
  if (data.type === 'host_transferred' && data.player_id) {
    setStatus(data.player_id === multiplayerState.playerId ? '你已成为新的房主。' : '房主已转移，联机对局继续。');
    return;
  }
  if (data.type === 'match_started' && data.match) {
    startMultiplayerMatch(data.match);
    return;
  }
  if (data.type === 'player_state' && data.player_id && data.player_id !== multiplayerState.playerId) {
    applyRemoteActorState(data.player_id, data.payload || {});
    return;
  }
  if (data.type === 'player_fire' && multiplayerState.isHost && data.player_id && data.player_id !== multiplayerState.playerId) {
    processRemoteFire(data.player_id, data.payload || {});
    return;
  }
  if (data.type === 'captain_command' && data.payload) {
    if (data.player_id !== multiplayerState.playerId) {
      applyCaptainCommand(data.payload.team, { x: data.payload.x, z: data.payload.z }, data.player_id);
    }
    return;
  }
  if (data.type === 'host_snapshot' && data.payload) {
    applyHostSnapshot(data.payload);
    return;
  }
  if (data.type === 'match_end' && data.payload) {
    if (!multiplayerState.isHost) {
      showRemoteMatchEnd(data.payload);
    }
  }
}

async function restoreSavedRoomSession() {
  const raw = localStorage.getItem(roomSessionStorageKey);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (!saved.roomId || !saved.playerId) {
      clearRoomSession();
      return;
    }
    const response = await fetch(`${roomActionUrl(saved.roomId)}?player_id=${encodeURIComponent(saved.playerId)}`, {
      headers: { 'X-Requested-With': 'fetch' },
    });
    const data = await response.json();
    if (!data.ok) {
      clearRoomSession();
      return;
    }
    multiplayerState.playerId = saved.playerId;
    applyRoomState(data.room);
    connectRoomSocket(saved.roomId, saved.playerId);
    if (data.match) {
      startMultiplayerMatch(data.match, { resumed: true });
    }
    if (data.snapshot) {
      applyHostSnapshot(data.snapshot);
    }
    if (data.final_result) {
      showRemoteMatchEnd(data.final_result);
    }
  } catch {
    clearRoomSession();
  }
}

function connectRoomSocket(roomId, playerId) {
  disconnectRoomSocket(true);
  multiplayerState.explicitDisconnect = false;
  const socket = new WebSocket(roomWebSocketUrl(roomId, playerId));
  multiplayerState.ws = socket;
  socket.addEventListener('open', () => {
    multiplayerState.connected = true;
    sendRoomSocket('request_room_state');
  });
  socket.addEventListener('message', (event) => {
    try {
      handleRoomSocketMessage(JSON.parse(event.data));
    } catch {
      // ignore malformed messages
    }
  });
  socket.addEventListener('close', () => {
    multiplayerState.connected = false;
    if (!multiplayerState.explicitDisconnect && multiplayerState.roomId && multiplayerState.playerId) {
      multiplayerState.reconnectTimer = window.setTimeout(() => {
        connectRoomSocket(multiplayerState.roomId, multiplayerState.playerId);
      }, 1000);
    }
  });
}

function sendRoomSocket(type, payload = {}) {
  if (!multiplayerState.ws || multiplayerState.ws.readyState !== WebSocket.OPEN) return;
  multiplayerState.ws.send(JSON.stringify({ type, payload }));
}

function startMatchLoop() {
  matchPhase = 'running';
  gameRunning = true;
  roundStart = performance.now();
  hideEntryOverlay();
  focusGamePage();
  if (!isMobileMode()) {
    controls.lock();
  } else {
    setStatus(multiplayerState.active ? '联机触屏模式已启动。' : '触屏模式已启动：左手移动，右侧滑屏瞄准，右下角开火。');
  }
}

function startSingleplayerMatch() {
  resetMultiplayerLobbyState();
  hideEntryOverlay();
  multiplayerState.active = false;
  multiplayerState.room = null;
  absoluteFriendlyTeam = ABS_TEAM_RED;
  resetRound();
  startMatchLoop();
}

function startMultiplayerMatch(match, options = {}) {
  multiplayerState.active = true;
  multiplayerState.humans = match.humans || [];
  if (multiplayerState.room) {
    multiplayerState.room.match_closed_slots = match.closed_slots || { [ABS_TEAM_RED]: [], [ABS_TEAM_BLUE]: [] };
  }
  multiplayerState.claimSent = false;
  multiplayerState.claimCompleted = false;
  multiplayerState.latestRemaining = match.duration_seconds || ROUND_DURATION;
  if (multiplayerState.room) {
    multiplayerState.room.status = 'started';
  }
  absoluteFriendlyTeam = multiplayerState.selfTeam || ABS_TEAM_RED;
  resetRound();
  if (options.resumed && multiplayerState.latestRemaining < ROUND_DURATION) {
    roundStart = performance.now() - (ROUND_DURATION - multiplayerState.latestRemaining) * 1000;
    gameRunning = true;
    hideEntryOverlay();
    focusGamePage();
    if (!isMobileMode()) {
      controls.lock();
    }
  } else {
    startMatchLoop();
  }
  setStatus(`联机对局已开始：${absoluteFriendlyTeam === ABS_TEAM_RED ? '你在红队' : '你在蓝队'}。`);
}

function localTeamForAbsolute(team) {
  return team === absoluteFriendlyTeam ? TEAM_FRIENDLY : TEAM_ENEMY;
}

function clampPointToArena(point) {
  const limit = MAP_HALF - PLAYER_BOUNDARY_MARGIN;
  point.x = Math.max(-limit, Math.min(limit, point.x));
  point.z = Math.max(-limit, Math.min(limit, point.z));
  point.y = Math.max(0, point.y);
  return point;
}

function pickWorldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  scene.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const worldMeshes = mapGroup.children.filter((mesh) => mesh.userData.blocksShots !== false);
  const hit = raycaster.intersectObjects(worldMeshes, false)[0] || null;
  return hit ? clampPointToArena(hit.point.clone()) : null;
}

function pickCommandPointFromCrosshair() {
  const rect = canvas.getBoundingClientRect();
  const worldPoint = pickWorldPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  if (worldPoint) {
    return worldPoint;
  }
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const direction = camera.getWorldDirection(new THREE.Vector3());
  if (Math.abs(direction.y) > 0.001) {
    const distanceToGround = origin.y / -direction.y;
    if (distanceToGround > 0) {
      return clampPointToArena(origin.clone().addScaledVector(direction, distanceToGround));
    }
  }
  direction.y = 0;
  if (direction.lengthSq() < 0.001) {
    direction.set(0, 0, -1);
  }
  direction.normalize();
  return clampPointToArena(origin.clone().addScaledVector(direction, 18));
}

function clearTeamFlagMarker(team) {
  const marker = teamFlagMarkers[team];
  if (!marker) return;
  scene.remove(marker);
  teamFlagMarkers[team] = null;
}

function placeTeamFlagMarker(team, point) {
  clearTeamFlagMarker(team);
  const marker = createCommandFlagModel();
  marker.position.copy(point.clone().setY(Math.max(0, point.y)));
  marker.scale.setScalar(1.2);
  scene.add(marker);
  teamFlagMarkers[team] = marker;
}

function applyCaptainCommand(team, point, commanderId) {
  multiplayerState.teamCommands[team] = { x: point.x, z: point.z, expiresAt: performance.now() + COMMAND_FLAG_DURATION };
  placeTeamFlagMarker(team, point.clone());
  if (commanderId === multiplayerState.playerId) {
    viewWeapon.userData.commandSwing = 420;
  }
  const actor = [...remotePlayers.values()].find((entry) => entry.playerId === commanderId);
  if (actor) {
    actor.waveTimer = 420;
  }
  addKillfeed(`${team === absoluteFriendlyTeam ? '我方' : '敌方'}队长发出集合指令`);
}

function issueCaptainCommand(point = null) {
  if (!multiplayerState.active || !multiplayerState.room || multiplayerState.room.current_slot_index !== 0) {
    return;
  }
  const commandPoint = point || pickCommandPointFromCrosshair();
  setStatus(`队长指令：向 (${commandPoint.x.toFixed(1)}, ${commandPoint.z.toFixed(1)}) 集合并进攻。`);
  applyCaptainCommand(absoluteFriendlyTeam, commandPoint, multiplayerState.playerId);
  sendRoomSocket('captain_command', { x: commandPoint.x, z: commandPoint.z, team: absoluteFriendlyTeam });
}

function absoluteTeamForLocal(team) {
  return team === TEAM_FRIENDLY ? absoluteFriendlyTeam : absoluteFriendlyTeam === ABS_TEAM_RED ? ABS_TEAM_BLUE : ABS_TEAM_RED;
}

function teamSpawnList(team) {
  return team === ABS_TEAM_RED ? RED_TEAM_SPAWNS : BLUE_TEAM_SPAWNS;
}

function localSpawnForCurrentPlayer() {
  if (!multiplayerState.active || !multiplayerState.room) {
    return RED_TEAM_SPAWNS[0].clone();
  }
  const spawnList = teamSpawnList(multiplayerState.selfTeam);
  const slotIndex = Math.max(0, multiplayerState.room.current_slot_index || 0);
  return (spawnList[slotIndex] || spawnList[0] || RED_TEAM_SPAWNS[0]).clone();
}

function clearMovementState() {
  keyState.w = false;
  keyState.a = false;
  keyState.s = false;
  keyState.d = false;
  keyState.space = false;
  mobileMoveVector.set(0, 0);
  resetStick();
}

function resetPlayerView(resetYaw = false) {
  camera.rotation.x = 0;
  camera.rotation.z = 0;
  if (resetYaw) {
    playerObject.rotation.y = 0;
  }
}

function applyPlayerStance(nextStance) {
  playerStance = nextStance;
  playerHeight = nextStance === 'prone' ? PLAYER_HEIGHT_PRONE : nextStance === 'crouch' ? PLAYER_HEIGHT_CROUCH : PLAYER_HEIGHT;
  playerObject.position.y = Math.max(playerHeight, playerObject.position.y);
  if (stanceEl) {
    stanceEl.textContent = nextStance === 'prone' ? '趴下' : nextStance === 'crouch' ? '蹲下' : '站立';
  }
  if (nextStance === 'prone') {
    setStatus('已趴下，移动更慢，更适合低姿态隐蔽。');
  } else if (nextStance === 'crouch') {
    setStatus('已蹲下，移动放缓但更稳定。');
  } else {
    setStatus('已恢复站立。');
  }
}

function updateMobileWeaponButtons() {
  mobileWeaponButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.voxelMobileWeapon === currentWeapon);
  });
}

function setWeapon(nextWeapon, announce = true) {
  if (!WEAPON_CONFIG[nextWeapon]) {
    return;
  }
  currentWeapon = nextWeapon;
  applyScopeState(false, false);
  if (weaponEl) {
    weaponEl.textContent = WEAPON_CONFIG[nextWeapon].label;
  }
  updateMobileWeaponButtons();
  if (announce) {
    setStatus(`已切换到 ${WEAPON_CONFIG[nextWeapon].label}。`);
  }
}

function applyScopeState(nextActive, announce = true) {
  const weapon = WEAPON_CONFIG[currentWeapon];
  const canScope = Boolean(weapon?.scopeEnabled);
  scopeActive = canScope ? nextActive : false;
  camera.fov = scopeActive ? weapon.zoomFov : BASE_FOV;
  camera.updateProjectionMatrix();
  if (scopeOverlay) {
    scopeOverlay.hidden = !scopeActive;
    scopeOverlay.classList.toggle('is-rifle-scope', scopeActive && currentWeapon === 'voxel_rifle');
    scopeOverlay.classList.toggle('is-sniper-scope', scopeActive && currentWeapon === 'voxel_sniper');
  }
  if (announce && canScope) {
    setStatus(scopeActive ? `${weapon.label} ${weapon.scopeLabel}已开启。` : `${weapon.label} ${weapon.scopeLabel}已关闭。`);
  }
}

function toggleScope() {
  if (!WEAPON_CONFIG[currentWeapon]?.scopeEnabled) {
    return;
  }
  applyScopeState(!scopeActive);
}

function setMovementKey(event, pressed) {
  const key = (event.key || '').toLowerCase();
  if (event.code === 'KeyW' || key === 'w') keyState.w = pressed;
  if (event.code === 'KeyA' || key === 'a') keyState.a = pressed;
  if (event.code === 'KeyS' || key === 's') keyState.s = pressed;
  if (event.code === 'KeyD' || key === 'd') keyState.d = pressed;
  if (event.code === 'Space' || key === ' ') {
    if (pressed) {
      event.preventDefault();
    }
    keyState.space = pressed;
  }
}

function resolveCurrentLeadWinStatus() {
  const friendlyAbs = absoluteFriendlyTeam;
  const enemyAbs = friendlyAbs === ABS_TEAM_RED ? ABS_TEAM_BLUE : ABS_TEAM_RED;
  const friendlyScore = teamScores[friendlyAbs] || 0;
  const enemyScore = teamScores[enemyAbs] || 0;
  if (friendlyScore !== enemyScore) {
    return friendlyScore > enemyScore;
  }
  return teamAliveCount(TEAM_FRIENDLY) >= teamAliveCount(TEAM_ENEMY);
}

function settlePauseDuration() {
  if (pauseStartedAt) {
    roundStart += performance.now() - pauseStartedAt;
    pauseStartedAt = 0;
  }
}

function updatePauseExitAction() {
  if (!pauseExitButton) return;
  pauseExitButton.hidden = false;
  if (!multiplayerState.active) {
    pauseExitButton.textContent = '结束本局';
    return;
  }
  pauseExitButton.textContent = multiplayerState.isHost ? '结束对局' : '离开房间';
}

function setPaused(paused, reason = '战斗已暂停') {
  gamePaused = paused;
  if (paused) {
    clearMovementState();
    pauseStartedAt = performance.now();
    pauseOverlay.hidden = false;
    pauseTitleEl.textContent = '战斗已暂停';
    pauseSummaryEl.textContent = reason;
    updatePauseExitAction();
    setStatus('战斗已暂停，可点击继续游戏恢复。');
  } else {
    settlePauseDuration();
    pauseOverlay.hidden = true;
    if (!gameEnded && gameRunning) {
      setStatus('已重新进入战斗。');
    }
  }
}

function isMobileMode() {
  return cachedMobileMode;
}

function showHitMarker() {
  hitMarker.classList.add('is-active');
  hitMarkerTimer = 120;
}

function createBlock(x, y, z, w, h, d, material, collider = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.blocksShots = collider;
  mapGroup.add(mesh);
  if (collider) {
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
  }
  return mesh;
}

function createWindowWallAlongX(x, z, width, height, material) {
  const wallThickness = 1;
  const sillHeight = Math.min(1.1, Math.max(0.9, height * 0.24));
  const headBandHeight = Math.min(1.2, Math.max(0.9, height * 0.28));
  const sidePostWidth = 0.8;
  createBlock(x, sillHeight / 2, z, width, sillHeight, wallThickness, material);
  createBlock(x, height - headBandHeight / 2, z, width, headBandHeight, wallThickness, material);
  createBlock(x - width / 2 + sidePostWidth / 2, height / 2, z, sidePostWidth, height, wallThickness, material);
  createBlock(x + width / 2 - sidePostWidth / 2, height / 2, z, sidePostWidth, height, wallThickness, material);
}

function createWindowWallAlongZ(x, z, depth, height, material) {
  const wallThickness = 1;
  const sillHeight = Math.min(1.1, Math.max(0.9, height * 0.24));
  const headBandHeight = Math.min(1.2, Math.max(0.9, height * 0.28));
  const sidePostDepth = 0.8;
  createBlock(x, sillHeight / 2, z, wallThickness, sillHeight, depth, material);
  createBlock(x, height - headBandHeight / 2, z, wallThickness, headBandHeight, depth, material);
  createBlock(x, height / 2, z - depth / 2 + sidePostDepth / 2, wallThickness, height, sidePostDepth, material);
  createBlock(x, height / 2, z + depth / 2 - sidePostDepth / 2, wallThickness, height, sidePostDepth, material);
}

function createDoorWallAlongX(x, z, width, height, material) {
  const wallThickness = 1;
  const doorWidth = Math.min(2.4, Math.max(1.8, width * 0.3));
  const doorHeight = Math.min(2.7, Math.max(2.2, height * 0.52));
  const sideWidth = (width - doorWidth) / 2;
  createBlock(x - (doorWidth / 2 + sideWidth / 2), height / 2, z, sideWidth, height, wallThickness, material);
  createBlock(x + (doorWidth / 2 + sideWidth / 2), height / 2, z, sideWidth, height, wallThickness, material);
  createBlock(x, doorHeight + (height - doorHeight) / 2, z, doorWidth, height - doorHeight, wallThickness, material);
}

function createEnterableHouseShell(x, z, width, depth, height, material) {
  createWindowWallAlongX(x, z - depth / 2, width, height, material);
  createDoorWallAlongX(x, z + depth / 2, width, height, material);
  createWindowWallAlongZ(x - width / 2, z, depth, height, material);
  createWindowWallAlongZ(x + width / 2, z, depth, height, material);
}

function createTower(x, z) {
  createBlock(x, 4, z, 6, 8, 6, materialSet.wood);
  createBlock(x, 8.5, z, 8, 1, 8, materialSet.wall);
  for (const dx of [-2, 0, 2]) {
      createBlock(x + dx, 9.5, z - 3, 1, 1, 1, materialSet.rail);
      createBlock(x + dx, 9.5, z + 3, 1, 1, 1, materialSet.rail);
      createBlock(x - 3, 9.5, z + dx, 1, 1, 1, materialSet.rail);
      createBlock(x + 3, 9.5, z + dx, 1, 1, 1, materialSet.rail);
    }
    coverAnchors.push(new THREE.Vector3(x, 0, z));
}

function createHouseInteriorCover(x, z, width, depth, variant = 'default') {
  const interiorY = 1;
  if (variant === 'central') {
    createBlock(x, interiorY, z - 2.2, width - 6, 2, 1.2, materialSet.stone, true);
    createBlock(x, interiorY, z + 2.2, width - 6, 2, 1.2, materialSet.stone, true);
    createBlock(x - 3.1, interiorY, z, 1.2, 2, depth - 8, materialSet.wallDark, true);
    createBlock(x + 3.1, interiorY, z, 1.2, 2, depth - 8, materialSet.wallDark, true);
    createBlock(x - 1.4, 1.4, z - 0.3, 1.6, 2.8, 1.6, materialSet.wood, true);
    createBlock(x + 1.4, 1.4, z + 0.3, 1.6, 2.8, 1.6, materialSet.wood, true);
    [
      [x - 4.2, z - 4.2],
      [x + 4.2, z - 4.2],
      [x - 4.2, z + 4.2],
      [x + 4.2, z + 4.2],
      [x, z],
    ].forEach(([cx, cz]) => coverAnchors.push(new THREE.Vector3(cx, 0, cz)));
    return;
  }

  createBlock(x, interiorY, z, Math.max(2, width - 4), 2, 1.2, materialSet.stone, true);
  coverAnchors.push(new THREE.Vector3(x, 0, z));
}

function createHouseComplex(x, z, width, depth, height, options = {}) {
  createEnterableHouseShell(x, z, width, depth, height, materialSet.wood);
  createBlock(x, height + 0.5, z, width + 1, 1, depth + 1, materialSet.roof, true);
  createRailLine(x - width / 2 + 1, z - depth / 2 + 1, x + width / 2 - 1, z - depth / 2 + 1, height + 0.8);
  createRailLine(x - width / 2 + 1, z + depth / 2 - 1, x + width / 2 - 1, z + depth / 2 - 1, height + 0.8);
  createLadder(x - width / 2 - 0.6, z, height, 'z');
  if (options.interiorCover) {
    createHouseInteriorCover(x, z, width, depth, options.interiorCover);
  }
  coverAnchors.push(new THREE.Vector3(x, 0, z));
}

function createStairRun(x, z, dirX, dirZ, steps) {
  for (let i = 0; i < steps; i += 1) {
    createBlock(x + dirX * i * 2, 0.5 + i * 0.5, z + dirZ * i * 2, 2, 1 + i, 2, materialSet.wall, true);
  }
}

function createRamp(x, z, width, length, dirZ = 1) {
  for (let i = 0; i < length; i += 1) {
    createBlock(x, 0.25 + i * 0.25, z + dirZ * i * 1.5, width, 0.5 + i * 0.5, 1.5, materialSet.dirt, true);
  }
}

function createHouse(x, z, width, depth, height) {
  createEnterableHouseShell(x, z, width, depth, height, materialSet.wallDark);
  createBlock(x, height + 0.5, z, width + 1, 1, depth + 1, materialSet.wall, true);
  coverAnchors.push(new THREE.Vector3(x, 0, z));
}

function createRailLine(x1, z1, x2, z2, y = 2) {
  const segments = 8;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = x1 + (x2 - x1) * t;
    const z = z1 + (z2 - z1) * t;
    createBlock(x, y, z, 0.4, 0.8, 0.4, materialSet.rail, true);
  }
}

function createBridge(x, z, width, depth, height) {
  createBlock(x, height, z, width, 1, depth, materialSet.wall, true);
  createRailLine(x - width / 2 + 1, z - depth / 2 + 1, x + width / 2 - 1, z - depth / 2 + 1, height + 0.8);
  createRailLine(x - width / 2 + 1, z + depth / 2 - 1, x + width / 2 - 1, z + depth / 2 - 1, height + 0.8);
}

function createLadder(x, z, height, axis = 'z') {
  for (let i = 0; i < height; i += 1) {
    if (axis === 'z') {
      createBlock(x - 0.3, 0.5 + i, z, 0.1, 1, 0.2, materialSet.wood, false);
      createBlock(x + 0.3, 0.5 + i, z, 0.1, 1, 0.2, materialSet.wood, false);
      createBlock(x, 0.5 + i, z, 0.7, 0.1, 0.2, materialSet.wood, false);
    } else {
      createBlock(x, 0.5 + i, z - 0.3, 0.2, 1, 0.1, materialSet.wood, false);
      createBlock(x, 0.5 + i, z + 0.3, 0.2, 1, 0.1, materialSet.wood, false);
      createBlock(x, 0.5 + i, z, 0.2, 0.1, 0.7, materialSet.wood, false);
    }
  }

  const halfX = axis === 'z' ? 0.65 : 0.5;
  const halfZ = axis === 'z' ? 0.5 : 0.65;
  ladderZones.push({
    axis,
    x,
    z,
    topY: height + PLAYER_HEIGHT + 0.22,
    box: new THREE.Box3(
      new THREE.Vector3(x - halfX, 0, z - halfZ),
      new THREE.Vector3(x + halfX, height + 0.8, z + halfZ),
    ),
  });
}

function createArena() {
  mapGroup.clear();
  colliders.length = 0;
  coverAnchors.length = 0;
  ladderZones.length = 0;
  grenadeProjectiles.forEach((entry) => scene.remove(entry.mesh));
  grenadeBursts.forEach((entry) => scene.remove(entry.mesh));
  commandFlagProjectiles.forEach((entry) => scene.remove(entry.mesh));
  clearTeamFlagMarker(ABS_TEAM_RED);
  clearTeamFlagMarker(ABS_TEAM_BLUE);
  grenadeProjectiles.length = 0;
  grenadeBursts.length = 0;
  commandFlagProjectiles.length = 0;

  createBlock(0, -0.5, 0, MAP_HALF * 2, 1, MAP_HALF * 2, materialSet.grass, false);
  createBlock(0, -1.5, 0, MAP_HALF * 2, 1, MAP_HALF * 2, materialSet.dirt, false);

  const wallSegments = [
    { x: 0, y: 2.5, z: -MAP_HALF, w: MAP_HALF * 2, h: 5, d: 2 },
    { x: 0, y: 2.5, z: MAP_HALF, w: MAP_HALF * 2, h: 5, d: 2 },
    { x: -MAP_HALF, y: 2.5, z: 0, w: 2, h: 5, d: MAP_HALF * 2 },
    { x: MAP_HALF, y: 2.5, z: 0, w: 2, h: 5, d: MAP_HALF * 2 },
  ];
  wallSegments.forEach((part) => createBlock(part.x, part.y, part.z, part.w, part.h, part.d, materialSet.wall));

  for (let i = -(MAP_HALF - 4); i <= MAP_HALF - 4; i += 4) {
    createBlock(i, 5.5, -MAP_HALF, 2, 1, 2, materialSet.wallDark);
    createBlock(i, 5.5, MAP_HALF, 2, 1, 2, materialSet.wallDark);
    createBlock(-MAP_HALF, 5.5, i, 2, 1, 2, materialSet.wallDark);
    createBlock(MAP_HALF, 5.5, i, 2, 1, 2, materialSet.wallDark);
  }

  for (const x of [-40, 0, 40]) {
    for (const z of [-40, 40]) {
      createBlock(x, 4.5, z, 4, 9, 4, materialSet.wallDark);
    }
  }

  createTower(-46, -46);
  createTower(46, -46);
  createTower(-46, 46);
  createTower(46, 46);
  createTower(0, -46);
  createTower(0, 46);

  createHouseComplex(0, 0, 14, 18, 6, { interiorCover: 'central' });
  createHouseComplex(-28, 24, 8, 10, 5);
  createHouseComplex(30, -22, 8, 10, 5);
  createHouseComplex(-30, -6, 7, 8, 4);
  createHouseComplex(22, 16, 7, 8, 4);
  createBridge(0, -34, 14, 4, 5);
  createBridge(0, 34, 14, 4, 5);

  createStairRun(-38, 10, 1, 0, 7);
  createStairRun(38, -10, -1, 0, 7);
  createStairRun(-10, 30, 1, -1, 8);
  createStairRun(12, -30, -1, 1, 8);
  createRamp(0, 28, 4, 8, -1);
  createRamp(-24, -4, 3, 10, 1);
  createRamp(24, 6, 3, 10, -1);
  createRamp(0, -18, 5, 8, 1);

  createRailLine(-18, 18, 18, 18, 3);
  createRailLine(-18, -18, 18, -18, 3);
  createRailLine(-36, 32, -12, 32, 5);
  createRailLine(12, -32, 36, -32, 5);
  createRailLine(-8, 6, 8, 6, 4);

  createLadder(-46, -42.7, 8, 'z');
  createLadder(46, -42.7, 8, 'z');
  createLadder(-46, 42.7, 8, 'z');
  createLadder(46, 42.7, 8, 'z');
  createLadder(0, -42.7, 8, 'z');
  createLadder(0, 42.7, 8, 'z');
  createLadder(-8, 30, 7, 'z');
  createLadder(8, -30, 7, 'z');
  createLadder(-28, 24, 5, 'x');
  createLadder(30, -22, 5, 'x');

  const covers = [
    [-30, 1, -30], [-12, 1, -32], [10, 1, -30], [28, 1, -28],
    [-34, 1, -10], [-18, 1, -6], [0, 1, -10], [16, 1, -4], [34, 1, -8],
    [-32, 1, 14], [-18, 1, 10], [-2, 1, 16], [12, 1, 10], [30, 1, 18],
    [-26, 1, 30], [-4, 1, 28], [14, 1, 30], [30, 1, 28],
    [-38, 1, 0], [38, 1, 0], [0, 1, 0], [-12, 1, 22], [12, 1, -22],
  ];
  covers.forEach(([x, y, z]) => {
    createBlock(x, y, z, 2, 2, 2, materialSet.stone);
    createBlock(x, y + 1.5, z, 2, 1, 2, materialSet.dirt);
    coverAnchors.push(new THREE.Vector3(x, 0, z));
  });

  const tallCovers = [
    [-24, 2, 20], [22, 2, 18], [-22, 2, -22], [24, 2, -18],
    [-10, 2, 30], [10, 2, 30], [0, 2, -24], [0, 2, 24],
  ];
  tallCovers.forEach(([x, y, z]) => {
    createBlock(x, y, z, 3, 4, 3, materialSet.stone);
    coverAnchors.push(new THREE.Vector3(x, 0, z));
  });
}

function makeVoxelHumanoid(team, isPlayer = false) {
  const root = new THREE.Group();
  const bodyMat = team === TEAM_FRIENDLY ? materialSet.blue : materialSet.red;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), materialSet.skin);
  head.position.set(0, 1.5, 0);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), bodyMat);
  body.position.set(0, 1.0, 0);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), bodyMat);
  const armR = armL.clone();
  armL.position.set(-0.42, 1.0, 0);
  armR.position.set(0.42, 1.0, 0);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), bodyMat);
  const legR = legL.clone();
  legL.position.set(-0.15, 0.25, 0);
  legR.position.set(0.15, 0.25, 0);

  const gun = new THREE.Group();
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.35), materialSet.gun);
  stock.position.set(0, 0, -0.12);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), materialSet.gun);
  receiver.position.set(0, 0, 0.15);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), materialSet.gun);
  barrel.position.set(0, 0, 0.72);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), materialSet.gun);
  grip.position.set(0, -0.18, 0.1);
  gun.add(stock, receiver, barrel, grip);
  gun.position.set(0.26, 1.05, 0.25);
  gun.rotation.x = Math.PI * 0.08;
  gun.rotation.y = Math.PI * 0.02;

  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.18), materialSet.wallDark);
  scope.position.set(0, 0.1, 0.36);
  scope.visible = false;
  gun.add(scope);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), materialSet.muzzle);
  muzzle.position.set(0, 0, 1.08);
  muzzle.visible = false;
  gun.add(muzzle);

  root.add(head, body, armL, armR, legL, legR, gun);
  root.castShadow = true;
  root.userData = { head, body, armL, armR, legL, legR, gun, muzzle, scope, team, isPlayer };
  return root;
}

function createCommandFlagModel() {
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.03), materialSet.wood);
  pole.position.set(0, 0.36, 0);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.04), materialSet.muzzle);
  cloth.position.set(0.18, 0.56, 0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), materialSet.rail);
  cap.position.set(0, 0.72, 0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), materialSet.wallDark);
  base.position.set(0, 0.03, 0);
  flag.add(pole, cloth, cap, base);
  return flag;
}

function createViewWeapon() {
  const gun = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.8), materialSet.gun);
  body.position.set(0, 0, -0.25);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), materialSet.gun);
  barrel.position.set(0.06, 0.03, -0.95);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.26), materialSet.gun);
  stock.position.set(-0.02, -0.05, 0.08);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), materialSet.skin);
  hand.position.set(-0.08, -0.16, -0.05);
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.24), materialSet.wallDark);
  scope.position.set(0.06, 0.11, -0.56);
  scope.visible = false;
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), materialSet.muzzle);
  muzzle.position.set(0.06, 0.03, -1.34);
  muzzle.visible = false;

  const grenade = new THREE.Group();
  const grenadeBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), materialSet.wallDark);
  grenadeBody.scale.set(1, 1.08, 1);
  const grenadeCap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), materialSet.rail);
  grenadeCap.position.set(0, 0.12, 0);
  const grenadeLever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.03), materialSet.rail);
  grenadeLever.position.set(0.04, 0.08, 0);
  const grenadePin = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), materialSet.muzzle);
  grenadePin.rotation.y = Math.PI / 2;
  grenadePin.position.set(-0.07, 0.12, 0);
  grenade.add(grenadeBody, grenadeCap, grenadeLever, grenadePin);
  grenade.position.set(0.02, -0.08, -0.38);
  grenade.rotation.set(0.35, -0.2, 0.1);
  grenade.visible = false;

  const commandFlag = createCommandFlagModel();
  commandFlag.position.set(0.08, -0.26, -0.48);
  commandFlag.rotation.set(0.12, -0.18, 0.08);
  commandFlag.visible = false;

  gun.add(body, barrel, stock, hand, scope, muzzle, grenade, commandFlag);
  gun.position.set(0.46, -0.38, -0.75);
  gun.rotation.set(-0.12, -0.12, 0.04);
  gun.userData = {
    muzzle,
    scope,
    grenade,
    commandFlag,
    firearmParts: [body, barrel, stock, scope],
    kick: 0,
    commandSwing: 0,
  };
  camera.add(gun);
  return gun;
}

const viewWeapon = createViewWeapon();

function applyBotDifficulty(bot) {
  const enemy = bot.team === TEAM_ENEMY;
  bot.weapon = Math.random() > (enemy ? 0.58 : 0.68) ? 'voxel_sniper' : 'voxel_rifle';
  bot.speed = (enemy ? 2.45 : 2.25) + Math.random() * (enemy ? 0.35 : 0.35);
  bot.preferredRange = bot.weapon === 'voxel_sniper' ? (enemy ? 18 : 24) : (enemy ? 8.6 : 8);
  bot.reactionScale = enemy ? 0.98 + Math.random() * 0.14 : 1.02 + Math.random() * 0.16;
  bot.burstCap = enemy ? 2 : 3;
  bot.pushBias = enemy ? 1.02 : 0.92;
  bot.damageScale = enemy ? 0.88 : 1;
  bot.coverRefresh = enemy ? 0.64 : 0.75;
}

function makeBot(team, index, spawn, options = {}) {
  const mesh = makeVoxelHumanoid(team);
  const safeSpawn = resolveSafeSpawn(spawn, PLAYER_HEIGHT, PLAYER_RADIUS * 0.9);
  mesh.position.copy(safeSpawn);
  mesh.position.y = 0;
  scene.add(mesh);

  const bot = {
    id: options.id || `${team}-${index}`,
    team,
    absoluteTeam: options.absoluteTeam || absoluteTeamForLocal(team),
    label: options.label || `Bot ${index + 1}`,
    isHuman: Boolean(options.isHuman),
    playerId: options.playerId || null,
    userId: options.userId || null,
    mesh,
    hp: 100,
    alive: true,
    state: options.isHuman ? 'remote' : 'patrol',
    deadAt: 0,
    respawnAt: 0,
    cooldown: 400 + Math.random() * 800,
    patrolTarget: spawn.clone(),
    coverTarget: null,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 500 + Math.random() * 900,
    burstLeft: 0,
    weapon: options.weapon || 'voxel_rifle',
    speed: 2.3,
    muzzleTimer: 0,
    hitTimer: 0,
    preferredRange: 10,
    reactionScale: 1,
    burstCap: 3,
    pushBias: 1,
    damageScale: 1,
    coverRefresh: 0.7,
  };
  if (!bot.isHuman) {
    applyBotDifficulty(bot);
  }
  actorLabels.set(bot.id, bot.label);
  actorStats.set(bot.id, { id: bot.id, label: bot.label, team: bot.absoluteTeam, kills: 0, deaths: 0, isHuman: bot.isHuman });
  return bot;
}

function setPatrolTarget(bot) {
  const anchor = coverAnchors[Math.floor(Math.random() * coverAnchors.length)] || new THREE.Vector3();
  const sign = bot.team === TEAM_FRIENDLY ? 1 : -1;
  bot.patrolTarget = new THREE.Vector3(anchor.x + (Math.random() - 0.5) * 3, 0, anchor.z + sign * (2 + Math.random() * 5));
}

function chooseCoverPosition(bot, threatPosition) {
  const sign = bot.team === TEAM_FRIENDLY ? 1 : -1;
  const anchors = coverAnchors.filter((anchor) => (bot.team === TEAM_FRIENDLY ? anchor.z > -1 : anchor.z < 1));
  if (!anchors.length) {
    return null;
  }
  return anchors.reduce((best, anchor) => {
    const hidePos = anchor.clone().add(new THREE.Vector3(0, 0, sign * 1.8));
    const toThreat = hidePos.distanceTo(threatPosition);
    const toBot = bot.mesh.position.distanceTo(hidePos);
    const pressureBonus = bot.team === TEAM_ENEMY ? Math.max(0, 16 - toThreat) * 0.55 : 0;
    const score = toBot + toThreat * bot.coverRefresh - pressureBonus;
    if (!best || score < best.score) {
      return { score, position: hidePos };
    }
    return best;
  }, null)?.position || null;
}

function resetBots(config = null) {
  botState.forEach((bot) => scene.remove(bot.mesh));
  botState.length = 0;
  actorLabels.clear();
  actorStats.clear();
  remotePlayers.clear();

  if (config?.humans?.length) {
    const groupedHumans = { [ABS_TEAM_RED]: [], [ABS_TEAM_BLUE]: [] };
    const closedSlots = config.closed_slots || { [ABS_TEAM_RED]: [], [ABS_TEAM_BLUE]: [] };
    config.humans.forEach((human) => {
      groupedHumans[human.team].push(human);
    });

    [ABS_TEAM_RED, ABS_TEAM_BLUE].forEach((absoluteTeam) => {
      const localTeam = localTeamForAbsolute(absoluteTeam);
      const spawnList = teamSpawnList(absoluteTeam);
      groupedHumans[absoluteTeam]
        .filter((human) => human.player_id !== multiplayerState.playerId)
        .forEach((human) => {
          const spawn = spawnList[human.slot_index] || spawnList[0];
          const actor = makeBot(localTeam, human.slot_index, spawn, {
            id: `human-${human.player_id}`,
            absoluteTeam,
            isHuman: true,
            playerId: human.player_id,
            userId: human.user_id,
            label: `ID ${human.user_id}`,
            weapon: 'voxel_rifle',
          });
          remotePlayers.set(human.player_id, actor);
          botState.push(actor);
        });
    });

    const spawnBotsForTeam = (absoluteTeam, localTeam) => {
      const spawnList = teamSpawnList(absoluteTeam);
      const occupiedSlots = new Set(groupedHumans[absoluteTeam].map((human) => human.slot_index));
      const blocked = new Set(closedSlots[absoluteTeam] || []);
      for (let slotIndex = 0; slotIndex < spawnList.length; slotIndex += 1) {
        if (slotIndex === 0 && absoluteTeam === absoluteFriendlyTeam) {
          continue;
        }
        if (occupiedSlots.has(slotIndex) || blocked.has(slotIndex)) {
          continue;
        }
        const bot = makeBot(localTeam, slotIndex, spawnList[slotIndex], { absoluteTeam });
        setPatrolTarget(bot);
        botState.push(bot);
      }
    };

    const enemyTeam = absoluteFriendlyTeam === ABS_TEAM_RED ? ABS_TEAM_BLUE : ABS_TEAM_RED;
    spawnBotsForTeam(absoluteFriendlyTeam, TEAM_FRIENDLY);
    spawnBotsForTeam(enemyTeam, TEAM_ENEMY);
    return;
  }

  FRIEND_SPAWNS.forEach((spawn, index) => {
    const bot = makeBot(TEAM_FRIENDLY, index, spawn, { absoluteTeam: ABS_TEAM_RED });
    setPatrolTarget(bot);
    botState.push(bot);
  });
  ENEMY_SPAWNS.forEach((spawn, index) => {
    const bot = makeBot(TEAM_ENEMY, index, spawn, { absoluteTeam: ABS_TEAM_BLUE });
    setPatrolTarget(bot);
    botState.push(bot);
  });
}

function respawnBot(bot) {
  if (bot.isHuman) {
    return;
  }
  const spawns = bot.team === TEAM_FRIENDLY ? FRIEND_SPAWNS : ENEMY_SPAWNS;
  const spawn = spawns[Number(bot.id.split('-')[1])] || spawns[0] || new THREE.Vector3();
  const safeSpawn = resolveSafeSpawn(spawn, PLAYER_HEIGHT, PLAYER_RADIUS * 0.9);
  bot.mesh.position.copy(safeSpawn);
  bot.mesh.position.y = 0;
  bot.mesh.visible = true;
  bot.hp = 100;
  bot.alive = true;
  bot.state = 'patrol';
  bot.deadAt = 0;
  bot.respawnAt = 0;
  bot.cooldown = 400 + Math.random() * 800;
  bot.coverTarget = null;
  bot.burstLeft = 0;
  bot.hitTimer = 0;
  applyBotDifficulty(bot);
  setPatrolTarget(bot);
}

function teamAliveCount(team) {
  let count = playerAlive && team === TEAM_FRIENDLY ? 1 : 0;
  botState.forEach((bot) => {
    if (bot.team === team && bot.alive) count += 1;
  });
  return count;
}

function teamRespawnPending(team) {
  let count = !playerAlive && team === TEAM_FRIENDLY && respawnTimer > 0 ? 1 : 0;
  botState.forEach((bot) => {
    if (bot.isHuman) return;
    if (bot.team === team && !bot.alive && bot.respawnAt > performance.now()) count += 1;
  });
  return count;
}

function notifyExternal(result) {
  const payload = { type: 'tamapet-voxel-fps-result', petId, petName, ...result };
  if (typeof window.voxelFpsGameCallback === 'function') {
    window.voxelFpsGameCallback(payload);
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, '*');
  }
}

window.calculateCoins = function calculateCoins(kills, winStatus, timeAlive) {
  const participation = 4;
  const killScore = Math.min(8, kills * 2);
  const winBonus = winStatus ? 6 : 0;
  const survivalBonus = Math.min(4, Math.floor(timeAlive / 30));
  return Math.min(20, participation + killScore + winBonus + survivalBonus);
};

function playerCollision(nextPosition) {
  collisionBox.min.set(nextPosition.x - PLAYER_RADIUS, nextPosition.y - playerHeight, nextPosition.z - PLAYER_RADIUS);
  collisionBox.max.set(nextPosition.x + PLAYER_RADIUS, nextPosition.y + 0.1, nextPosition.z + PLAYER_RADIUS);
  return colliders.some((box) => scratchBox.copy(box).intersectsBox(collisionBox));
}

function collisionAt(position, height = PLAYER_HEIGHT, radius = PLAYER_RADIUS) {
  collisionBox.min.set(position.x - radius, position.y - height, position.z - radius);
  collisionBox.max.set(position.x + radius, position.y + 0.1, position.z + radius);
  return colliders.some((box) => scratchBox.copy(box).intersectsBox(collisionBox));
}

function boxesOverlapXZ(box, x, z, radius = PLAYER_RADIUS) {
  return box.max.x > x - radius && box.min.x < x + radius && box.max.z > z - radius && box.min.z < z + radius;
}

function getHighestSurfaceAt(x, z, radius = PLAYER_RADIUS, maxY = Number.POSITIVE_INFINITY) {
  let supportTop = 0;
  colliders.forEach((box) => {
    if (!boxesOverlapXZ(box, x, z, radius)) return;
    if (box.max.y > maxY) return;
    if (box.max.y > supportTop) {
      supportTop = box.max.y;
    }
  });
  return supportTop;
}

function getSupportTopAt(position, maxStepDown = PLAYER_JUMP_CLIMB_HEIGHT + 1.5) {
  const footY = position.y - playerHeight;
  let supportTop = 0;
  colliders.forEach((box) => {
    if (!boxesOverlapXZ(box, position.x, position.z)) return;
    if (box.max.y > position.y + PLAYER_GROUND_EPSILON) return;
    if (footY - box.max.y > maxStepDown) return;
    if (box.max.y > supportTop) {
      supportTop = box.max.y;
    }
  });
  return supportTop;
}

function getBlockingTopAt(position) {
  collisionBox.min.set(position.x - PLAYER_RADIUS, position.y - playerHeight, position.z - PLAYER_RADIUS);
  collisionBox.max.set(position.x + PLAYER_RADIUS, position.y + 0.1, position.z + PLAYER_RADIUS);
  let blockingTop = null;
  colliders.forEach((box) => {
    if (!scratchBox.copy(box).intersectsBox(collisionBox)) return;
    blockingTop = blockingTop === null ? box.max.y : Math.max(blockingTop, box.max.y);
  });
  return blockingTop;
}

function resolveStepUpHeight(nextPosition, currentY) {
  const blockingTop = getBlockingTopAt(nextPosition);
  if (blockingTop === null) {
    return null;
  }
  const targetY = blockingTop + playerHeight + PLAYER_GROUND_EPSILON;
  const rise = targetY - currentY;
  const maxRise = (keyState.space || playerVelocity.y > 0.45) ? PLAYER_JUMP_CLIMB_HEIGHT : PLAYER_STEP_HEIGHT;
  if (rise <= 0 || rise > maxRise) {
    return null;
  }
  tempVecB.copy(nextPosition);
  tempVecB.y = targetY;
  if (!playerCollision(tempVecB)) {
    return targetY;
  }
  return null;
}

function movePlayerAxis(current, axis, amount) {
  if (!amount) return;
  tempVecC.copy(current);
  tempVecC[axis] += amount;
  if (!playerCollision(tempVecC)) {
    current[axis] = tempVecC[axis];
    return;
  }
  const climbY = resolveStepUpHeight(tempVecC, current.y);
  if (climbY !== null) {
    current.y = climbY;
    current[axis] = tempVecC[axis];
    playerVelocity.y = Math.max(0, playerVelocity.y);
  }
}

function clampPlayerInsideBounds(position) {
  const limit = MAP_HALF - PLAYER_BOUNDARY_MARGIN;
  position.x = Math.max(-limit, Math.min(limit, position.x));
  position.z = Math.max(-limit, Math.min(limit, position.z));
}

function getNearbyLadder(position) {
  return ladderZones.find((zone) => zone.box.containsPoint(position) || zone.box.distanceToPoint(position) < 0.2) || null;
}

function resolveSafeSpawn(basePosition, height = PLAYER_HEIGHT, radius = PLAYER_RADIUS) {
  const candidate = basePosition.clone();
  candidate.y = height;
  if (!collisionAt(candidate, height, radius)) {
    return candidate;
  }

  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  for (let distance = 2; distance <= 24; distance += 2) {
    for (const [dx, dz] of directions) {
      candidate.set(basePosition.x + dx * distance, height, basePosition.z + dz * distance);
      if (!collisionAt(candidate, height, radius)) {
        return candidate.clone();
      }
    }
  }
  return new THREE.Vector3(basePosition.x, height, basePosition.z);
}

function lineOfSight(from, to) {
  tempVecA.copy(to).sub(from);
  const distance = tempVecA.length();
  if (!distance) return true;
  scene.updateMatrixWorld(true);
  raycaster.set(from, tempVecA.normalize());
  raycaster.far = distance;
  const worldMeshes = mapGroup.children.filter((mesh) => mesh.userData.blocksShots !== false);
  const hits = raycaster.intersectObjects(worldMeshes, false);
  return hits.length === 0;
}

function getBotAimPoint(bot) {
  return bot.mesh.position.clone().add(new THREE.Vector3(0, 1.18, 0));
}

function findClosestShootableEnemy() {
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const weaponRange = WEAPON_CONFIG[currentWeapon]?.range ?? WEAPON_CONFIG.voxel_rifle.range;
  const candidates = botState
    .filter((bot) => bot.team === TEAM_ENEMY && bot.alive)
    .map((bot) => {
      const aimPoint = getBotAimPoint(bot);
      return {
        bot,
        aimPoint,
        distance: origin.distanceTo(aimPoint),
      };
    })
    .filter((entry) => entry.distance <= weaponRange)
    .sort((a, b) => a.distance - b.distance);

  return candidates.find((entry) => lineOfSight(origin, entry.aimPoint)) || candidates[0] || null;
}

function aimPlayerAt(position) {
  camera.lookAt(position);
  camera.rotation.z = 0;
  camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));
}

function resolveBotFromHitObject(hitObject) {
  let current = hitObject;
  while (current) {
    const bot = botState.find((entry) => entry.mesh === current);
    if (bot) {
      return bot;
    }
    current = current.parent;
  }
  return null;
}

function getPlayerTargetHits() {
  scene.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const worldMeshes = mapGroup.children.filter((mesh) => mesh.userData.blocksShots !== false);
  const worldHit = raycaster.intersectObjects(worldMeshes, false)[0] || null;
  const enemyMeshes = botState.filter((bot) => bot.alive && bot.team === TEAM_ENEMY).map((bot) => bot.mesh);
  return raycaster
    .intersectObjects(enemyMeshes, true)
    .filter((hit) => !worldHit || hit.distance <= worldHit.distance + 0.02)
    .map((hit) => ({ ...hit, bot: resolveBotFromHitObject(hit.object) }));
}

function resolveLocalPlayerHit(origin, direction, maxDistance) {
  if (!playerAlive) {
    return null;
  }
  const center = playerObject.position.clone().add(new THREE.Vector3(0, -playerHeight * 0.35, 0));
  const toCenter = center.sub(origin);
  const projected = toCenter.dot(direction);
  if (projected < 0 || projected > maxDistance) {
    return null;
  }
  const closest = origin.clone().addScaledVector(direction, projected);
  const distance = closest.distanceTo(playerObject.position);
  return distance <= 0.85 ? { type: 'player', distance: projected } : null;
}

function resolveTargetFromRay(origin, direction, shooterTeam, weapon) {
  scene.updateMatrixWorld(true);
  const normalized = direction.clone().normalize();
  raycaster.set(origin, normalized);
  raycaster.far = weapon.range;
  const worldMeshes = mapGroup.children.filter((mesh) => mesh.userData.blocksShots !== false);
  const worldHit = raycaster.intersectObjects(worldMeshes, false)[0] || null;
  const targetMeshes = botState.filter((actor) => actor.alive && actor.team !== shooterTeam).map((actor) => actor.mesh);
  const actorHit = raycaster
    .intersectObjects(targetMeshes, true)
    .map((hit) => ({ ...hit, actor: resolveBotFromHitObject(hit.object) }))
    .find((hit) => hit.actor && (!worldHit || hit.distance <= worldHit.distance + 0.02));
  const playerHit = shooterTeam === TEAM_ENEMY ? resolveLocalPlayerHit(origin, normalized, weapon.range) : null;
  if (playerHit && (!worldHit || playerHit.distance <= worldHit.distance + 0.02) && (!actorHit || playerHit.distance < actorHit.distance)) {
    return playerHit;
  }
  return actorHit ? { type: 'actor', actor: actorHit.actor, distance: actorHit.distance } : null;
}

function recordKillForActor(actorId, absoluteTeam) {
  teamScores[absoluteTeam] += 1;
  const stat = actorStats.get(actorId);
  if (stat) {
    stat.kills += 1;
  }
}

function processRemoteFire(playerId, payload = {}) {
  const actor = remotePlayers.get(playerId);
  if (!actor || !actor.alive) {
    return;
  }
  const weapon = WEAPON_CONFIG[payload.weapon] || WEAPON_CONFIG.voxel_rifle;
  if (payload.weapon === 'voxel_grenade') {
    return;
  }
  const origin = new THREE.Vector3(payload.origin?.x || actor.mesh.position.x, payload.origin?.y || 1.7, payload.origin?.z || actor.mesh.position.z);
  const direction = new THREE.Vector3(payload.direction?.x || 0, payload.direction?.y || 0, payload.direction?.z || -1);
  const target = resolveTargetFromRay(origin, direction, actor.team, weapon);
  if (!target) {
    return;
  }
  if (target.type === 'player') {
    const wasAlive = playerAlive;
    applyDamage('player', weapon.damage, actor.label);
    if (wasAlive && !playerAlive) {
      recordKillForActor(actor.id, actor.absoluteTeam);
    }
    return;
  }
  const killed = applyBotDamage(target.actor, weapon.damage, actor.label);
  if (killed) {
    recordKillForActor(actor.id, actor.absoluteTeam);
  }
}

function findTarget(bot) {
  const weaponRange = bot.weapon === 'voxel_sniper' ? WEAPON_CONFIG.voxel_sniper.range : WEAPON_CONFIG.voxel_rifle.range;
  const candidates = [];
  if (bot.team === TEAM_ENEMY && playerAlive) {
    const playerPos = playerObject.position.clone();
    candidates.push({ type: 'player', position: playerPos, distance: bot.mesh.position.distanceTo(playerPos), priority: 0 });
  }
  botState.forEach((other) => {
    if (!other.alive || other.team === bot.team) return;
    const distance = bot.mesh.position.distanceTo(other.mesh.position);
    candidates.push({
      type: 'bot',
      bot: other,
      position: other.mesh.position,
      distance,
      priority: other.hitTimer > 0 ? -1 : 1,
    });
  });
  candidates.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.distance - b.distance);
  return candidates.find((entry) => entry.distance < weaponRange && lineOfSight(bot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), entry.position.clone().add(new THREE.Vector3(0, 1.2, 0)))) || null;
}

function applyDamage(target, amount, attackerName) {
  if (target !== 'player') {
    applyBotDamage(target, amount, attackerName);
    return;
  }
  if (!playerAlive) return;
  playerHealth = Math.max(0, playerHealth - amount);
  healthEl.textContent = String(Math.round(playerHealth));
  showHitMarker();
  damageFlashTimer = 220;
  damageScreen?.classList.add('is-active');
  setStatus(`中枪！生命降到 ${playerHealth.toFixed(1)}`);
  if (playerHealth <= 0) {
    playerAlive = false;
    camera.rotation.z = -0.45;
    camera.rotation.x = Math.max(camera.rotation.x, 0.25);
    playerObject.position.y = PLAYER_HEIGHT_CROUCH;
    controls.unlock();
    respawnTimer = PLAYER_RESPAWN_MS;
    respawnOverlay.hidden = false;
    respawnTitleEl.textContent = '你已倒下';
    respawnSummaryEl.textContent = '系统将在短暂时间后把你投回前线，也可以直接重新开始。';
    addKillfeed(`${attackerName} 击倒了你`);
    setStatus('你已倒下，等待本局结束。');
  }
}

function applyBotDamage(target, amount, attackerName, options = {}) {
  const { playerCredit = false, hitDuration = 140 } = options;
  if (!target.alive) return false;
  target.hp = Math.max(0, target.hp - amount);
  target.hitTimer = Math.max(target.hitTimer, hitDuration);
  if (target.hp <= 0) {
    target.alive = false;
    target.state = 'dead';
    target.deadAt = performance.now();
    target.respawnAt = target.isHuman ? 0 : target.deadAt + BOT_RESPAWN_MS;
    target.mesh.userData.deadTilt = target.team === TEAM_ENEMY ? -1.2 : 1.0;
    target.mesh.userData.muzzle.visible = false;
    const stat = actorStats.get(target.id);
    if (stat) {
      stat.deaths += 1;
    }
    if (playerCredit) {
      playerKills += 1;
      killsEl.textContent = String(playerKills);
      teamScores[absoluteFriendlyTeam] += 1;
      const localStat = actorStats.get('local-player');
      if (localStat) {
        localStat.kills += 1;
      }
    }
    addKillfeed(`${attackerName} 击倒了 ${target.isHuman ? target.label : `${target.team === TEAM_FRIENDLY ? '友军' : '敌军'} Bot`}`);
    return true;
  }
  return false;
}

function createGrenadeBurst(position) {
  const material = new THREE.MeshBasicMaterial({ color: '#ffb24b', transparent: true, opacity: 0.52 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), material);
  mesh.position.copy(position);
  scene.add(mesh);
  grenadeBursts.push({ mesh, startedAt: performance.now() });
}

function explodeGrenade(projectile) {
  scene.remove(projectile.mesh);
  createGrenadeBurst(projectile.mesh.position.clone());
  let hits = 0;
  botState.forEach((bot) => {
    if (bot.team !== TEAM_ENEMY || !bot.alive) return;
    const aimPoint = getBotAimPoint(bot);
    const distance = projectile.mesh.position.distanceTo(aimPoint);
    if (distance > GRENADE_BLAST_RADIUS) return;
    const damageRatio = 1 - distance / GRENADE_BLAST_RADIUS;
    const damage = Math.max(20, Math.round(GRENADE_MAX_DAMAGE * damageRatio));
    hits += 1;
    applyBotDamage(bot, damage, '你的手雷', { playerCredit: true, hitDuration: 280 });
  });
  if (hits > 0) {
    showHitMarker();
    setStatus(`手雷爆炸，波及 ${hits} 个敌人。`);
  } else {
    setStatus('手雷爆炸，但没有命中敌人。');
  }
}

function throwGrenade() {
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const spawn = camera.getWorldPosition(new THREE.Vector3())
    .add(direction.clone().multiplyScalar(0.85))
    .add(new THREE.Vector3(0, -0.15, 0));
  const velocity = direction.multiplyScalar(GRENADE_THROW_SPEED);
  velocity.y += 4.5;

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), materialSet.wallDark);
  mesh.position.copy(spawn);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  grenadeProjectiles.push({
    mesh,
    velocity,
  });
  setStatus('手雷已掷出，落地后会爆炸。');
}

function updateGrenadeProjectiles(delta) {
  for (let i = grenadeProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = grenadeProjectiles[i];
    projectile.velocity.y -= 18 * delta;
    const nextPosition = projectile.mesh.position.clone().addScaledVector(projectile.velocity, delta);
    projectile.mesh.rotation.x += delta * 7;
    projectile.mesh.rotation.y += delta * 9;

    const groundTop = getHighestSurfaceAt(nextPosition.x, nextPosition.z, 0.22, nextPosition.y + 0.8);
    const touchY = groundTop + 0.2;
    const touchedGround = projectile.velocity.y <= 0 && projectile.mesh.position.y > touchY && nextPosition.y <= touchY;
    if (touchedGround) {
      projectile.mesh.position.set(nextPosition.x, touchY, nextPosition.z);
      explodeGrenade(projectile);
      grenadeProjectiles.splice(i, 1);
      continue;
    }

    projectile.mesh.position.copy(nextPosition);
  }
}

function throwCommandFlag() {
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const spawn = camera.getWorldPosition(new THREE.Vector3())
    .add(direction.clone().multiplyScalar(0.78))
    .add(new THREE.Vector3(0, -0.18, 0));
  const velocity = direction.multiplyScalar(COMMAND_FLAG_THROW_SPEED);
  velocity.y += 4.2;

  const mesh = createCommandFlagModel();
  mesh.position.copy(spawn);
  mesh.scale.setScalar(0.8);
  scene.add(mesh);
  commandFlagProjectiles.push({ mesh, velocity });
  setStatus('红旗已掷出，落地后本队 Bot 会立刻向旗点集结。');
}

function updateCommandFlagProjectiles(delta) {
  for (let i = commandFlagProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = commandFlagProjectiles[i];
    projectile.velocity.y -= 18 * delta;
    const nextPosition = projectile.mesh.position.clone().addScaledVector(projectile.velocity, delta);
    projectile.mesh.rotation.x += delta * 5;
    projectile.mesh.rotation.z += delta * 2;
    const groundTop = getHighestSurfaceAt(nextPosition.x, nextPosition.z, 0.24, nextPosition.y + 0.8);
    const touchY = groundTop + 0.05;
    const touchedGround = projectile.velocity.y <= 0 && projectile.mesh.position.y > touchY && nextPosition.y <= touchY;
    if (touchedGround) {
      const landing = new THREE.Vector3(nextPosition.x, touchY, nextPosition.z);
      scene.remove(projectile.mesh);
      commandFlagProjectiles.splice(i, 1);
      issueCaptainCommand(landing);
      continue;
    }
    projectile.mesh.position.copy(nextPosition);
  }
}

function updateCommandFlagMarkers() {
  [ABS_TEAM_RED, ABS_TEAM_BLUE].forEach((team) => {
    const activeCommand = multiplayerState.teamCommands[team];
    if (!activeCommand || activeCommand.expiresAt <= performance.now()) {
      clearTeamFlagMarker(team);
    }
  });
}

function updateGrenadeBursts(now) {
  for (let i = grenadeBursts.length - 1; i >= 0; i -= 1) {
    const burst = grenadeBursts[i];
    const age = now - burst.startedAt;
    const progress = age / GRENADE_BLAST_DURATION;
    if (progress >= 1) {
      scene.remove(burst.mesh);
      burst.mesh.material.dispose();
      grenadeBursts.splice(i, 1);
      continue;
    }
    burst.mesh.scale.setScalar(1 + progress * 5.4);
    burst.mesh.material.opacity = 0.52 * (1 - progress);
  }
}

function playerShoot(now) {
  const weapon = WEAPON_CONFIG[currentWeapon];
  if (!pointerLocked || !playerAlive || !gameRunning || now - lastPlayerShot < weapon.fireDelay) {
    return;
  }
  lastPlayerShot = now;
  viewWeapon.userData.kick = weapon.kick;

  if (currentWeapon === 'voxel_grenade') {
    viewWeapon.userData.muzzle.visible = false;
    throwGrenade();
    return;
  }

  if (currentWeapon === 'voxel_command_flag') {
    viewWeapon.userData.muzzle.visible = false;
    throwCommandFlag();
    return;
  }

  viewWeapon.userData.scope.visible = Boolean(weapon.scopeEnabled);
  viewWeapon.userData.muzzle.visible = true;
  window.setTimeout(() => {
    viewWeapon.userData.muzzle.visible = false;
  }, 60);

  if (multiplayerState.active && !multiplayerState.isHost) {
    const direction = camera.getWorldDirection(new THREE.Vector3());
    const origin = camera.getWorldPosition(new THREE.Vector3());
    sendRoomSocket('player_fire', {
      weapon: currentWeapon,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: direction.x, y: direction.y, z: direction.z },
    });
    return;
  }

  const validHit = getPlayerTargetHits().find((hit) => hit.distance <= weapon.range && hit.bot);
  if (!validHit) {
    return;
  }
  const bot = validHit.bot;
  if (!bot) {
    return;
  }
  showHitMarker();
  applyBotDamage(bot, weapon.damage, '你', {
    playerCredit: true,
    hitDuration: currentWeapon === 'voxel_sniper' ? 320 : 220,
  });
  if (multiplayerState.active) {
    sendRoomSocket('player_fire', { weapon: currentWeapon });
  }
}

function toggleCrouch() {
  applyPlayerStance(playerStance === 'crouch' ? 'stand' : 'crouch');
}

function toggleProne() {
  applyPlayerStance(playerStance === 'prone' ? 'stand' : 'prone');
}

function updateViewWeapon(delta) {
  const kick = viewWeapon.userData.kick || 0;
  const weapon = WEAPON_CONFIG[currentWeapon] || WEAPON_CONFIG.voxel_rifle;
  const scopedWeapon = Boolean(weapon.scopeEnabled);
  const usingGrenade = currentWeapon === 'voxel_grenade';
  const usingCommandFlag = currentWeapon === 'voxel_command_flag';
  viewWeapon.userData.grenade.visible = usingGrenade;
  viewWeapon.userData.commandFlag.visible = usingCommandFlag;
  viewWeapon.userData.firearmParts.forEach((part) => {
    part.visible = !usingGrenade && !usingCommandFlag;
  });
  viewWeapon.userData.scope.visible = scopedWeapon && !usingGrenade && !usingCommandFlag;
  const commandSwing = viewWeapon.userData.commandSwing || 0;
  if (usingGrenade || usingCommandFlag) {
    viewWeapon.userData.muzzle.visible = false;
    viewWeapon.position.x = usingCommandFlag ? 0.3 : 0.32;
    viewWeapon.position.y = playerStance === 'prone' ? -0.66 : playerStance === 'crouch' ? -0.5 : -0.42;
    viewWeapon.position.z = usingCommandFlag ? -0.5 : -0.54;
    viewWeapon.rotation.z = (usingCommandFlag ? 0.08 : -0.04) + commandSwing * 0.0008;
    viewWeapon.rotation.x = (usingCommandFlag ? 0.08 : -0.04) - kick * 0.03;
    viewWeapon.userData.kick = Math.max(0, kick - delta * 0.004);
    viewWeapon.userData.commandSwing = Math.max(0, commandSwing - delta * 0.9);
    return;
  }

  viewWeapon.rotation.z = (playerStance === 'prone' ? -0.14 : playerStance === 'crouch' ? -0.06 : 0.04) + commandSwing * 0.0012;
  if (kick > 0) {
    viewWeapon.position.z = (scopedWeapon ? -0.62 : -0.75) + kick * 0.09;
    viewWeapon.rotation.x = -0.12 - kick * 0.05;
    viewWeapon.userData.kick = Math.max(0, kick - delta * 0.006);
  } else {
    viewWeapon.position.z = scopedWeapon ? -0.62 : -0.75;
    viewWeapon.rotation.x = -0.12;
  }
  viewWeapon.position.x = scopedWeapon ? 0.34 : 0.46;
  viewWeapon.position.y = playerStance === 'prone' ? -0.58 : playerStance === 'crouch' ? -0.46 : -0.38;
  viewWeapon.userData.commandSwing = Math.max(0, commandSwing - delta * 0.9);
}

function updatePlayerHealing(delta) {
  if (!gameRunning || gamePaused || !playerAlive || playerHealth >= PLAYER_MAX_HEALTH) {
    return;
  }
  playerHealth = Math.min(PLAYER_MAX_HEALTH, playerHealth + PLAYER_HEAL_PER_SECOND * delta);
}

function updateMobileAutoFire(now) {
  if (!isMobileMode() || !mobileFireHeld || !playerAlive || !gameRunning || gamePaused) {
    return;
  }
  playerShoot(now);
}

function updateBots(delta) {
  botState.forEach((bot) => {
    if (bot.isHuman) {
      return;
    }
    if (!bot.alive) {
      if (bot.mesh.visible && performance.now() - bot.deadAt > 1200) {
        bot.mesh.visible = false;
      }
      if (!gameEnded && bot.respawnAt && performance.now() >= bot.respawnAt) {
        respawnBot(bot);
      }
      return;
    }
    bot.cooldown -= delta;
    bot.hitTimer = Math.max(0, bot.hitTimer - delta);
    bot.strafeTimer -= delta;

    const activeCommand = multiplayerState.teamCommands[bot.absoluteTeam];
    if (activeCommand && activeCommand.expiresAt <= performance.now()) {
      multiplayerState.teamCommands[bot.absoluteTeam] = null;
    }
    if (activeCommand && activeCommand.expiresAt > performance.now()) {
      const commandPos = new THREE.Vector3(activeCommand.x, 0, activeCommand.z);
      if (bot.mesh.position.distanceTo(commandPos) > 2.5) {
        bot.state = 'command_move';
        tempVecA.copy(commandPos).sub(bot.mesh.position);
        tempVecA.y = 0;
        if (tempVecA.lengthSq() > 0.01) {
          tempVecA.normalize().multiplyScalar(bot.speed * delta * 0.00215);
          tempVecB.copy(bot.mesh.position).add(tempVecA);
          if (!playerCollision(tempVecB.clone().setY(PLAYER_HEIGHT))) {
            bot.mesh.position.x = tempVecB.x;
            bot.mesh.position.z = tempVecB.z;
          }
          bot.mesh.lookAt(commandPos.x, 0.9, commandPos.z);
        }
        return;
      }
    }

    const target = findTarget(bot);
    if (target) {
      const threatPos = target.position.clone();
      const shouldRefreshCover = !bot.coverTarget || bot.mesh.position.distanceTo(bot.coverTarget) < 0.6 || bot.hitTimer > 60 || target.distance < bot.preferredRange * 0.72;
      if (shouldRefreshCover) {
        bot.coverTarget = chooseCoverPosition(bot, threatPos);
      }

      if (bot.coverTarget && bot.mesh.position.distanceTo(bot.coverTarget) > 0.9) {
        bot.state = 'seek_cover';
        tempVecA.copy(bot.coverTarget).sub(bot.mesh.position);
        tempVecA.y = 0;
        if (tempVecA.lengthSq() > 0.01) {
          tempVecA.normalize().multiplyScalar(bot.speed * delta * 0.00125 * bot.pushBias);
          tempVecB.copy(bot.mesh.position).add(tempVecA);
          if (!playerCollision(tempVecB.clone().setY(PLAYER_HEIGHT))) {
            bot.mesh.position.x = tempVecB.x;
            bot.mesh.position.z = tempVecB.z;
          }
          bot.mesh.lookAt(bot.coverTarget.x, 0.9, bot.coverTarget.z);
        }
        return;
      }

      bot.state = 'engage';
      tempVecA.copy(threatPos).sub(bot.mesh.position);
      tempVecA.y = 0;
      if (tempVecA.lengthSq() > 0.01) {
        bot.mesh.lookAt(bot.mesh.position.x + tempVecA.x, 0.9, bot.mesh.position.z + tempVecA.z);
      }
      const botWeapon = WEAPON_CONFIG[bot.weapon] || WEAPON_CONFIG.voxel_rifle;
      const preferredRange = bot.preferredRange;
      const retreatThreshold = preferredRange * 0.55;
      const pushThreshold = preferredRange * 1.22;
      if (target.distance > pushThreshold && !bot.coverTarget) {
        tempVecA.normalize().multiplyScalar(bot.speed * delta * 0.0012 * bot.pushBias);
        tempVecB.copy(bot.mesh.position).add(tempVecA);
        if (!playerCollision(tempVecB.clone().setY(PLAYER_HEIGHT))) {
          bot.mesh.position.x = tempVecB.x;
          bot.mesh.position.z = tempVecB.z;
        }
      } else if (target.distance < retreatThreshold) {
        tempVecA.normalize().multiplyScalar(bot.speed * delta * 0.00095);
        tempVecB.copy(bot.mesh.position).sub(tempVecA);
        if (!playerCollision(tempVecB.clone().setY(PLAYER_HEIGHT))) {
          bot.mesh.position.x = tempVecB.x;
          bot.mesh.position.z = tempVecB.z;
        }
      }

      if (bot.strafeTimer <= 0) {
        bot.strafeDir *= -1;
        bot.strafeTimer = 260 + Math.random() * 520;
      }
      const right = new THREE.Vector3().crossVectors(tempVecA.normalize(), new THREE.Vector3(0, 1, 0)).normalize();
      tempVecB.copy(bot.mesh.position).addScaledVector(right, bot.strafeDir * bot.speed * delta * (bot.coverTarget ? 0.00045 : 0.00058));
      if (!playerCollision(tempVecB.clone().setY(PLAYER_HEIGHT))) {
        bot.mesh.position.x = tempVecB.x;
        bot.mesh.position.z = tempVecB.z;
      }

      if (bot.cooldown <= 0) {
        bot.cooldown = botWeapon.fireDelay * bot.reactionScale + Math.random() * (bot.team === TEAM_ENEMY ? 220 : 220);
        bot.burstLeft = 1 + Math.floor(Math.random() * bot.burstCap);
      }
      if (bot.burstLeft > 0 && bot.cooldown <= (bot.team === TEAM_ENEMY ? 110 : 120)) {
        bot.cooldown = botWeapon.fireDelay * (bot.team === TEAM_ENEMY ? 0.38 : 0.35);
        bot.burstLeft -= 1;
        bot.mesh.userData.muzzle.visible = true;
        bot.mesh.userData.scope.visible = bot.weapon === 'voxel_sniper';
        window.setTimeout(() => {
          if (bot.mesh.userData.muzzle) bot.mesh.userData.muzzle.visible = false;
        }, 80);
        const damage = botWeapon.damage * 0.34 * bot.damageScale;
        if (target.type === 'player') {
          const wasAlive = playerAlive;
          applyDamage('player', damage, bot.team === TEAM_ENEMY ? '敌军 Bot' : '友军 Bot');
          if (wasAlive && !playerAlive) {
            teamScores[bot.absoluteTeam] += 1;
            const stat = actorStats.get(bot.id);
            if (stat) {
              stat.kills += 1;
            }
          }
        } else {
          const killed = applyBotDamage(target.bot, damage, bot.team === TEAM_ENEMY ? '敌军 Bot' : '友军 Bot');
          if (killed) {
            teamScores[bot.absoluteTeam] += 1;
            const stat = actorStats.get(bot.id);
            if (stat) {
              stat.kills += 1;
            }
          }
        }
      }
      return;
    }

    bot.state = 'patrol';
    bot.coverTarget = null;
    if (bot.mesh.position.distanceTo(bot.patrolTarget) < 0.8) {
      setPatrolTarget(bot);
    }
    tempVecA.copy(bot.patrolTarget).sub(bot.mesh.position);
    tempVecA.y = 0;
    if (tempVecA.lengthSq() > 0.01) {
      tempVecA.normalize().multiplyScalar(bot.speed * delta * 0.00085);
      tempVecB.copy(bot.mesh.position).add(tempVecA);
      if (!playerCollision(tempVecB.clone().setY(PLAYER_HEIGHT))) {
        bot.mesh.position.x = tempVecB.x;
        bot.mesh.position.z = tempVecB.z;
        bot.mesh.lookAt(bot.patrolTarget.x, 0.9, bot.patrolTarget.z);
      } else {
        setPatrolTarget(bot);
      }
    }
  });
}

function updateBotAnimation(time) {
  botState.forEach((bot) => {
    if (!bot.mesh.visible) return;
    const parts = bot.mesh.userData;
    if (bot.state === 'dead') {
      parts.armL.rotation.x = -1.2;
      parts.armR.rotation.x = 0.4;
      parts.legL.rotation.x = 0.25;
      parts.legR.rotation.x = -0.18;
      parts.body.rotation.z = bot.team === TEAM_ENEMY ? -1.15 : 1.05;
      parts.head.rotation.z = bot.team === TEAM_ENEMY ? -0.35 : 0.3;
      return;
    }
    const stride = bot.state === 'patrol' || bot.state === 'engage' || bot.state === 'seek_cover' || bot.state === 'command_move' ? Math.sin(time * 0.008 + bot.mesh.position.x) : 0;
    if (bot.waveTimer > 0) {
      bot.waveTimer = Math.max(0, bot.waveTimer - 16);
      parts.armL.rotation.x = -1.2 + Math.sin(time * 0.03) * 0.5;
      parts.armR.rotation.x = -0.2;
    } else {
      parts.armL.rotation.x = stride * 0.8;
      parts.armR.rotation.x = -stride * 0.8;
    }
    parts.legL.rotation.x = -stride * 0.9;
    parts.legR.rotation.x = stride * 0.9;
    if (bot.hitTimer > 0) {
      parts.body.material.emissive = new THREE.Color('#ffffff');
      parts.body.material.emissiveIntensity = 0.18;
    } else {
      parts.body.material.emissiveIntensity = 0;
    }
    if (bot.state === 'seek_cover') {
      parts.body.rotation.y = Math.sin(time * 0.01) * 0.08;
    } else {
      parts.body.rotation.y = 0;
    }
    parts.body.rotation.z = 0;
    parts.head.rotation.z = 0;
  });
}

function updatePlayerMovement(delta) {
  if ((!pointerLocked && !isMobileMode()) || !playerAlive) return;

  const moveSpeed = playerStance === 'prone' ? 2.1 : playerStance === 'crouch' ? 4.2 : 7.4;
  const gravity = 22;
  const jumpSpeed = 8.6;
  const current = playerObject.position;
  const supportTop = getSupportTopAt(current);
  const onGround = current.y <= supportTop + playerHeight + PLAYER_GROUND_EPSILON && playerVelocity.y <= 0.25;
  const ladder = getNearbyLadder(current);

  if (onGround && playerVelocity.y < 0) {
    playerVelocity.y = 0;
  }
  if (keyState.space && onGround && playerStance === 'stand' && !ladder) {
    playerVelocity.y = jumpSpeed;
  }

  const direction = new THREE.Vector3();
  if (keyState.w) direction.z -= 1;
  if (keyState.s) direction.z += 1;
  if (keyState.a) direction.x -= 1;
  if (keyState.d) direction.x += 1;
  direction.x += mobileMoveVector.x;
  direction.z += mobileMoveVector.y;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    controls.getDirection(tempVecB);
    tempVecB.y = 0;
    tempVecB.normalize();
    tempVecA.crossVectors(tempVecB, camera.up).normalize();

    const stepX = (tempVecA.x * direction.x + tempVecB.x * -direction.z) * moveSpeed * delta;
    const stepZ = (tempVecA.z * direction.x + tempVecB.z * -direction.z) * moveSpeed * delta;
    movePlayerAxis(current, 'x', stepX);
    movePlayerAxis(current, 'z', stepZ);
  }
  clampPlayerInsideBounds(current);

  if (ladder) {
    current.x += (ladder.x - current.x) * 0.28;
    current.z += (ladder.z - current.z) * 0.28;
    const climbingUp = keyState.w || keyState.space || mobileMoveVector.y < -0.2;
    const climbingDown = keyState.s || mobileMoveVector.y > 0.22;
    if (climbingUp) {
      playerVelocity.y = LADDER_CLIMB_SPEED;
    } else if (climbingDown) {
      playerVelocity.y = -LADDER_CLIMB_SPEED * 0.78;
    } else {
      playerVelocity.y = Math.max(playerVelocity.y, LADDER_SLIDE_SPEED);
    }

    current.y = Math.max(playerHeight, Math.min(ladder.topY, current.y + playerVelocity.y * delta));
    const ladderSupportTop = getSupportTopAt(current, 3);
    const ladderFloor = ladderSupportTop + playerHeight + PLAYER_GROUND_EPSILON;
    if (current.y <= ladderFloor) {
      current.y = ladderFloor;
      if (!climbingDown) {
        playerVelocity.y = 0;
      }
    }
    clampPlayerInsideBounds(current);
    return;
  }

  playerVelocity.y -= gravity * delta;
  const nextY = current.y + playerVelocity.y * delta;

  if (playerVelocity.y > 0) {
    tempVecC.copy(current);
    tempVecC.y = nextY;
    if (!playerCollision(tempVecC)) {
      current.y = nextY;
    } else {
      playerVelocity.y = 0;
    }
    return;
  }

  tempVecC.copy(current);
  tempVecC.y = nextY;
  const landingTop = getSupportTopAt(tempVecC);
  const landingY = landingTop + playerHeight + PLAYER_GROUND_EPSILON;
  if (nextY <= landingY) {
    current.y = landingY;
    playerVelocity.y = 0;
  } else {
    current.y = nextY;
  }
  clampPlayerInsideBounds(current);
}

function updateHud(remaining) {
  timerEl.textContent = String(Math.max(0, Math.ceil(remaining)));
  healthEl.textContent = String(Math.max(0, Math.round(playerHealth)));
  killsEl.textContent = String(playerKills);
  friendlyEl.textContent = String(teamAliveCount(TEAM_FRIENDLY));
  enemyEl.textContent = String(teamAliveCount(TEAM_ENEMY));
  const healthCard = healthEl.closest('.voxel-hud-block');
  if (healthCard) {
    healthCard.classList.toggle('is-danger', playerHealth <= 35);
  }
  if (!pointerLocked && gameRunning && playerAlive) {
    setStatus(`鼠标已释放，点击开始战斗区域可继续锁定视角。当前武器：${WEAPON_CONFIG[currentWeapon].label} / 姿态：${playerStance === 'stand' ? '站立' : playerStance === 'crouch' ? '蹲下' : '趴下'}`);
  }
}

function teamDisplayLabel(team) {
  return team === ABS_TEAM_RED ? '红队' : '蓝队';
}

function computeMvpEntry(preferredTeam = null) {
  const stats = [...actorStats.values()];
  if (!stats.length) {
    return null;
  }
  stats.sort(
    (a, b) =>
      b.kills - a.kills ||
      a.deaths - b.deaths ||
      Number((b.team === preferredTeam) && Boolean(preferredTeam)) - Number((a.team === preferredTeam) && Boolean(preferredTeam)) ||
      Number(b.isHuman) - Number(a.isHuman),
  );
  return stats[0];
}

function currentLeadingTeam() {
  return (teamScores[ABS_TEAM_RED] || 0) >= (teamScores[ABS_TEAM_BLUE] || 0) ? ABS_TEAM_RED : ABS_TEAM_BLUE;
}

function computeMvpLabel(preferredTeam = null) {
  const entry = computeMvpEntry(preferredTeam);
  if (!entry) {
    return '待定';
  }
  return `全场MVP · ${teamDisplayLabel(entry.team)} ${entry.label} (${entry.kills} 击杀)`;
}

function buildMultiplayerPlayerResults(winnerTeam, elapsedSeconds) {
  const results = [];
  const localDeaths = actorStats.get('local-player')?.deaths || 0;
  results.push({
    player_id: multiplayerState.playerId,
    label: humanDisplayLabel(currentRoomSeat()?.user_id, userLabel),
    team: absoluteFriendlyTeam,
    kills: playerKills,
    deaths: localDeaths,
    alive: playerAlive,
    time_alive: playerAlive ? ROUND_DURATION : Math.max(0, Math.floor(elapsedSeconds)),
    win_status: winnerTeam === absoluteFriendlyTeam,
    winner_team: winnerTeam,
    red_kills: teamScores[ABS_TEAM_RED] || 0,
    blue_kills: teamScores[ABS_TEAM_BLUE] || 0,
    mvp: computeMvpLabel(winnerTeam),
  });
  remotePlayers.forEach((actor) => {
    const stat = actorStats.get(actor.id);
    results.push({
      player_id: actor.playerId,
      label: actor.label,
      team: actor.absoluteTeam,
      kills: stat?.kills || 0,
      deaths: stat?.deaths || 0,
      alive: actor.alive,
      time_alive: actor.alive ? ROUND_DURATION : Math.max(0, Math.floor(elapsedSeconds)),
      win_status: winnerTeam === actor.absoluteTeam,
      winner_team: winnerTeam,
      red_kills: teamScores[ABS_TEAM_RED] || 0,
      blue_kills: teamScores[ABS_TEAM_BLUE] || 0,
      mvp: computeMvpLabel(winnerTeam),
    });
  });
  return results;
}

function endGame(winStatus) {
  if (gameEnded) return;
  matchPhase = 'ended';
  gameEnded = true;
  gameRunning = false;
  gamePaused = false;
  controls.unlock();
  gameOverOverlay.hidden = false;
  respawnOverlay.hidden = true;
  pauseOverlay.hidden = true;

  const elapsedSeconds = Math.max(0, Math.floor((performance.now() - roundStart) / 1000));
  const timeAlive = playerAlive ? ROUND_DURATION : elapsedSeconds;
  const localCoins = window.calculateCoins(playerKills, winStatus, timeAlive);
  const score = Math.min(100, localCoins * 5);

  const redKills = teamScores[ABS_TEAM_RED] || 0;
  const blueKills = teamScores[ABS_TEAM_BLUE] || 0;
  const winnerTeam = multiplayerState.active ? (redKills >= blueKills ? ABS_TEAM_RED : ABS_TEAM_BLUE) : (winStatus ? absoluteFriendlyTeam : absoluteFriendlyTeam === ABS_TEAM_RED ? ABS_TEAM_BLUE : ABS_TEAM_RED);
  endTitleEl.textContent = multiplayerState.active ? `${winnerTeam === ABS_TEAM_RED ? '红队' : '蓝队'}获胜` : (winStatus ? `${absoluteFriendlyTeam === ABS_TEAM_RED ? '红队' : '蓝队'}获胜` : '战斗结束');
  endSummaryEl.textContent = `你击杀 ${playerKills} 人，存活时间 ${timeAlive} 秒。红队 ${redKills} 击杀，蓝队 ${blueKills} 击杀，全场最佳：${computeMvpLabel(winnerTeam)}。`;
  endKillsEl.textContent = String(playerKills);
  endTimeEl.textContent = `${timeAlive}s`;
  endRedKillsEl.textContent = String(redKills);
  endBlueKillsEl.textContent = String(blueKills);
  endMvpEl.textContent = computeMvpLabel(winnerTeam);
  endCoinsEl.textContent = String(localCoins);

  const form = new FormData();
  form.set('game_type', 'voxel_fps');
  form.set('difficulty', 'normal');
  form.set('weapon', 'voxel_rifle');
  form.set('score', String(score));
  form.set('csrf_token', csrfToken);

  if (multiplayerState.active) {
    if (multiplayerState.isHost) {
      const finalPayload = {
        winner_team: winnerTeam,
        red_kills: redKills,
        blue_kills: blueKills,
        mvp: computeMvpLabel(winnerTeam),
        summary: endSummaryEl.textContent,
        player_results: buildMultiplayerPlayerResults(winnerTeam, elapsedSeconds),
        snapshot: buildHostSnapshot(0),
      };
      sendRoomSocket('match_end', finalPayload);
      showRemoteMatchEnd(finalPayload);
    }
    return;
  }

  fetch(claimUrl, { method: 'POST', body: form, headers: { 'X-Requested-With': 'fetch' } })
    .then((response) => response.json())
    .then((data) => {
      const confirmedCoins = data.reward ?? localCoins;
      earnedCoins = confirmedCoins;
      endCoinsEl.textContent = String(confirmedCoins);
      setResultMessage(`${data.game_label || '方块战场'}结算完成：获得 ${confirmedCoins} 金币，当前剩余 ${data.coins_after ?? '-'} 金币。`, 'success');
      notifyExternal({ earnedCoins: confirmedCoins, kills: playerKills, winStatus, timeAlive });
    })
    .catch(() => {
      earnedCoins = localCoins;
      setResultMessage(`本地结算：预计获得 ${localCoins} 金币（接口异常，未能确认服务器奖励）。`, 'warning');
      notifyExternal({ earnedCoins: localCoins, kills: playerKills, winStatus, timeAlive });
    });
}

function resetRound() {
  playerHealth = PLAYER_MAX_HEALTH;
  playerKills = 0;
  playerAlive = true;
  teamScores = { [ABS_TEAM_RED]: 0, [ABS_TEAM_BLUE]: 0 };
  multiplayerState.teamCommands = { [ABS_TEAM_RED]: null, [ABS_TEAM_BLUE]: null };
  actorStats = new Map();
  actorStats.set('local-player', { id: 'local-player', label: humanDisplayLabel(currentRoomSeat()?.user_id, userLabel), team: absoluteFriendlyTeam, kills: 0, deaths: 0, isHuman: true });
  playerStance = 'stand';
  playerHeight = PLAYER_HEIGHT;
  respawnTimer = 0;
  playerVelocity.set(0, 0, 0);
  resetPlayerView(true);
  if (absoluteFriendlyTeam === ABS_TEAM_BLUE) {
    playerObject.rotation.y = Math.PI;
  }
  applyScopeState(false, false);
  grenadeProjectiles.forEach((entry) => scene.remove(entry.mesh));
  grenadeBursts.forEach((entry) => {
    scene.remove(entry.mesh);
    entry.mesh.material.dispose();
  });
  commandFlagProjectiles.forEach((entry) => scene.remove(entry.mesh));
  clearTeamFlagMarker(ABS_TEAM_RED);
  clearTeamFlagMarker(ABS_TEAM_BLUE);
  grenadeProjectiles.length = 0;
  grenadeBursts.length = 0;
  commandFlagProjectiles.length = 0;
  playerObject.position.copy(resolveSafeSpawn(localSpawnForCurrentPlayer().setY(PLAYER_HEIGHT)));
  resetBots(multiplayerState.active && multiplayerState.room ? {
    humans: multiplayerState.room.teams[ABS_TEAM_RED].concat(multiplayerState.room.teams[ABS_TEAM_BLUE]).filter((seat) => seat && seat.seat_state === 'occupied'),
    closed_slots: multiplayerState.room.match_closed_slots || {
      [ABS_TEAM_RED]: multiplayerState.room.teams[ABS_TEAM_RED].filter((seat) => seat.seat_state === 'closed').map((seat) => seat.slot_index),
      [ABS_TEAM_BLUE]: multiplayerState.room.teams[ABS_TEAM_BLUE].filter((seat) => seat.seat_state === 'closed').map((seat) => seat.slot_index),
    },
  } : null);
  hitMarker.classList.remove('is-active');
  hitMarkerTimer = 0;
  killfeed.innerHTML = '';
  gameRunning = false;
  gamePaused = false;
  gameEnded = false;
  roundStart = 0;
  lastPlayerShot = 0;
  scopeActive = false;
  if (scopeOverlay) {
    scopeOverlay.hidden = true;
  }
  setWeapon('voxel_rifle', false);
  setResultMessage('结算后会通过回调和金币接口把结果同步回主站。');
  gameOverOverlay.hidden = true;
  respawnOverlay.hidden = true;
  pauseOverlay.hidden = true;
  updateHud(ROUND_DURATION);
}

function respawnPlayer() {
  playerAlive = true;
  playerHealth = PLAYER_MAX_HEALTH;
  respawnTimer = 0;
  damageFlashTimer = 0;
  damageScreen?.classList.remove('is-active');
  resetPlayerView(true);
  applyScopeState(false, false);
  playerObject.position.copy(resolveSafeSpawn(localSpawnForCurrentPlayer().setY(PLAYER_HEIGHT)));
  respawnOverlay.hidden = true;
  setStatus('你已复活，重新投入战场。');
  healthEl.textContent = String(PLAYER_MAX_HEALTH);
  if (!gameEnded) {
    gamePaused = false;
    controls.lock();
  }
}

function animate(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000 || 0);
  lastFrame = now;

  if (gameRunning && !gamePaused) {
    const elapsedSeconds = (now - roundStart) / 1000;
    const remaining = ROUND_DURATION - elapsedSeconds;

    updatePlayerMovement(delta);
    clampPlayerInsideBounds(playerObject.position);
    updatePlayerHealing(delta);
    updateMobileAutoFire(now);
    updateCommandFlagProjectiles(delta);
    updateCommandFlagMarkers();
    if (!multiplayerState.active || multiplayerState.isHost) {
      updateGrenadeProjectiles(delta);
      updateGrenadeBursts(now);
      updateBots(delta * 1000);
    }
    updateBotAnimation(now);
    updateViewWeapon(delta * 1000);

    if (hitMarkerTimer > 0) {
      hitMarkerTimer -= delta * 1000;
      if (hitMarkerTimer <= 0) hitMarker.classList.remove('is-active');
    }
    if (damageFlashTimer > 0) {
      damageFlashTimer -= delta * 1000;
      if (damageFlashTimer <= 0) {
        damageScreen?.classList.remove('is-active');
      }
    }
    if (!playerAlive && respawnTimer > 0 && !gameEnded) {
      respawnTimer -= delta * 1000;
      respawnTitleEl.textContent = `你已倒下 - ${Math.max(1, Math.ceil(respawnTimer / 1000))} 秒后复活`;
      if (respawnTimer <= 0) {
        respawnPlayer();
      }
    }

    syncMultiplayerState(now, remaining);
    updateHud(remaining);

    if (
      (!multiplayerState.active || multiplayerState.isHost) &&
      (
        remaining <= 0 ||
        (teamAliveCount(TEAM_FRIENDLY) <= 0 && teamRespawnPending(TEAM_FRIENDLY) <= 0) ||
        (teamAliveCount(TEAM_ENEMY) <= 0 && teamRespawnPending(TEAM_ENEMY) <= 0)
      )
    ) {
      endGame(teamAliveCount(TEAM_FRIENDLY) > teamAliveCount(TEAM_ENEMY));
    }
  } else if (gameRunning && gamePaused) {
    updateHud(Math.max(0, ROUND_DURATION - (performance.now() - roundStart) / 1000));
  }

  updateLabelPositions();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

async function toggleFullscreen() {
  if (document.fullscreenElement !== stage) {
    await stage.requestFullscreen();
    fullscreenButton.textContent = '退出全屏';
  } else {
    await document.exitFullscreen();
    fullscreenButton.textContent = '进入全屏';
  }
}

function updateStick(clientX, clientY) {
  const rect = stickZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const max = rect.width * 0.28;
  const len = Math.hypot(dx, dy) || 1;
  const clampedLen = Math.min(max, len);
  const nx = (dx / len) * clampedLen;
  const ny = (dy / len) * clampedLen;
  stickThumb.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  mobileMoveVector.set(nx / max, ny / max);
}

function resetStick() {
  mobileMoveVector.set(0, 0);
  stickThumb.style.transform = 'translate(-50%, -50%)';
}

function buildWorldDecor() {
  const grid = new THREE.GridHelper(MAP_HALF * 2, MAP_HALF * 2, 0x5d7a4f, 0x5d7a4f);
  grid.position.y = 0.01;
  grid.material.opacity = 0.22;
  grid.material.transparent = true;
  scene.add(grid);
}

createArena();
buildWorldDecor();
resetRound();
resize();
requestAnimationFrame(animate);
restoreSavedRoomSession();

window.addEventListener('resize', resize);

controls.addEventListener('lock', () => {
  pointerLocked = true;
  setPaused(false);
  setStatus('已锁定鼠标，开始战斗。');
});
controls.addEventListener('unlock', () => {
  pointerLocked = false;
  clearMovementState();
  if (gameRunning && !gameEnded && playerAlive && !respawnOverlay.hidden) {
    return;
  }
  if (gameRunning && !gameEnded && playerAlive) {
    setPaused(true, '你按下了 Esc，战斗已暂停。点击继续游戏可回到战斗。');
  }
});

startButton.addEventListener('click', () => {
  startSingleplayerMatch();
});

openRoomsButton?.addEventListener('click', async () => {
  await refreshRoomList(true);
});

roomBackButton?.addEventListener('click', () => {
  showOverlayPanel('mode');
});

roomRefreshButton?.addEventListener('click', async () => {
  await refreshRoomList();
});

roomCreateButton?.addEventListener('click', async () => {
  const data = await postRoomAction(roomBaseUrl);
  if (!data.ok) {
    setResultMessage(data.message || '创建房间失败。', 'warning');
    return;
  }
  connectRoomSocket(data.room.room_id, data.player_id);
  applyRoomState(data.room);
});

roomListEl?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-room-join]');
  if (!button) return;
  const roomId = button.dataset.roomJoin;
  const data = await postRoomAction(roomActionUrl(roomId, '/join'));
  if (!data.ok) {
    setResultMessage(data.message || '加入房间失败。', 'warning');
    return;
  }
  connectRoomSocket(data.room.room_id, data.player_id);
  applyRoomState(data.room);
});

function handleTeamSwitchClick(event) {
  const button = event.target.closest('[data-team-switch]');
  if (!button || !multiplayerState.roomId || !multiplayerState.playerId) return;
  postRoomAction(roomActionUrl(multiplayerState.roomId, '/team'), {
    player_id: multiplayerState.playerId,
    team: button.dataset.teamSwitch,
    slot_index: button.dataset.slotIndex,
  }).then((data) => {
    if (!data.ok) {
      setResultMessage(data.message || '切换队伍失败。', 'warning');
      return;
    }
    applyRoomState(data.room);
  });
}

function handleSlotToggleClick(event) {
  const button = event.target.closest('[data-slot-toggle]');
  if (!button || !multiplayerState.roomId || !multiplayerState.playerId) return;
  postRoomAction(roomActionUrl(multiplayerState.roomId, '/slot'), {
    player_id: multiplayerState.playerId,
    team: button.dataset.slotToggle,
    slot_index: button.dataset.slotIndex,
    closed: button.dataset.slotClosed,
  }).then((data) => {
    if (!data.ok) {
      setResultMessage(data.message || '更新空位失败。', 'warning');
      return;
    }
    applyRoomState(data.room);
  });
}

redTeamEl?.addEventListener('click', (event) => {
  handleTeamSwitchClick(event);
  handleSlotToggleClick(event);
});
blueTeamEl?.addEventListener('click', (event) => {
  handleTeamSwitchClick(event);
  handleSlotToggleClick(event);
});

lobbyLeaveButton?.addEventListener('click', async () => {
  if (multiplayerState.roomId && multiplayerState.playerId) {
    await postRoomAction(roomActionUrl(multiplayerState.roomId, '/leave'), { player_id: multiplayerState.playerId });
  }
  resetMultiplayerLobbyState();
  await refreshRoomList(true);
});

lobbyStartButton?.addEventListener('click', async () => {
  if (!multiplayerState.roomId || !multiplayerState.playerId) return;
  const data = await postRoomAction(roomActionUrl(multiplayerState.roomId, '/start'), { player_id: multiplayerState.playerId });
  if (!data.ok) {
    setResultMessage(data.message || '开始联机对局失败。', 'warning');
    return;
  }
  startMultiplayerMatch(data.match);
});

function returnToModeSelection() {
  resetMultiplayerLobbyState();
  resetRound();
  gameOverOverlay.hidden = true;
  respawnOverlay.hidden = true;
  pauseOverlay.hidden = true;
  showOverlayPanel('mode');
  setResultMessage('已返回模式选择。', 'success');
}

restartButton.addEventListener('click', () => {
  if (multiplayerState.active && multiplayerState.room) {
    gameOverOverlay.hidden = true;
    showOverlayPanel('lobby');
    return;
  }
  startSingleplayerMatch();
});

forceRestartButton?.addEventListener('click', () => {
  if (multiplayerState.active) {
    resetRound();
    startMatchLoop();
    respawnOverlay.hidden = true;
    return;
  }
  resetRound();
  startMatchLoop();
  respawnOverlay.hidden = true;
});

fullscreenButton?.addEventListener('click', () => {
  toggleFullscreen();
});

async function leaveMultiplayerMatchFromPause() {
  if (multiplayerState.roomId && multiplayerState.playerId) {
    await postRoomAction(roomActionUrl(multiplayerState.roomId, '/leave'), { player_id: multiplayerState.playerId });
  }
  resetMultiplayerLobbyState();
  resetRound();
  pauseOverlay.hidden = true;
  gamePaused = false;
  gameRunning = false;
  gameEnded = false;
  await refreshRoomList(true);
  setResultMessage('你已离开联机房间，可以重新选择其他房间。', 'success');
}

function endCurrentMatchFromPause() {
  settlePauseDuration();
  pauseOverlay.hidden = true;
  gamePaused = false;
  endGame(resolveCurrentLeadWinStatus());
}

resumeButton?.addEventListener('click', () => {
  setPaused(false);
  focusGamePage();
  if (!isMobileMode()) {
    controls.lock();
  } else {
    setStatus('触屏模式已恢复，继续战斗。');
  }
});

pauseExitButton?.addEventListener('click', async () => {
  if (multiplayerState.active && !multiplayerState.isHost) {
    await leaveMultiplayerMatchFromPause();
    return;
  }
  endCurrentMatchFromPause();
});

returnModeButton?.addEventListener('click', () => {
  returnToModeSelection();
});

document.addEventListener('fullscreenchange', () => {
  if (fullscreenButton) {
    fullscreenButton.textContent = document.fullscreenElement === stage ? '退出全屏' : '进入全屏';
  }
  if (document.fullscreenElement !== stage && gameRunning && !gameEnded && playerAlive) {
    clearMovementState();
    setPaused(true, '你已退出全屏，战斗已自动暂停。点击继续游戏恢复。');
    if (pointerLocked) {
      controls.unlock();
    }
  }
});

function handleKeyDown(event) {
  if (event.code === 'Escape' && gameRunning && !gameEnded && playerAlive && !gamePaused) {
    setPaused(true, '你按下了 Esc，战斗已暂停。点击继续游戏可回到战斗。');
    if (pointerLocked) {
      controls.unlock();
    }
    return;
  }
  if (event.code === 'Digit1') {
    setWeapon('voxel_rifle');
  }
  if (event.code === 'Digit2') {
    setWeapon('voxel_sniper');
  }
  if (event.code === 'Digit3') {
    setWeapon('voxel_grenade');
  }
  if (event.code === 'Digit4') {
    event.preventDefault();
    if (multiplayerState.active && multiplayerState.room?.current_slot_index === 0) {
      setWeapon('voxel_command_flag');
      setStatus('已切换到红旗，左键掷出后将引导本队 Bot 集结。');
    } else {
      setStatus('只有红蓝队的真人队长可以使用红旗指挥。');
    }
  }
  if (event.code === 'KeyC') {
    toggleCrouch();
  }
  if (event.code === 'KeyZ') {
    toggleProne();
  }
  setMovementKey(event, true);
}

function handleMobilePointerCancel(event) {
  if (mobileMoveId === event.pointerId) {
    mobileMoveId = null;
    resetStick();
  }
  if (mobileLookId === event.pointerId) {
    mobileLookId = null;
    mobileLookLast = null;
  }
  if (mobileFireHeld) {
    mobileFireHeld = false;
  }
}

function handleKeyUp(event) {
  setMovementKey(event, false);
}

window.addEventListener('resize', () => {
  cachedMobileMode = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  updateMobileWeaponButtons();
});
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', clearMovementState);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearMovementState();
  }
});

document.addEventListener('mousedown', (event) => {
  if (!gameRunning || !pointerLocked) return;
  if (event.button === 0) {
    playerShoot(performance.now());
  }
  if (event.button === 1) {
    event.preventDefault();
  }
  if (event.button === 2) {
    event.preventDefault();
    toggleScope();
  }
});

document.addEventListener('contextmenu', (event) => {
  if (pointerLocked) {
    event.preventDefault();
  }
});

stickZone?.addEventListener('pointerdown', (event) => {
  if (!isMobileMode()) return;
  mobileMoveId = event.pointerId;
  updateStick(event.clientX, event.clientY);
});

mobileFireButton?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (!gameRunning || !playerAlive) return;
  mobileFireHeld = true;
  playerShoot(performance.now());
});

mobileFireButton?.addEventListener('pointerup', () => {
  mobileFireHeld = false;
});

mobileFireButton?.addEventListener('pointercancel', () => {
  mobileFireHeld = false;
});

mobilePauseButton?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (!gameRunning || gameEnded) return;
  setPaused(true, '你点击了暂停按钮，战斗已暂停。');
});

mobileCrouchButton?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  toggleCrouch();
});

mobileJumpButton?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  keyState.space = true;
});

mobileJumpButton?.addEventListener('pointerup', () => {
  keyState.space = false;
});

mobileJumpButton?.addEventListener('pointercancel', () => {
  keyState.space = false;
});

mobileScopeButton?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  toggleScope();
});

mobileWeaponButtons.forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const weapon = button.dataset.voxelMobileWeapon;
    if (!weapon) return;
    setWeapon(weapon);
  });
});

stage.addEventListener('touchstart', (event) => {
  if (isMobileMode()) {
    event.preventDefault();
  }
}, { passive: false });

stage.addEventListener('touchmove', (event) => {
  if (isMobileMode()) {
    event.preventDefault();
  }
}, { passive: false });

stage.addEventListener('pointerdown', (event) => {
  if (!isMobileMode()) return;
  if (stickZone?.contains(event.target) || mobileFireButton?.contains(event.target)) return;
  mobileLookId = event.pointerId;
  mobileLookLast = { x: event.clientX, y: event.clientY };
});

stage.addEventListener('pointermove', (event) => {
  if (isMobileMode()) {
    if (mobileMoveId === event.pointerId) {
      event.preventDefault();
      updateStick(event.clientX, event.clientY);
      return;
    }
    if (mobileLookId === event.pointerId && mobileLookLast) {
      const sensitivity = 0.003 * Math.min(1, 960 / stage.clientWidth);
      const dx = event.clientX - mobileLookLast.x;
      const dy = event.clientY - mobileLookLast.y;
      playerObject.rotation.y -= dx * sensitivity;
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x - dy * sensitivity));
      mobileLookLast = { x: event.clientX, y: event.clientY };
    }
  }
});

stage.addEventListener('pointerup', (event) => {
  handleMobilePointerCancel(event);
});

stage.addEventListener('pointercancel', (event) => {
  handleMobilePointerCancel(event);
});

updateMobileWeaponButtons();
