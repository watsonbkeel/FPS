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
    assert "targetPoint: clampPointToArena(origin.addScaledVector(direction, GRENADE_THROW_SPEED * 0.9))," in source


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
