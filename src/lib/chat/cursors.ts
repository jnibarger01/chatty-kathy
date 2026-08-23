/** Persist last-seen event ids so a reconnect can catch up instead of refetching. */

const prefix = "relay.seq.";

export function readCursors(username: string): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(prefix + username);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCursor(username: string, roomId: string, eventId: number) {
  if (!eventId) return;
  try {
    const current = readCursors(username);
    const prev = current[roomId] ?? 0;
    if (eventId <= prev) return;
    current[roomId] = eventId;
    sessionStorage.setItem(prefix + username, JSON.stringify(current));
  } catch {
    /* private mode */
  }
}

export function clearCursors(username: string) {
  try {
    sessionStorage.removeItem(prefix + username);
  } catch {
    /* ignore */
  }
}
