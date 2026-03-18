from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


def now_utc() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    pets: Mapped[list[Pet]] = relationship("Pet", back_populates="user")
    inventories: Mapped[list[Inventory]] = relationship("Inventory", back_populates="user")
    owned_circles: Mapped[list[Circle]] = relationship("Circle", back_populates="owner")


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    species: Mapped[str] = mapped_column(String(50))
    gender: Mapped[str] = mapped_column(String(20), default="male")
    appearance_style: Mapped[str] = mapped_column(String(30), default="classic")
    color: Mapped[str] = mapped_column(String(50))
    personality: Mapped[str] = mapped_column(String(50))
    stage: Mapped[str] = mapped_column(String(20), default="egg")
    growth_path: Mapped[str] = mapped_column(String(30), default="稳健型")
    age_hours: Mapped[int] = mapped_column(Integer, default=0)
    hunger: Mapped[int] = mapped_column(Integer, default=20)
    mood: Mapped[int] = mapped_column(Integer, default=80)
    cleanliness: Mapped[int] = mapped_column(Integer, default=80)
    health: Mapped[int] = mapped_column(Integer, default=85)
    energy: Mapped[int] = mapped_column(Integer, default=80)
    relationship_score: Mapped[int] = mapped_column(Integer, default=0)
    coins: Mapped[int] = mapped_column(Integer, default=30)
    care_score: Mapped[float] = mapped_column(Float, default=55.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)
    last_tick_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    is_alive: Mapped[bool] = mapped_column(Boolean, default=True)
    is_sleeping: Mapped[bool] = mapped_column(Boolean, default=False)
    hosting_mode: Mapped[str] = mapped_column(String(20), default="off")
    auto_social_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship("User", back_populates="pets")
    events: Mapped[list[PetEvent]] = relationship("PetEvent", back_populates="pet")
    memberships: Mapped[list[CircleMember]] = relationship("CircleMember", back_populates="pet")
    hosting_policy: Mapped[HostingPolicy | None] = relationship("HostingPolicy", back_populates="pet", uselist=False)
    parent_links: Mapped[list[PetLineage]] = relationship(
        "PetLineage",
        foreign_keys="PetLineage.child_pet_id",
        back_populates="child_pet",
    )
    child_links: Mapped[list[PetLineage]] = relationship(
        "PetLineage",
        foreign_keys="PetLineage.parent_pet_id",
        back_populates="parent_pet",
    )


class PetEvent(Base):
    __tablename__ = "pet_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pet_id: Mapped[int | None] = mapped_column(ForeignKey("pets.id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    circle_id: Mapped[int | None] = mapped_column(ForeignKey("circles.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    message: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, index=True)

    pet: Mapped[Pet | None] = relationship("Pet", back_populates="events")
    circle: Mapped[Circle | None] = relationship("Circle", back_populates="events")


class Circle(Base):
    __tablename__ = "circles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    owner: Mapped[User] = relationship("User", back_populates="owned_circles")
    members: Mapped[list[CircleMember]] = relationship("CircleMember", back_populates="circle")
    events: Mapped[list[PetEvent]] = relationship("PetEvent", back_populates="circle")


class CircleMember(Base):
    __tablename__ = "circle_members"
    __table_args__ = (UniqueConstraint("circle_id", "pet_id", name="uq_circle_pet"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    circle_id: Mapped[int] = mapped_column(ForeignKey("circles.id"), index=True)
    pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    circle: Mapped[Circle] = relationship("Circle", back_populates="members")
    pet: Mapped[Pet] = relationship("Pet", back_populates="memberships")


class PetRelationship(Base):
    __tablename__ = "pet_relationships"
    __table_args__ = (UniqueConstraint("pet_id", "other_pet_id", name="uq_pet_relationship_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id"), index=True)
    other_pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id"), index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    last_interaction_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)


class PetLineage(Base):
    __tablename__ = "pet_lineage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id"), index=True)
    child_pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id"), index=True)
    relation_type: Mapped[str] = mapped_column(String(20), default="parent")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    parent_pet: Mapped[Pet] = relationship("Pet", foreign_keys=[parent_pet_id], back_populates="child_links")
    child_pet: Mapped[Pet] = relationship("Pet", foreign_keys=[child_pet_id], back_populates="parent_links")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    category: Mapped[str] = mapped_column(String(30))
    price: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, default="")
    effect_json: Mapped[dict] = mapped_column(JSON, default=dict)

    inventories: Mapped[list[Inventory]] = relationship("Inventory", back_populates="item")


class Inventory(Base):
    __tablename__ = "inventories"
    __table_args__ = (UniqueConstraint("user_id", "item_id", name="uq_inventory_user_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship("User", back_populates="inventories")
    item: Mapped[Item] = relationship("Item", back_populates="inventories")


class HostingPolicy(Base):
    __tablename__ = "hosting_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id"), unique=True, index=True)
    mode: Mapped[str] = mapped_column(String(20), default="off")
    auto_social_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_action_summary: Mapped[str] = mapped_column(Text, default="尚未触发托管动作")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    pet: Mapped[Pet] = relationship("Pet", back_populates="hosting_policy")
