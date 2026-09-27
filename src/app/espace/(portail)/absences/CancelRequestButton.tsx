"use client";

import { useState, useTransition } from "react";
import { cancelAbsenceRequest } from "../../actions";

export function CancelRequestButton({ absenceId }: { absenceId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)} className="min-h-[40px] rounded-lg px-2 text-sm font-semibold text-ink-soft hover:bg-surface-subtle hover:text-ink">Annuler</button>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setConfirming(false)} className="min-h-[40px] rounded-lg px-2 text-sm text-ink-soft hover:bg-surface-subtle">Garder</button>
        <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await cancelAbsenceRequest(absenceId); if (result?.error) setError(result.error); })} className="min-h-[40px] rounded-lg px-2 text-sm font-semibold text-accent-rose hover:bg-accent-rose/5 disabled:opacity-50">
          {pending ? "Annulation…" : "Confirmer l'annulation"}
        </button>
      </div>
      {error ? <p className="text-xs text-accent-rose">{error}</p> : null}
    </div>
  );
}
