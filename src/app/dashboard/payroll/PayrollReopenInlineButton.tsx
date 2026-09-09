"use client";

import { useFormState, useFormStatus } from "react-dom";
import { reopenPayrollPeriodAction, type PayrollReopenFormState } from "./periodActions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-accent-amber/40 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-accent-amber/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Réouverture…" : "Réouvrir"}
    </button>
  );
}

export default function PayrollReopenInlineButton({ periodId }: { periodId: string }) {
  const [state, formAction] = useFormState<PayrollReopenFormState, FormData>(
    reopenPayrollPeriodAction,
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={formAction} className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <input type="hidden" name="periodId" value={periodId} />
        <input
          name="reason"
          required
          maxLength={500}
          placeholder="Motif de correction"
          aria-label="Motif de correction"
          className="w-40 rounded-lg border border-surface-border bg-white px-2.5 py-2 text-xs text-ink placeholder:text-ink-faint"
          onClick={(event) => event.stopPropagation()}
        />
        <SubmitButton />
      </form>
      {state?.error ? (
        <p className="max-w-xs text-right text-[11px] text-accent-amber" role="alert">{state.error}</p>
      ) : null}
    </div>
  );
}
