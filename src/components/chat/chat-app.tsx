import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Hash, Menu, Radio, Terminal, Users, X } from "lucide-react";
import { GateScreen } from "@/components/chat/gate-screen";
import { ConnectionBadge } from "@/components/chat/connection-badge";
import { RoomList } from "@/components/chat/room-list";
import { PresenceList } from "@/components/chat/presence-list";
import { MessagePane } from "@/components/chat/message-pane";
import { Composer } from "@/components/chat/composer";
import { ProtocolInspector } from "@/components/chat/protocol-inspector";
import { NewRoomDialog } from "@/components/chat/new-room-dialog";
import { Button } from "@/components/ui/button";
import { connectChat } from "@/lib/chat/socket";
import { clearStoredUsername, readStoredUsername } from "@/lib/chat/identity";
import { roomLabel } from "@/lib/chat/protocol";
import { useChatStore } from "@/lib/chat/store";
import { cn } from "@/lib/utils";

type SocketApi = ReturnType<typeof connectChat>;

export function ChatApp() {
  const [username, setUsername] = useState<string | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const socketRef = useRef<SocketApi | null>(null);
  const lastTyping = useRef(0);

  const status = useChatStore((s) => s.status);
  const rooms = useChatStore((s) => s.rooms);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const messages = useChatStore((s) => s.messages);
  const members = useChatStore((s) => s.members);
  const typing = useChatStore((s) => s.typing);
  const error = useChatStore((s) => s.error);
  const inspectorOpen = useChatStore((s) => s.inspectorOpen);
  const firstUnreadEventId = useChatStore((s) => s.firstUnreadEventId);
  const pruneTyping = useChatStore((s) => s.pruneTyping);
  const toggleInspector = useChatStore((s) => s.toggleInspector);
  const resetSession = useChatStore((s) => s.resetSession);

  useEffect(() => {
    const stored = readStoredUsername();
    if (stored) setUsername(stored);
  }, []);

  useEffect(() => {
    if (!username) return;
    const handle = connectChat(username);
    socketRef.current = handle;
    return () => {
      handle.disconnect();
      socketRef.current = null;
    };
  }, [username]);

  useEffect(() => {
    const id = window.setInterval(() => pruneTyping(), 400);
    return () => window.clearInterval(id);
  }, [pruneTyping]);

  const room = rooms.find((item) => item.id === activeRoomId);
  const roomMessages = activeRoomId ? (messages[activeRoomId] ?? []) : [];
  const roomMembers = activeRoomId ? (members[activeRoomId] ?? []) : [];
  const typingNames = useMemo(() => {
    if (!activeRoomId || !username) return [];
    const now = Date.now();
    return Object.entries(typing[activeRoomId] ?? {})
      .filter(([name, expires]) => name !== username && expires > now)
      .map(([name]) => name);
  }, [activeRoomId, typing, username]);

  function enter(name: string) {
    resetSession();
    setUsername(name);
  }

  function signOut() {
    socketRef.current?.disconnect();
    clearStoredUsername();
    resetSession();
    setUsername(null);
  }

  function selectRoom(roomId: string) {
    socketRef.current?.join(roomId);
    setRoomsOpen(false);
  }

  function sendMessage(body: string) {
    if (!activeRoomId) return;
    socketRef.current?.sendMessage(activeRoomId, body);
  }

  function messageUser(name: string) {
    socketRef.current?.openDirect(name);
    setPeopleOpen(false);
  }

  function onTyping() {
    if (!activeRoomId) return;
    const now = Date.now();
    if (now - lastTyping.current < 700) return;
    lastTyping.current = now;
    socketRef.current?.typing(activeRoomId);
  }

  if (!username) {
    return <GateScreen onEnter={enter} />;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-bg text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 md:hidden"
            onClick={() => setRoomsOpen(true)}
            aria-label="Open rooms"
          >
            <Menu className="size-4" />
          </Button>
          <Radio className="hidden size-4 text-accent md:block" />
          <span className="font-display text-lg tracking-tight">Relay</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {room ? (room.kind === "dm" ? room.peer || room.name : `#${room.id}`) : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ConnectionBadge status={status} />
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-11", inspectorOpen && "text-accent")}
            onClick={toggleInspector}
            aria-label="Toggle protocol inspector"
          >
            <Terminal className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 md:hidden"
            onClick={() => setPeopleOpen(true)}
            aria-label="Open presence"
          >
            <Users className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            members={members}
            onSelect={selectRoom}
            onCreate={() => setCreateOpen(true)}
          />
          <div className="border-t border-border px-4 py-3">
            <p className="truncate text-sm">{username}</p>
            <button
              type="button"
              onClick={signOut}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Change name
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 md:hidden">
            <Hash className="size-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{roomLabel(room)}</span>
          </div>
          {error ? (
            <p className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <MessagePane
            room={room}
            messages={roomMessages}
            typingNames={typingNames}
            username={username}
            disabled={status !== "connected"}
            firstUnreadEventId={firstUnreadEventId}
            onEdit={(id, body) => {
              if (!activeRoomId) return;
              socketRef.current?.editMessage(activeRoomId, id, body);
            }}
            onDelete={(id) => {
              if (!activeRoomId) return;
              socketRef.current?.deleteMessage(activeRoomId, id);
            }}
          />
          <Composer
            disabled={status !== "connected" || !activeRoomId}
            roomName={room?.kind === "dm" ? `@${room.peer || room.name}` : `#${room?.id ?? "room"}`}
            onSend={sendMessage}
            onTyping={onTyping}
          />
        </div>

        <aside className="hidden w-56 shrink-0 border-l border-border bg-surface lg:flex lg:flex-col">
          <PresenceList members={roomMembers} username={username} onMessage={messageUser} />
        </aside>
      </div>

      <ProtocolInspector />

      {roomsOpen ? (
        <MobileDrawer title="Rooms" onClose={() => setRoomsOpen(false)}>
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            members={members}
            onSelect={selectRoom}
            onCreate={() => {
              setRoomsOpen(false);
              setCreateOpen(true);
            }}
          />
          <div className="border-t border-border px-4 py-3">
            <p className="truncate text-sm">{username}</p>
            <button type="button" onClick={signOut} className="mt-1 text-xs text-muted-foreground">
              Change name
            </button>
          </div>
        </MobileDrawer>
      ) : null}

      {peopleOpen ? (
        <MobileDrawer title="Online" side="right" onClose={() => setPeopleOpen(false)}>
          <PresenceList members={roomMembers} username={username} onMessage={messageUser} />
        </MobileDrawer>
      ) : null}

      <NewRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => selectRoom(created.id)}
      />
    </div>
  );
}

function MobileDrawer({
  title,
  onClose,
  children,
  side = "left",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  side?: "left" | "right";
}) {
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 flex w-[min(20rem,88vw)] flex-col bg-surface",
          side === "right" ? "right-0 border-l border-border" : "left-0 border-r border-border",
        )}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <Button variant="ghost" size="icon" className="size-11" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
