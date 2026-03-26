from __future__ import annotations

from pathlib import Path


VOXEL_FPS_PATH = Path(__file__).resolve().parents[2] / "app" / "static" / "voxel-fps.js"


def _read_source() -> str:
    return VOXEL_FPS_PATH.read_text(encoding="utf-8")


def test_singleplayer_can_issue_team_command() -> None:
    source = _read_source()

    assert "function canIssueTeamCommand()" in source
    assert "return !multiplayerState.active || Boolean(multiplayerState.room && multiplayerState.room.current_slot_index === 0);" in source
    assert "if (!canIssueTeamCommand()) {" in source


def test_opening_team_commands_are_seeded_on_round_reset() -> None:
    source = _read_source()
    reset_round_start = source.index("function resetRound() {")
    reset_round_end = source.index("function respawnPlayer() {", reset_round_start)
    reset_round_block = source[reset_round_start:reset_round_end]

    assert "const OPENING_COMMAND_DURATION = 14000;" in source
    assert "function seedOpeningTeamCommands()" in source
    assert "opening: true," in source
    assert "seedOpeningTeamCommands();" in reset_round_block
    assert reset_round_block.index("resetBots(") < reset_round_block.index("seedOpeningTeamCommands();")


def test_command_move_uses_formation_offsets() -> None:
    source = _read_source()

    assert "function getBotFormationOffset(bot)" in source
    assert "function getCommandMoveTarget(bot, activeCommand)" in source
    assert "const commandPos = getCommandMoveTarget(bot, activeCommand);" in source
    assert "if (activeCommand?.opening && (target || bot.hitTimer > 0)) {" in source
    assert "const shouldHoldCommand = activeCommand.manual ? bot.mesh.position.distanceTo(commandPos) > 1.6" in source
    assert "y: point.y || 0" in source


def test_bot_ai_adds_opening_and_lane_parameters() -> None:
    source = _read_source()

    assert "bot.openingBias = enemy ? 1.12 + Math.random() * 0.16 : 1.02 + Math.random() * 0.14;" in source
    assert "bot.laneDiscipline = 0.58 + Math.random() * 0.18;" in source
    assert "const lanePenalty = Math.abs(anchor.x - laneX) * 0.18;" in source
    assert "function chooseAssaultAnchor(bot)" in source
    assert "function moveBotTowardPoint(bot, destination, stepAmount, options = {})" in source
    assert "const BOT_MAX_PERCH_STEP_UP = 9.8;" in source
    assert "position.y - height + PLAYER_GROUND_EPSILON" in source


def test_command_flag_selection_respects_singleplayer_or_captain_rules() -> None:
    source = _read_source()

    assert "if (canIssueTeamCommand()) {" in source
    assert "if (weapon === 'voxel_command_flag' && !canIssueTeamCommand()) {" in source


def test_sniper_bots_have_high_ground_role_and_perch_targets() -> None:
    source = _read_source()

    assert "const highGroundPerches = [];" in source
    assert "function chooseSniperPerch(bot)" in source
    assert "bot.perchTarget = chooseSniperPerch(bot);" in source
    assert "bot.state = 'take_perch';" in source
    assert "bot.state = 'overwatch';" in source
    assert "allowPerchHop: true" in source


def test_team_combat_signal_supports_follow_and_focus_fire() -> None:
    source = _read_source()

    assert "let teamCombatSignals = { [ABS_TEAM_RED]: null, [ABS_TEAM_BLUE]: null };" in source
    assert "function getTeamHumanLeader(team)" in source
    assert "function getLeaderFollowPoint(bot, leader)" in source
    assert "function recordTeamCombatSignal(team, payload)" in source
    assert "function findSignalTarget(bot, signal)" in source
    assert "const hasLOS = lineOfSight(bot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), aimPoint);" in source
    assert "type: 'point'" in source
    assert "if (teamSignal && (teamSignal.weapon === 'voxel_rifle' || teamSignal.weapon === 'voxel_sniper')) {" in source
    assert "bot.state = 'follow_leader';" in source
    assert "recordTeamCombatSignal(absoluteFriendlyTeam, {" in source


def test_focus_marker_visualizes_team_focus_target() -> None:
    source = _read_source()

    assert "const teamFocusMarkers = { [ABS_TEAM_RED]: null, [ABS_TEAM_BLUE]: null };" in source
    assert "function ensureTeamFocusMarker(team)" in source
    assert "function updateTeamFocusMarkers(now)" in source
    assert "updateTeamFocusMarkers(now);" in source
    assert "clearTeamFocusMarker(ABS_TEAM_RED);" in source


def test_ladder_approach_keeps_height_and_releases_at_ladder_base() -> None:
    source = _read_source()

    assert "function resolveLadderApproach(destination, botPosition = null)" in source
    assert "Math.hypot(ladder.x - botPosition.x, ladder.z - botPosition.z) < 1.2" in source
    assert "return new THREE.Vector3(ladder.x, destination.y || 0, ladder.z);" in source
    assert "? resolveLadderApproach(destination, bot.mesh.position)" in source
