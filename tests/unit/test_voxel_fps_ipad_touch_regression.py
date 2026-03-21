from __future__ import annotations

from pathlib import Path


VOXEL_FPS_PATH = Path(__file__).resolve().parents[2] / "app" / "static" / "voxel-fps.js"


def _read_source() -> str:
    return VOXEL_FPS_PATH.read_text(encoding="utf-8")


def test_detect_mobile_mode_includes_touch_capability_fallbacks() -> None:
    source = _read_source()

    assert "function detectMobileMode()" in source
    assert "navigator.maxTouchPoints > 0" in source
    assert "'ontouchstart' in window" in source
    assert "let cachedMobileMode = detectMobileMode();" in source


def test_apply_mobile_overrides_forces_mobile_controls_visible() -> None:
    source = _read_source()

    assert "function applyMobileOverrides()" in source
    assert "mobileControls.style.display = 'flex';" in source
    assert "document.documentElement.style.overscrollBehavior = 'none';" in source
    assert "document.body.style.overscrollBehavior = 'none';" in source
    assert "document.documentElement.style.overscrollBehavior = '';" in source
    assert "document.body.style.overscrollBehavior = '';" in source
    assert "applyMobileOverrides();" in source


def test_resize_handler_recomputes_mobile_mode_and_reapplies_overrides() -> None:
    source = _read_source()
    resize_start = source.index("window.addEventListener('resize', () => {")
    resize_end = source.index("window.addEventListener('keydown'", resize_start)
    resize_block = source[resize_start:resize_end]

    assert "cachedMobileMode = detectMobileMode();" in resize_block
    assert "applyMobileOverrides();" in resize_block
    assert "updateMobileWeaponButtons();" in resize_block


def test_touchstart_allows_overlay_interaction_on_mobile() -> None:
    source = _read_source()
    touch_start = source.index("stage.addEventListener('touchstart', (event) => {")
    touch_end = source.index("stage.addEventListener('touchmove'", touch_start)
    touch_block = source[touch_start:touch_end]

    assert "event.target.closest('.voxel-overlay') || event.target.closest('button')" in touch_block
    assert "return;" in touch_block
    assert "event.preventDefault();" in touch_block


def test_touchmove_also_allows_overlay_interaction_on_mobile() -> None:
    source = _read_source()
    touch_move = source.index("stage.addEventListener('touchmove', (event) => {")
    touch_move_end = source.index("stage.addEventListener('pointerdown'", touch_move)
    touch_move_block = source[touch_move:touch_move_end]

    assert "event.target.closest('.voxel-overlay') || event.target.closest('button')" in touch_move_block
    assert "event.preventDefault();" in touch_move_block


def test_respawn_no_longer_force_locks_pointer() -> None:
    source = _read_source()
    respawn_start = source.index("function respawnPlayer() {")
    respawn_end = source.index("function animate(now) {", respawn_start)
    respawn_block = source[respawn_start:respawn_end]

    assert "gamePaused = false;" in respawn_block
    assert "controls.lock();" not in respawn_block


def test_mousedown_can_relock_pointer_without_hitting_ui() -> None:
    source = _read_source()
    mouse_start = source.index("document.addEventListener('mousedown', (event) => {")
    mouse_end = source.index("document.addEventListener('contextmenu'", mouse_start)
    mouse_block = source[mouse_start:mouse_end]

    assert "if (!pointerLocked && !isMobileMode())" in mouse_block
    assert "event.target.closest('.voxel-overlay')" in mouse_block
    assert "event.target.closest('button')" in mouse_block
    assert "event.target.closest('.voxel-mobile-controls')" in mouse_block
    assert "controls.lock();" in mouse_block
