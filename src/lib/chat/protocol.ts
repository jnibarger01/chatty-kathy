/** Mirrors `app/websocket/events.py`. Keep these strings identical. */
export const EventType = {
  CONNECTION_READY: "connection.ready",
  CHAT_MESSAGE: "chat.message",
  CHAT_EDIT: "chat.edit",
  CHAT_EDITED: "chat.edited",
  CHAT_DELETE: "chat.delete",
  CHAT_DELETED: "chat.deleted",
  USER_JOINED: "user.joined",
  USER_LEFT: "user.left",
  USER_TYPING: "user.typing",
  ROOM_JOIN: "room.join",
  ROOM_LEAVE: "room.leave",
  ROOM_JOINED: "room.joined",
  ROOM_LEFT: "room.left",
  ROOM_CREATED: "room.created",
  DM_OPEN: "dm.open",
  CURSOR_READ: "cursor.read",
  UNREAD_UPDATE: "unread.update",
  ERROR: "error",
  PING: "ping",
  PONG: "pong",
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type Room = {
  id: string;
  name: string;
  topic: string;
  created_at: string;
  member_count: number;
  kind?: "channel" | "dm" | string;
  peer?: string | null;
  unread_count?: number;
  last_event_id?: number;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  username: string;
  message: string;
  created_at: string;
  edited_at?: string | null;
  deleted?: boolean;
  event_id?: number;
};

export type ProtocolEvent = {
  type: string;
  room_id?: string;
  event_id?: number;
  data: Record<string, unknown>;
  at: number;
  direction: "in" | "out";
};

export type ServerEvent = {
  type: string;
  room_id?: string;
  event_id?: number;
  data: Record<string, unknown>;
};

export function wsUrl(username: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ username });
  return `${proto}//${window.location.host}/ws?${params.toString()}`;
}

export function isDirect(room: Room | undefined): boolean {
  return room?.kind === "dm";
}

export function roomLabel(room: Room | undefined): string {
  if (!room) return "room";
  if (room.kind === "dm") return room.peer || room.name;
  return room.name;
}
