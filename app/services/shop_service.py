from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Inventory, Item, Pet, User
from .event_service import log_event


DEFAULT_ITEMS = [
    {"name": "小饼干", "category": "food", "price": 6, "description": "常规零食，适合日常囤货", "effect_json": {"hunger": -14, "mood": 4, "coins": 2}},
    {"name": "能量三明治", "category": "food", "price": 14, "description": "更扎实的能量补给，吃完心情也更好", "effect_json": {"hunger": -32, "mood": 8, "health": 2, "coins": 3}},
    {"name": "高能罐头", "category": "food", "price": 22, "description": "高级食材制成，饱腹且微量回血", "effect_json": {"hunger": -46, "mood": 12, "health": 4, "coins": 4}},
    {"name": "简易药剂", "category": "medicine", "price": 12, "description": "轻度治疗用品，效果高于基础治疗", "effect_json": {"health": 28, "mood": 2}},
    {"name": "强化药剂", "category": "medicine", "price": 18, "description": "加强版治疗，适合中度不适", "effect_json": {"health": 40, "mood": 4}},
    {"name": "高级医疗包", "category": "medicine", "price": 26, "description": "恢复力更强，适合严重状态时使用", "effect_json": {"health": 54, "mood": 6}},
    {"name": "精力丸", "category": "medicine", "price": 30, "description": "快速提神，不用睡觉也能补一点精力", "effect_json": {"energy": 5, "mood": 1}},
    {"name": "小花束", "category": "gift", "price": 10, "description": "圈子互动时可送出的礼物", "effect_json": {"relationship": 8}},
]


def seed_items(db: Session) -> None:
    for payload in DEFAULT_ITEMS:
        existing = db.scalar(select(Item).where(Item.name == payload["name"]))
        if existing:
            existing.category = payload["category"]
            existing.price = payload["price"]
            existing.description = payload["description"]
            existing.effect_json = payload["effect_json"]
            continue
        db.add(Item(**payload))
    db.flush()


def list_items(db: Session) -> list[Item]:
    seed_items(db)
    return list(db.scalars(select(Item).order_by(Item.price.asc(), Item.name.asc())))


def _hourly_seed() -> int:
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    return int(now.strftime("%Y%m%d%H"))


def shop_refresh_window() -> tuple[datetime, datetime]:
    start = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=1)
    return start, end


def hourly_shop_offers(db: Session, *, slots: int = 5) -> list[Item]:
    items = list_items(db)
    if not items:
        seed_items(db)
        items = list_items(db)
    if len(items) <= slots:
        return items

    rng = random.Random(_hourly_seed())
    foods = [item for item in items if item.category == "food"]
    meds = [item for item in items if item.category == "medicine"]
    energy_meds = [item for item in meds if (item.effect_json or {}).get("energy", 0) > 0]
    health_meds = [item for item in meds if (item.effect_json or {}).get("health", 0) > 0]
    others = [item for item in items if item.category not in {"food", "medicine"}]
    rng.shuffle(foods)
    rng.shuffle(health_meds)
    rng.shuffle(energy_meds)
    rng.shuffle(others)

    picks: list[Item] = []
    picks.extend(foods[:2])
    if health_meds:
        picks.append(health_meds[0])
    if energy_meds:
        picks.append(energy_meds[0])
    picks.extend(others[:1])

    seen_ids = {item.id for item in picks}
    pool = [item for item in items if item.id not in seen_ids]
    rng.shuffle(pool)
    picks.extend(pool[: max(0, slots - len(picks))])
    return picks[:slots]


def inventory_map(db: Session, user: User) -> dict[int, Inventory]:
    rows = list(db.scalars(select(Inventory).where(Inventory.user_id == user.id)))
    return {row.item_id: row for row in rows}


def buy_item(db: Session, user: User, pet: Pet, item_id: int) -> Item:
    item = db.get(Item, item_id)
    if not item:
        raise ValueError("商品不存在")
    if pet.user_id != user.id:
        raise ValueError("不能用别人的宠物金币购买")
    if pet.coins < item.price:
        raise ValueError("金币不足，无法购买")

    pet.coins -= item.price
    inventory = db.scalar(select(Inventory).where(Inventory.user_id == user.id, Inventory.item_id == item.id))
    if not inventory:
        inventory = Inventory(user=user, item=item, quantity=0)
        db.add(inventory)
    inventory.quantity += 1
    log_event(
        db,
        pet=pet,
        user=user,
        event_type="shop_buy",
        message=f"{pet.name} 购买了 {item.name}，花费 {item.price} 金币，当前剩余 {pet.coins} 金币",
        metadata={"coin_delta": -item.price, "coins_after": pet.coins, "coin_source": "shop_buy", "item_name": item.name},
    )
    return item


def consume_gift_item(db: Session, user: User) -> bool:
    gift_inventory = db.scalar(
        select(Inventory)
        .join(Item, Item.id == Inventory.item_id)
        .where(Inventory.user_id == user.id, Item.category == "gift", Inventory.quantity > 0)
        .order_by(Item.price.asc())
    )
    if not gift_inventory:
        return False
    gift_inventory.quantity -= 1
    return True
