"""Translate inbound JSON frames into manager + service calls.

The socket loop lives here so FastAPI's route stays thin:

    accept → register → loop receive → dispatch → finally disconnect

Malformed frames produce a structured `error` event and the socket stays
open. We never let one bad client crash the handler for everyone else.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket
from pydantic import ValidationError as PydanticValidationError
from starlette.websockets import WebSocketDisconnect, WebSocketState

from app.core.limits import HISTORY_LIMIT, MAX_FRAME_BYTES
from app.database.session import get_session_factory
from app.schemas.events import (
    ChatEditData,
    ChatMessageData,
    CursorReadData,
    DirectOpenData,
    InboundEvent,
    MessageIdData,
    RoomJoinData,
)
from app.services import cursors as cursor_service
from app.services import messages as message_service
from app.services import rooms as room_service
from app.services.messages import MessageError
from app.services.rooms import RoomError
from app.services.validation import ValidationError, normalize_username, require_room_id
from app.websocket.events import INBOUND_EVENTS, EventType, envelope
from app.websocket.manager import Connection, ConnectionManager

logger = logging.getLogger("relay.ws")


def _error(code: str, message: str) -> dict[str, Any]:
    return envelope(EventType.ERROR, {"code": code, "message": message})


def _pydantic_message(exc: PydanticValidationError, fallback: str) -> str:
    msg = fallback
    for err in exc.errors():
        if err.get("type") == "string_too_long":
            return "Message is too long."
        inner = err.get("msg", "")
        if "empty" in inner.lower() or "too short" in inner.lower():
            msg = "Message cannot be empty."
        elif "too long" in inner.lower():
            msg = "Message is too long."
        elif "id" in [str(loc).lower() for loc in err.get("loc", ())]:
            msg = "Message id is required."
    return msg


def _require_membership(conn: Connection, room_id: str, action: str) -> None:
    if conn.room_id != room_id:
        raise ValidationError("NOT_IN_ROOM", f"Join the room before {action}.")


async def _safe_send(websocket: WebSocket, payload: dict[str, Any]) -> None:
    if websocket.client_state != WebSocketState.CONNECTED:
        return
    try:
        await websocket.send_json(payload)
    except Exception:
        logger.warning("failed to send error frame")


async def _decorate_room(
    session, manager: ConnectionManager, room, username: str
) -> dict[str, Any]:
    last_read = await cursor_service.get_last_read(session, username, room.id)
    unread = (
        await cursor_service.count_unread(session, room.id, username, last_read)
        if last_read or await cursor_service.has_visited(session, username, room.id)
        else 0
    )
    latest = await message_service.latest_seq(session, room.id)
    return room_service.serialize_room(
        room,
        manager.member_count(room.id),
        viewer=username,
        unread_count=unread,
        last_event_id=latest,
    ).model_dump(mode="json")


async def _room_snapshot(
    manager: ConnectionManager,
    room_id: str,
    username: str,
    *,
    since_event_id: int | None = None,
) -> tuple[dict[str, Any], int]:
    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise RoomError("INVALID_ROOM", "That room does not exist.")
        room_service.assert_can_join(room, username)
        last_read = await cursor_service.get_last_read(session, username, room_id)
        visited = await cursor_service.has_visited(session, username, room_id)
        mode = "snapshot"
        history = await message_service.recent_messages(session, room_id)
        if since_event_id is not None:
            catchup = await message_service.messages_since(
                session, room_id, since_event_id, limit=HISTORY_LIMIT
            )
            if len(catchup) <= HISTORY_LIMIT:
                history = catchup
                mode = "catchup"
        first_unread = None
        if visited:
            for row in history:
                if row.seq > last_read and row.username != username and row.deleted_at is None:
                    first_unread = row.seq
                    break
        latest = await message_service.latest_seq(session, room_id)
        await cursor_service.mark_read(session, username, room_id, latest)
        data = {
            "room": room_service.serialize_room(
                room,
                manager.member_count(room_id),
                viewer=username,
                unread_count=0,
                last_event_id=latest,
            ).model_dump(mode="json"),
            "members": manager.usernames_in_room(room_id),
            "messages": [
                message_service.serialize_message(row).model_dump(mode="json")
                for row in history
            ],
            "mode": mode,
            "first_unread_event_id": first_unread,
        }
    return data, latest


async def _list_rooms_payload(
    manager: ConnectionManager, username: str
) -> list[dict[str, Any]]:
    factory = get_session_factory()
    async with factory() as session:
        rooms = await room_service.list_visible_rooms(session, username)
        return [await _decorate_room(session, manager, room, username) for room in rooms]


async def join_room(
    manager: ConnectionManager,
    conn: Connection,
    room_id: str,
    *,
    since_event_id: int | None = None,
) -> None:
    room_id = require_room_id(room_id)
    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise RoomError("INVALID_ROOM", "That room does not exist.")
        room_service.assert_can_join(room, conn.username)

    previous = await manager.join_room(conn.connection_id, room_id)
    if previous and previous != room_id:
        if not manager.username_still_in_room(
            conn.username, previous, exclude=conn.connection_id
        ):
            await manager.broadcast_room(
                previous,
                envelope(
                    EventType.USER_LEFT,
                    {"username": conn.username, "members": manager.usernames_in_room(previous)},
                    room_id=previous,
                ),
                exclude=conn.connection_id,
            )
        await manager.send(
            conn.connection_id,
            envelope(
                EventType.ROOM_LEFT,
                {"room_id": previous},
                room_id=previous,
            ),
        )

    snapshot, _latest = await _room_snapshot(
        manager, room_id, conn.username, since_event_id=since_event_id
    )
    await manager.send(
        conn.connection_id,
        envelope(EventType.ROOM_JOINED, snapshot, room_id=room_id),
    )

    if not manager.username_still_in_room(
        conn.username, room_id, exclude=conn.connection_id
    ) or manager.member_count(room_id) == 1:
        others_same = manager.username_still_in_room(
            conn.username, room_id, exclude=conn.connection_id
        )
        if not others_same:
            await manager.broadcast_room(
                room_id,
                envelope(
                    EventType.USER_JOINED,
                    {
                        "username": conn.username,
                        "members": manager.usernames_in_room(room_id),
                    },
                    room_id=room_id,
                ),
                exclude=conn.connection_id,
            )


async def leave_current_room(manager: ConnectionManager, conn: Connection) -> None:
    room_id = await manager.leave_room(conn.connection_id)
    if not room_id:
        return
    await manager.send(
        conn.connection_id,
        envelope(EventType.ROOM_LEFT, {"room_id": room_id}, room_id=room_id),
    )
    if not manager.username_still_in_room(conn.username, room_id):
        await manager.broadcast_room(
            room_id,
            envelope(
                EventType.USER_LEFT,
                {
                    "username": conn.username,
                    "members": manager.usernames_in_room(room_id),
                },
                room_id=room_id,
            ),
        )


async def _fanout_chat(
    manager: ConnectionManager,
    *,
    room,
    payload: dict[str, Any],
    author: str,
    event_id: int,
    bump_unread: bool,
) -> None:
    """Room broadcast plus DM unicast and unread bumps for people not in-room."""
    await manager.broadcast_room(room.id, payload)
    factory = get_session_factory()

    if room.kind == "dm":
        for name in (room.peer_a, room.peer_b):
            if not name:
                continue
            await manager.send_user(name, payload, exclude_room=room.id)

    if not bump_unread:
        return

    targets: set[str] = set()
    if room.kind == "dm":
        for name in (room.peer_a, room.peer_b):
            if name and name != author:
                targets.add(name)
    else:
        async with factory() as session:
            for conn in manager.snapshot_connections():
                if conn.username == author or conn.room_id == room.id:
                    continue
                if await cursor_service.has_visited(session, conn.username, room.id):
                    targets.add(conn.username)

    async with factory() as session:
        for username in targets:
            in_room = any(
                conn.room_id == room.id
                for conn in manager.connections_for(username)
            )
            if in_room:
                await cursor_service.mark_read(session, username, room.id, event_id)
                continue
            last = await cursor_service.get_last_read(session, username, room.id)
            if room.kind == "dm" and not await cursor_service.has_visited(
                session, username, room.id
            ):
                await cursor_service.mark_read(session, username, room.id, 0)
                last = 0
            unread = await cursor_service.count_unread(
                session, room.id, username, last
            )
            await manager.send_user(
                username,
                envelope(
                    EventType.UNREAD_UPDATE,
                    {"room_id": room.id, "unread_count": unread},
                    room_id=room.id,
                ),
                exclude_room=room.id,
            )


async def _handle_chat_message(
    manager: ConnectionManager, conn: Connection, event: InboundEvent
) -> None:
    room_id = require_room_id(event.room_id or conn.room_id)
    _require_membership(conn, room_id, "sending messages")
    try:
        body = ChatMessageData.model_validate(event.data).message
    except PydanticValidationError as exc:
        raise ValidationError(
            "INVALID_MESSAGE", _pydantic_message(exc, "Message cannot be empty.")
        ) from exc

    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise RoomError("INVALID_ROOM", "That room does not exist.")
        room_service.assert_can_join(room, conn.username)
        row = await message_service.persist_message(
            session, room_id=room_id, username=conn.username, body=body
        )
        await cursor_service.mark_read(session, conn.username, room_id, row.seq)
    payload = envelope(
        EventType.CHAT_MESSAGE,
        message_service.serialize_message(row).model_dump(mode="json"),
        room_id=room_id,
        event_id=row.seq,
    )
    await _fanout_chat(
        manager,
        room=room,
        payload=payload,
        author=conn.username,
        event_id=row.seq,
        bump_unread=True,
    )
    logger.info(
        "message sent room=%s username=%s bytes=%s seq=%s",
        room_id,
        conn.username,
        len(body.encode("utf-8")),
        row.seq,
    )


async def _handle_chat_edit(
    manager: ConnectionManager, conn: Connection, event: InboundEvent
) -> None:
    room_id = require_room_id(event.room_id or conn.room_id)
    _require_membership(conn, room_id, "editing messages")
    try:
        payload_in = ChatEditData.model_validate(event.data)
    except PydanticValidationError as exc:
        raise ValidationError(
            "INVALID_MESSAGE", _pydantic_message(exc, "Message cannot be empty.")
        ) from exc

    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise RoomError("INVALID_ROOM", "That room does not exist.")
        row = await message_service.get_message(session, payload_in.id)
        if row is None:
            raise MessageError("NOT_FOUND", "That message does not exist.")
        if row.room_id != room_id:
            raise ValidationError(
                "NOT_IN_ROOM", "Join the room that holds that message."
            )
        row = await message_service.edit_message(
            session,
            message_id=payload_in.id,
            username=conn.username,
            body=payload_in.message,
        )
    payload = envelope(
        EventType.CHAT_EDITED,
        message_service.serialize_message(row).model_dump(mode="json"),
        room_id=room_id,
        event_id=row.seq,
    )
    await _fanout_chat(
        manager,
        room=room,
        payload=payload,
        author=conn.username,
        event_id=row.seq,
        bump_unread=False,
    )
    logger.info("message edited room=%s id=%s username=%s", room_id, row.id, conn.username)


async def _handle_chat_delete(
    manager: ConnectionManager, conn: Connection, event: InboundEvent
) -> None:
    room_id = require_room_id(event.room_id or conn.room_id)
    _require_membership(conn, room_id, "deleting messages")
    try:
        payload_in = MessageIdData.model_validate(event.data)
    except PydanticValidationError as exc:
        raise ValidationError(
            "INVALID_MESSAGE", _pydantic_message(exc, "Message id is required.")
        ) from exc

    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise RoomError("INVALID_ROOM", "That room does not exist.")
        row = await message_service.get_message(session, payload_in.id)
        if row is None:
            raise MessageError("NOT_FOUND", "That message does not exist.")
        if row.room_id != room_id:
            raise ValidationError(
                "NOT_IN_ROOM", "Join the room that holds that message."
            )
        row = await message_service.delete_message(
            session, message_id=payload_in.id, username=conn.username
        )
    payload = envelope(
        EventType.CHAT_DELETED,
        message_service.serialize_message(row).model_dump(mode="json"),
        room_id=room_id,
        event_id=row.seq,
    )
    await _fanout_chat(
        manager,
        room=room,
        payload=payload,
        author=conn.username,
        event_id=row.seq,
        bump_unread=False,
    )
    logger.info("message deleted room=%s id=%s username=%s", room_id, row.id, conn.username)


async def _handle_dm_open(
    manager: ConnectionManager, conn: Connection, event: InboundEvent
) -> None:
    try:
        payload = DirectOpenData.model_validate(event.data)
        peer = normalize_username(payload.username)
    except PydanticValidationError as exc:
        raise ValidationError("INVALID_USERNAME", "Need a username to message.") from exc

    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_or_create_dm(session, conn.username, peer)

    serialized = None
    async with factory() as session:
        latest = await message_service.latest_seq(session, room.id)
        serialized = room_service.serialize_room(
            room,
            manager.member_count(room.id),
            viewer=peer,
            last_event_id=latest,
        ).model_dump(mode="json")

    await join_room(manager, conn, room.id)
    await manager.send_user(
        peer,
        envelope(EventType.ROOM_CREATED, serialized),
    )


async def _handle_cursor_read(
    manager: ConnectionManager, conn: Connection, event: InboundEvent
) -> None:
    room_id = require_room_id(event.room_id or conn.room_id)
    try:
        payload = CursorReadData.model_validate(event.data)
    except PydanticValidationError:
        raise ValidationError("INVALID_MESSAGE", "last_event_id is required.")
    factory = get_session_factory()
    async with factory() as session:
        room = await room_service.get_room(session, room_id)
        if room is None:
            raise RoomError("INVALID_ROOM", "That room does not exist.")
        room_service.assert_can_join(room, conn.username)
        await cursor_service.mark_read(
            session, conn.username, room_id, payload.last_event_id
        )
        unread = await cursor_service.count_unread(
            session, room_id, conn.username, payload.last_event_id
        )
    await manager.send(
        conn.connection_id,
        envelope(
            EventType.UNREAD_UPDATE,
            {"room_id": room_id, "unread_count": unread},
            room_id=room_id,
        ),
    )


async def handle_event(
    manager: ConnectionManager, conn: Connection, raw: str
) -> None:
    if len(raw.encode("utf-8")) > MAX_FRAME_BYTES:
        await manager.send(
            conn.connection_id,
            _error("INVALID_MESSAGE", "Frame is too large."),
        )
        return

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        await manager.send(
            conn.connection_id,
            _error("INVALID_JSON", "Payload must be JSON."),
        )
        return

    if not isinstance(parsed, dict):
        await manager.send(
            conn.connection_id,
            _error("INVALID_JSON", "Payload must be a JSON object."),
        )
        return

    try:
        event = InboundEvent.model_validate(parsed)
    except PydanticValidationError:
        await manager.send(
            conn.connection_id,
            _error("INVALID_MESSAGE", "Event is missing required fields."),
        )
        return

    if event.type not in INBOUND_EVENTS:
        await manager.send(
            conn.connection_id,
            _error("UNKNOWN_EVENT", f"Unknown event type '{event.type}'."),
        )
        return

    try:
        if event.type == EventType.PING:
            await manager.send(conn.connection_id, envelope(EventType.PONG))
            return

        if event.type == EventType.ROOM_JOIN:
            join_data = RoomJoinData.model_validate(event.data or {})
            await join_room(
                manager,
                conn,
                require_room_id(event.room_id),
                since_event_id=join_data.since_event_id,
            )
            return

        if event.type == EventType.ROOM_LEAVE:
            await leave_current_room(manager, conn)
            return

        if event.type == EventType.DM_OPEN:
            await _handle_dm_open(manager, conn, event)
            return

        if event.type == EventType.CURSOR_READ:
            await _handle_cursor_read(manager, conn, event)
            return

        if event.type == EventType.USER_TYPING:
            room_id = require_room_id(event.room_id or conn.room_id)
            _require_membership(conn, room_id, "typing")
            await manager.broadcast_room(
                room_id,
                envelope(
                    EventType.USER_TYPING,
                    {"username": conn.username},
                    room_id=room_id,
                ),
                exclude=conn.connection_id,
            )
            return

        if event.type == EventType.CHAT_MESSAGE:
            await _handle_chat_message(manager, conn, event)
            return

        if event.type == EventType.CHAT_EDIT:
            await _handle_chat_edit(manager, conn, event)
            return

        if event.type == EventType.CHAT_DELETE:
            await _handle_chat_delete(manager, conn, event)
            return
    except ValidationError as exc:
        await manager.send(conn.connection_id, _error(exc.code, exc.message))
    except MessageError as exc:
        await manager.send(conn.connection_id, _error(exc.code, exc.message))
    except RoomError as exc:
        await manager.send(conn.connection_id, _error(exc.code, exc.message))
    except Exception:
        logger.exception("WebSocket exception while handling %s", event.type)
        await manager.send(
            conn.connection_id,
            _error("INTERNAL", "The server could not handle that event."),
        )


async def socket_loop(
    websocket: WebSocket, manager: ConnectionManager, username: str
) -> None:
    try:
        username = normalize_username(username)
    except ValidationError as exc:
        await websocket.accept()
        await _safe_send(websocket, _error(exc.code, exc.message))
        await websocket.close(code=1008)
        return

    conn: Connection | None = None
    try:
        conn = await manager.connect(websocket, username)
        await manager.send(
            conn.connection_id,
            envelope(
                EventType.CONNECTION_READY,
                {
                    "connection_id": conn.connection_id,
                    "username": conn.username,
                    "online": manager.online_usernames(),
                    "rooms": await _list_rooms_payload(manager, conn.username),
                },
            ),
        )
        while True:
            raw = await websocket.receive_text()
            live = manager.get(conn.connection_id)
            if live is None:
                break
            await handle_event(manager, live, raw)
    except WebSocketDisconnect:
        logger.info("client disconnected (browser close)")
    except Exception:
        logger.exception("WebSocket exception")
    finally:
        if conn is not None:
            leftover = manager.get(conn.connection_id)
            room_id = leftover.room_id if leftover else None
            username_left = leftover.username if leftover else username
            gone = await manager.disconnect(conn.connection_id)
            target_room = room_id or (gone.room_id if gone else None)
            if target_room and not manager.username_still_in_room(
                username_left, target_room
            ):
                await manager.broadcast_room(
                    target_room,
                    envelope(
                        EventType.USER_LEFT,
                        {
                            "username": username_left,
                            "members": manager.usernames_in_room(target_room),
                        },
                        room_id=target_room,
                    ),
                )
