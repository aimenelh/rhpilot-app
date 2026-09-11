"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  generatePayslipsWithPaymentDateAction,
  type PayrollPayslipGenerationFormState,
} from "./generatePayslipsWithPaymentDateAction";

const bundleUrl = (periodId: string) => `/api/payroll/periods/${encodeURIComponent(periodId)}/payslips`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-w-[210px] items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Préparation des bulletins…" : "Générer et télécharger"}
    </button>
  );
}

function DownloadAfterGeneration({ periodId, state }: { periodId: string; state: PayrollPayslipGenerationFormState }) {
  const { pending } = useFormStatus();
  const completedRequest = useRef(false);

  useEffect(() => {
    if (pending) {
      completedRequest.current = true;
      return;
    }
    if (completedRequest.current && !state?.error) {
      completedRequest.current = false;
      window.location.assign(bundleUrl(periodId));
    }
  }, [pending, periodId, state]);

  return null;
}

export default function PayrollPayslipGenerateButton({ periodId }: { periodId: string }) {
  const [state, formAction] = useFormState<PayrollPayslipGenerationFormState, FormData>(
    generatePayslipsWithPaymentDateAction,
    undefined,
  );

  return (
    <div className="rounded-lg border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">Bulletins de salaire</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-faint ring-1 ring-surface-border">PDF</span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-faint">
            Renseignez la date prévue du versement, puis RH Pilot génère les bulletins à partir des calculs verrouillés et prépare un dossier PDF unique.
          </p>
        </div>

        <form action={formAction} className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-end lg:w-auto">
          <div className="min-w-[190px]">
            <label htmlFor={`payment-date-${periodId}`} className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Date de paiement
            </label>
            <input
              id={`payment-date-${periodId}`}
              name="paymentDate"
              type="date"
              required
              className="h-[42px] w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <input type="hidden" name="periodId" value={periodId} />
          <SubmitButton />
          <DownloadAfterGeneration periodId={periodId} state={state} />
        </form>
      </div>

      {state?.error ? (
        <p className="mt-3 rounded-md border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-surface-border pt-3">
        <a href={bundleUrl(periodId)} className="text-xs font-semibold text-ink-soft underline decoration-surface-border underline-offset-4 transition hover:text-ink">
          Télécharger à nouveau le dossier PDF
        </a>
        <span className="text-xs text-ink-faint">Les bulletins restent disponibles après génération.</span>
      </div>
    </div>
  );
}
