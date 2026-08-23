import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Room } from "@/lib/chat/protocol";

export function NewRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (room: Room) => void;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), topic: topic.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail || "Could not create the room.");
      }
      const room = (await response.json()) as Room;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New room</DialogTitle>
          <DialogDescription>
            Rooms are created over HTTP, then announced to every open socket.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground" htmlFor="room-name">
            Name
          </label>
          <Input
            id="room-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Design review"
            maxLength={40}
            required
            minLength={2}
          />
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground" htmlFor="room-topic">
            Topic
          </label>
          <Input
            id="room-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Optional"
            maxLength={160}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            {pending ? "Creating…" : "Create room"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
