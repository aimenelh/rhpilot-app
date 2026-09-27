"use client";

import { useState, useTransition } from "react";
import { setPaperPayslipPreference } from "../../actions";

export function PaperToggle({ paper }: { paper: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const apply = (next: boolean) => startTransition(async () => {
    const result = await setPaperPayslipPreference(next);
    setConfirming(false);
    setMessage(result?.error ? { tone: "error", text: result.error } : { tone: "ok", text: result?.success ?? "Enregistré." });
  });

  return (
    <div>
      {paper ? (
        <button type="button" disabled={pending} onClick={() => apply(false)} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-surface-border bg-white px-4 text-[15px] font-semibold text-ink hover:bg-surface-subtle disabled:opacity-60 sm:w-auto">
          {pending ? "Enregistrement…" : "Revenir au bulletin électronique"}
        </button>
      ) : confirming ? (
        <div className="rounded-xl border border-surface-border p-4">
          <p className="text-sm leading-6 text-ink-soft">Vos prochains bulletins vous seront remis sur papier et n&apos;arriveront plus dans cet espace. Les bulletins déjà publiés restent consultables ici.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={pending} onClick={() => apply(true)} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-ink px-4 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-60">{pending ? "Enregistrement…" : "Confirmer le papier"}</button>
            <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-[15px] font-semibold text-ink-soft hover:bg-surface-subtle">Annuler</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-surface-border bg-white px-4 text-[15px] font-semibold text-ink hover:bg-surface-subtle sm:w-auto">
          Recevoir mes bulletins sur papier
        </button>
      )}
      {message ? <p role="status" className={`mt-3 text-sm ${message.tone === "ok" ? "text-accent-teal" : "text-accent-rose"}`}>{message.text}</p> : null}
    </div>
  );
}
