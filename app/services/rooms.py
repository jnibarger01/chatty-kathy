from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limits import DEFAULT_ROOMS, ROOM_ID_MAX, ROOM_ID_RE
from app.models.room import Room
from app.schemas.rooms import RoomCreate, RoomOut


class RoomError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    slug = slug[:ROOM_ID_MAX].strip("-")
    if not ROOM_ID_RE.match(slug):
        raise RoomError("INVALID_ROOM", "Room name must produce a valid slug.")
    return slug


def dm_peers(user_a: str, user_b: str) -> tuple[str, str]:
    return tuple(sorted((user_a, user_b), key=lambda item: (item.casefold(), item)))


def dm_room_id(user_a: str, user_b: str) -> str:
    low, high = dm_peers(user_a, user_b)
    digest = hashlib.sha256(f"{low}\n{high}".encode("utf-8")).hexdigest()[:20]
    return f"dm-{digest}"


def serialize_room(
    room: Room,
    member_count: int = 0,
    *,
    viewer: str | None = None,
    unread_count: int = 0,
    last_event_id: int = 0,
) -> RoomOut:
    peer = None
    name = room.name
    topic = room.topic
    if room.kind == "dm":
        if viewer and room.peer_a and room.peer_b:
            peer = room.peer_b if room.peer_a == viewer else room.peer_a
            if viewer.casefold() == (room.peer_a or "").casefold():
                peer = room.peer_b
            elif viewer.casefold() == (room.peer_b or "").casefold():
                peer = room.peer_a
        name = peer or name
        topic = f"Direct with {peer}" if peer else "Direct message"
    return RoomOut(
        id=room.id,
        name=name,
        topic=topic,
        created_at=room.created_at,
        member_count=member_count,
        kind=room.kind,
        peer=peer,
        unread_count=unread_count,
        last_event_id=last_event_id,
    )


async def seed_default_rooms(session: AsyncSession) -> None:
    for room_id, name, topic in DEFAULT_ROOMS:
        existing = await session.get(Room, room_id)
        if existing is None:
            session.add(
                Room(
                    id=room_id,
                    name=name,
                    topic=topic,
                    kind="channel",
                    created_at=datetime.now(timezone.utc),
                )
            )
    await session.commit()


async def list_rooms(session: AsyncSession) -> list[Room]:
    """Public channels only. REST must not leak direct threads."""
    result = await session.execute(
        select(Room).where(Room.kind == "channel").order_by(Room.created_at.asc())
    )
    return list(result.scalars().all())


async def list_direct_rooms(session: AsyncSession, username: str) -> list[Room]:
    result = await session.execute(
        select(Room)
        .where(
            Room.kind == "dm",
            or_(Room.peer_a == username, Room.peer_b == username),
        )
        .order_by(Room.created_at.asc())
    )
    return list(result.scalars().all())


async def list_visible_rooms(session: AsyncSession, username: str) -> list[Room]:
    channels = await list_rooms(session)
    directs = await list_direct_rooms(session, username)
    return channels + directs


async def get_room(session: AsyncSession, room_id: str) -> Room | None:
    return await session.get(Room, room_id)


def assert_can_join(room: Room, username: str) -> None:
    if room.kind != "dm":
        return
    peers = {room.peer_a, room.peer_b}
    if username not in peers:
        raise RoomError("FORBIDDEN", "That direct thread is not yours.")


async def create_room(session: AsyncSession, payload: RoomCreate) -> Room:
    room_id = slugify(payload.name)
    existing = await session.get(Room, room_id)
    if existing is not None:
        raise RoomError("ROOM_EXISTS", f"Room '{room_id}' already exists.")
    room = Room(
        id=room_id,
        name=payload.name,
        topic=payload.topic,
        kind="channel",
        created_at=datetime.now(timezone.utc),
    )
    session.add(room)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise RoomError("ROOM_EXISTS", f"Room '{room_id}' already exists.") from exc
    await session.refresh(room)
    return room


async def get_or_create_dm(session: AsyncSession, user_a: str, user_b: str) -> Room:
    if user_a == user_b:
        raise RoomError("CANNOT_DM_SELF", "You cannot message yourself.")
    low, high = dm_peers(user_a, user_b)
    result = await session.execute(
        select(Room).where(Room.kind == "dm", Room.peer_a == low, Room.peer_b == high)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    room_id = dm_room_id(low, high)
    room = Room(
        id=room_id,
        name=room_id,
        topic="Direct message",
        kind="dm",
        peer_a=low,
        peer_b=high,
        created_at=datetime.now(timezone.utc),
    )
    session.add(room)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        again = await session.execute(
            select(Room).where(
                Room.kind == "dm", Room.peer_a == low, Room.peer_b == high
            )
        )
        found = again.scalar_one_or_none()
        if found is None:
            raise RoomError("INVALID_ROOM", "Could not open that direct message.")
        return found
    await session.refresh(room)
    return room
