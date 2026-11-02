"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function AuthModal({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="auth-modal"
      aria-labelledby="auth-title"
      onCancel={(event) => {
        event.preventDefault();
        router.back();
      }}
    >
      <button
        type="button"
        className="auth-modal-close"
        onClick={() => router.back()}
      >
        <X size={20} /> Tutup
      </button>
      {children}
    </dialog>
  );
}
