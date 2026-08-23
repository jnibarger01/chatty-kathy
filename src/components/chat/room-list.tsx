import { Hash, Plus } from "lucide-react";
import { Avatar } from "@/components/chat/avatars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/chat/protocol";

function RoomButton({
  room,
  active,
  count,
  onSelect,
}: {
  room: Room;
  active: boolean;
  count: number;
  onSelect: (roomId: string) => void;
}) {
  const unread = room.unread_count ?? 0;
  const dm = room.kind === "dm";
  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors duration-[var(--motion-quick)]",
        active
          ? "bg-muted text-foreground"
          : unread
            ? "text-foreground hover:bg-muted/60"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {dm ? (
        <Avatar name={room.peer || room.name} size="sm" />
      ) : (
        <Hash className="size-3.5 shrink-0" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          unread ? "font-semibold" : "font-medium",
        )}
      >
        {dm ? room.peer || room.name : room.name}
      </span>
      {unread > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-xs tabular-nums text-accent-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

export function RoomList({
  rooms,
  activeRoomId,
  members,
  onSelect,
  onCreate,
}: {
  rooms: Room[];
  activeRoomId: string | null;
  members: Record<string, string[]>;
  onSelect: (roomId: string) => void;
  onCreate: () => void;
}) {
  const channels = rooms.filter((room) => room.kind !== "dm");
  const directs = rooms.filter((room) => room.kind === "dm");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Rooms
        </h2>
        <Button variant="ghost" size="icon" className="size-9" onClick={onCreate} aria-label="New room">
          <Plus className="size-4" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {channels.map((room) => (
          <RoomButton
            key={room.id}
            room={room}
            active={room.id === activeRoomId}
            count={members[room.id]?.length ?? room.member_count}
            onSelect={onSelect}
          />
        ))}
        <h2 className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Direct
        </h2>
        {directs.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Click someone online to start a thread. Messages go to their socket, not the room.
          </p>
        ) : (
          directs.map((room) => (
            <RoomButton
              key={room.id}
              room={room}
              active={room.id === activeRoomId}
              count={members[room.id]?.length ?? room.member_count}
              onSelect={onSelect}
            />
          ))
        )}
      </nav>
    </div>
  );
}
