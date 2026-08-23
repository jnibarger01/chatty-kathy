from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limits import HISTORY_LIMIT
from app.models.cursor import Meta
from app.models.message import Message
from app.schemas.rooms import MessageOut


class MessageError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def serialize_message(row: Message) -> MessageOut:
    deleted = row.deleted_at is not None
    return MessageOut(
        id=row.id,
        room_id=row.room_id,
        username=row.username,
        message="" if deleted else row.body,
        created_at=row.created_at,
        edited_at=row.edited_at,
        deleted=deleted,
        event_id=row.seq or 0,
    )


async def allocate_event_id(session: AsyncSession) -> int:
    row = await session.get(Meta, "event_id")
    if row is None:
        row = Meta(key="event_id", value=1)
        session.add(row)
        await session.flush()
        return 1
    row.value += 1
    await session.flush()
    return row.value


async def persist_message(
    session: AsyncSession, *, room_id: str, username: str, body: str
) -> Message:
    seq = await allocate_event_id(session)
    row = Message(
        id=str(uuid4()),
        room_id=room_id,
        username=username,
        body=body,
        seq=seq,
        created_at=datetime.now(timezone.utc),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def get_message(session: AsyncSession, message_id: str) -> Message | None:
    return await session.get(Message, message_id)


async def edit_message(
    session: AsyncSession, *, message_id: str, username: str, body: str
) -> Message:
    row = await get_message(session, message_id)
    if row is None:
        raise MessageError("NOT_FOUND", "That message does not exist.")
    if row.deleted_at is not None:
        raise MessageError("ALREADY_DELETED", "That message was deleted.")
    if row.username != username:
        raise MessageError("NOT_AUTHOR", "You can only edit your own messages.")
    if row.body == body:
        row.edited_at = row.edited_at or datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(row)
        return row
    row.body = body
    row.edited_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(row)
    return row


async def delete_message(
    session: AsyncSession, *, message_id: str, username: str
) -> Message:
    row = await get_message(session, message_id)
    if row is None:
        raise MessageError("NOT_FOUND", "That message does not exist.")
    if row.deleted_at is not None:
        raise MessageError("ALREADY_DELETED", "That message was already deleted.")
    if row.username != username:
        raise MessageError("NOT_AUTHOR", "You can only delete your own messages.")
    row.deleted_at = datetime.now(timezone.utc)
    row.body = ""
    await session.commit()
    await session.refresh(row)
    return row


async def recent_messages(
    session: AsyncSession, room_id: str, *, limit: int = HISTORY_LIMIT
) -> list[Message]:
    result = await session.execute(
        select(Message)
        .where(Message.room_id == room_id)
        .order_by(Message.seq.desc())
        .limit(limit)
    )
    rows = list(result.scalars().all())
    rows.reverse()
    return rows


async def messages_since(
    session: AsyncSession,
    room_id: str,
    since_event_id: int,
    *,
    limit: int = HISTORY_LIMIT,
) -> list[Message]:
    result = await session.execute(
        select(Message)
        .where(Message.room_id == room_id, Message.seq > since_event_id)
        .order_by(Message.seq.asc())
        .limit(limit + 1)
    )
    return list(result.scalars().all())


async def latest_seq(session: AsyncSession, room_id: str) -> int:
    result = await session.execute(
        select(func.max(Message.seq)).where(Message.room_id == room_id)
    )
    value = result.scalar()
    return int(value or 0)
