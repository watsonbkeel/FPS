from __future__ import annotations

from typing import TypedDict

from sqlalchemy.orm import Session

from ...models import Pet
from ..event_service import log_event


class MiniGameRule(TypedDict):
    label: str
    base: dict[str, int]
    scale: int
    max_reward: int


MINI_GAME_RULES: dict[str, MiniGameRule] = {
    "shooting": {
        "label": "海滩防线",
        "base": {"easy": 1, "normal": 2, "hard": 3},
        "scale": 12,
        "max_reward": 20,
    },
    "voxel_fps": {
        "label": "方块战场",
        "base": {"easy": 1, "normal": 2, "hard": 3},
        "scale": 12,
        "max_reward": 20,
    },
}

MINI_GAME_DIFFICULTIES = {"easy": "简单", "normal": "标准", "hard": "困难"}
MINI_GAME_WEAPONS = {"machine_gun": "重机枪", "coastal_cannon": "岸防炮", "voxel_rifle": "长枪"}


def calculate_voxel_fps_score(kills: int, win_status: bool, time_alive: int) -> int:
    participation = 4
    kill_score = min(8, max(0, kills) * 2)
    win_bonus = 6 if win_status else 0
    survival_bonus = min(4, max(0, time_alive) // 30)
    local_coins = min(20, participation + kill_score + win_bonus + survival_bonus)
    return min(100, local_coins * 5)


def _coin_metadata(delta: int, pet: Pet, source: str, **extra: object) -> dict[str, object]:
    metadata: dict[str, object] = {
        "coin_delta": delta,
        "coins_after": pet.coins,
        "coin_source": source,
    }
    metadata.update(extra)
    return metadata


def claim_mini_game_reward(
    db: Session,
    pet: Pet,
    *,
    game_type: str,
    difficulty: str,
    score: int,
    weapon: str | None = None,
) -> dict[str, object]:
    if game_type not in MINI_GAME_RULES:
        raise ValueError("小游戏类型不存在")
    if difficulty not in MINI_GAME_DIFFICULTIES:
        raise ValueError("小游戏难度不存在")
    if game_type == "shooting" and weapon not in MINI_GAME_WEAPONS:
        raise ValueError("射击武器不存在")

    normalized_score = max(0, min(100, int(score)))
    rule = MINI_GAME_RULES[game_type]
    if game_type == "voxel_fps":
        message = f"{pet.name} 完成了{rule['label']}，得分 {normalized_score}。该模式已改为独立站入口，不再发放主站金币"
        log_event(
            db,
            pet=pet,
            event_type="mini_game",
            message=message,
            metadata=_coin_metadata(
                0,
                pet,
                f"mini_game_{game_type}",
                game_type=game_type,
                difficulty=difficulty,
                weapon=weapon,
                score=normalized_score,
            ),
        )
        return {
            "game_label": rule["label"],
            "difficulty_label": MINI_GAME_DIFFICULTIES[difficulty],
            "weapon_label": MINI_GAME_WEAPONS.get(weapon) if weapon else None,
            "score": normalized_score,
            "reward": 0,
            "coins_after": pet.coins,
            "message": message,
        }
    weapon_bonus = 1 if game_type == "shooting" and weapon == "coastal_cannon" and normalized_score >= 60 else 0
    reward = min(rule["max_reward"], rule["base"][difficulty] + round(normalized_score / rule["scale"]) + weapon_bonus)
    pet.coins += reward
    difficulty_label = MINI_GAME_DIFFICULTIES[difficulty]
    game_label = rule["label"]
    weapon_label = MINI_GAME_WEAPONS.get(weapon) if weapon else None
    weapon_text = f" / {weapon_label}" if weapon_label else ""
    message = f"{pet.name} 完成了{game_label}（{difficulty_label}{weapon_text}），得分 {normalized_score}，获得 {reward} 金币，当前剩余 {pet.coins} 金币"
    log_event(
        db,
        pet=pet,
        event_type="mini_game",
        message=message,
        metadata=_coin_metadata(
            reward,
            pet,
            f"mini_game_{game_type}",
            game_type=game_type,
            difficulty=difficulty,
            weapon=weapon,
            score=normalized_score,
        ),
    )
    return {
        "game_label": game_label,
        "difficulty_label": difficulty_label,
        "weapon_label": weapon_label,
        "score": normalized_score,
        "reward": reward,
        "coins_after": pet.coins,
        "message": message,
    }
