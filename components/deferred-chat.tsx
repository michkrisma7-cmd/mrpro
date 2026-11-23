"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Plus } from "lucide-react";
import "./chat-widget.css";
import { WhatsappFloat } from "./whatsapp-float";

function Launcher({
  onClick,
  loading = false,
  whatsapp,
}: {
  onClick?: () => void;
  loading?: boolean;
  whatsapp: string;
}) {
  return (
    <div className="mr-chat">
      <div className="mr-chat-actions">
        <WhatsappFloat whatsapp={whatsapp} />
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
    </div>
  );
}

const Chat = dynamic(
  () => import("./chat-widget").then((module) => module.ChatWidget),
  {
    // Nomor tidak tersedia di sini; WhatsappFloat memakai nomor resmi.
    loading: () => <Launcher loading whatsapp="" />,
  },
);

export function DeferredChat({ whatsapp }: { whatsapp: string }) {
  const path = usePathname();
  const [activated, setActivated] = useState(false);
  if (path.startsWith("/admin") || path.startsWith("/login")) return null;
  return activated ? (
    <Chat whatsapp={whatsapp} initiallyOpen />
  ) : (
    <Launcher whatsapp={whatsapp} onClick={() => setActivated(true)} />
  );
}
