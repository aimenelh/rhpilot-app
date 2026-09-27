"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel, variant = "primary", className = "" }: { children: ReactNode; pendingLabel?: string; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  const styles = variant === "primary"
    ? "bg-brand-primary text-white hover:opacity-90"
    : variant === "danger"
      ? "border border-accent-rose/40 bg-white text-accent-rose hover:bg-accent-rose/5"
      : "border border-surface-border bg-white text-ink hover:bg-surface-subtle";
  return (
    <button type="submit" disabled={pending} className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}>
      {pending ? pendingLabel ?? "Un instant…" : children}
    </button>
  );
}
