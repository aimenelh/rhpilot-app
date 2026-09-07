"use client";

import { useEffect, useState } from "react";
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

type ContributionDetail = {
  code: string;
  label: string;
  sourceRule: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
};

type ContributionResult = {
  employeeId: string;
  modelVersion: string | null;
  contributionDetails: ContributionDetail[];
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

function formatPayrollEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
  const [contributions, setContributions] = useState<ContributionResult[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(true);
  const [contributionsError, setContributionsError] = useState<string | null>(null);
  const grouped = employees.map((employee) => ({
    employee,
    variables: variables.filter((variable) => variable.employeeId === employee.id),
  }));
  const canEdit = !readOnly;

  useEffect(() => {
    let cancelled = false;
    setContributionsLoading(true);
    setContributionsError(null);

    fetch(`/api/payroll/periods/${encodeURIComponent(periodId)}/contributions`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger le détail des cotisations.");
        return (await response.json()) as ContributionResult[];
      })
      .then((data) => {
        if (!cancelled) setContributions(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setContributionsError(error instanceof Error ? error.message : "Impossible de charger le détail des cotisations.");
      })
      .finally(() => {
        if (!cancelled) setContributionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [periodId]);

  const contributionByEmployee = new Map(contributions.map((item) => [item.employeeId, item]));

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

      <div className="border-t border-surface-border">
        <div className="px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-ink">Détail des cotisations sociales</h2>
              <p className="mt-1 text-xs text-ink-faint">Détail issu du modèle social officiel Publicodes utilisé pour le calcul enregistré.</p>
            </div>
            {!contributionsLoading && contributions.some((item) => item.modelVersion) && (
              <span className="rounded-full bg-accent-teal/10 px-3 py-1.5 text-xs font-semibold text-accent-teal">
                Modèle Publicodes {contributions.find((item) => item.modelVersion)?.modelVersion}
              </span>
            )}
          </div>

          {contributionsLoading ? (
            <p className="mt-4 text-sm text-ink-faint">Chargement du détail…</p>
          ) : contributionsError ? (
            <p className="mt-4 rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber">{contributionsError}</p>
          ) : contributions.length === 0 ? (
            <p className="mt-4 text-sm text-ink-faint">Aucun calcul Publicodes enregistré pour cette période.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {employees.map((employee) => {
                const result = contributionByEmployee.get(employee.id);
                const details = result?.contributionDetails ?? [];
                const employeeDetails = details.filter((detail) => detail.side === "EMPLOYEE");
                const employerDetails = details.filter((detail) => detail.side === "EMPLOYER");
                const employeeTotal = employeeDetails.reduce((sum, detail) => sum + detail.amount, 0);
                const employerTotal = employerDetails.reduce((sum, detail) => sum + detail.amount, 0);

                if (!result) return null;

                return (
                  <div key={employee.id} className="rounded-lg border border-surface-border">
                    <div className="flex flex-col gap-1 border-b border-surface-border bg-surface-subtle/30 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p>
                      <p className="text-xs text-ink-faint">Source : Publicodes {result.modelVersion ?? ""}</p>
                    </div>
                    {details.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-ink-faint">Aucune ligne de cotisation détaillée n&apos;a été exposée par le modèle pour ce calcul.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-surface-border text-left text-xs text-ink-faint">
                              <th className="px-4 py-2.5 font-medium">Cotisation</th>
                              <th className="px-4 py-2.5 font-medium">Part</th>
                              <th className="px-4 py-2.5 text-right font-medium">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {details.map((detail) => (
                              <tr key={detail.code}>
                                <td className="px-4 py-2.5">
                                  <p className="font-medium text-ink">{detail.label}</p>
                                  <p className="mt-0.5 text-xs text-ink-faint">{detail.sourceRule}</p>
                                </td>
                                <td className="px-4 py-2.5 text-ink-soft">
                                  {detail.side === "EMPLOYEE" ? "Salarié" : "Employeur"}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-ink">{formatPayrollEuros(detail.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-surface-border bg-surface-subtle/20">
                            <tr>
                              <td className="px-4 py-2.5 font-semibold text-ink" colSpan={2}>Total part salarié</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-ink">{formatPayrollEuros(employeeTotal)}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 font-semibold text-ink" colSpan={2}>Total part employeur</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-ink">{formatPayrollEuros(employerTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
