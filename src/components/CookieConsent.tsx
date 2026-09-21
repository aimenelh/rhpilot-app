"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Logomark, Wordmark } from "@/components/Brand";

const STORAGE_KEY = "rhpilot.cookie-consent.v1";
const COOKIE_MASCOT_SRC = "data:image/webp;base64,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";

type ConsentPreferences = {
  analytics: boolean;
  version: 1;
  updatedAt: string;
};

function readConsent(): ConsentPreferences | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    if (parsed.version !== 1 || typeof parsed.analytics !== "boolean") return null;
    return parsed as ConsentPreferences;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    setAnalyticsChoice(saved?.analytics ?? false);
    setReady(true);
  }, []);

  function saveConsent(analytics: boolean) {
    const next: ConsentPreferences = {
      analytics,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Le choix reste appliqué pour la session même si le stockage est indisponible.
    }

    setConsent(next);
    setAnalyticsChoice(analytics);
    setCustomizing(false);
  }

  return (
    <>
      {consent?.analytics ? <Analytics /> : null}

      {ready && !consent ? (
        <section
          role="dialog"
          aria-label="Choix des cookies"
          aria-describedby="rhpilot-cookie-description"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-xl border border-surface-border bg-white px-5 pb-5 pt-6 shadow-elevated sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0 sm:w-[560px] sm:px-7 sm:pb-7 sm:pt-7"
        >
          <img
            src={COOKIE_MASCOT_SRC}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -top-[86px] right-4 hidden h-auto w-[190px] select-none sm:block"
          />

          <div className="flex items-center gap-2.5">
            <Logomark size={34} />
            <Wordmark />
          </div>

          <h2 className="mt-5 pr-0 text-[1.55rem] font-bold leading-tight tracking-tight text-ink sm:pr-28 sm:text-[1.7rem]">
            On vous laisse choisir les cookies <span aria-hidden="true">🍪</span>
          </h2>

          <p id="rhpilot-cookie-description" className="mt-3 text-[15px] leading-6 text-ink-soft">
            RH Pilot utilise des cookies et technologies similaires de mesure d’audience
            pour comprendre l’utilisation du site et l’améliorer. Les éléments strictement
            nécessaires au fonctionnement restent actifs.
          </p>

          {customizing ? (
            <div className="mt-5 rounded-xl border border-surface-border bg-surface-subtle p-4">
              <div className="flex items-start justify-between gap-5 border-b border-surface-border pb-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Cookies nécessaires</p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Connexion, sécurité et fonctionnement essentiel de RH Pilot.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                  Toujours actifs
                </span>
              </div>

              <div className="flex items-center justify-between gap-5 pt-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Mesure d’audience</p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Nous aide à comprendre les pages consultées et à améliorer le site.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsChoice}
                  onClick={() => setAnalyticsChoice((value) => !value)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                    analyticsChoice
                      ? "border-brand-primary bg-brand-primary"
                      : "border-surface-border bg-white"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-[18px] w-[18px] rounded-full bg-white shadow-card transition-transform ${
                      analyticsChoice ? "translate-x-[25px]" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Autoriser la mesure d’audience</span>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/cookies"
                  className="text-xs font-medium text-ink-soft underline decoration-surface-border underline-offset-4 transition-colors hover:text-ink"
                >
                  En savoir plus
                </Link>
                <button
                  type="button"
                  onClick={() => saveConsent(analyticsChoice)}
                  className="min-h-[42px] rounded-md bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                >
                  Enregistrer mes choix
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => saveConsent(true)}
                  className="min-h-[46px] rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={() => saveConsent(false)}
                  className="min-h-[46px] rounded-md border border-surface-border bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
                >
                  Refuser
                </button>
              </div>

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setCustomizing(true)}
                  className="text-sm font-medium text-brand-primary underline decoration-brand-primary/35 underline-offset-4 transition-colors hover:text-brand-primary-dark"
                >
                  Personnaliser
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
