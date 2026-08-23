from __future__ import annotations

from app.core.limits import USERNAME_MAX, USERNAME_MIN, USERNAME_RE, ROOM_ID_RE


class ValidationError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def normalize_username(raw: str) -> str:
    cleaned = " ".join((raw or "").replace("\x00", "").split())
    if len(cleaned) < USERNAME_MIN:
        raise ValidationError(
            "INVALID_USERNAME",
            f"Username must be at least {USERNAME_MIN} characters.",
        )
    if len(cleaned) > USERNAME_MAX:
        raise ValidationError(
            "INVALID_USERNAME",
            f"Username must be at most {USERNAME_MAX} characters.",
        )
    if not USERNAME_RE.match(cleaned):
        raise ValidationError(
            "INVALID_USERNAME",
            "Use letters, numbers, spaces, dots, underscores, or hyphens.",
        )
    return cleaned


def require_room_id(room_id: str | None) -> str:
    if not room_id or not ROOM_ID_RE.match(room_id):
        raise ValidationError("INVALID_ROOM", "That room id is not valid.")
    return room_id
