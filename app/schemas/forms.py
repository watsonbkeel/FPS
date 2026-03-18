from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from ..constants import APPEARANCE_OPTIONS, COLOR_OPTIONS, GENDER_OPTIONS, HOSTING_MODES, INTERACTION_TYPES, PERSONALITY_OPTIONS, SPECIES_OPTIONS


class RegisterForm(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    confirm_password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("邮箱格式不正确")
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.strip()) < 6:
            raise ValueError("密码至少需要 6 位")
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, value: str, info) -> str:
        if len(value.strip()) < 6:
            raise ValueError("确认密码至少需要 6 位")
        if value != info.data.get("password"):
            raise ValueError("两次输入的密码不一致")
        return value


class LoginForm(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.strip()) < 6:
            raise ValueError("密码至少需要 6 位")
        return value


class PetCreateForm(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    species: str
    gender: str
    appearance_style: str
    color: str
    personality: str

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("species")
    @classmethod
    def validate_species(cls, value: str) -> str:
        if value not in SPECIES_OPTIONS:
            raise ValueError("物种不在允许范围内")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        if value not in GENDER_OPTIONS:
            raise ValueError("性别不在允许范围内")
        return value

    @field_validator("appearance_style")
    @classmethod
    def validate_appearance_style(cls, value: str) -> str:
        if value not in APPEARANCE_OPTIONS:
            raise ValueError("外貌不在允许范围内")
        return value

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        if value not in COLOR_OPTIONS:
            raise ValueError("颜色不在允许范围内")
        return value

    @field_validator("personality")
    @classmethod
    def validate_personality(cls, value: str) -> str:
        if value not in PERSONALITY_OPTIONS:
            raise ValueError("性格不在允许范围内")
        return value


class HostingForm(BaseModel):
    hosting_mode: str

    @field_validator("hosting_mode")
    @classmethod
    def validate_mode(cls, value: str) -> str:
        if value not in HOSTING_MODES:
            raise ValueError("托管模式不正确")
        return value


class CircleCreateForm(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(max_length=500)

    @field_validator("name", "description")
    @classmethod
    def strip_value(cls, value: str) -> str:
        return value.strip()


class CircleJoinForm(BaseModel):
    pet_id: int


class CircleInteractForm(BaseModel):
    actor_pet_id: int
    target_pet_id: int
    action_type: str

    @field_validator("action_type")
    @classmethod
    def validate_action(cls, value: str) -> str:
        if value not in INTERACTION_TYPES:
            raise ValueError("互动动作不正确")
        return value


class BreedForm(BaseModel):
    partner_pet_id: int


class ShopPurchaseForm(BaseModel):
    item_id: int
    pet_id: int
