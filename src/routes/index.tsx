import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/chat-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ChatApp />;
}
