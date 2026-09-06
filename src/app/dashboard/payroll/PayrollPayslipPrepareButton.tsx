"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  preparePayrollPayslipsAction,
  type PayrollPayslipPreparationFormState,
} from "./periodActions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Préparation en cours…" : "Préparer les bulletins"}
    </button>
  );
}

export default function PayrollPayslipPrepareButton({
  periodId,
  disabled,
}: {
  periodId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState<PayrollPayslipPreparationFormState, FormData>(
    preparePayrollPayslipsAction,
    undefined,
  );

  return (
    <div className="mt-5 rounded-lg border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Bulletins de paie</p>
          <p className="mt-1 text-xs text-ink-faint">
            Les bulletins sont préparés à partir des calculs verrouillés. Le PDF sera généré depuis ces données figées.
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
