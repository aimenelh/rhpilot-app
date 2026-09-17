"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  valueComplementaryHoursAction,
  valueOvertimeHoursAction,
  type WorkingTimeFormState,
} from "./workingTimeActions";

type Employee = { id: string; firstName: string; lastName: string };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Feedback({ state }: { state: WorkingTimeFormState }) {
  if (state?.error) {
    return <p className="mt-3 rounded-lg border border-accent-amber/20 bg-accent-amber/10 px-3 py-2 text-xs leading-5 text-accent-amber" role="alert">{state.error}</p>;
  }
  if (state?.success) {
    return <p className="mt-3 rounded-lg border border-accent-teal/20 bg-accent-teal/10 px-3 py-2 text-xs leading-5 text-accent-teal" role="status">{state.success}</p>;
  }
  return null;
}

export default function WorkingTimeCalculator({
  periodId,
  employees,
  readOnly,
}: {
  periodId: string;
  employees: Employee[];
  readOnly: boolean;
}) {
  const overtimeAction = valueOvertimeHoursAction.bind(null, periodId);
  const complementaryAction = valueComplementaryHoursAction.bind(null, periodId);
  const [overtimeState, overtimeFormAction] = useFormState<WorkingTimeFormState, FormData>(overtimeAction, undefined);
  const [complementaryState, complementaryFormAction] = useFormState<WorkingTimeFormState, FormData>(complementaryAction, undefined);
  const [mode, setMode] = useState<"overtime" | "complementary">("overtime");

  if (readOnly) {
    return <p className="text-xs text-ink-faint">Cette période est en lecture seule. Les heures déjà valorisées restent visibles dans les éléments du mois.</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Temps de travail</p>
        <h3 className="text-lg font-semibold text-ink">Valoriser les heures avant calcul de paie</h3>
        <p className="max-w-3xl text-xs leading-5 text-ink-faint">
          RH Pilot lit le salaire mensuel et le volume horaire du profil paie du salarié, calcule le taux horaire puis enregistre uniquement les montants valorisés en euros. Les taux conventionnels restent à vérifier lorsque votre convention collective prévoit des règles particulières.
        </p>
      </div>

      <div className="mt-4 inline-flex rounded-lg border border-surface-border bg-surface-subtle/40 p-1">
        <button type="button" onClick={() => setMode("overtime")} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${mode === "overtime" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}>Heures supplémentaires</button>
        <button type="button" onClick={() => setMode("complementary")} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${mode === "complementary" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}>Heures complémentaires</button>
      </div>

      {mode === "overtime" ? (
        <form action={overtimeFormAction} className="mt-4 rounded-xl border border-surface-border bg-surface-subtle/20 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-ink-soft">
              Salarié
              <select name="employeeId" required className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
                <option value="">Sélectionner…</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              1re tranche hebdomadaire
              <div className="mt-1.5 flex items-center gap-2"><input name="firstBandHours" defaultValue="8" inputMode="decimal" className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" /><span className="text-xs text-ink-faint">h</span></div>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Majoration tranche 1
              <div className="mt-1.5 flex items-center gap-2"><input name="firstPremiumRate" defaultValue="25" inputMode="decimal" className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" /><span className="text-xs text-ink-faint">%</span></div>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Majoration tranche 2
              <div className="mt-1.5 flex items-center gap-2"><input name="secondPremiumRate" defaultValue="50" inputMode="decimal" className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" /><span className="text-xs text-ink-faint">%</span></div>
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-ink-soft">Heures supplémentaires par semaine</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((week) => (
                <label key={week} className="text-[11px] text-ink-faint">
                  Semaine {week}
                  <input name={`week${week}Hours`} inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
                </label>
              ))}
            </div>
          </div>

          <label className="mt-4 block text-xs font-medium text-ink-soft">
            Source / règle appliquée
            <input name="sourceReference" defaultValue="Code du travail, art. L3121-36" className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" />
          </label>
          <p className="mt-2 text-[11px] leading-4 text-ink-faint">Les valeurs 25 % / 50 % correspondent au régime légal par défaut. Modifiez-les si une convention ou un accord applicable prévoit d'autres majorations, sans descendre sous le minimum légal de 10 % prévu pour un taux conventionnel.</p>

          <div className="mt-4 flex justify-end"><SubmitButton label="Valoriser les heures supplémentaires" pendingLabel="Valorisation…" /></div>
          <Feedback state={overtimeState} />
        </form>
      ) : (
        <form action={complementaryFormAction} className="mt-4 rounded-xl border border-surface-border bg-surface-subtle/20 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-ink-soft">
              Salarié
              <select name="employeeId" required className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
                <option value="">Sélectionner…</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Heures complémentaires
              <div className="mt-1.5 flex items-center gap-2"><input name="complementaryHours" required inputMode="decimal" placeholder="3" className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" /><span className="text-xs text-ink-faint">h</span></div>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Majoration jusqu'au dixième
              <div className="mt-1.5 flex items-center gap-2"><input name="firstPremiumRate" defaultValue="10" inputMode="decimal" className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" /><span className="text-xs text-ink-faint">%</span></div>
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Majoration au-delà du dixième
              <div className="mt-1.5 flex items-center gap-2"><input name="secondPremiumRate" defaultValue="25" inputMode="decimal" className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" /><span className="text-xs text-ink-faint">%</span></div>
            </label>
          </div>

          <label className="mt-4 flex items-start gap-2 rounded-lg border border-surface-border bg-white px-3 py-3 text-xs text-ink-soft">
            <input type="checkbox" name="agreementAllowsOneThird" className="mt-0.5" />
            <span>Un accord ou une convention applicable autorise des heures complémentaires jusqu'au tiers de la durée contractuelle. Sans cette case, RH Pilot bloque au dixième.</span>
          </label>

          <label className="mt-3 block text-xs font-medium text-ink-soft">
            Source / règle appliquée
            <input name="sourceReference" defaultValue="Code du travail, art. L3123-29" className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink" />
          </label>

          <div className="mt-4 flex justify-end"><SubmitButton label="Valoriser les heures complémentaires" pendingLabel="Valorisation…" /></div>
          <Feedback state={complementaryState} />
        </form>
      )}
    </div>
  );
}
