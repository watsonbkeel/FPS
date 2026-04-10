from __future__ import annotations

from pathlib import Path


VOXEL_FPS_PATH = Path(__file__).resolve().parents[2] / "app" / "static" / "voxel-fps.js"


def _read_source() -> str:
    return VOXEL_FPS_PATH.read_text(encoding="utf-8")


def test_rifle_and_sniper_cover_full_map_range() -> None:
    source = _read_source()

    assert "const FULL_MAP_RANGE = Math.hypot(MAP_HALF * 2, MAP_HALF * 2) + 16;" in source
    assert "range: FULL_MAP_RANGE," in source
    assert "raycaster.far = WEAPON_CONFIG[currentWeapon]?.range ?? FULL_MAP_RANGE;" in source


def test_grenade_throw_speed_is_scaled_up_and_remote_signal_matches() -> None:
    source = _read_source()

    assert "const GRENADE_THROW_SPEED = 125;" in source
    assert "targetPoint: clampPointToArena(origin.clone().addScaledVector(direction, GRENADE_THROW_SPEED * 0.9))," in source


def test_multiplayer_start_ignores_duplicate_match_started_and_unlock_spurious_pause() -> None:
    source = _read_source()

    assert "if (gameRunning && multiplayerState.active && matchPhase === 'running') {" in source
    assert "const hadLock = pointerLocked;" in source
    assert "if (!hadLock) {" in source


def test_bot_facing_uses_yaw_only_helper() -> None:
    source = _read_source()

    assert "function faceBotTowards(bot, target)" in source
    assert "bot.mesh.rotation.x = 0;" in source
    assert "bot.mesh.rotation.z = 0;" in source
    assert "faceBotTowards(bot, commandPos);" in source
    assert "faceBotTowards(bot, bot.perchTarget);" in source


def test_player_shoot_allows_mobile_without_pointer_lock() -> None:
    source = _read_source()

    assert "if ((!pointerLocked && !isMobileMode()) || !playerAlive || !gameRunning || now - lastPlayerShot < weapon.fireDelay) {" in source


def test_room_socket_applies_explicit_player_respawn_updates() -> None:
    source = _read_source()
    handler_start = source.index('function handleRoomSocketMessage(data) {')
    handler_end = source.index('async function restoreSavedRoomSession()', handler_start)
    handler_block = source[handler_start:handler_end]

    assert "data.type === 'player_state' || data.type === 'player_respawn'" in handler_block
    assert 'applyRemoteActorState(data.player_id, data.payload || {});' in handler_block


def test_respawn_player_notifies_room_after_multiplayer_respawn() -> None:
    source = _read_source()
    respawn_start = source.index('function respawnPlayer() {')
    respawn_end = source.index('function animate(now) {', respawn_start)
    respawn_block = source[respawn_start:respawn_end]

    assert "if (multiplayerState.active) {" in respawn_block
    assert "sendRoomSocket('player_respawn', buildLocalPlayerState());" in respawn_block


def test_remote_actor_state_clears_dead_flags_on_respawn_sync() -> None:
    source = _read_source()
    remote_start = source.index('function applyRemoteActorState(playerId, state) {')
    remote_end = source.index('function buildLocalPlayerState()', remote_start)
    remote_block = source[remote_start:remote_end]

    assert 'actor.mesh.visible = true;' in remote_block
    assert 'actor.deadAt = 0;' in remote_block
    assert 'actor.respawnAt = 0;' in remote_block


def test_non_host_grenade_stops_local_stuck_projectiles_and_relies_on_host_sync() -> None:
    source = _read_source()
    shoot_start = source.index("if (currentWeapon === 'voxel_grenade') {")
    shoot_end = source.index("if (currentWeapon === 'voxel_command_flag') {", shoot_start)
    shoot_block = source[shoot_start:shoot_end]

    assert "if (multiplayerState.active && !multiplayerState.isHost) {" in shoot_block
    assert "sendRoomSocket('player_fire', {" in shoot_block
    assert "setStatus('手雷已投出，房主正在同步弹道。');" in shoot_block
    assert shoot_block.index("setStatus('手雷已投出，房主正在同步弹道。');") < shoot_block.index('throwGrenade();')
    assert shoot_block.index("setStatus('手雷已投出，房主正在同步弹道。');") < shoot_block.index('return;')


def test_host_simulates_remote_grenade_projectiles_for_joined_players() -> None:
    source = _read_source()
    remote_fire_start = source.index('function processRemoteFire(playerId, payload = {}) {')
    remote_fire_end = source.index('function findTarget(bot) {', remote_fire_start)
    remote_fire_block = source[remote_fire_start:remote_fire_end]

    assert 'spawnGrenadeProjectile(origin, direction, {' in remote_fire_block
    assert 'ownerAbsoluteTeam: actor.absoluteTeam,' in remote_fire_block
    assert 'creditActorId: actor.id,' in remote_fire_block


def test_remote_humans_use_absolute_team_colors_and_helmet_geometry() -> None:
    source = _read_source()
    humanoid_start = source.index('function makeVoxelHumanoid(team, options = {}) {')
    humanoid_end = source.index('function createCommandFlagModel()', humanoid_start)
    humanoid_block = source[humanoid_start:humanoid_end]

    assert 'const resolvedAbsoluteTeam = options.absoluteTeam || absoluteTeamForLocal(team);' in humanoid_block
    assert 'const bodyMat = resolvedAbsoluteTeam === ABS_TEAM_BLUE ? materialSet.blue : materialSet.red;' in humanoid_block
    assert 'const helmetMat = resolvedAbsoluteTeam === ABS_TEAM_BLUE ? materialSet.helmetBlue : materialSet.helmetRed;' in humanoid_block
    assert 'const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), materialSet.visor);' in humanoid_block


def test_local_player_death_updates_death_stats_in_apply_damage() -> None:
    source = _read_source()
    damage_start = source.index('function applyDamage(target, amount, attackerName) {')
    damage_end = source.index('function applyBotDamage(target, amount, attackerName, options = {}) {', damage_start)
    damage_block = source[damage_start:damage_end]

    assert "const localStat = actorStats.get('local-player');" in damage_block
    assert 'localStat.deaths += 1;' in damage_block
