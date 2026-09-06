"use client";

import { useFormState, useFormStatus } from "react-dom";
import { validatePayrollPeriodAction, type PayrollValidationFormState } from "./periodActions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Validation en cours…" : "Valider la période"}
    </button>
  );
}

export default function PayrollValidateButton({
  periodId,
  disabled,
}: {
  periodId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState<PayrollValidationFormState, FormData>(
    validatePayrollPeriodAction,
    undefined,
  );

  return (
    <div className="mt-5 rounded-lg border border-accent-teal/30 bg-accent-teal/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Validation de la période</p>
          <p className="mt-1 text-xs text-ink-faint">
            La validation confirme que tous les calculs requis sont présents et cohérents avant verrouillage.
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
