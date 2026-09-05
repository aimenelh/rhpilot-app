"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 2500;
const MAX_AUTO_RETRIES = 20; // ~50 secondes avant de proposer un geste manuel

export function InitializingScreen() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt >= MAX_AUTO_RETRIES) return;
    const timeout = setTimeout(() => {
      setAttempt((a) => a + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [attempt, router]);

  const tookLong = attempt >= MAX_AUTO_RETRIES;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {!tookLong && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        )}
        <p className="text-sm text-ink-soft">
          {tookLong
            ? "L'initialisation prend plus longtemps que prévu."
            : "Initialisation de votre compte en cours..."}
        </p>
        {tookLong && (
          <button
            type="button"
            onClick={() => {
              setAttempt(0);
              router.refresh();
            }}
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}
