import { readCursors, writeCursor } from "./cursors";
import {
  EventType,
  type ChatMessage,
  type Room,
  type ServerEvent,
  wsUrl,
} from "./protocol";
import { useChatStore } from "./store";

const MIN_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;

type SocketHandle = {
  join: (roomId: string) => void;
  leave: () => void;
  sendMessage: (roomId: string, message: string) => void;
  editMessage: (roomId: string, id: string, message: string) => void;
  deleteMessage: (roomId: string, id: string) => void;
  openDirect: (username: string) => void;
  markRead: (roomId: string, lastEventId: number) => void;
  typing: (roomId: string) => void;
  disconnect: () => void;
};

function record(direction: "in" | "out", payload: ServerEvent) {
  useChatStore.getState().pushEvent({
    type: payload.type,
    room_id: payload.room_id,
    event_id: payload.event_id,
    data: payload.data ?? {},
    at: Date.now(),
    direction,
  });
}

function asRoom(value: unknown): Room | null {
  if (!value || typeof value !== "object") return null;
  const room = value as Room;
  if (typeof room.id !== "string" || typeof room.name !== "string") return null;
  return room;
}

function asMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.room_id !== "string" ||
    typeof raw.username !== "string" ||
    typeof raw.message !== "string"
  ) {
    return null;
  }
  return {
    id: raw.id,
    room_id: raw.room_id,
    username: raw.username,
    message: raw.message,
    created_at: typeof raw.created_at === "string" ? raw.created_at : "",
    edited_at: typeof raw.edited_at === "string" ? raw.edited_at : null,
    deleted: Boolean(raw.deleted),
    event_id: typeof raw.event_id === "number" ? raw.event_id : 0,
  };
}

function persistSeq(username: string, roomId: string, eventId?: number) {
  if (!eventId) return;
  writeCursor(username, roomId, eventId);
  useChatStore.getState().rememberSeq(roomId, eventId);
}

function handleInbound(username: string, event: ServerEvent) {
  const store = useChatStore.getState();
  record("in", event);
  const data = event.data ?? {};

  switch (event.type) {
    case EventType.CONNECTION_READY: {
      const rooms = Array.isArray(data.rooms)
        ? (data.rooms.map(asRoom).filter(Boolean) as Room[])
        : [];
      store.setRooms(rooms);
      store.setOnline(Array.isArray(data.online) ? (data.online as string[]) : []);
      store.setStatus("connected");
      store.setError(null);
      break;
    }
    case EventType.ROOM_JOINED: {
      const room = asRoom(data.room);
      if (room) {
        store.upsertRoom({ ...room, unread_count: 0 });
        store.setActiveRoom(room.id);
      } else if (event.room_id) {
        store.setActiveRoom(event.room_id);
        store.setUnread(event.room_id, 0);
      }
      const roomId = room?.id ?? event.room_id;
      if (roomId) {
        const history = Array.isArray(data.messages)
          ? (data.messages.map(asMessage).filter(Boolean) as ChatMessage[])
          : [];
        const members = Array.isArray(data.members) ? (data.members as string[]) : [];
        if (data.mode === "catchup") {
          store.catchupHistory(roomId, history, members);
        } else {
          store.replaceHistory(roomId, history, members);
        }
        const first =
          typeof data.first_unread_event_id === "number" ? data.first_unread_event_id : null;
        store.setFirstUnread(first);
        const latest = history.reduce((max, item) => Math.max(max, item.event_id ?? 0), 0);
        persistSeq(username, roomId, latest);
      }
      break;
    }
    case EventType.ROOM_LEFT: {
      break;
    }
    case EventType.ROOM_CREATED: {
      const room = asRoom(data);
      if (room) store.upsertRoom(room);
      break;
    }
    case EventType.CHAT_MESSAGE: {
      const message = asMessage(data);
      if (message) {
        store.appendMessage(message);
        persistSeq(username, message.room_id, message.event_id);
        const active = store.activeRoomId;
        if (active === message.room_id && message.event_id) {
          // Viewing this room: tell the server we saw it so a blip doesn't resurrect the badge.
        }
      }
      break;
    }
    case EventType.CHAT_EDITED:
    case EventType.CHAT_DELETED: {
      const message = asMessage(data);
      if (message) {
        store.patchMessage(message);
        persistSeq(username, message.room_id, message.event_id);
      }
      break;
    }
    case EventType.UNREAD_UPDATE: {
      const roomId =
        (typeof data.room_id === "string" && data.room_id) || event.room_id || "";
      const count = typeof data.unread_count === "number" ? data.unread_count : 0;
      if (roomId) store.setUnread(roomId, count);
      break;
    }
    case EventType.USER_JOINED:
    case EventType.USER_LEFT: {
      const roomId = event.room_id;
      if (roomId && Array.isArray(data.members)) {
        const names = data.members as string[];
        store.setMembers(roomId, names);
        const existing = store.rooms.find((item) => item.id === roomId);
        if (existing) store.upsertRoom({ ...existing, member_count: names.length });
      }
      break;
    }
    case EventType.USER_TYPING: {
      const roomId = event.room_id;
      const name = typeof data.username === "string" ? data.username : "";
      if (roomId && name) store.markTyping(roomId, name);
      break;
    }
    case EventType.ERROR: {
      const message =
        typeof data.message === "string" ? data.message : "Something went wrong.";
      store.setError(message);
      break;
    }
    default:
      break;
  }
}

export function connectChat(username: string): SocketHandle {
  let socket: WebSocket | null = null;
  let shouldReconnect = true;
  let backoff = MIN_BACKOFF_MS;
  let reconnectTimer: number | None = null;
  let pingTimer: number | None = null;
  let intendedRoom: string | null = useChatStore.getState().activeRoomId;

  const send = (payload: ServerEvent) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
    record("out", payload);
  };

  const sinceFor = (roomId: string): number | undefined => {
    const local = useChatStore.getState().messages[roomId];
    if (!local || local.length === 0) return undefined;
    const stored = readCursors(username)[roomId];
    const live = useChatStore.getState().lastEventIds[roomId];
    const value = Math.max(stored ?? 0, live ?? 0);
    return value > 0 ? value : undefined;
  };

  const clearTimers = () => {
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    if (pingTimer !== null) window.clearInterval(pingTimer);
    reconnectTimer = null;
    pingTimer = null;
  };

  const open = () => {
    const store = useChatStore.getState();
    store.setStatus(store.status === "idle" ? "connecting" : "reconnecting");
    socket = new WebSocket(wsUrl(username));

    socket.onopen = () => {
      backoff = MIN_BACKOFF_MS;
      store.setStatus("connected");
      pingTimer = window.setInterval(() => {
        send({ type: EventType.PING, data: {} });
      }, 25_000);
    };

    socket.onmessage = (event) => {
      let parsed: ServerEvent;
      try {
        parsed = JSON.parse(event.data) as ServerEvent;
      } catch {
        return;
      }
      handleInbound(username, parsed);
      if (parsed.type === EventType.CONNECTION_READY) {
        const room = intendedRoom ?? "general";
        intendedRoom = room;
        const since = sinceFor(room);
        send({
          type: EventType.ROOM_JOIN,
          room_id: room,
          data: since ? { since_event_id: since } : {},
        });
      }
      if (parsed.type === EventType.CHAT_MESSAGE) {
        const roomId = parsed.room_id;
        const eventId =
          parsed.event_id ??
          (typeof parsed.data?.event_id === "number" ? parsed.data.event_id : 0);
        const active = useChatStore.getState().activeRoomId;
        if (roomId && active === roomId && eventId) {
          send({
            type: EventType.CURSOR_READ,
            room_id: roomId,
            data: { last_event_id: eventId },
          });
        }
      }
    };

    socket.onclose = () => {
      clearTimers();
      if (!shouldReconnect) {
        useChatStore.getState().setStatus("disconnected");
        return;
      }
      useChatStore.getState().setStatus("reconnecting");
      reconnectTimer = window.setTimeout(() => {
        backoff = Math.min(MAX_BACKOFF_MS, backoff * 2);
        open();
      }, backoff);
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  open();

  return {
    join(roomId) {
      intendedRoom = roomId;
      const since = sinceFor(roomId);
      send({
        type: EventType.ROOM_JOIN,
        room_id: roomId,
        data: since ? { since_event_id: since } : {},
      });
    },
    leave() {
      intendedRoom = null;
      send({ type: EventType.ROOM_LEAVE, data: {} });
      useChatStore.getState().setActiveRoom(null);
    },
    sendMessage(roomId, message) {
      send({
        type: EventType.CHAT_MESSAGE,
        room_id: roomId,
        data: { message },
      });
    },
    editMessage(roomId, id, message) {
      send({
        type: EventType.CHAT_EDIT,
        room_id: roomId,
        data: { id, message },
      });
    },
    deleteMessage(roomId, id) {
      send({
        type: EventType.CHAT_DELETE,
        room_id: roomId,
        data: { id },
      });
    },
    openDirect(peer) {
      send({ type: EventType.DM_OPEN, data: { username: peer } });
    },
    markRead(roomId, lastEventId) {
      send({
        type: EventType.CURSOR_READ,
        room_id: roomId,
        data: { last_event_id: lastEventId },
      });
    },
    typing(roomId) {
      send({ type: EventType.USER_TYPING, room_id: roomId, data: {} });
    },
    disconnect() {
      shouldReconnect = false;
      clearTimers();
      socket?.close();
      useChatStore.getState().setStatus("disconnected");
    },
  };
}

type None = null;
