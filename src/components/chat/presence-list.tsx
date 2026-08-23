import { Avatar } from "@/components/chat/avatars";

export function PresenceList({
  members,
  username,
  onMessage,
}: {
  members: string[];
  username: string | null;
  onMessage?: (name: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          In this room
        </h2>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          {members.length} online
        </p>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {members.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No one here yet.</li>
        ) : (
          members.map((name) => {
            const self = name === username;
            const inner = (
              <>
                <span className="relative">
                  <Avatar name={name} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success" />
                </span>
                <span className="min-w-0 truncate">
                  {name}
                  {self ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">you</span>
                  ) : (
                    <span className="ml-1.5 text-xs text-muted-foreground">message</span>
                  )}
                </span>
              </>
            );
            return (
              <li key={name}>
                {self || !onMessage ? (
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm">{inner}</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMessage(name)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
