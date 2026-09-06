"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  generatePayrollPayslipsAction,
  type PayrollPayslipGenerationFormState,
} from "./generatePayslipsAction";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Génération en cours…" : "Générer les PDF"}
    </button>
  );
}

export default function PayrollPayslipGenerateButton({ periodId }: { periodId: string }) {
  const [state, formAction] = useFormState<PayrollPayslipGenerationFormState, FormData>(
    generatePayrollPayslipsAction,
    undefined,
  );

  return (
    <div className="mt-4 rounded-lg border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Génération des bulletins</p>
          <p className="mt-1 text-xs text-ink-faint">
            Le PDF est produit uniquement depuis les calculs verrouillés et les données réglementaires disponibles.
          </p>
        </div>
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="periodId" value={periodId} />
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
