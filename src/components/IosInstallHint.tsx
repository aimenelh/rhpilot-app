"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const STORAGE_KEY = "rhpilot_ios_hint_dismissed";
const APPEAR_DELAY_MS = 2500;

// iOS n'a jamais de bannière d'installation automatique (contrairement à
// Android/Chrome) — c'est une limite d'Apple, pas un manque côté RH
// Pilot. La détection doit être précise : Safari sur iOS spécifiquement
// (pas Chrome iOS, qui ne peut de toute façon pas installer de PWA), et
// jamais si l'app est déjà lancée depuis l'écran d'accueil.
function isIosSafariNotInstalled(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !isOtherIosBrowser && !isStandalone;
}

export function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    if (!isIosSafariNotInstalled()) return;

    const timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    // Contrairement à la carte d'actualités (une fois par jour), ce
    // message ne change jamais de contenu — une fois fermé, il ne
    // revient plus, pour de bon.
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 animate-[iosHintIn_0.3s_ease-out_both]">
      <style>{`
        @keyframes iosHintIn { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .ios-hint-in { animation: none; } }
      `}</style>
      <div className="flex items-center gap-3 bg-ink px-4 py-2.5 text-white shadow-lg">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Share size={13} />
        </span>
        <p className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          Ajoutez RH Pilot à votre écran d&apos;accueil : appuyez sur{" "}
          <Share size={12} className="mb-0.5 inline" aria-label="icône de partage" /> puis sur{" "}
          <strong className="font-semibold">« Sur l&apos;écran d&apos;accueil »</strong>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 text-white/70 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
