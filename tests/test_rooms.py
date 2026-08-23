from __future__ import annotations

from fastapi.testclient import TestClient


def test_lists_default_rooms(client: TestClient) -> None:
    response = client.get("/api/rooms")
    assert response.status_code == 200
    rooms = response.json()
    ids = {room["id"] for room in rooms}
    assert ids >= {"general", "random", "development"}


def test_create_room(client: TestClient) -> None:
    response = client.post("/api/rooms", json={"name": "Design Review", "topic": "UI"})
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == "design-review"
    assert body["name"] == "Design Review"

    listed = client.get("/api/rooms").json()
    assert any(room["id"] == "design-review" for room in listed)


def test_create_room_conflict(client: TestClient) -> None:
    first = client.post("/api/rooms", json={"name": "general"})
    assert first.status_code == 409


def test_create_room_rejects_blank(client: TestClient) -> None:
    response = client.post("/api/rooms", json={"name": " "})
    assert response.status_code == 422


def test_message_history_empty_then_populated(client: TestClient) -> None:
    empty = client.get("/api/rooms/general/messages")
    assert empty.status_code == 200
    assert empty.json() == []

    with client.websocket_connect("/ws?username=Jace") as ws:
        assert ws.receive_json()["type"] == "connection.ready"
        ws.send_json({"type": "room.join", "room_id": "general", "data": {}})
        assert ws.receive_json()["type"] == "room.joined"
        ws.send_json(
            {"type": "chat.message", "room_id": "general", "data": {"message": "hello history"}}
        )
        event = ws.receive_json()
        assert event["type"] == "chat.message"

    history = client.get("/api/rooms/general/messages").json()
    assert len(history) == 1
    assert history[0]["message"] == "hello history"
    assert history[0]["username"] == "Jace"


def test_unknown_room_history_404(client: TestClient) -> None:
    response = client.get("/api/rooms/does-not-exist/messages")
    assert response.status_code == 404
