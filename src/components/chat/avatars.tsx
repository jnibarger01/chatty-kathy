import { cn } from "@/lib/utils";
import { initials, toneIndex } from "@/lib/chat/identity";

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "sm" ? "size-7 text-[10px]" : "size-8 text-[11px]",
        `avatar-tone-${toneIndex(name)}`,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
