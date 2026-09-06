"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addPayrollVariable, deletePayrollVariable, type PayrollVariableFormState } from "./periodActions";

const UNITS = [
  ["EUR", "Euros"],
  ["DAYS", "Jours"],
  ["HOURS", "Heures"],
  ["PERCENT", "%"],
] as const;

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Saisie manuelle",
  IMPORT: "Import",
  SYSTEM: "Système",
};

type VariableRow = {
  id: string;
  employeeId: string;
  code: string;
  label: string;
  amount: string;
  unit: string;
  source: string;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enregistrement…" : "Ajouter"}
    </button>
  );
}

export default function PayrollVariablesSection({
  periodId,
  employees,
  variables,
  readOnly,
}: {
  periodId: string;
  employees: Employee[];
  variables: VariableRow[];
  readOnly: boolean;
}) {
  const action = addPayrollVariable.bind(null, periodId);
  const [state, formAction] = useFormState<PayrollVariableFormState, FormData>(action, undefined);
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const grouped = employees.map((employee) => ({
    employee,
    variables: variables.filter((variable) => variable.employeeId === employee.id),
  }));
  const canEdit = !readOnly;

  return (
    <section className="mt-7 rounded-xl border border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="font-semibold text-ink">Variables de paie</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Saisissez les éléments propres à cette période : primes, retenues, absences, heures ou autres variables. Aucune règle réglementaire n&apos;est déduite automatiquement ici.
        </p>
      </div>

      {canEdit && (
        <form action={formAction} className="grid gap-3 border-b border-surface-border bg-surface-subtle/30 p-5 lg:grid-cols-[1.1fr_1fr_1.2fr_1fr_auto]">
          <label className="text-xs font-medium text-ink-soft">
            Salarié
            <select name="employeeId" required className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink">
              <option value="">Sélectionner…</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Code
            <input name="code" required maxLength={80} placeholder="PRIME" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm uppercase text-ink placeholder:normal-case" />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Libellé
            <input name="label" required maxLength={160} placeholder="Prime exceptionnelle" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-ink-soft">
              Valeur
              <input name="amount" required inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Unité
              <select name="unit" defaultValue="EUR" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink">
                {UNITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-end">
            <SubmitButton />
          </div>
        </form>
      )}

      {state?.error && (
        <div className="border-b border-surface-border bg-accent-amber/10 px-5 py-3 text-sm text-ink">{state.error}</div>
      )}

      <div className="divide-y divide-surface-border">
        {grouped.map(({ employee, variables: employeeVariables }) => (
          <div key={employee.id} className="px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p>
              <p className="text-xs text-ink-faint">{employeeVariables.length} variable{employeeVariables.length > 1 ? "s" : ""}</p>
            </div>

            {employeeVariables.length === 0 ? (
              <p className="mt-2 text-sm text-ink-faint">Aucune variable saisie pour cette période.</p>
            ) : (
              <div className="mt-3 divide-y divide-surface-border rounded-lg border border-surface-border">
                {employeeVariables.map((variable) => (
                  <div key={variable.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{variable.label}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {variable.code} · {SOURCE_LABELS[variable.source] ?? variable.source}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-semibold text-ink">{variable.amount} {variable.unit === "PERCENT" ? "%" : variable.unit === "EUR" ? "€" : variable.unit === "DAYS" ? "j" : "h"}</p>
                      {canEdit && (
                        <form action={deletePayrollVariable.bind(null, periodId, variable.id)}>
                          <button type="submit" className="text-xs font-medium text-ink-faint hover:text-ink">Supprimer</button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {employees.length === 0 && (
          <p className="px-5 py-8 text-sm text-ink-soft">Aucun salarié actif dans cette organisation.</p>
        )}
      </div>
    </section>
  );
}
