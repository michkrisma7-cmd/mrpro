"use client";
import { useFormStatus } from "react-dom";
import {
  LoaderCircle,
  ArrowUpRight,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import type { ActionState } from "@/lib/types";
export function SubmitButton({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending || disabled}>
      {pending ? (
        <LoaderCircle size={17} className="spin" />
      ) : (
        <ArrowUpRight size={17} />
      )}{" "}
      {pending ? "Memproses…" : children}
    </button>
  );
}
export function FormMessage({ state }: { state: ActionState }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p className="form-message error" role="alert">
          <CircleAlert size={18} />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-message success">
          <CircleCheck size={18} />
          {state.success}
        </p>
      )}
    </div>
  );
}
