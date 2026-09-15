"use client";

import { useState } from "react";

export default function DsnExportButton({ periodId }: { periodId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/payroll/periods/${periodId}/dsn?mode=test`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Préparation DSN impossible (${response.status}).`);
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const fileName = match?.[1] ?? "dsn-P26V01-precontrole.txt";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de préparer la DSN.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Contrôle des prérequis…" : "Générer la DSN de pré-contrôle"}
      </button>
      {error ? <p className="max-w-xl rounded-lg bg-accent-amber/10 px-3 py-2 text-sm leading-5 text-accent-amber" role="alert">{error}</p> : null}
    </div>
  );
}
