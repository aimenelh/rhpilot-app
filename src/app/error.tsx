"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logomark } from "@/components/Brand";

// Page d'erreur du site et de l'espace salarié (le tableau de bord a la sienne).
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-6 text-center">
      <Logomark size={40} />
      <h1 className="mt-6 text-2xl font-semibold text-ink">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink-soft">
        Une erreur est survenue de notre côté. Réessayez dans un instant ; si le problème revient, écrivez-nous à{" "}
        <a href="mailto:contact@rhpilot.fr" className="font-medium text-brand-primary hover:underline">contact@rhpilot.fr</a>
        {error.digest ? <> en indiquant le code {error.digest}</> : null}.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-dark">
          Réessayer
        </button>
        <Link href="/" className="rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
