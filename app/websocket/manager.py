"""In-memory connection and room membership manager.

A WebSocket is a *persistent* connection. Unlike an HTTP request, the socket
lives across many events, so the server must remember:

  connections: connection_id → Connection (socket + username + current room)
  rooms:       room_id → set of connection_ids

This process is the source of truth for *presence*. Message history lives in
SQLite. If you run more than one Uvicorn worker / host, these dicts are not
shared — that is the scaling limit documented in the README. A future
deployment would publish the same events through Redis pub/sub and keep
this class as the per-process fan-out adapter.

Concurrency assumptions
-----------------------
* Mutations of `_connections` and `_rooms` happen under `_lock`.
* We copy the target list, *release the lock*, then await `send_json`.
  Holding the lock across a network write would stall every other join,
  leave, and broadcast on this event loop.
* A send that fails marks the connection stale; cleanup runs after the
  fan-out, never while iterating a live set.
* The event loop is single-threaded: await points are the only interleaving.
  There are no threads and no blocking I/O on this path.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from starlette.websockets import WebSocket

logger = logging.getLogger("relay.ws")


@dataclass
class Connection:
    websocket: WebSocket
    username: str
    connection_id: str = field(default_factory=lambda: str(uuid4()))
    room_id: str | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._connections: dict[str, Connection] = {}
        self._rooms: dict[str, set[str]] = {}

    async def connect(self, websocket: WebSocket, username: str) -> Connection:
        await websocket.accept()
        conn = Connection(websocket=websocket, username=username)
        async with self._lock:
            self._connections[conn.connection_id] = conn
        logger.info(
            "client connected id=%s username=%s", conn.connection_id, username
        )
        return conn

    async def disconnect(self, connection_id: str) -> Connection | None:
        """Drop a socket and remove it from its room. Idempotent."""
        async with self._lock:
            conn = self._connections.pop(connection_id, None)
            if conn is None:
                return None
            room_id = conn.room_id
            if room_id and connection_id in self._rooms.get(room_id, set()):
                self._rooms[room_id].discard(connection_id)
                if not self._rooms[room_id]:
                    self._rooms.pop(room_id, None)
            conn.room_id = None
        logger.info(
            "client disconnected id=%s username=%s", connection_id, conn.username
        )
        return conn

    async def join_room(self, connection_id: str, room_id: str) -> str | None:
        """Move the connection into `room_id`. Returns the previous room, if any."""
        async with self._lock:
            conn = self._connections.get(connection_id)
            if conn is None:
                return None
            previous = conn.room_id
            if previous == room_id:
                return previous
            if previous:
                members = self._rooms.get(previous)
                if members is not None:
                    members.discard(connection_id)
                    if not members:
                        self._rooms.pop(previous, None)
            self._rooms.setdefault(room_id, set()).add(connection_id)
            conn.room_id = room_id
        logger.info(
            "room joined id=%s username=%s room=%s",
            connection_id,
            conn.username,
            room_id,
        )
        return previous

    async def leave_room(self, connection_id: str) -> str | None:
        async with self._lock:
            conn = self._connections.get(connection_id)
            if conn is None or conn.room_id is None:
                return None
            room_id = conn.room_id
            members = self._rooms.get(room_id)
            if members is not None:
                members.discard(connection_id)
                if not members:
                    self._rooms.pop(room_id, None)
            conn.room_id = None
        logger.info(
            "room left id=%s username=%s room=%s",
            connection_id,
            conn.username,
            room_id,
        )
        return room_id

    def get(self, connection_id: str) -> Connection | None:
        return self._connections.get(connection_id)

    def room_of(self, connection_id: str) -> str | None:
        conn = self._connections.get(connection_id)
        return conn.room_id if conn else None

    def usernames_in_room(self, room_id: str) -> list[str]:
        names: list[str] = []
        seen: set[str] = set()
        for cid in self._rooms.get(room_id, set()):
            conn = self._connections.get(cid)
            if conn and conn.username not in seen:
                seen.add(conn.username)
                names.append(conn.username)
        names.sort(key=str.lower)
        return names

    def username_still_in_room(
        self, username: str, room_id: str, *, exclude: str | None = None
    ) -> bool:
        for cid in self._rooms.get(room_id, set()):
            if cid == exclude:
                continue
            conn = self._connections.get(cid)
            if conn and conn.username == username:
                return True
        return False

    def online_usernames(self) -> list[str]:
        names = sorted({c.username for c in self._connections.values()}, key=str.lower)
        return names

    def member_count(self, room_id: str) -> int:
        return len(self._rooms.get(room_id, set()))

    def member_counts(self) -> dict[str, int]:
        return {room_id: len(members) for room_id, members in self._rooms.items()}

    def connections_for(
        self, username: str, *, exclude: str | None = None
    ) -> list[Connection]:
        return [
            conn
            for cid, conn in self._connections.items()
            if conn.username == username and cid != exclude
        ]

    def snapshot_connections(self) -> list[Connection]:
        return list(self._connections.values())

    async def send_user(
        self,
        username: str,
        payload: dict[str, Any],
        *,
        exclude: str | None = None,
        exclude_room: str | None = None,
    ) -> int:
        """Unicast to every live socket owned by `username`.

        Chat rooms fan out to a set of connection ids. Direct messages need
        the other shape: one identity, however many tabs they have open,
        even if they are currently looking at a different room.
        """
        async with self._lock:
            targets = [
                conn
                for cid, conn in self._connections.items()
                if conn.username == username
                and cid != exclude
                and (exclude_room is None or conn.room_id != exclude_room)
            ]
        stale: list[str] = []
        delivered = 0
        for conn in targets:
            ok = await self._send_ws(conn.websocket, payload)
            if ok:
                delivered += 1
            else:
                stale.append(conn.connection_id)
        for cid in stale:
            await self.disconnect(cid)
        return delivered

    async def send(self, connection_id: str, payload: dict[str, Any]) -> bool:
        conn = self._connections.get(connection_id)
        if conn is None:
            return False
        return await self._send_ws(conn.websocket, payload)

    async def broadcast_room(
        self,
        room_id: str,
        payload: dict[str, Any],
        *,
        exclude: str | None = None,
    ) -> None:
        async with self._lock:
            targets = [
                self._connections[cid]
                for cid in self._rooms.get(room_id, set())
                if cid != exclude and cid in self._connections
            ]
        stale: list[str] = []
        for conn in targets:
            ok = await self._send_ws(conn.websocket, payload)
            if not ok:
                stale.append(conn.connection_id)
        for cid in stale:
            await self.disconnect(cid)

    async def broadcast_all(
        self, payload: dict[str, Any], *, exclude: str | None = None
    ) -> None:
        async with self._lock:
            targets = [
                conn
                for cid, conn in self._connections.items()
                if cid != exclude
            ]
        stale: list[str] = []
        for conn in targets:
            ok = await self._send_ws(conn.websocket, payload)
            if not ok:
                stale.append(conn.connection_id)
        for cid in stale:
            await self.disconnect(cid)

    @staticmethod
    async def _send_ws(websocket: WebSocket, payload: dict[str, Any]) -> bool:
        try:
            await websocket.send_json(payload)
            return True
        except Exception:
            logger.warning("send failed; socket is stale")
            return False
