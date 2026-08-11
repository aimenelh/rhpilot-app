"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-surface-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-ink">{question}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{children}</p>
      )}
    </div>
  );
}
