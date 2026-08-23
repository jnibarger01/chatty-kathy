from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Meta(Base):
    """Process-wide counters. `event_id` is the monotonic message cursor."""

    __tablename__ = "meta"

    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class LastRead(Base):
    """Per-user, per-room last-seen event id. Unread = messages with seq > this."""

    __tablename__ = "last_reads"

    username: Mapped[str] = mapped_column(String(24), primary_key=True)
    room_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    last_event_id: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
