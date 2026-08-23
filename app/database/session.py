"""Async engine/session lifecycle.

WebSocket handlers never call blocking sqlite3. All persistence goes through
this async session factory so a slow disk write cannot stall other sockets.
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.database.base import Base
from app.models import LastRead, Message, Meta, Room  # noqa: F401

logger = logging.getLogger("relay.db")

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def database_url() -> str:
    override = os.environ.get("CHAT_DATABASE_URL")
    if override:
        return override
    data_dir = Path(os.environ.get("CHAT_DATA_DIR", "data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    # Four slashes after the scheme for an absolute path; three + relative
    # works when cwd is the project root.
    db_path = (data_dir / "relay.db").resolve()
    return f"sqlite+aiosqlite:///{db_path}"


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("Database is not initialized")
    return _session_factory


def _column_names(sync_conn, table: str) -> set[str]:
    rows = sync_conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def _add_missing_sqlite_columns(sync_conn) -> None:
    """create_all will not ALTER existing SQLite tables. Add new columns."""
    room_cols = _column_names(sync_conn, "rooms")
    if room_cols:
        if "kind" not in room_cols:
            sync_conn.execute(
                text("ALTER TABLE rooms ADD COLUMN kind VARCHAR(16) DEFAULT 'channel'")
            )
            sync_conn.execute(text("UPDATE rooms SET kind = 'channel' WHERE kind IS NULL"))
            logger.info("migrated rooms.kind")
        if "peer_a" not in room_cols:
            sync_conn.execute(text("ALTER TABLE rooms ADD COLUMN peer_a VARCHAR(24)"))
            logger.info("migrated rooms.peer_a")
        if "peer_b" not in room_cols:
            sync_conn.execute(text("ALTER TABLE rooms ADD COLUMN peer_b VARCHAR(24)"))
            logger.info("migrated rooms.peer_b")

    names = _column_names(sync_conn, "messages")
    if "edited_at" not in names:
        sync_conn.execute(text("ALTER TABLE messages ADD COLUMN edited_at DATETIME"))
        logger.info("migrated messages.edited_at")
    if "deleted_at" not in names:
        sync_conn.execute(text("ALTER TABLE messages ADD COLUMN deleted_at DATETIME"))
        logger.info("migrated messages.deleted_at")
    if "seq" not in names:
        sync_conn.execute(text("ALTER TABLE messages ADD COLUMN seq INTEGER"))
        rows = sync_conn.execute(
            text("SELECT id FROM messages ORDER BY created_at ASC, id ASC")
        ).fetchall()
        for index, (message_id,) in enumerate(rows, start=1):
            sync_conn.execute(
                text("UPDATE messages SET seq = :seq WHERE id = :id"),
                {"seq": index, "id": message_id},
            )
        max_seq = len(rows)
        existing = sync_conn.execute(
            text("SELECT value FROM meta WHERE key = 'event_id'")
        ).fetchone()
        if existing is None:
            sync_conn.execute(
                text("INSERT INTO meta (key, value) VALUES ('event_id', :v)"),
                {"v": max_seq},
            )
        else:
            sync_conn.execute(
                text("UPDATE meta SET value = :v WHERE key = 'event_id' AND value < :v"),
                {"v": max_seq},
            )
        sync_conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_messages_seq ON messages (seq)")
        )
        logger.info("migrated messages.seq count=%s", max_seq)


async def init_engine() -> None:
    """Create (or recreate) the engine from the current env URL."""
    global _engine, _session_factory
    await shutdown_engine()
    url = database_url()
    kwargs: dict = {"echo": False, "future": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    _engine = create_async_engine(url, **kwargs)
    _session_factory = async_sessionmaker(
        _engine, expire_on_commit=False, class_=AsyncSession
    )
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if url.startswith("sqlite"):
            await conn.run_sync(_add_missing_sqlite_columns)
    logger.info("database ready")


async def shutdown_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def session_scope() -> AsyncIterator[AsyncSession]:
    factory = get_session_factory()
    async with factory() as session:
        yield session
