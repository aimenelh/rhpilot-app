"use client";

import { useEffect, useState } from "react";
import { Newspaper, X } from "lucide-react";
import type { RhNewsItem } from "@/lib/rhNews";

const STORAGE_KEY = "rhpilot_news_last_shown";
const APPEAR_DELAY_MS = 4000;

export function RhNewsToast({ items }: { items: RhNewsItem[] }) {
  const [visible, setVisible] = useState(false);
  const [item, setItem] = useState<RhNewsItem | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const lastShown = window.localStorage.getItem(STORAGE_KEY);
    if (lastShown === today) return;

    // Un article différent chaque jour plutôt que toujours le même,
    // sans dépendre d'un vrai tirage aléatoire (la date suffit à
    // varier le choix de façon stable pour toute la journée).
    const dayIndex = new Date().getDate() % items.length;
    setItem(items[dayIndex]);

    const timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items]);

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
  }

  if (!item || !visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 w-80 animate-[newsIn_0.4s_ease-out_both]">
      <style>{`
        @keyframes newsIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .animate-\\[newsIn_0\\.4s_ease-out_both\\] { animation: none; } }
      `}</style>
      <div className="relative rounded-xl border border-surface-border bg-white p-4 shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute right-2.5 top-2.5 text-ink-faint hover:text-ink-soft"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-2.5 pr-5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Newspaper size={13} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              Actu RH · {item.source}
            </p>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="mt-1 block text-sm font-medium leading-snug text-ink hover:text-brand-primary"
            >
              {item.title}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
