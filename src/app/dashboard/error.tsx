"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Page d'erreur de l'espace connecté. Sans elle, Next affiche un écran blanc
 * en anglais. Le menu reste visible (la mise en page du tableau de bord n'est
 * pas remplacée) et le code affiché permet de retrouver l'erreur dans les logs.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <h1 className="text-lg font-semibold text-ink">Cette page n&apos;a pas pu s&apos;afficher</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Une erreur est survenue de notre côté. Réessayez dans un instant ; si le problème revient, envoyez-nous le code
          ci-dessous avec « Envoyer un retour ».
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-lg bg-surface-subtle px-3 py-2 font-mono text-xs text-ink-soft">Code : {error.digest}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>Réessayer</Button>
          <Button asChild variant="secondary"><Link href="/dashboard">Retour au tableau de bord</Link></Button>
        </div>
      </Card>
    </div>
  );
}
