from __future__ import annotations

from pathlib import Path


VOXEL_FPS_PATH = Path(__file__).resolve().parents[2] / "app" / "static" / "voxel-fps.js"


def _read_source() -> str:
    return VOXEL_FPS_PATH.read_text(encoding="utf-8")


def test_reset_round_reseeds_local_player_stats_after_reset_bots():
    source = _read_source()
    reset_round_start = source.index("function resetRound() {")
    reset_round_end = source.index("function respawnPlayer()", reset_round_start)
    reset_round_block = source[reset_round_start:reset_round_end]

    assert "resetBots(" in reset_round_block
    assert "seedLocalPlayerStats();" in reset_round_block
    assert reset_round_block.index("resetBots(") < reset_round_block.index("seedLocalPlayerStats();")


def test_host_snapshot_syncs_local_player_kills_into_actor_stats():
    source = _read_source()
    apply_snapshot_start = source.index("function applyHostSnapshot(snapshot) {")
    apply_snapshot_end = source.index("function ensureLabelElement", apply_snapshot_start)
    apply_snapshot_block = source[apply_snapshot_start:apply_snapshot_end]

    assert "localStat.kills = human.kills || 0;" in apply_snapshot_block
    assert "localStat.deaths = human.deaths || 0;" in apply_snapshot_block
