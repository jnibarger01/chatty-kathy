"""Shared validation limits. Keep transport, services, and tests aligned."""

from __future__ import annotations

import re

USERNAME_MIN = 2
USERNAME_MAX = 24
USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _.-]{0,22}[A-Za-z0-9]$|^[A-Za-z0-9]{2,24}$")

ROOM_ID_MIN = 2
ROOM_ID_MAX = 32
ROOM_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,31}$")

ROOM_NAME_MIN = 2
ROOM_NAME_MAX = 40

MESSAGE_MIN = 1
MESSAGE_MAX = 2000

# Reject oversized frames before JSON parse so a noisy client cannot
# pin the event loop on huge payloads.
MAX_FRAME_BYTES = 8_192

HISTORY_LIMIT = 80
TYPING_TTL_MS = 2500

DEFAULT_ROOMS: tuple[tuple[str, str, str], ...] = (
    ("general", "General", "Day-to-day conversation"),
    ("random", "Random", "Off-topic asides and detours"),
    ("development", "Development", "Architecture, bugs, and sockets"),
)
