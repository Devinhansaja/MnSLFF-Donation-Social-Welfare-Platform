"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { btn } from "./ui";
import { cn } from "@/lib/format";

export function SubmitButton({
  children, pendingText = "Please wait…", variant = "primary", size = "md", className, confirm,
}: { children: React.ReactNode; pendingText?: string; variant?: Parameters<typeof btn>[0]; size?: Parameters<typeof btn>[1]; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={btn(variant, size, className)}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

export function Field({
  label, name, error, hint, className, children, required,
}: { label: string; name: string; error?: string; hint?: string; className?: string; children?: React.ReactNode; required?: boolean }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-urgent" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} className="mt-1 text-xs font-medium text-urgent">{error}</p>}
    </div>
  );
}

export function Notice({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700",
      )}
    >
      {state.message}
    </p>
  );
}
