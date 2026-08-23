from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    db = tmp_path / "relay.db"
    monkeypatch.setenv("CHAT_DATABASE_URL", f"sqlite+aiosqlite:///{db}")
    application = create_app()
    with TestClient(application) as test_client:
        yield test_client


def connect_ws(client: TestClient, username: str, room: str | None = None):
    params = f"username={username}"
    ws = client.websocket_connect(f"/ws?{params}")
    ready = ws.receive_json()
    assert ready["type"] == "connection.ready"
    if room:
        ws.send_json({"type": "room.join", "room_id": room, "data": {}})
        joined = ws.receive_json()
        assert joined["type"] == "room.joined"
        return ws, ready, joined
    return ws, ready, None
