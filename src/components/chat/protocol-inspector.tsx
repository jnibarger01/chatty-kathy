import { useChatStore } from "@/lib/chat/store";
import { cn } from "@/lib/utils";

export function ProtocolInspector() {
  const events = useChatStore((s) => s.events);
  const open = useChatStore((s) => s.inspectorOpen);
  if (!open) return null;

  return (
    <aside className="max-h-48 overflow-y-auto border-t border-border bg-bg px-4 py-3 font-mono text-[11px] leading-relaxed md:max-h-56">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Live protocol
      </p>
      <ol className="space-y-1">
        {events.length === 0 ? (
          <li className="text-muted-foreground">Events will appear here as they cross the socket.</li>
        ) : (
          events
            .slice()
            .reverse()
            .map((event, index) => (
              <li key={`${event.at}-${index}`} className="flex gap-2">
                <span
                  className={cn(
                    "w-6 shrink-0",
                    event.direction === "in" ? "text-accent" : "text-warn",
                  )}
                >
                  {event.direction === "in" ? "IN" : "OUT"}
                </span>
                <span className="text-foreground">{event.type}</span>
                {event.room_id ? (
                  <span className="text-muted-foreground">#{event.room_id}</span>
                ) : null}
              </li>
            ))
        )}
      </ol>
    </aside>
  );
}
