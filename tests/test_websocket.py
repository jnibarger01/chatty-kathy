from __future__ import annotations

from fastapi.testclient import TestClient


def _ready(ws):
    event = ws.receive_json()
    assert event["type"] == "connection.ready"
    return event


def _join(ws, room_id: str):
    ws.send_json({"type": "room.join", "room_id": room_id, "data": {}})
    event = ws.receive_json()
    assert event["type"] == "room.joined"
    return event


def test_client_connection(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Ada") as ws:
        ready = _ready(ws)
        assert ready["data"]["username"] == "Ada"
        assert ready["data"]["connection_id"]
        ids = {room["id"] for room in ready["data"]["rooms"]}
        assert "general" in ids


def test_invalid_username_closes(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=x") as ws:
        error = ws.receive_json()
        assert error["type"] == "error"
        assert error["data"]["code"] == "INVALID_USERNAME"


def test_send_and_broadcast(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        # Alex joining general produces user.joined on Jace
        _join(b, "general")
        joined_notice = a.receive_json()
        assert joined_notice["type"] == "user.joined"
        assert joined_notice["data"]["username"] == "Alex"

        a.send_json(
            {"type": "chat.message", "room_id": "general", "data": {"message": "Hello world"}}
        )
        from_a = a.receive_json()
        from_b = b.receive_json()
        assert from_a["type"] == "chat.message"
        assert from_b["type"] == "chat.message"
        assert from_a["data"]["message"] == "Hello world"
        assert from_b["data"]["id"] == from_a["data"]["id"]
        assert from_b["data"]["username"] == "Jace"


def test_room_isolation(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "random")
        a.send_json(
            {"type": "chat.message", "room_id": "general", "data": {"message": "only general"}}
        )
        echoed = a.receive_json()
        assert echoed["data"]["message"] == "only general"
        # Alex is in another room; nothing should arrive. Ping to confirm the
        # socket is still idle of chat events.
        b.send_json({"type": "ping", "data": {}})
        event = b.receive_json()
        assert event["type"] == "pong"


def test_malformed_events_do_not_close(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Sam") as ws:
        _ready(ws)
        _join(ws, "general")

        ws.send_text("not-json")
        err = ws.receive_json()
        assert err["type"] == "error"
        assert err["data"]["code"] == "INVALID_JSON"

        ws.send_json({"type": "does.not.exist", "data": {}})
        err = ws.receive_json()
        assert err["data"]["code"] == "UNKNOWN_EVENT"

        ws.send_json({"type": "chat.message", "room_id": "general", "data": {"message": "   "}})
        err = ws.receive_json()
        assert err["data"]["code"] == "INVALID_MESSAGE"

        ws.send_json(
            {"type": "chat.message", "room_id": "general", "data": {"message": "still here"}}
        )
        ok = ws.receive_json()
        assert ok["type"] == "chat.message"


def test_join_leave_notifications(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "development")
        _join(b, "development")
        notice = a.receive_json()
        assert notice["type"] == "user.joined"
        assert notice["data"]["username"] == "Alex"
        assert "Alex" in notice["data"]["members"]

        b.send_json({"type": "room.leave", "room_id": "development", "data": {}})
        left_ack = b.receive_json()
        assert left_ack["type"] == "room.left"
        left = a.receive_json()
        assert left["type"] == "user.left"
        assert left["data"]["username"] == "Alex"
        assert "Alex" not in left["data"]["members"]


def test_disconnect_cleanup(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a:
        _ready(a)
        with client.websocket_connect("/ws?username=Alex") as b:
            _ready(b)
            _join(a, "general")
            _join(b, "general")
            notice = a.receive_json()
            assert notice["type"] == "user.joined"
        left = a.receive_json()
        assert left["type"] == "user.left"
        assert left["data"]["username"] == "Alex"


def test_typing_is_ephemeral_and_room_scoped(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b, client.websocket_connect("/ws?username=Sam") as c:
        _ready(a)
        _ready(b)
        _ready(c)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()  # Alex joined
        _join(c, "random")

        a.send_json({"type": "user.typing", "room_id": "general", "data": {}})
        typing = b.receive_json()
        assert typing["type"] == "user.typing"
        assert typing["data"]["username"] == "Jace"

        c.send_json({"type": "ping", "data": {}})
        assert c.receive_json()["type"] == "pong"


def test_history_loaded_on_join(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a:
        _ready(a)
        _join(a, "general")
        a.send_json(
            {"type": "chat.message", "room_id": "general", "data": {"message": "persisted"}}
        )
        a.receive_json()

    with client.websocket_connect("/ws?username=Alex") as b:
        _ready(b)
        joined = _join(b, "general")
        bodies = [m["message"] for m in joined["data"]["messages"]]
        assert "persisted" in bodies


def test_blank_username_rejected(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=%20%20") as ws:
        error = ws.receive_json()
        assert error["type"] == "error"


def test_unknown_room_join(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        ws.send_json({"type": "room.join", "room_id": "nope", "data": {}})
        error = ws.receive_json()
        assert error["type"] == "error"
        assert error["data"]["code"] == "INVALID_ROOM"


def test_room_created_broadcast(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        response = client.post("/api/rooms", json={"name": "Ops"})
        assert response.status_code == 201
        event = ws.receive_json()
        assert event["type"] == "room.created"
        assert event["data"]["id"] == "ops"
