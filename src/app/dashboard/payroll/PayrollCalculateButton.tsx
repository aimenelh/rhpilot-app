"use client";

import { useFormState, useFormStatus } from "react-dom";
import { calculatePayrollPeriodAction, type PayrollCalculationFormState } from "./periodActions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Calcul en cours…" : "Calculer la période"}
    </button>
  );
}

export default function PayrollCalculateButton({
  periodId,
  disabled,
  ruleCode,
  ruleScope,
}: {
  periodId: string;
  disabled: boolean;
  ruleCode: string;
  ruleScope: string;
}) {
  const [state, formAction] = useFormState<PayrollCalculationFormState, FormData>(
    calculatePayrollPeriodAction,
    undefined,
  );

  return (
    <div className="mt-5 rounded-lg border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Calcul de la période</p>
          <p className="mt-1 text-xs text-ink-faint">
            Le calcul utilise uniquement les règles validées disponibles dans le référentiel.
          </p>
        </div>
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="periodId" value={periodId} />
          <input type="hidden" name="ruleCode" value={ruleCode} />
          <input type="hidden" name="ruleScope" value={ruleScope} />
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
