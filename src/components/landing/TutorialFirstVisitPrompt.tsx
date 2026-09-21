"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle, X } from "lucide-react";
import { Logomark } from "@/components/Brand";

const PROMPT_STORAGE_KEY = "rhpilot.tutorial-prompt.v1";
const COOKIE_STORAGE_KEY = "rhpilot.cookie-consent.v1";

function hasStoredValue(key: string) {
  try {
    return Boolean(window.localStorage.getItem(key));
  } catch {
    return false;
  }
}

export function TutorialFirstVisitPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasStoredValue(PROMPT_STORAGE_KEY)) return;

    let showTimer: number | null = null;

    const schedulePrompt = () => {
      if (showTimer !== null) return;
      showTimer = window.setTimeout(() => {
        if (!hasStoredValue(PROMPT_STORAGE_KEY)) setVisible(true);
      }, 3200);
    };

    if (hasStoredValue(COOKIE_STORAGE_KEY)) {
      schedulePrompt();
    } else {
      const consentWatcher = window.setInterval(() => {
        if (hasStoredValue(COOKIE_STORAGE_KEY)) {
          window.clearInterval(consentWatcher);
          schedulePrompt();
        }
      }, 400);

      return () => {
        window.clearInterval(consentWatcher);
        if (showTimer !== null) window.clearTimeout(showTimer);
      };
    }

    return () => {
      if (showTimer !== null) window.clearTimeout(showTimer);
    };
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(PROMPT_STORAGE_KEY, "seen");
    } catch {
      // Le composant reste utilisable même si le stockage local est bloqué.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label="Découvrir les tutoriels RH Pilot"
      className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-md rounded-xl border border-surface-border bg-white p-5 shadow-elevated sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0 sm:w-[410px] sm:p-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink"
      >
        <X size={18} />
      </button>

      <div className="flex items-center gap-3 pr-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F6F4EE]">
          <Logomark size={28} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
            Guide vidéo
          </p>
          <p className="text-sm font-semibold text-ink">Première visite sur RH Pilot ?</p>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-6 text-ink-soft">
        Retrouvez le logiciel en vidéo : dossiers salariés, personnalisation des
        parcours et suivi des échéances.
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_auto]">
        <Link
          href="/tutoriels"
          onClick={dismiss}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
        >
          <PlayCircle size={17} />
          Voir les tutoriels
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] rounded-md border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
        >
          Continuer sur le site
        </button>
      </div>
    </aside>
  );
}
