import { Badge } from "@/components/ui/badge";
import type { ConnectionStatus } from "@/lib/chat/protocol";

const LABEL: Record<ConnectionStatus, string> = {
  idle: "Idle",
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  disconnected: "Disconnected",
};

const VARIANT: Record<ConnectionStatus, "default" | "connected" | "reconnecting" | "disconnected"> =
  {
    idle: "default",
    connecting: "reconnecting",
    connected: "connected",
    reconnecting: "reconnecting",
    disconnected: "disconnected",
  };

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const pulse = status === "reconnecting" || status === "connecting";
  return (
    <Badge variant={VARIANT[status]} className="gap-1.5 uppercase tracking-[0.14em]">
      <span className="status-dot" data-pulse={pulse ? "true" : "false"} />
      {LABEL[status]}
    </Badge>
  );
}
