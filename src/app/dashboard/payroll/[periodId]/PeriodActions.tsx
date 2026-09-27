"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, LockKeyhole, Undo2 } from "lucide-react";
import { backToEntryAction, closePayrollPeriodAction, runPayrollCalculation } from "../entryActions";

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="mt-3 rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3 py-2 text-sm leading-6 text-accent-rose">{message}</p>;
}

export function RunCalculationButton({ periodId, ruleCode, ruleScope, alreadyCalculated, disabled, nextHref }: { periodId: string; ruleCode: string; ruleScope: string; alreadyCalculated: boolean; disabled?: boolean; nextHref: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => startTransition(async () => {
          const result = await runPayrollCalculation(periodId, ruleCode, ruleScope);
          if ("error" in result) setError(result.error);
          else { setError(null); router.push(nextHref); router.refresh(); }
        })}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Calculator size={17} /> {pending ? "Calcul en cours…" : alreadyCalculated ? "Recalculer la paie" : "Calculer la paie"}
      </button>
      <ErrorBox message={error} />
    </div>
  );
}

export function ClosePeriodButton({ periodId, employeeCount }: { periodId: string; employeeCount: number }) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
        <span>J&apos;ai relu les {employeeCount} bulletin{employeeCount > 1 ? "s" : ""} : le mois sera clôturé et la saisie fermée.</span>
      </label>
      <button
        type="button"
        disabled={!confirmed || pending}
        onClick={() => startTransition(async () => {
          const result = await closePayrollPeriodAction(periodId);
          if ("error" in result) setError(result.error);
          else { setError(null); router.refresh(); }
        })}
        className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LockKeyhole size={16} /> {pending ? "Clôture…" : "Valider et clôturer le mois"}
      </button>
      <ErrorBox message={error} />
    </div>
  );
}

export function BackToEntryButton({ periodId, entryHref }: { periodId: string; entryHref: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          const result = await backToEntryAction(periodId);
          if ("error" in result) setError(result.error);
          else { setError(null); router.push(entryHref); router.refresh(); }
        })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-50"
      >
        <Undo2 size={15} /> {pending ? "Réouverture…" : "Revenir à la saisie"}
      </button>
      <ErrorBox message={error} />
    </div>
  );
}
