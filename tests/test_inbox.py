from __future__ import annotations

from fastapi.testclient import TestClient


def _ready(ws):
    event = ws.receive_json()
    assert event["type"] == "connection.ready"
    return event


def _join(ws, room_id: str, since: int | None = None):
    data = {} if since is None else {"since_event_id": since}
    ws.send_json({"type": "room.join", "room_id": room_id, "data": data})
    event = ws.receive_json()
    if event["type"] == "room.left":
        event = ws.receive_json()
    assert event["type"] == "room.joined"
    return event


def _send(ws, room_id: str, body: str) -> dict:
    ws.send_json({"type": "chat.message", "room_id": room_id, "data": {"message": body}})
    event = ws.receive_json()
    assert event["type"] == "chat.message"
    return event


def test_unread_bumps_after_you_leave(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        assert a.receive_json()["type"] == "user.joined"

        b.send_json({"type": "room.leave", "room_id": "general", "data": {}})
        assert b.receive_json()["type"] == "room.left"
        assert a.receive_json()["type"] == "user.left"
        _join(b, "random")

        _send(a, "general", "you should see a badge")
        unread = b.receive_json()
        assert unread["type"] == "unread.update"
        assert unread["data"]["room_id"] == "general"
        assert unread["data"]["unread_count"] == 1

        b.send_json({"type": "ping", "data": {}})
        assert b.receive_json()["type"] == "pong"


def test_joining_clears_unread_and_shows_divider_cursor(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()
        b.send_json({"type": "room.leave", "data": {}})
        b.receive_json()
        a.receive_json()
        _join(b, "random")

        sent = _send(a, "general", "new since you left")
        assert b.receive_json()["type"] == "unread.update"

        joined = _join(b, "general")
        a.receive_json()  # user.joined
        assert joined["data"]["room"]["unread_count"] == 0
        assert joined["data"]["first_unread_event_id"] == sent["data"]["event_id"]


def test_never_visited_room_is_not_unread(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "random")
        _send(a, "general", "alex never opened general")
        b.send_json({"type": "ping", "data": {}})
        assert b.receive_json()["type"] == "pong"


def test_catchup_returns_only_messages_after_cursor(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        _join(ws, "general")
        first = _send(ws, "general", "old")
        second = _send(ws, "general", "new")
        joined = _join(ws, "general", since=first["data"]["event_id"])
        assert joined["data"]["mode"] == "catchup"
        bodies = [item["message"] for item in joined["data"]["messages"]]
        assert "old" not in bodies
        assert "new" in bodies
        assert second["data"]["id"] in {item["id"] for item in joined["data"]["messages"]}


def test_rest_messages_since_event_id(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        _join(ws, "general")
        first = _send(ws, "general", "alpha")
        _send(ws, "general", "beta")
    since = first["data"]["event_id"]
    rows = client.get(f"/api/rooms/general/messages?since={since}").json()
    assert [row["message"] for row in rows] == ["beta"]


def test_open_dm_unicasts_to_peer(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b, client.websocket_connect("/ws?username=Sam") as c:
        _ready(a)
        _ready(b)
        _ready(c)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()
        _join(c, "random")

        a.send_json({"type": "dm.open", "data": {"username": "Alex"}})
        left = a.receive_json()
        if left["type"] == "room.left":
            joined = a.receive_json()
        else:
            joined = left
        assert joined["type"] == "room.joined"
        assert joined["data"]["room"]["kind"] == "dm"
        assert joined["data"]["room"]["peer"] == "Alex"
        dm_id = joined["room_id"]

        b_left = b.receive_json()
        assert b_left["type"] == "user.left"
        b_created = b.receive_json()
        assert b_created["type"] == "room.created"
        assert b_created["data"]["id"] == dm_id
        assert b_created["data"]["peer"] == "Jace"

        sent = _send(a, dm_id, "secret ping")
        incoming = b.receive_json()
        assert incoming["type"] == "chat.message"
        assert incoming["data"]["message"] == "secret ping"
        assert incoming["data"]["id"] == sent["data"]["id"]
        unread = b.receive_json()
        assert unread["type"] == "unread.update"
        assert unread["data"]["room_id"] == dm_id
        assert unread["data"]["unread_count"] == 1

        c.send_json({"type": "ping", "data": {}})
        assert c.receive_json()["type"] == "pong"

        listed = {room["id"] for room in client.get("/api/rooms").json()}
        assert dm_id not in listed


def test_cannot_dm_yourself(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        ws.send_json({"type": "dm.open", "data": {"username": "Jace"}})
        error = ws.receive_json()
        assert error["type"] == "error"
        assert error["data"]["code"] == "CANNOT_DM_SELF"


def test_stranger_cannot_join_someone_elses_dm(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b, client.websocket_connect("/ws?username=Sam") as c:
        _ready(a)
        _ready(b)
        _ready(c)
        a.send_json({"type": "dm.open", "data": {"username": "Alex"}})
        joined = a.receive_json()
        if joined["type"] == "room.left":
            joined = a.receive_json()
        assert joined["type"] == "room.joined"
        dm_id = joined["room_id"]
        created = b.receive_json()
        assert created["type"] == "room.created"

        c.send_json({"type": "room.join", "room_id": dm_id, "data": {}})
        error = c.receive_json()
        assert error["data"]["code"] == "FORBIDDEN"


def test_cursor_read_clears_badge(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()
        b.send_json({"type": "room.leave", "data": {}})
        b.receive_json()
        a.receive_json()
        _join(b, "random")
        sent = _send(a, "general", "badge")
        assert b.receive_json()["type"] == "unread.update"
        b.send_json(
            {
                "type": "cursor.read",
                "room_id": "general",
                "data": {"last_event_id": sent["data"]["event_id"]},
            }
        )
        cleared = b.receive_json()
        assert cleared["type"] == "unread.update"
        assert cleared["data"]["unread_count"] == 0
