import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/chat/avatars";
import { Button } from "@/components/ui/button";
import type { ChatMessage, Room } from "@/lib/chat/protocol";
import { cn } from "@/lib/utils";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function MessagePane({
  room,
  messages,
  typingNames,
  username,
  disabled,
  firstUnreadEventId,
  onEdit,
  onDelete,
}: {
  room: Room | undefined;
  messages: ChatMessage[];
  typingNames: string[];
  username: string;
  disabled: boolean;
  firstUnreadEventId: number | null;
  onEdit: (id: string, message: string) => void;
  onDelete: (id: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    if (!stickRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingNames.length]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="hidden border-b border-border px-6 py-4 md:block">
        <h2 className="font-display text-xl tracking-tight">
          {room ? (
            room.kind === "dm" ? room.peer || room.name : `# ${room.name}`
          ) : (
            "Choose a room"
          )}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {room?.kind === "dm"
            ? "Unicast thread. Only the two of you receive these frames."
            : room?.topic || "Messages stay in this room. History loads on join."}
        </p>
      </header>
      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
            <p className="font-display text-lg">Quiet so far</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              History is empty until someone speaks. Open a second tab and send a
              line to see the broadcast.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const grouped = prev?.username === message.username && !prev?.deleted;
              const showDivider =
                firstUnreadEventId != null &&
                message.event_id === firstUnreadEventId &&
                message.username !== username;
              return (
                <li key={message.id} className="list-none">
                  {showDivider ? (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-accent/50" />
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                        New messages
                      </span>
                      <span className="h-px flex-1 bg-accent/50" />
                    </div>
                  ) : null}
                  <MessageItem
                    message={message}
                    grouped={grouped && !showDivider}
                    isOwn={message.username === username}
                    disabled={disabled}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="min-h-6 px-4 pb-1 text-xs text-muted-foreground md:px-6">
        {typingNames.length > 0 ? (
          <span>
            {typingNames.length === 1
              ? `${typingNames[0]} is typing…`
              : `${typingNames.slice(0, 2).join(", ")} are typing…`}
          </span>
        ) : (
          <span className="opacity-0">idle</span>
        )}
      </div>
    </section>
  );
}

function MessageItem({
  message,
  grouped,
  isOwn,
  disabled,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  grouped: boolean;
  isOwn: boolean;
  disabled: boolean;
  onEdit: (id: string, message: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.message);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(message.message);
  }, [message.message, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const deleted = Boolean(message.deleted);
  const canMutate = isOwn && !deleted && !disabled;

  function save() {
    const next = draft.trim();
    if (!next || next === message.message) {
      setEditing(false);
      setDraft(message.message);
      return;
    }
    onEdit(message.id, next);
    setEditing(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
      setDraft(message.message);
    }
  }

  return (
    <div className={cn(grouped ? "pl-11" : "flex gap-3", "group relative")}>
      {grouped ? null : <Avatar name={message.username} />}
      <div className="min-w-0 flex-1">
        {grouped ? null : (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-sm font-medium">{message.username}</span>
            <time className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatTime(message.created_at)}
            </time>
            {message.edited_at && !deleted ? (
              <span className="text-xs text-muted-foreground">(edited)</span>
            ) : null}
          </div>
        )}
        {grouped && message.edited_at && !deleted && !editing ? (
          <p className="-mt-1 mb-0.5 font-mono text-xs text-muted-foreground">(edited)</p>
        ) : null}
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={draft}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Edit message"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button
              type="button"
              size="icon"
              className="size-10 shrink-0 rounded-md"
              onClick={save}
              aria-label="Save edit"
            >
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-md"
              onClick={() => {
                setEditing(false);
                setDraft(message.message);
              }}
              aria-label="Cancel edit"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : deleted ? (
          <p className="text-sm italic text-muted-foreground">This message was deleted.</p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/95">
            {message.message}
          </p>
        )}
        {canMutate && !editing ? (
          <div
            className={cn(
              "mt-1 flex items-center gap-1",
              "md:absolute md:right-0 md:top-0 md:mt-0 md:rounded-md md:border md:border-border md:bg-surface md:p-0.5",
              "md:opacity-0 md:transition-opacity md:duration-[var(--motion-quick)] md:group-hover:opacity-100 md:group-focus-within:opacity-100",
            )}
          >
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  className="h-10 px-2 text-xs font-medium text-danger hover:underline md:h-8"
                  onClick={() => {
                    onDelete(message.id);
                    setConfirmDelete(false);
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="h-10 px-2 text-xs text-muted-foreground hover:text-foreground md:h-8"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-md md:size-8"
                  onClick={() => {
                    setConfirmDelete(false);
                    setEditing(true);
                  }}
                  aria-label="Edit message"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-md text-danger hover:text-danger md:size-8"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete message"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
