"""FastAPI application factory.

HTTP is used for resources that have a natural request/response shape
(health, room CRUD, message history). The `/ws` endpoint is a long-lived
socket: FastAPI accepts it, then `socket_loop` owns the connection until
the browser closes it or the process dies.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.health import router as health_router
from app.api.rooms import router as rooms_router
from app.core.logging import configure_logging
from app.database.session import get_session_factory, init_engine, shutdown_engine
from app.services.rooms import seed_default_rooms
from app.websocket.handlers import socket_loop
from app.websocket.manager import ConnectionManager

logger = logging.getLogger("relay")
STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    await init_engine()
    factory = get_session_factory()
    async with factory() as session:
        await seed_default_rooms(session)
    logger.info("relay ready")
    yield
    await shutdown_engine()


def create_app() -> FastAPI:
    application = FastAPI(
        title="Relay",
        version="1.0.0",
        description="Real-time room chat over FastAPI WebSockets.",
        lifespan=lifespan,
    )
    application.state.manager = ConnectionManager()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(rooms_router)

    @application.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html", media_type="text/html")

    @application.websocket("/ws")
    async def websocket_endpoint(
        websocket: WebSocket,
        username: str = Query(default="", max_length=32),
    ) -> None:
        # Origin is logged so students can see where a restriction would hook in.
        origin = websocket.headers.get("origin", "")
        logger.info("websocket handshake origin=%s", origin or "-")
        manager: ConnectionManager = websocket.app.state.manager
        await socket_loop(websocket, manager, username)

    application.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    return application


app = create_app()
