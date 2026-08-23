from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.limits import ROOM_NAME_MAX, ROOM_NAME_MIN


class RoomCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=ROOM_NAME_MIN, max_length=ROOM_NAME_MAX)
    topic: str = Field(default="", max_length=160)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < ROOM_NAME_MIN:
            raise ValueError("Room name is too short.")
        return cleaned

    @field_validator("topic")
    @classmethod
    def normalize_topic(cls, value: str) -> str:
        return " ".join(value.split())


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    topic: str
    created_at: datetime
    member_count: int = 0
    kind: str = "channel"
    peer: str | None = None
    unread_count: int = 0
    last_event_id: int = 0


class MessageOut(BaseModel):
    id: str
    room_id: str
    username: str
    message: str
    created_at: datetime
    edited_at: datetime | None = None
    deleted: bool = False
    event_id: int = 0
