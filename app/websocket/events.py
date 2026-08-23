"""Canonical event names for the application-level WebSocket protocol.

Both the Python server and the TypeScript client must use these strings.
Never scatter raw event names through handlers — import from here.
"""

from __future__ import annotations

from typing import Any


class EventType:
    CONNECTION_READY = "connection.ready"
    CHAT_MESSAGE = "chat.message"
    CHAT_EDIT = "chat.edit"
    CHAT_EDITED = "chat.edited"
    CHAT_DELETE = "chat.delete"
    CHAT_DELETED = "chat.deleted"
    USER_JOINED = "user.joined"
    USER_LEFT = "user.left"
    USER_TYPING = "user.typing"
    ROOM_JOIN = "room.join"
    ROOM_LEAVE = "room.leave"
    ROOM_JOINED = "room.joined"
    ROOM_LEFT = "room.left"
    ROOM_CREATED = "room.created"
    DM_OPEN = "dm.open"
    CURSOR_READ = "cursor.read"
    UNREAD_UPDATE = "unread.update"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"


# Client → server event types we accept.
INBOUND_EVENTS = frozenset(
    {
        EventType.CHAT_MESSAGE,
        EventType.CHAT_EDIT,
        EventType.CHAT_DELETE,
        EventType.ROOM_JOIN,
        EventType.ROOM_LEAVE,
        EventType.USER_TYPING,
        EventType.DM_OPEN,
        EventType.CURSOR_READ,
        EventType.PING,
    }
)


def envelope(
    event_type: str,
    data: dict[str, Any] | None = None,
    *,
    room_id: str | None = None,
    event_id: int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"type": event_type, "data": data or {}}
    if room_id is not None:
        payload["room_id"] = room_id
    if event_id is not None:
        payload["event_id"] = event_id
    return payload
