const EventType = {
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
  ROOM_JOINED: "room.joined",
  ROOM_CREATED: "room.created",
  DM_OPEN: "dm.open",
  UNREAD_UPDATE: "unread.update",
  ERROR: "error",
  PING: "ping",
};

const state = {
  username: sessionStorage.getItem("relay.username") || "",
  status: "idle",
  rooms: [],
  activeRoomId: "general",
  messages: {},
  members: {},
  typing: {},
  unread: {},
  lastSeq: {},
  error: "",
};

let socket = null;
let backoff = 500;
let intendedRoom = "general";
let lastTyping = 0;

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "onclick") node.addEventListener("click", value);
    else if (key === "onsubmit") node.addEventListener("submit", value);
    else if (key === "oninput") node.addEventListener("input", value);
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function connect() {
  if (!state.username) return;
  state.status = socket ? "reconnecting" : "connecting";
  render();
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(
    `${proto}//${location.host}/ws?username=${encodeURIComponent(state.username)}`,
  );
  socket.onopen = () => {
    backoff = 500;
    state.status = "connected";
    render();
  };
  socket.onmessage = (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    handle(payload);
    if (payload.type === EventType.CONNECTION_READY) {
      const since = state.lastSeq[intendedRoom];
      send({
        type: EventType.ROOM_JOIN,
        room_id: intendedRoom,
        data: since ? { since_event_id: since } : {},
      });
    }
  };
  socket.onclose = () => {
    state.status = "reconnecting";
    render();
    setTimeout(() => {
      backoff = Math.min(10000, backoff * 2);
      connect();
    }, backoff);
  };
}

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function mergeMessages(current, incoming) {
  const seen = new Set(current.map((item) => item.id));
  const next = current.slice();
  for (const msg of incoming) {
    if (!seen.has(msg.id)) {
      next.push(msg);
      seen.add(msg.id);
    }
  }
  return next;
}

function patchMessage(data) {
  if (!data || !data.room_id || !data.id) return;
  const list = state.messages[data.room_id] || [];
  const index = list.findIndex((item) => item.id === data.id);
  if (index === -1) {
    state.messages[data.room_id] = [...list, data];
    return;
  }
  const next = list.slice();
  next[index] = { ...list[index], ...data };
  state.messages[data.room_id] = next;
}

function handle(event) {
  const data = event.data || {};
  if (event.type === EventType.CONNECTION_READY) {
    state.rooms = data.rooms || [];
    state.status = "connected";
    state.error = "";
  } else if (event.type === EventType.ROOM_JOINED) {
    const room = data.room;
    if (room) {
      intendedRoom = room.id;
      state.activeRoomId = room.id;
      const exists = state.rooms.some((item) => item.id === room.id);
      state.rooms = exists
        ? state.rooms.map((item) => (item.id === room.id ? room : item))
        : [...state.rooms, room];
    }
    state.messages[state.activeRoomId] = data.mode === "catchup"
      ? mergeMessages(state.messages[state.activeRoomId] || [], data.messages || [])
      : (data.messages || []);
    (state.messages[state.activeRoomId] || []).forEach((msg) => {
      if (msg.event_id) state.lastSeq[state.activeRoomId] = Math.max(state.lastSeq[state.activeRoomId] || 0, msg.event_id);
    });
    state.members[state.activeRoomId] = data.members || [];
    state.unread[state.activeRoomId] = 0;
  } else if (event.type === EventType.ROOM_CREATED && data.id) {
    if (!state.rooms.some((item) => item.id === data.id)) state.rooms.push(data);
  } else if (event.type === EventType.CHAT_MESSAGE && data.room_id) {
    const list = state.messages[data.room_id] || [];
    if (!list.some((item) => item.id === data.id)) {
      state.messages[data.room_id] = [...list, data];
    }
    if (data.event_id) {
      state.lastSeq[data.room_id] = Math.max(state.lastSeq[data.room_id] || 0, data.event_id);
    }
  } else if (event.type === EventType.UNREAD_UPDATE && (data.room_id || event.room_id)) {
    state.unread[data.room_id || event.room_id] = data.unread_count || 0;
  } else if (event.type === EventType.CHAT_EDITED || event.type === EventType.CHAT_DELETED) {
    patchMessage(data);
  } else if (
    (event.type === EventType.USER_JOINED || event.type === EventType.USER_LEFT) &&
    event.room_id
  ) {
    state.members[event.room_id] = data.members || [];
  } else if (event.type === EventType.USER_TYPING && event.room_id && data.username) {
    state.typing[event.room_id] = {
      ...(state.typing[event.room_id] || {}),
      [data.username]: Date.now() + 2500,
    };
  } else if (event.type === EventType.ERROR) {
    state.error = data.message || "Something went wrong.";
  }
  render();
}

function render() {
  const root = document.getElementById("app");
  root.replaceChildren();
  root.append(styleTag());
  if (!state.username) {
    root.append(gate());
    return;
  }
  root.append(shell());
}

function styleTag() {
  const tag = document.createElement("style");
  tag.textContent = `
    .wrap { min-height: 100dvh; display: flex; flex-direction: column; background: #0c0c0b; color: #f3f0e8; }
    .gate { max-width: 28rem; margin: auto; padding: 2rem; }
    .kicker { color: #7aa89a; letter-spacing: 0.22em; text-transform: uppercase; font-size: 0.75rem; }
    h1 { font-family: Newsreader, Georgia, serif; font-size: 3rem; font-weight: 500; margin: 0.4rem 0; }
    .muted { color: #9a978c; }
    input, button { height: 2.75rem; border-radius: 0.5rem; border: 1px solid rgba(243,240,232,0.12); background: #161614; color: inherit; padding: 0 0.9rem; }
    button.primary { background: #f3f0e8; color: #0c0c0b; border: 0; font-weight: 600; width: 100%; margin-top: 0.75rem; }
    header.bar { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; height: 3.5rem; border-bottom: 1px solid rgba(243,240,232,0.12); }
    .layout { display: grid; grid-template-columns: 14rem 1fr 13rem; min-height: 0; flex: 1; }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
    .side { border-right: 1px solid rgba(243,240,232,0.12); background: #161614; padding: 1rem 0.6rem; overflow: auto; }
    .side.right { border-right: 0; border-left: 1px solid rgba(243,240,232,0.12); }
    .room { display: flex; width: 100%; background: transparent; color: #9a978c; border: 0; text-align: left; padding: 0.6rem 0.75rem; border-radius: 0.5rem; }
    .room.active { background: #22221e; color: #f3f0e8; }
    .messages { overflow: auto; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.9rem; }
    .composer { display: flex; gap: 0.5rem; padding: 0.75rem; border-top: 1px solid rgba(243,240,232,0.12); }
    .composer input { flex: 1; }
    .dot { width: 0.5rem; height: 0.5rem; border-radius: 99px; display: inline-block; margin-right: 0.4rem; background: #7aa89a; }
    .err { background: rgba(201,137,122,0.12); color: #c9897a; padding: 0.5rem 1rem; font-size: 0.875rem; }
    .msg-actions { display: inline-flex; gap: 0.35rem; margin-left: 0.5rem; }
    .msg-actions button { height: 1.75rem; padding: 0 0.5rem; font-size: 0.75rem; }
    .deleted { font-style: italic; color: #9a978c; }
  `;
  return tag;
}

function gate() {
  const input = el("input", { id: "name", placeholder: "Ada Lovelace", maxlength: "24" });
  const form = el("form", {
    class: "gate",
    onsubmit: (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (name.length < 2) return;
      sessionStorage.setItem("relay.username", name);
      state.username = name;
      connect();
      render();
    },
  }, [
    el("p", { class: "kicker", text: "FastAPI · WebSockets" }),
    el("h1", { text: "Relay" }),
    el("p", { class: "muted", text: "Persistent rooms. Instant messages." }),
    el("label", { class: "muted", text: "Display name", style: "display:block;margin:1.5rem 0 0.4rem;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;" }),
    input,
    el("button", { class: "primary", type: "submit", text: "Enter the rooms" }),
  ]);
  return el("div", { class: "wrap" }, [form]);
}

function messageRow(msg) {
  const own = msg.username === state.username && !msg.deleted;
  const body = msg.deleted
    ? el("span", { class: "deleted", text: "This message was deleted." })
    : el("span", { class: "muted", text: msg.message + (msg.edited_at ? " (edited)" : "") });
  const actions = own
    ? el("span", { class: "msg-actions" }, [
        el("button", {
          type: "button",
          text: "Edit",
          onclick: () => {
            const next = window.prompt("Edit message", msg.message);
            if (next == null) return;
            const trimmed = next.trim();
            if (!trimmed) return;
            send({
              type: EventType.CHAT_EDIT,
              room_id: state.activeRoomId,
              data: { id: msg.id, message: trimmed },
            });
          },
        }),
        el("button", {
          type: "button",
          text: "Delete",
          onclick: () => {
            if (!window.confirm("Delete this message?")) return;
            send({
              type: EventType.CHAT_DELETE,
              room_id: state.activeRoomId,
              data: { id: msg.id },
            });
          },
        }),
      ])
    : "";
  return el("div", {}, [
    el("strong", { text: msg.username + " " }),
    body,
    actions,
  ].filter(Boolean));
}

function shell() {
  const messages = state.messages[state.activeRoomId] || [];
  const members = state.members[state.activeRoomId] || [];
  const input = el("input", {
    placeholder: `Message #${state.activeRoomId}`,
    maxlength: "2000",
    oninput: () => {
      const now = Date.now();
      if (now - lastTyping < 700) return;
      lastTyping = now;
      send({ type: EventType.USER_TYPING, room_id: state.activeRoomId, data: {} });
    },
  });
  const roomButtons = state.rooms.map((item) =>
    el("button", {
      class: item.id === state.activeRoomId ? "room active" : "room",
      text: `# ${item.name}${state.unread[item.id] ? ` (${state.unread[item.id]})` : ""}`,
      onclick: () => {
        intendedRoom = item.id;
        const since = state.lastSeq[item.id];
        send({
          type: EventType.ROOM_JOIN,
          room_id: item.id,
          data: since ? { since_event_id: since } : {},
        });
      },
    }),
  );
  return el("div", { class: "wrap" }, [
    el("header", { class: "bar" }, [
      el("strong", { text: "Relay" }),
      el("span", {}, [
        el("span", { class: "dot" }),
        document.createTextNode(state.status === "connected" ? "Connected" : "Reconnecting…"),
      ]),
    ]),
    state.error ? el("div", { class: "err", text: state.error }) : "",
    el("div", { class: "layout" }, [
      el("aside", { class: "side" }, [el("p", { class: "kicker", text: "Rooms" }), ...roomButtons]),
      el("section", { style: "display:flex;flex-direction:column;min-width:0;" }, [
        el("div", { class: "messages" },
          messages.length
            ? messages.map(messageRow)
            : [el("p", { class: "muted", text: "Quiet so far. Open another tab and send a line." })],
        ),
        el("form", {
          class: "composer",
          onsubmit: (event) => {
            event.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            send({ type: EventType.CHAT_MESSAGE, room_id: state.activeRoomId, data: { message: text } });
            input.value = "";
          },
        }, [input, el("button", { class: "primary", type: "submit", text: "Send", style: "width:auto;" })]),
      ]),
      el("aside", { class: "side right" }, [
        el("p", { class: "kicker", text: "In this room" }),
        ...members.map((name) =>
          el("p", {
            text: name,
            style: name === state.username ? "" : "cursor:pointer;text-decoration:underline;",
            onclick: () => {
              if (name === state.username) return;
              send({ type: EventType.DM_OPEN, data: { username: name } });
            },
          }),
        ),
      ]),
    ]),
  ].filter(Boolean));
}

if (state.username) connect();
render();
