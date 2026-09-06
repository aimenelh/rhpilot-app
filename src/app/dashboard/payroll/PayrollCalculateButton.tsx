"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  calculatePayrollPeriodAction,
  movePayrollPeriodToReviewAction,
  type PayrollCalculationFormState,
  type PayrollReviewFormState,
} from "./periodActions";

function CalculateSubmitButton({ disabled }: { disabled: boolean }) {
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

function ReviewSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Ouverture du contrôle…" : "Passer au contrôle"}
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
  const [calculationState, calculationFormAction] = useFormState<
    PayrollCalculationFormState,
    FormData
  >(calculatePayrollPeriodAction, undefined);
  const [reviewState, reviewFormAction] = useFormState<PayrollReviewFormState, FormData>(
    movePayrollPeriodToReviewAction,
    undefined,
  );

  const isReferenceOnlyRule = ruleCode === "FR.SMIC.MONTHLY_GROSS";
  const calculationUnavailable = disabled || isReferenceOnlyRule;
  const error = calculationState?.error ?? reviewState?.error;

  return (
    <div className="mt-5 rounded-lg border border-surface-border bg-surface-subtle/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">
            {isReferenceOnlyRule ? "Référentiel SMIC" : "Calcul de la période"}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {isReferenceOnlyRule
              ? "Le référentiel SMIC sert au contrôle du minimum de rémunération. Il ne constitue pas à lui seul un jeu complet de règles de calcul de paie."
              : "Le calcul utilise uniquement les règles validées disponibles dans le référentiel."}
          </p>
        </div>

        {isReferenceOnlyRule ? null : (
          <div className="flex flex-wrap gap-2">
            <form action={calculationFormAction}>
              <input type="hidden" name="periodId" value={periodId} />
              <input type="hidden" name="ruleCode" value={ruleCode} />
              <input type="hidden" name="ruleScope" value={ruleScope} />
              <CalculateSubmitButton disabled={calculationUnavailable} />
            </form>

            {calculationUnavailable ? (
              <form action={reviewFormAction}>
                <input type="hidden" name="periodId" value={periodId} />
                <ReviewSubmitButton />
              </form>
            ) : null}
          </div>
        )}
      </div>

      {isReferenceOnlyRule ? (
        <p className="mt-3 rounded-md bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="status">
          Données salarié prêtes. Aucun jeu complet de règles sociales validé n&apos;est actuellement disponible pour lancer le calcul.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
