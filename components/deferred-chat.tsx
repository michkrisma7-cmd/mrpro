"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Plus } from "lucide-react";
import "./chat-widget.css";

function Launcher({
  onClick,
  loading = false,
}: {
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="mr-chat">
      <button
        type="button"
        className="mr-chat-launcher"
        onClick={onClick}
        aria-label={loading ? "Menyiapkan Chat" : "Buka Chat"}
        aria-busy={loading}
        disabled={loading}
      >
        <MessageCircle size={22} strokeWidth={1.7} />
        <span>{loading ? "Memuat…" : "Chat"}</span>
        <span className="mr-chat-launcher-plus">
          <Plus size={14} />
        </span>
      </button>
    </div>
  );
}

const Chat = dynamic(
  () => import("./chat-widget").then((module) => module.ChatWidget),
  {
    loading: () => <Launcher loading />,
  },
);

export function DeferredChat({ whatsapp }: { whatsapp: string }) {
  const path = usePathname();
  const [activated, setActivated] = useState(false);
  if (path.startsWith("/admin") || path.startsWith("/login")) return null;
  return activated ? (
    <Chat whatsapp={whatsapp} initiallyOpen />
  ) : (
    <Launcher onClick={() => setActivated(true)} />
  );
}
