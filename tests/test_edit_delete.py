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


def _send(ws, room_id: str, body: str) -> dict:
    ws.send_json({"type": "chat.message", "room_id": room_id, "data": {"message": body}})
    event = ws.receive_json()
    assert event["type"] == "chat.message"
    return event


def test_author_can_edit_and_room_sees_it(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()  # Alex joined

        sent = _send(a, "general", "hello world")
        echoed = b.receive_json()
        assert echoed["data"]["id"] == sent["data"]["id"]
        assert echoed["data"]["edited_at"] is None
        assert echoed["data"]["deleted"] is False

        a.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": sent["data"]["id"], "message": "hello everyone"},
            }
        )
        edited_a = a.receive_json()
        edited_b = b.receive_json()
        assert edited_a["type"] == "chat.edited"
        assert edited_b["type"] == "chat.edited"
        assert edited_a["data"]["message"] == "hello everyone"
        assert edited_b["data"]["id"] == sent["data"]["id"]
        assert edited_a["data"]["edited_at"]
        assert edited_a["data"]["deleted"] is False


def test_cannot_edit_someone_elses_message(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()

        sent = _send(a, "general", "mine")
        b.receive_json()

        b.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": sent["data"]["id"], "message": "hijacked"},
            }
        )
        error = b.receive_json()
        assert error["type"] == "error"
        assert error["data"]["code"] == "NOT_AUTHOR"

        a.send_json({"type": "ping", "data": {}})
        assert a.receive_json()["type"] == "pong"


def test_author_can_delete_and_history_keeps_tombstone(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()

        sent = _send(a, "general", "please forget this")
        b.receive_json()

        a.send_json(
            {
                "type": "chat.delete",
                "room_id": "general",
                "data": {"id": sent["data"]["id"]},
            }
        )
        deleted_a = a.receive_json()
        deleted_b = b.receive_json()
        assert deleted_a["type"] == "chat.deleted"
        assert deleted_b["type"] == "chat.deleted"
        assert deleted_a["data"]["deleted"] is True
        assert deleted_a["data"]["message"] == ""
        assert deleted_b["data"]["id"] == sent["data"]["id"]

    history = client.get("/api/rooms/general/messages").json()
    assert len(history) == 1
    assert history[0]["deleted"] is True
    assert history[0]["message"] == ""


def test_cannot_delete_someone_elses_message(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "general")
        a.receive_json()

        sent = _send(a, "general", "stay")
        b.receive_json()
        b.send_json(
            {
                "type": "chat.delete",
                "room_id": "general",
                "data": {"id": sent["data"]["id"]},
            }
        )
        error = b.receive_json()
        assert error["data"]["code"] == "NOT_AUTHOR"


def test_cannot_edit_a_deleted_message(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        _join(ws, "general")
        sent = _send(ws, "general", "temporary")
        ws.send_json(
            {
                "type": "chat.delete",
                "room_id": "general",
                "data": {"id": sent["data"]["id"]},
            }
        )
        assert ws.receive_json()["type"] == "chat.deleted"
        ws.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": sent["data"]["id"], "message": "revive"},
            }
        )
        error = ws.receive_json()
        assert error["data"]["code"] == "ALREADY_DELETED"


def test_edit_rejects_empty_body(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        _join(ws, "general")
        sent = _send(ws, "general", "keep me")
        ws.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": sent["data"]["id"], "message": "   "},
            }
        )
        error = ws.receive_json()
        assert error["data"]["code"] == "INVALID_MESSAGE"


def test_edit_is_room_scoped(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a, client.websocket_connect(
        "/ws?username=Alex"
    ) as b:
        _ready(a)
        _ready(b)
        _join(a, "general")
        _join(b, "random")
        sent = _send(a, "general", "only general")
        a.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": sent["data"]["id"], "message": "still only general"},
            }
        )
        assert a.receive_json()["type"] == "chat.edited"
        b.send_json({"type": "ping", "data": {}})
        assert b.receive_json()["type"] == "pong"


def test_must_join_before_edit(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        ws.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": "00000000-0000-0000-0000-000000000000", "message": "nope"},
            }
        )
        error = ws.receive_json()
        assert error["data"]["code"] == "NOT_IN_ROOM"


def test_unknown_message_edit(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as ws:
        _ready(ws)
        _join(ws, "general")
        ws.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": "00000000-0000-0000-0000-000000000000", "message": "ghost"},
            }
        )
        error = ws.receive_json()
        assert error["data"]["code"] == "NOT_FOUND"


def test_history_loads_edits_for_late_joiner(client: TestClient) -> None:
    with client.websocket_connect("/ws?username=Jace") as a:
        _ready(a)
        _join(a, "general")
        sent = _send(a, "general", "draft")
        a.send_json(
            {
                "type": "chat.edit",
                "room_id": "general",
                "data": {"id": sent["data"]["id"], "message": "final"},
            }
        )
        assert a.receive_json()["type"] == "chat.edited"

    with client.websocket_connect("/ws?username=Alex") as b:
        _ready(b)
        joined = _join(b, "general")
        bodies = joined["data"]["messages"]
        assert bodies[-1]["message"] == "final"
        assert bodies[-1]["edited_at"]
        assert bodies[-1]["deleted"] is False
