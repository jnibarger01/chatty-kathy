import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Composer({
  disabled,
  roomName,
  onSend,
  onTyping,
}: {
  disabled: boolean;
  roomName: string;
  onSend: (message: string) => void;
  onTyping: () => void;
}) {
  const [value, setValue] = useState("");

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-t border-border bg-surface px-3 py-3 md:px-5"
    >
      <input
        value={value}
        maxLength={2000}
        disabled={disabled}
        placeholder={`Message ${roomName}`}
        onChange={(event) => {
          setValue(event.target.value);
          onTyping();
        }}
        onKeyDown={onKeyDown}
        className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-bg px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
      />
      <Button type="submit" size="icon" className="size-12 rounded-lg" disabled={disabled || !value.trim()}>
        <Send className="size-4" />
        <span className="sr-only">Send</span>
      </Button>
    </form>
  );
}
