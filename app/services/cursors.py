"""Last-read cursors and unread counts.

Unread is *new since you left*, not "every message in a room you never opened."
A missing last_read row means the user has never joined that room → unread 0.
Joining a room advances the cursor to the latest seq so the next leave starts
a clean window.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cursor import LastRead
from app.models.message import Message


async def get_last_read(
    session: AsyncSession, username: str, room_id: str
) -> int:
    row = await session.get(LastRead, (username, room_id))
    return row.last_event_id if row else 0


async def last_reads_for(
    session: AsyncSession, username: str
) -> dict[str, int]:
    result = await session.execute(
        select(LastRead).where(LastRead.username == username)
    )
    return {row.room_id: row.last_event_id for row in result.scalars().all()}


async def mark_read(
    session: AsyncSession, username: str, room_id: str, event_id: int
) -> LastRead:
    row = await session.get(LastRead, (username, room_id))
    now = datetime.now(timezone.utc)
    if row is None:
        row = LastRead(
            username=username,
            room_id=room_id,
            last_event_id=max(0, event_id),
            updated_at=now,
        )
        session.add(row)
    elif event_id > row.last_event_id:
        row.last_event_id = event_id
        row.updated_at = now
    await session.commit()
    await session.refresh(row)
    return row


async def count_unread(
    session: AsyncSession, room_id: str, username: str, after_seq: int
) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(Message)
        .where(
            Message.room_id == room_id,
            Message.seq > after_seq,
            Message.username != username,
            Message.deleted_at.is_(None),
        )
    )
    return int(result.scalar() or 0)


async def has_visited(session: AsyncSession, username: str, room_id: str) -> bool:
    row = await session.get(LastRead, (username, room_id))
    return row is not None
