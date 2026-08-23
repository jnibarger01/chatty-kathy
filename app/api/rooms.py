from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.limits import HISTORY_LIMIT
from app.database.session import get_session_factory
from app.schemas.rooms import MessageOut, RoomCreate, RoomOut
from app.services import messages as message_service
from app.services import rooms as room_service
from app.services.rooms import RoomError
from app.websocket.events import EventType, envelope
from app.websocket.manager import ConnectionManager

router = APIRouter(prefix="/api")


def _manager(request: Request) -> ConnectionManager:
    return request.app.state.manager


@router.get("/rooms", response_model=list[RoomOut])
async def list_rooms(request: Request) -> list[RoomOut]:
    manager = _manager(request)
    counts = manager.member_counts()
    factory = get_session_factory()
    async with factory() as session:
        rooms = await room_service.list_rooms(session)
        out: list[RoomOut] = []
        for room in rooms:
            latest = await message_service.latest_seq(session, room.id)
            out.append(
                room_service.serialize_room(
                    room, counts.get(room.id, 0), last_event_id=latest
                )
            )
        return out


@router.post("/rooms", response_model=RoomOut, status_code=201)
async def create_room(payload: RoomCreate, request: Request) -> RoomOut:
    manager = _manager(request)
    factory = get_session_factory()
    try:
        async with factory() as session:
            room = await room_service.create_room(session, payload)
    except RoomError as exc:
        status = 409 if exc.code == "ROOM_EXISTS" else 400
        raise HTTPException(status_code=status, detail=exc.message) from exc
    out = room_service.serialize_room(room, 0)
    await manager.broadcast_all(
        envelope(EventType.ROOM_CREATED, out.model_dump(mode="json"))
    )
    return out


@router.get("/rooms/{room_id}/messages", response_model=list[MessageOut])
async def room_messages(
    room_id: str,
    limit: int = HISTORY_LIMIT,
    since: int | None = Query(default=None, ge=0),
) -> list[MessageOut]:
    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise HTTPException(status_code=404, detail="Room not found.")
        cap = max(1, min(limit, 200))
        if since is None:
            rows = await message_service.recent_messages(session, room_id, limit=cap)
        else:
            rows = await message_service.messages_since(
                session, room_id, since, limit=cap
            )
            if len(rows) > cap:
                rows = rows[-cap:]
        return [message_service.serialize_message(row) for row in rows]
