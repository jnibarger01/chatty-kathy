import { useState, type FormEvent } from "react";
import { ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeUsername } from "@/lib/chat/identity";

export function GateScreen({ onEnter }: { onEnter: (username: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
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

  return (
    <main className="relay-grain relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="stagger-in w-full max-w-md">
        <p className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-accent">
          <Radio className="size-3.5" />
          FastAPI · WebSockets
        </p>
        <h1 className="font-display text-5xl font-medium tracking-[-0.03em] text-foreground sm:text-6xl">
          Relay
        </h1>
        <p className="mt-3 max-w-sm text-base text-muted-foreground">
          Persistent rooms. Instant messages. Open another tab to watch presence,
          typing, and fan-out happen live.
        </p>
        <form onSubmit={submit} className="mt-10 flex flex-col gap-3">
          <label htmlFor="username" className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Display name
          </label>
          <Input
            id="username"
            autoFocus
            autoComplete="nickname"
            placeholder="Ada Lovelace"
            value={value}
            maxLength={24}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" size="lg" className="mt-2 h-12 justify-between px-5">
            Enter the rooms
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <ol className="mt-12 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
          <li>
            <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-accent">01</span>
            Socket stays open
          </li>
          <li>
            <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-accent">02</span>
            Events, not polling
          </li>
          <li>
            <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-accent">03</span>
            Rooms isolate fan-out
          </li>
        </ol>
      </div>
    </main>
  );
}
