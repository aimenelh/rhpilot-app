"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MIN_DURATION_MS = 5000;
const MAX_DURATION_MS = 25000;
const MS_PER_CHARACTER = 90;

function readingDuration(message: string) {
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, message.length * MS_PER_CHARACTER));
}

function FlashToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = searchParams.get("flash");
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    setVisible(true);

    // Nettoie l'URL pour qu'un rechargement de page ne réaffiche pas
    // le message indéfiniment.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("flash");
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, {
      scroll: false,
    });

    timeoutRef.current = setTimeout(() => setVisible(false), readingDuration(message));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setVisible(false), readingDuration(message));
      }}
      className="fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-2.5 rounded-lg border border-surface-border bg-ink px-4 py-3 text-sm font-medium text-white shadow-card"
    >
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
      <p className="leading-5">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fermer"
        className="ml-1 shrink-0 rounded p-0.5 text-white/60 transition-colors hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function FlashToast() {
  // useSearchParams exige une frontière Suspense côté Next.js.
  return (
    <Suspense fallback={null}>
      <FlashToastInner />
    </Suspense>
  );
}
