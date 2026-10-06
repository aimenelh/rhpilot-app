"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/** Oriente chaque blocage vers l'écran où il se corrige. */
function fixFor(message: string, periodId: string): { href: string; label: string } | null {
  const period = (sub: string) => `/dashboard/payroll/${periodId}?tab=saisie&sub=${sub}`;
  if (/fiche de sortie|partie déclarative|fin de contrat/i.test(message)) return { href: period("mouvements"), label: "Compléter la fiche de sortie" };
  if (/primes? non mensuelle|nature DSN/i.test(message)) return { href: period("variables"), label: "Qualifier les primes du mois" };
  if (/IJSS estimées|décompte CPAM/i.test(message)) return { href: period("absences"), label: "Saisir les IJSS de l'attestation" };
  if (/recalcul|rouvrez la saisie/i.test(message)) return { href: `/dashboard/payroll/${periodId}`, label: "Ouvrir le mois de paie" };
  if (/contact DSN|SEPA|mandat|organismes Urssaf|IBAN|BIC|code APEN|NAF|émetteur/i.test(message)) return { href: "#entreprise", label: "Compléter les informations de l'entreprise" };
  if (/profil|NIR|nature du contrat|dispositif|diplôme|code risque|lieu de travail|quotité|affiliation|motif de recours|naissance/i.test(message)) return { href: "#salaries", label: "Compléter les profils DSN des salariés" };
  return null;
}

export default function DsnExportButton({ periodId }: { periodId: string }) {
  const router = useRouter();
  const requestKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fix = error ? fixFor(error, periodId) : null;

  async function download() {
    setPending(true);
    setError(null);
    try {
      requestKey.current ??= crypto.randomUUID();
      const response = await fetch(`/api/payroll/periods/${periodId}/dsn?mode=test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test", requestKey: requestKey.current }),
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Préparation DSN impossible (${response.status}).`);
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const fileName = match?.[1] ?? "dsn-P26V01-essai.txt";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      requestKey.current = null;
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de préparer la DSN.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/40"
      >
        {pending ? "Contrôle en cours…" : "Générer le fichier d'essai"}
      </button>
      {error ? (
        <div className="max-w-xl rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3 py-2.5 text-sm leading-5 text-ink-soft md:text-right" role="alert">
          <p>{error.replace(/^DSN bloquée( pour [^:]+)? : /, (_, who: string | undefined) => (who ? `Bloqué${who} : ` : ""))}</p>
          {fix ? <Link href={fix.href} className="mt-1.5 inline-block font-semibold text-brand-primary hover:underline">{fix.label}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
