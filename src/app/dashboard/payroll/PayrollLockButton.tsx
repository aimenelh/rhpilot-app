"use client";

import { useFormState, useFormStatus } from "react-dom";
import { lockPayrollPeriodAction, type PayrollLockFormState } from "./periodActions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Verrouillage en cours…" : "Verrouiller la période"}
    </button>
  );
}

export default function PayrollLockButton({
  periodId,
  disabled,
}: {
  periodId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState<PayrollLockFormState, FormData>(
    lockPayrollPeriodAction,
    undefined,
  );

  return (
    <div className="mt-5 rounded-lg border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Verrouillage de la période</p>
          <p className="mt-1 text-xs text-ink-faint">
            Le verrouillage fige la période après validation. Toute correction ultérieure devra passer par un nouveau cycle.
          </p>
        </div>
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="periodId" value={periodId} />
          <SubmitButton disabled={disabled} />
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
