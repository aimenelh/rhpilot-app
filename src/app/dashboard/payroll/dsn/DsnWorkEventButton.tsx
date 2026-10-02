"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DsnWorkEventNature } from "@/lib/payroll/dsn-work-event";

export default function DsnWorkEventButton({ absenceId, anticipatedRecovery }: { absenceId: string; anticipatedRecovery: boolean }) {
  const router = useRouter();
  const keys = useRef<Partial<Record<DsnWorkEventNature, string>>>({});
  const [pending, setPending] = useState<DsnWorkEventNature | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function download(nature: DsnWorkEventNature) {
    if (pending) return;
    setPending(nature);
    setError(null);
    try {
      keys.current[nature] ??= crypto.randomUUID();
      const response = await fetch(`/api/payroll/absences/${absenceId}/dsn?mode=test`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test", nature, requestKey: keys.current[nature] }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Impossible de préparer le signalement.");
      }
      const fileName = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/i)?.[1] ?? "dsn-signalement-precontrole.txt";
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      delete keys.current[nature];
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de préparer le signalement."); }
    finally { setPending(null); }
  }
  return <div className="flex flex-col items-start gap-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending !== null} onClick={() => download("04")} className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending === "04" ? "Préparation…" : "Pré-contrôler l'arrêt"}</button>
      {anticipatedRecovery && <button type="button" disabled={pending !== null} onClick={() => download("05")} className="rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink disabled:opacity-50">{pending === "05" ? "Préparation…" : "Pré-contrôler la reprise anticipée"}</button>}
    </div>
    {error && <p role="alert" className="max-w-xl rounded-lg bg-accent-amber/10 px-3 py-2 text-sm leading-5 text-accent-amber">{error}</p>}
  </div>;
}
