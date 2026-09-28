"use client";

import { useFormState, useFormStatus } from "react-dom";
import { reopenPayrollPeriodAction, type PayrollReopenFormState } from "./periodActions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-lg border border-accent-amber/40 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent-amber/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Réouverture en cours…" : "Rouvrir pour correction"}
    </button>
  );
}

/**
 * Réouverture d'un mois clôturé. Mise en page empilée : le bloc vit dans une
 * colonne étroite à côté des bulletins et ne doit jamais déborder.
 */
export default function PayrollReopenButton({
  periodId,
  disabledReason,
}: {
  periodId: string;
  disabledReason: string | null;
}) {
  const [state, formAction] = useFormState<PayrollReopenFormState, FormData>(
    reopenPayrollPeriodAction,
    undefined,
  );

  if (disabledReason) {
    return <p className="rounded-lg bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-soft">{disabledReason}</p>;
  }

  return (
    <form action={formAction} className="min-w-0 space-y-3">
      <input type="hidden" name="periodId" value={periodId} />
      <div>
        <label htmlFor={`reopen-reason-${periodId}`} className="text-sm font-medium text-ink">Motif de la correction</label>
        <input
          id={`reopen-reason-${periodId}`}
          name="reason"
          required
          maxLength={500}
          placeholder="Ex. prime oubliée pour Antoine Perrot"
          className="mt-1.5 w-full min-w-0 rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>
      <SubmitButton />
      <p className="text-xs leading-5 text-ink-faint">Le mois repasse en brouillon et la réouverture est inscrite dans le journal d&apos;audit.</p>

      {state?.error ? (
        <p className="rounded-md bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
