from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    topic: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    kind: Mapped[str] = mapped_column(String(16), default="channel", nullable=False, index=True)
    peer_a: Mapped[str | None] = mapped_column(String(24), nullable=True)
    peer_b: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
