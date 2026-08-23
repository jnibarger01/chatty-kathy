"""Pydantic models for inbound WebSocket JSON. Never trust a raw dict."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.limits import MESSAGE_MAX, MESSAGE_MIN, USERNAME_MAX, USERNAME_MIN


class InboundEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str = Field(min_length=1, max_length=64)
    room_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)

    @field_validator("type")
    @classmethod
    def strip_type(cls, value: str) -> str:
        return value.strip()

    @field_validator("room_id")
    @classmethod
    def strip_room(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ChatMessageData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(min_length=MESSAGE_MIN, max_length=MESSAGE_MAX)

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        cleaned = " ".join(value.replace("\x00", "").split())
        if not cleaned:
            raise ValueError("Message cannot be empty.")
        if len(cleaned) > MESSAGE_MAX:
            raise ValueError("Message is too long.")
        return cleaned


class MessageIdData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=8, max_length=36)

    @field_validator("id")
    @classmethod
    def normalize_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message id is required.")
        return cleaned


class ChatEditData(ChatMessageData, MessageIdData):
    """Edit payload: the existing message id plus a replacement body."""


class RoomJoinData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    since_event_id: int | None = Field(default=None, ge=0)


class CursorReadData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    last_event_id: int = Field(ge=0)


class DirectOpenData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    username: str = Field(min_length=USERNAME_MIN, max_length=USERNAME_MAX)

    @field_validator("username")
    @classmethod
    def strip_username(cls, value: str) -> str:
        return value.strip()


class OutboundError(BaseModel):
    code: str
    message: str
