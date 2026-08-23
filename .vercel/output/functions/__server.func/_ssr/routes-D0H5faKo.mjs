import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as Send, c as Menu, i as Terminal, l as Hash, n as Users, o as Radio, s as Plus, t as X, u as ArrowRight } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, l as Slot, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D0H5faKo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,background-color,color,opacity,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/90",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			ghost: "text-foreground hover:bg-muted",
			outline: "border border-border bg-transparent hover:bg-muted",
			accent: "bg-accent text-accent-foreground hover:bg-accent/90"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 px-3 text-xs",
			lg: "h-12 px-5",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-border transition-[box-shadow,border-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
var STORAGE_KEY = "relay.username";
function readStoredUsername() {
	try {
		const value = sessionStorage.getItem(STORAGE_KEY);
		return value && value.trim() ? value : null;
	} catch {
		return null;
	}
}
function storeUsername(name) {
	try {
		sessionStorage.setItem(STORAGE_KEY, name);
	} catch {}
}
function clearStoredUsername() {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {}
}
function initials(name) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function toneIndex(name) {
	let hash = 0;
	for (let i = 0; i < name.length; i += 1) hash = hash * 31 + name.charCodeAt(i) >>> 0;
	return hash % 4;
}
function GateScreen({ onEnter }) {
	const [value, setValue] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	function submit(event) {
		event.preventDefault();
		const username = value.trim();
		if (username.length < 2) {
			setError("Need at least two characters.");
			return;
		}
		if (username.length > 24) {
			setError("Keep it under 24 characters.");
			return;
		}
		if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,22}[A-Za-z0-9]$|^[A-Za-z0-9]{2,24}$/.test(username)) {
			setError("Letters, numbers, spaces, dots, underscores, or hyphens.");
			return;
		}
		storeUsername(username);
		onEnter(username);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "relay-grain relative flex min-h-dvh flex-col items-center justify-center px-5 py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "stagger-in w-full max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-accent",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-3.5" }), "FastAPI · WebSockets"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-5xl font-medium tracking-[-0.03em] text-foreground sm:text-6xl",
					children: "Relay"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-sm text-base text-muted-foreground",
					children: "Persistent rooms. Instant messages. Open another tab to watch presence, typing, and fan-out happen live."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					className: "mt-10 flex flex-col gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "username",
							className: "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground",
							children: "Display name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "username",
							autoFocus: true,
							autoComplete: "nickname",
							placeholder: "Ada Lovelace",
							value,
							maxLength: 24,
							onChange: (event) => {
								setValue(event.target.value);
								setError(null);
							}
						}),
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-danger",
							children: error
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							size: "lg",
							className: "mt-2 h-12 justify-between px-5",
							children: ["Enter the rooms", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-12 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-accent",
							children: "01"
						}), "Socket stays open"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-accent",
							children: "02"
						}), "Events, not polling"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-mono text-[11px] uppercase tracking-[0.16em] text-accent",
							children: "03"
						}), "Rooms isolate fan-out"] })
					]
				})
			]
		})
	});
}
var badgeVariants = cva("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", {
	variants: { variant: {
		default: "border-transparent bg-muted text-muted-foreground",
		connected: "border-transparent bg-success/15 text-success",
		reconnecting: "border-transparent bg-warn/15 text-warn",
		disconnected: "border-transparent bg-danger/15 text-danger"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var LABEL = {
	idle: "Idle",
	connecting: "Connecting",
	connected: "Connected",
	reconnecting: "Reconnecting…",
	disconnected: "Disconnected"
};
var VARIANT = {
	idle: "default",
	connecting: "reconnecting",
	connected: "connected",
	reconnecting: "reconnecting",
	disconnected: "disconnected"
};
function ConnectionBadge({ status }) {
	const pulse = status === "reconnecting" || status === "connecting";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
		variant: VARIANT[status],
		className: "gap-1.5 uppercase tracking-[0.14em]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "status-dot",
			"data-pulse": pulse ? "true" : "false"
		}), LABEL[status]]
	});
}
function RoomList({ rooms, activeRoomId, members, onSelect, onCreate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-4 pb-3 pt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground",
				children: "Rooms"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon",
				className: "size-9",
				onClick: onCreate,
				"aria-label": "New room",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
			className: "flex-1 space-y-1 overflow-y-auto px-2 pb-4",
			children: rooms.map((room) => {
				const active = room.id === activeRoomId;
				const count = members[room.id]?.length ?? room.member_count;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onSelect(room.id),
					className: cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors duration-[var(--motion-quick)]", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hash, { className: "size-3.5 shrink-0" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-sm font-medium",
							children: room.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs tabular-nums text-muted-foreground",
							children: count
						})
					]
				}, room.id);
			})
		})]
	});
}
function Avatar({ name, size = "md" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium", size === "sm" ? "size-7 text-[10px]" : "size-8 text-[11px]", `avatar-tone-${toneIndex(name)}`),
		"aria-hidden": true,
		children: initials(name)
	});
}
function PresenceList({ members, username }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-4 pb-3 pt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground",
				children: "In this room"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-mono text-xs tabular-nums text-muted-foreground",
				children: [members.length, " online"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "flex-1 space-y-1 overflow-y-auto px-2 pb-4",
			children: members.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "px-3 py-2 text-sm text-muted-foreground",
				children: "No one here yet."
			}) : members.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
						name,
						size: "sm"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "truncate",
					children: [name, name === username ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-1.5 text-xs text-muted-foreground",
						children: "you"
					}) : null]
				})]
			}, name))
		})]
	});
}
function formatTime(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	});
}
function MessagePane({ room, messages, typingNames }) {
	const bottomRef = (0, import_react.useRef)(null);
	const scrollerRef = (0, import_react.useRef)(null);
	const stickRef = (0, import_react.useRef)(true);
	(0, import_react.useEffect)(() => {
		if (!stickRef.current) return;
		bottomRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end"
		});
	}, [messages.length, typingNames.length]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 min-w-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "hidden border-b border-border px-6 py-4 md:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl tracking-tight",
					children: room ? `# ${room.name}` : "Choose a room"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-sm text-muted-foreground",
					children: room?.topic || "Messages stay in this room. History loads on join."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scrollerRef,
				onScroll: () => {
					const el = scrollerRef.current;
					if (!el) return;
					stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
				},
				className: "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6",
				children: [messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full min-h-48 flex-col items-center justify-center text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg",
						children: "Quiet so far"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-sm text-sm text-muted-foreground",
						children: "History is empty until someone speaks. Open a second tab and send a line to see the broadcast."
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "space-y-4",
					children: messages.map((message, index) => {
						const grouped = messages[index - 1]?.username === message.username;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: grouped ? "pl-11" : "flex gap-3",
							children: [grouped ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, { name: message.username }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [grouped ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-0.5 flex items-baseline gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-medium",
										children: message.username
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
										className: "font-mono text-[11px] tabular-nums text-muted-foreground",
										children: formatTime(message.created_at)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/95",
									children: message.message
								})]
							})]
						}, message.id);
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottomRef })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-6 px-4 pb-1 text-xs text-muted-foreground md:px-6",
				children: typingNames.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.slice(0, 2).join(", ")} are typing…` }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "opacity-0",
					children: "idle"
				})
			})
		]
	});
}
function Composer({ disabled, roomName, onSend, onTyping }) {
	const [value, setValue] = (0, import_react.useState)("");
	function submit(event) {
		event?.preventDefault();
		const message = value.trim();
		if (!message || disabled) return;
		onSend(message);
		setValue("");
	}
	function onKeyDown(event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "flex items-center gap-2 border-t border-border bg-surface px-3 py-3 md:px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value,
			maxLength: 2e3,
			disabled,
			placeholder: `Message #${roomName}`,
			onChange: (event) => {
				setValue(event.target.value);
				onTyping();
			},
			onKeyDown,
			className: "h-12 min-w-0 flex-1 rounded-lg border border-border bg-bg px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			type: "submit",
			size: "icon",
			className: "size-12 rounded-lg",
			disabled: disabled || !value.trim(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Send"
			})]
		})]
	});
}
var TYPING_TTL_MS = 2500;
var useChatStore = create((set) => ({
	username: null,
	status: "idle",
	rooms: [],
	activeRoomId: null,
	messages: {},
	members: {},
	typing: {},
	online: [],
	events: [],
	error: null,
	inspectorOpen: false,
	setUsername: (username) => set({ username }),
	setStatus: (status) => set({ status }),
	setError: (error) => set({ error }),
	setRooms: (rooms) => set({ rooms }),
	upsertRoom: (room) => set((state) => {
		return { rooms: state.rooms.some((item) => item.id === room.id) ? state.rooms.map((item) => item.id === room.id ? {
			...item,
			...room
		} : item) : [...state.rooms, room] };
	}),
	setActiveRoom: (activeRoomId) => set({ activeRoomId }),
	setOnline: (online) => set({ online }),
	replaceHistory: (roomId, messages, members) => set((state) => ({
		messages: {
			...state.messages,
			[roomId]: messages
		},
		members: {
			...state.members,
			[roomId]: members
		}
	})),
	appendMessage: (message) => set((state) => {
		const current = state.messages[message.room_id] ?? [];
		if (current.some((item) => item.id === message.id)) return state;
		return { messages: {
			...state.messages,
			[message.room_id]: [...current, message]
		} };
	}),
	setMembers: (roomId, members) => set((state) => ({ members: {
		...state.members,
		[roomId]: members
	} })),
	markTyping: (roomId, username) => set((state) => ({ typing: {
		...state.typing,
		[roomId]: {
			...state.typing[roomId] ?? {},
			[username]: Date.now() + TYPING_TTL_MS
		}
	} })),
	pruneTyping: (now = Date.now()) => set((state) => {
		const next = {};
		for (const [roomId, users] of Object.entries(state.typing)) {
			const kept = {};
			for (const [name, expires] of Object.entries(users)) if (expires > now) kept[name] = expires;
			if (Object.keys(kept).length) next[roomId] = kept;
		}
		return { typing: next };
	}),
	pushEvent: (event) => set((state) => ({ events: [...state.events, event].slice(-60) })),
	toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
	resetSession: () => set({
		status: "idle",
		rooms: [],
		messages: {},
		members: {},
		typing: {},
		online: [],
		events: [],
		error: null
	})
}));
function ProtocolInspector() {
	const events = useChatStore((s) => s.events);
	if (!useChatStore((s) => s.inspectorOpen)) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "max-h-48 overflow-y-auto border-t border-border bg-bg px-4 py-3 font-mono text-[11px] leading-relaxed md:max-h-56",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
			children: "Live protocol"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "space-y-1",
			children: events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "text-muted-foreground",
				children: "Events will appear here as they cross the socket."
			}) : events.slice().reverse().map((event, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("w-6 shrink-0", event.direction === "in" ? "text-accent" : "text-warn"),
						children: event.direction === "in" ? "IN" : "OUT"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-foreground",
						children: event.type
					}),
					event.room_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted-foreground",
						children: ["#", event.room_id]
					}) : null
				]
			}, `${event.at}-${index}`))
		})]
	});
}
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-bg/70 data-[state=open]:animate-in data-[state=closed]:animate-out", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-border", "duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)] data-[state=open]:scale-100 data-[state=closed]:scale-[0.96] data-[state=open]:opacity-100 data-[state=closed]:opacity-0", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-3 top-3 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1.5 pr-8", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-display text-lg font-medium tracking-tight", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-muted-foreground", className),
		...props
	});
}
function NewRoomDialog({ open, onOpenChange, onCreated }) {
	const [name, setName] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)(false);
	async function submit(event) {
		event.preventDefault();
		setPending(true);
		setError(null);
		try {
			const response = await fetch("/api/rooms", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					topic: topic.trim()
				})
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.detail || "Could not create the room.");
			}
			const room = await response.json();
			setName("");
			setTopic("");
			onOpenChange(false);
			onCreated(room);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not create the room.");
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New room" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Rooms are created over HTTP, then announced to every open socket." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: submit,
			className: "mt-4 flex flex-col gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground",
					htmlFor: "room-name",
					children: "Name"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "room-name",
					value: name,
					onChange: (event) => setName(event.target.value),
					placeholder: "Design review",
					maxLength: 40,
					required: true,
					minLength: 2
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground",
					htmlFor: "room-topic",
					children: "Topic"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "room-topic",
					value: topic,
					onChange: (event) => setTopic(event.target.value),
					placeholder: "Optional",
					maxLength: 160
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: pending || name.trim().length < 2,
					children: pending ? "Creating…" : "Create room"
				})
			]
		})] })
	});
}
/** Mirrors `app/websocket/events.py`. Keep these strings identical. */
var EventType = {
	CONNECTION_READY: "connection.ready",
	CHAT_MESSAGE: "chat.message",
	USER_JOINED: "user.joined",
	USER_LEFT: "user.left",
	USER_TYPING: "user.typing",
	ROOM_JOIN: "room.join",
	ROOM_LEAVE: "room.leave",
	ROOM_JOINED: "room.joined",
	ROOM_LEFT: "room.left",
	ROOM_CREATED: "room.created",
	ERROR: "error",
	PING: "ping",
	PONG: "pong"
};
function wsUrl(username) {
	const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
	const params = new URLSearchParams({ username });
	return `${proto}//${window.location.host}/ws?${params.toString()}`;
}
var MIN_BACKOFF_MS = 500;
var MAX_BACKOFF_MS = 1e4;
function record(direction, payload) {
	useChatStore.getState().pushEvent({
		type: payload.type,
		room_id: payload.room_id,
		data: payload.data ?? {},
		at: Date.now(),
		direction
	});
}
function asRoom(value) {
	if (!value || typeof value !== "object") return null;
	const room = value;
	if (typeof room.id !== "string" || typeof room.name !== "string") return null;
	return room;
}
function asMessage(value) {
	if (!value || typeof value !== "object") return null;
	const msg = value;
	if (!msg.id || !msg.room_id || !msg.username || typeof msg.message !== "string") return null;
	return msg;
}
function handleInbound(event) {
	const store = useChatStore.getState();
	record("in", event);
	const data = event.data ?? {};
	switch (event.type) {
		case EventType.CONNECTION_READY: {
			const rooms = Array.isArray(data.rooms) ? data.rooms.map(asRoom).filter(Boolean) : [];
			store.setRooms(rooms);
			store.setOnline(Array.isArray(data.online) ? data.online : []);
			store.setStatus("connected");
			store.setError(null);
			break;
		}
		case EventType.ROOM_JOINED: {
			const room = asRoom(data.room);
			if (room) {
				store.upsertRoom(room);
				store.setActiveRoom(room.id);
			} else if (event.room_id) store.setActiveRoom(event.room_id);
			const roomId = room?.id ?? event.room_id;
			if (roomId) {
				const history = Array.isArray(data.messages) ? data.messages.map(asMessage).filter(Boolean) : [];
				const members = Array.isArray(data.members) ? data.members : [];
				store.replaceHistory(roomId, history, members);
			}
			break;
		}
		case EventType.ROOM_LEFT: break;
		case EventType.ROOM_CREATED: {
			const room = asRoom(data);
			if (room) store.upsertRoom(room);
			break;
		}
		case EventType.CHAT_MESSAGE: {
			const message = asMessage(data);
			if (message) store.appendMessage(message);
			break;
		}
		case EventType.USER_JOINED:
		case EventType.USER_LEFT: {
			const roomId = event.room_id;
			if (roomId && Array.isArray(data.members)) {
				const names = data.members;
				store.setMembers(roomId, names);
				const existing = store.rooms.find((item) => item.id === roomId);
				if (existing) store.upsertRoom({
					...existing,
					member_count: names.length
				});
			}
			break;
		}
		case EventType.USER_TYPING: {
			const roomId = event.room_id;
			const username = typeof data.username === "string" ? data.username : "";
			if (roomId && username) store.markTyping(roomId, username);
			break;
		}
		case EventType.ERROR: {
			const message = typeof data.message === "string" ? data.message : "Something went wrong.";
			store.setError(message);
			break;
		}
	}
}
function connectChat(username) {
	let socket = null;
	let shouldReconnect = true;
	let backoff = MIN_BACKOFF_MS;
	let reconnectTimer = null;
	let pingTimer = null;
	let intendedRoom = useChatStore.getState().activeRoomId;
	const send = (payload) => {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify(payload));
		record("out", payload);
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
				send({
					type: EventType.PING,
					data: {}
				});
			}, 25e3);
		};
		socket.onmessage = (event) => {
			let parsed;
			try {
				parsed = JSON.parse(event.data);
			} catch {
				return;
			}
			handleInbound(parsed);
			if (parsed.type === EventType.CONNECTION_READY) {
				const room = intendedRoom ?? "general";
				intendedRoom = room;
				send({
					type: EventType.ROOM_JOIN,
					room_id: room,
					data: {}
				});
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
			send({
				type: EventType.ROOM_JOIN,
				room_id: roomId,
				data: {}
			});
		},
		leave() {
			intendedRoom = null;
			send({
				type: EventType.ROOM_LEAVE,
				data: {}
			});
			useChatStore.getState().setActiveRoom(null);
		},
		sendMessage(roomId, message) {
			send({
				type: EventType.CHAT_MESSAGE,
				room_id: roomId,
				data: { message }
			});
		},
		typing(roomId) {
			send({
				type: EventType.USER_TYPING,
				room_id: roomId,
				data: {}
			});
		},
		disconnect() {
			shouldReconnect = false;
			clearTimers();
			socket?.close();
			useChatStore.getState().setStatus("disconnected");
		}
	};
}
function ChatApp() {
	const [username, setUsername] = (0, import_react.useState)(null);
	const [roomsOpen, setRoomsOpen] = (0, import_react.useState)(false);
	const [peopleOpen, setPeopleOpen] = (0, import_react.useState)(false);
	const [createOpen, setCreateOpen] = (0, import_react.useState)(false);
	const socketRef = (0, import_react.useRef)(null);
	const lastTyping = (0, import_react.useRef)(0);
	const status = useChatStore((s) => s.status);
	const rooms = useChatStore((s) => s.rooms);
	const activeRoomId = useChatStore((s) => s.activeRoomId);
	const messages = useChatStore((s) => s.messages);
	const members = useChatStore((s) => s.members);
	const typing = useChatStore((s) => s.typing);
	const error = useChatStore((s) => s.error);
	const inspectorOpen = useChatStore((s) => s.inspectorOpen);
	const pruneTyping = useChatStore((s) => s.pruneTyping);
	const toggleInspector = useChatStore((s) => s.toggleInspector);
	const resetSession = useChatStore((s) => s.resetSession);
	(0, import_react.useEffect)(() => {
		const stored = readStoredUsername();
		if (stored) setUsername(stored);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!username) return;
		const handle = connectChat(username);
		socketRef.current = handle;
		return () => {
			handle.disconnect();
			socketRef.current = null;
		};
	}, [username]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => pruneTyping(), 400);
		return () => window.clearInterval(id);
	}, [pruneTyping]);
	const room = rooms.find((item) => item.id === activeRoomId);
	const roomMessages = activeRoomId ? messages[activeRoomId] ?? [] : [];
	const roomMembers = activeRoomId ? members[activeRoomId] ?? [] : [];
	const typingNames = (0, import_react.useMemo)(() => {
		if (!activeRoomId || !username) return [];
		const now = Date.now();
		return Object.entries(typing[activeRoomId] ?? {}).filter(([name, expires]) => name !== username && expires > now).map(([name]) => name);
	}, [
		activeRoomId,
		typing,
		username
	]);
	function enter(name) {
		resetSession();
		setUsername(name);
	}
	function signOut() {
		socketRef.current?.disconnect();
		clearStoredUsername();
		resetSession();
		setUsername(null);
	}
	function selectRoom(roomId) {
		socketRef.current?.join(roomId);
		setRoomsOpen(false);
	}
	function sendMessage(body) {
		if (!activeRoomId) return;
		socketRef.current?.sendMessage(activeRoomId, body);
	}
	function onTyping() {
		if (!activeRoomId) return;
		const now = Date.now();
		if (now - lastTyping.current < 700) return;
		lastTyping.current = now;
		socketRef.current?.typing(activeRoomId);
	}
	if (!username) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GateScreen, { onEnter: enter });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh min-h-0 flex-col bg-bg text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-3 md:px-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							className: "size-11 md:hidden",
							onClick: () => setRoomsOpen(true),
							"aria-label": "Open rooms",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "hidden size-4 text-accent md:block" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-lg tracking-tight",
							children: "Relay"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden truncate text-sm text-muted-foreground sm:inline",
							children: room ? `#${room.id}` : ""
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionBadge, { status }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							className: cn("size-11", inspectorOpen && "text-accent"),
							onClick: toggleInspector,
							"aria-label": "Toggle protocol inspector",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							className: "size-11 md:hidden",
							onClick: () => setPeopleOpen(true),
							"aria-label": "Open presence",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4" })
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomList, {
							rooms,
							activeRoomId,
							members,
							onSelect: selectRoom,
							onCreate: () => setCreateOpen(true)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-border px-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm",
								children: username
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: signOut,
								className: "mt-1 text-xs text-muted-foreground hover:text-foreground",
								children: "Change name"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 flex-1 flex-col",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 border-b border-border px-4 py-3 md:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hash, { className: "size-3.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium",
									children: room?.name ?? "Rooms"
								})]
							}),
							error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger",
								children: error
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessagePane, {
								room,
								messages: roomMessages,
								typingNames
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, {
								disabled: status !== "connected" || !activeRoomId,
								roomName: room?.id ?? "room",
								onSend: sendMessage,
								onTyping
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: "hidden w-56 shrink-0 border-l border-border bg-surface lg:flex lg:flex-col",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresenceList, {
							members: roomMembers,
							username
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProtocolInspector, {}),
			roomsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MobileDrawer, {
				title: "Rooms",
				onClose: () => setRoomsOpen(false),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomList, {
					rooms,
					activeRoomId,
					members,
					onSelect: selectRoom,
					onCreate: () => {
						setRoomsOpen(false);
						setCreateOpen(true);
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-sm",
						children: username
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: signOut,
						className: "mt-1 text-xs text-muted-foreground",
						children: "Change name"
					})]
				})]
			}) : null,
			peopleOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileDrawer, {
				title: "Online",
				side: "right",
				onClose: () => setPeopleOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresenceList, {
					members: roomMembers,
					username
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewRoomDialog, {
				open: createOpen,
				onOpenChange: setCreateOpen,
				onCreated: (created) => selectRoom(created.id)
			})
		]
	});
}
function MobileDrawer({ title, onClose, children, side = "left" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-40 md:hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-bg/70",
			"aria-label": "Close drawer",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("absolute inset-y-0 flex w-[min(20rem,88vw)] flex-col bg-surface", side === "right" ? "right-0 border-l border-border" : "left-0 border-r border-border"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					className: "size-11",
					onClick: onClose,
					"aria-label": "Close",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto",
				children
			})]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatApp, {});
}
//#endregion
export { Home as component };
