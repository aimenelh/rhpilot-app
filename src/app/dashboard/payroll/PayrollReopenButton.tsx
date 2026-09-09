"use client";

import { useFormState, useFormStatus } from "react-dom";
import { reopenPayrollPeriodAction, type PayrollReopenFormState } from "./periodActions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg border border-accent-amber/40 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent-amber/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Réouverture en cours…" : "Réouvrir pour correction"}
    </button>
  );
}

export default function PayrollReopenButton({
  periodId,
  disabled,
}: {
  periodId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState<PayrollReopenFormState, FormData>(
    reopenPayrollPeriodAction,
    undefined,
  );

  return (
    <div className="mt-5 rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Correction après verrouillage</p>
          <p className="mt-1 text-xs text-ink-faint">
            Réservé aux administrateurs. La réouverture repasse la période en brouillon et est enregistrée dans l&apos;audit.
          </p>
        </div>
        <form
          action={formAction}
          className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input type="hidden" name="periodId" value={periodId} />
          <input
            name="reason"
            required
            maxLength={500}
            placeholder="Motif de correction"
            aria-label="Motif de correction"
            className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint sm:w-64"
          />
          <SubmitButton />
        </form>
      </div>

      {state?.error ? (
        <p className="mt-3 rounded-md bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
