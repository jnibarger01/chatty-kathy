import { create } from "zustand";
import type {
  ChatMessage,
  ConnectionStatus,
  ProtocolEvent,
  Room,
} from "./protocol";

const EVENT_CAP = 60;
const TYPING_TTL_MS = 2500;

type ChatState = {
  username: string | null;
  status: ConnectionStatus;
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, ChatMessage[]>;
  members: Record<string, string[]>;
  typing: Record<string, Record<string, number>>;
  lastEventIds: Record<string, number>;
  firstUnreadEventId: number | null;
  online: string[];
  events: ProtocolEvent[];
  error: string | null;
  inspectorOpen: boolean;
  setUsername: (name: string | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setRooms: (rooms: Room[]) => void;
  upsertRoom: (room: Room) => void;
  setUnread: (roomId: string, unreadCount: number) => void;
  setActiveRoom: (roomId: string | null) => void;
  setOnline: (names: string[]) => void;
  rememberSeq: (roomId: string, eventId: number) => void;
  replaceHistory: (roomId: string, messages: ChatMessage[], members: string[]) => void;
  catchupHistory: (roomId: string, messages: ChatMessage[], members: string[]) => void;
  appendMessage: (message: ChatMessage) => void;
  patchMessage: (message: ChatMessage) => void;
  setMembers: (roomId: string, members: string[]) => void;
  setFirstUnread: (eventId: number | null) => void;
  markTyping: (roomId: string, username: string) => void;
  pruneTyping: (now?: number) => void;
  pushEvent: (event: ProtocolEvent) => void;
  toggleInspector: () => void;
  resetSession: () => void;
};

function bumpSeq(
  lastEventIds: Record<string, number>,
  roomId: string,
  eventId?: number,
): Record<string, number> {
  if (!eventId) return lastEventIds;
  const prev = lastEventIds[roomId] ?? 0;
  if (eventId <= prev) return lastEventIds;
  return { ...lastEventIds, [roomId]: eventId };
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(current.map((item) => item.id));
  const next = current.slice();
  for (const message of incoming) {
    if (seen.has(message.id)) {
      const index = next.findIndex((item) => item.id === message.id);
      if (index >= 0) next[index] = { ...next[index], ...message };
    } else {
      next.push(message);
      seen.add(message.id);
    }
  }
  next.sort((a, b) => (a.event_id ?? 0) - (b.event_id ?? 0));
  return next;
}

export const useChatStore = create<ChatState>((set) => ({
  username: null,
  status: "idle",
  rooms: [],
  activeRoomId: null,
  messages: {},
  members: {},
  typing: {},
  lastEventIds: {},
  firstUnreadEventId: null,
  online: [],
  events: [],
  error: null,
  inspectorOpen: false,
  setUsername: (username) => set({ username }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setRooms: (rooms) => set({ rooms }),
  upsertRoom: (room) =>
    set((state) => {
      const exists = state.rooms.some((item) => item.id === room.id);
      return {
        rooms: exists
          ? state.rooms.map((item) => (item.id === room.id ? { ...item, ...room } : item))
          : [...state.rooms, room],
      };
    }),
  setUnread: (roomId, unreadCount) =>
    set((state) => ({
      rooms: state.rooms.map((item) =>
        item.id === roomId ? { ...item, unread_count: unreadCount } : item,
      ),
    })),
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  setOnline: (online) => set({ online }),
  rememberSeq: (roomId, eventId) =>
    set((state) => ({ lastEventIds: bumpSeq(state.lastEventIds, roomId, eventId) })),
  replaceHistory: (roomId, messages, members) =>
    set((state) => {
      let lastEventIds = state.lastEventIds;
      for (const message of messages) {
        lastEventIds = bumpSeq(lastEventIds, roomId, message.event_id);
      }
      return {
        messages: { ...state.messages, [roomId]: messages },
        members: { ...state.members, [roomId]: members },
        lastEventIds,
      };
    }),
  catchupHistory: (roomId, messages, members) =>
    set((state) => {
      const merged = mergeMessages(state.messages[roomId] ?? [], messages);
      let lastEventIds = state.lastEventIds;
      for (const message of merged) {
        lastEventIds = bumpSeq(lastEventIds, roomId, message.event_id);
      }
      return {
        messages: { ...state.messages, [roomId]: merged },
        members: { ...state.members, [roomId]: members },
        lastEventIds,
      };
    }),
  appendMessage: (message) =>
    set((state) => {
      const current = state.messages[message.room_id] ?? [];
      if (current.some((item) => item.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [message.room_id]: [...current, message],
        },
        lastEventIds: bumpSeq(state.lastEventIds, message.room_id, message.event_id),
      };
    }),
  patchMessage: (message) =>
    set((state) => {
      const current = state.messages[message.room_id] ?? [];
      if (!current.some((item) => item.id === message.id)) {
        return {
          messages: {
            ...state.messages,
            [message.room_id]: [...current, message],
          },
          lastEventIds: bumpSeq(state.lastEventIds, message.room_id, message.event_id),
        };
      }
      return {
        messages: {
          ...state.messages,
          [message.room_id]: current.map((item) =>
            item.id === message.id ? { ...item, ...message } : item,
          ),
        },
        lastEventIds: bumpSeq(state.lastEventIds, message.room_id, message.event_id),
      };
    }),
  setMembers: (roomId, members) =>
    set((state) => ({ members: { ...state.members, [roomId]: members } })),
  setFirstUnread: (firstUnreadEventId) => set({ firstUnreadEventId }),
  markTyping: (roomId, username) =>
    set((state) => ({
      typing: {
        ...state.typing,
        [roomId]: {
          ...(state.typing[roomId] ?? {}),
          [username]: Date.now() + TYPING_TTL_MS,
        },
      },
    })),
  pruneTyping: (now = Date.now()) =>
    set((state) => {
      const next: Record<string, Record<string, number>> = {};
      for (const [roomId, users] of Object.entries(state.typing)) {
        const kept: Record<string, number> = {};
        for (const [name, expires] of Object.entries(users)) {
          if (expires > now) kept[name] = expires;
        }
        if (Object.keys(kept).length) next[roomId] = kept;
      }
      return { typing: next };
    }),
  pushEvent: (event) =>
    set((state) => ({
      events: [...state.events, event].slice(-EVENT_CAP),
    })),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  resetSession: () =>
    set({
      status: "idle",
      rooms: [],
      messages: {},
      members: {},
      typing: {},
      lastEventIds: {},
      firstUnreadEventId: null,
      online: [],
      events: [],
      error: null,
    }),
}));
