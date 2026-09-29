"use client";

import Link from "next/link";
import { useEffect } from "react";

// Erreur dans l'espace salarié : message simple, adapté au téléphone.
export default function EspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-5 py-12 text-center">
      <h1 className="text-lg font-semibold text-ink">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-soft">Réessayez dans un instant. Vos documents ne sont pas concernés.</p>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-brand-primary px-4 py-3 text-[15px] font-semibold text-white">Réessayer</button>
        <Link href="/espace" className="rounded-xl border border-surface-border px-4 py-3 text-[15px] font-semibold text-ink">Retour à mon espace</Link>
      </div>
      {error.digest ? <p className="mt-6 text-xs text-ink-faint">Code : {error.digest}</p> : null}
    </div>
  );
}
