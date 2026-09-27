"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Calculator, FileSpreadsheet, Gauge, ReceiptText } from "lucide-react";
import { addPayrollVariable, deletePayrollVariable, type PayrollVariableFormState } from "./periodActions";
import MinimumSalaryControlSection from "./MinimumSalaryControlSection";
import { BULLETIN_VARIABLES } from "@/lib/payroll/bulletin/variables";

const VARIABLE_GROUPS = Array.from(new Set(BULLETIN_VARIABLES.map((definition) => definition.group)));
const UNIT_LABELS: Record<string, { field: string; suffix: string; placeholder: string }> = {
  EUR: { field: "Montant (€)", suffix: "€", placeholder: "200,00" },
  HOURS: { field: "Nombre d'heures", suffix: "h", placeholder: "8" },
  UNITS: { field: "Nombre de titres", suffix: "titres", placeholder: "18" },
};

const SOURCE_LABELS: Record<string, string> = { MANUAL: "Saisie manuelle", IMPORT: "Import", SYSTEM: "Système" };
type VariableRow = { id: string; employeeId: string; code: string; label: string; amount: string; unit: string; source: string; reference?: string | null };
type IjssAbsence = { id: string; employeeId: string; label: string };
export type PaidLeaveRow = { employeeId: string; previousAcquired: number; previousTaken: number; currentAcquired: number; currentTaken: number; daysTaken: number; acquiredThisMonth: number; compensatedDays: number | null; method: string | null };

function days(value: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
type Employee = { id: string; firstName: string; lastName: string };
type ContributionDetail = { code: string; label: string; sourceRule: string; side: "EMPLOYEE" | "EMPLOYER"; amount: number };
type ContributionResult = { employeeId: string; modelVersion: string | null; contributionDetails: ContributionDetail[] };
type TabKey = "variables" | "paid-leave" | "minimum" | "contributions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Enregistrement…" : "Ajouter"}</button>;
}

function formatPayrollEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function PayrollVariablesSection({ periodId, employees, variables, readOnly, ijssAbsences = [], paidLeaveRows = [] }: { periodId: string; employees: Employee[]; variables: VariableRow[]; readOnly: boolean; ijssAbsences?: IjssAbsence[]; paidLeaveRows?: PaidLeaveRow[] }) {
  const action = addPayrollVariable.bind(null, periodId);
  const [state, formAction] = useFormState<PayrollVariableFormState, FormData>(action, undefined);
  const [selectedVariable, setSelectedVariable] = useState<string>(BULLETIN_VARIABLES[0].code);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("variables");
  const [contributions, setContributions] = useState<ContributionResult[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState<string | null>(null);
  const canEdit = !readOnly;
  const selectedDefinition = BULLETIN_VARIABLES.find((definition) => definition.code === selectedVariable) ?? BULLETIN_VARIABLES[0];
  const selectedLabel = selectedDefinition.label;
  const unit = UNIT_LABELS[selectedDefinition.unit];
  const employeeAbsences = ijssAbsences.filter((absence) => absence.employeeId === selectedEmployee);

  const grouped = useMemo(
    () => employees.map((employee) => ({ employee, variables: variables.filter((variable) => variable.employeeId === employee.id) })),
    [employees, variables],
  );
  const employeesWithVariables = grouped.filter((item) => item.variables.length > 0);

  useEffect(() => {
    if (activeTab !== "contributions" || contributions.length > 0) return;
    let cancelled = false;
    setContributionsLoading(true);
    setContributionsError(null);
    fetch(`/api/payroll/periods/${encodeURIComponent(periodId)}/contributions`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger le détail des cotisations.");
        return (await response.json()) as ContributionResult[];
      })
      .then((data) => { if (!cancelled) setContributions(data); })
      .catch((error: unknown) => { if (!cancelled) setContributionsError(error instanceof Error ? error.message : "Impossible de charger le détail des cotisations."); })
      .finally(() => { if (!cancelled) setContributionsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, contributions.length, periodId]);

  const contributionByEmployee = new Map(contributions.map((item) => [item.employeeId, item]));
  const tabs: Array<{ key: TabKey; label: string; helper: string; icon: typeof Calculator }> = [
    { key: "variables", label: "Éléments du mois", helper: `${variables.length} saisi${variables.length > 1 ? "s" : ""}`, icon: ReceiptText },
    { key: "paid-leave", label: "Congés payés", helper: "Compteurs", icon: Calculator },
    { key: "minimum", label: "Salaire minimum", helper: "Contrôle", icon: Gauge },
    { key: "contributions", label: "Cotisations", helper: "Détail du calcul", icon: FileSpreadsheet },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Préparation détaillée</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">Éléments et contrôles de la période</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">Chaque sujet est isolé dans son propre espace pour éviter une page interminable. Rien n'est recalculé ici sans action explicite.</p>
      </div>

      <div className="overflow-x-auto border-b border-surface-border bg-surface-subtle/25 px-3 py-3">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex min-w-[170px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active ? "border-brand-primary/25 bg-white shadow-sm" : "border-transparent text-ink-soft hover:border-surface-border hover:bg-white"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-brand-primary/10 text-brand-primary" : "bg-surface-subtle text-ink-faint"}`}><Icon size={17} /></span>
                <span><span className={`block text-sm font-semibold ${active ? "text-ink" : "text-ink-soft"}`}>{tab.label}</span><span className="mt-0.5 block text-[11px] text-ink-faint">{tab.helper}</span></span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "variables" ? (
        <div>
          {canEdit ? (
            <form action={formAction} className="border-b border-surface-border p-5">
              <div className="grid gap-3 lg:grid-cols-[1.05fr_1.45fr_1fr_auto] lg:items-end">
                <label className="text-xs font-medium text-ink-soft">Salarié<select name="employeeId" required value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)} className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"><option value="">Sélectionner…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
                <label className="text-xs font-medium text-ink-soft">Élément de paie<select name="code" value={selectedVariable} onChange={(event) => setSelectedVariable(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10">{VARIABLE_GROUPS.map((group) => <optgroup key={group} label={group}>{BULLETIN_VARIABLES.filter((definition) => definition.group === group).map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</optgroup>)}</select></label>
                <input type="hidden" name="label" value={selectedLabel} />
                <label className="text-xs font-medium text-ink-soft">{unit.field}<input name="amount" required inputMode="decimal" placeholder={unit.placeholder} className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" /><input type="hidden" name="unit" value={selectedDefinition.unit} /></label>
                <SubmitButton />
              </div>
              {selectedDefinition.kind === "IJSS_GROSS" ? (
                <label className="mt-3 block text-xs font-medium text-ink-soft lg:w-1/2">Arrêt concerné<select name="reference" className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink"><option value="">{employeeAbsences.length === 1 ? employeeAbsences[0].label : "Sélectionner l'arrêt…"}</option>{employeeAbsences.length > 1 ? employeeAbsences.map((absence) => <option key={absence.id} value={absence.id}>{absence.label}</option>) : null}</select></label>
              ) : null}
              <p className="mt-2 text-xs text-ink-faint">{selectedDefinition.help}</p>
            </form>
          ) : (
            <div className="border-b border-surface-border bg-surface-subtle/30 px-5 py-3 text-xs text-ink-faint">Cette période n'accepte plus de modification des variables.</div>
          )}
          {state?.error ? <div className="border-b border-surface-border bg-accent-amber/10 px-5 py-3 text-sm text-ink">{state.error}</div> : null}

          <div className="p-5">
            {employeesWithVariables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border px-5 py-10 text-center"><ReceiptText size={22} className="mx-auto text-ink-faint" /><p className="mt-2 text-sm font-medium text-ink">Aucun élément variable saisi</p><p className="mt-1 text-xs text-ink-faint">Heures supplémentaires, primes, frais, titres-restaurant, IJSS : le reste du bulletin est calculé à partir du contrat et des absences validées.</p></div>
            ) : (
              <div className="space-y-4">
                {employeesWithVariables.map(({ employee, variables: employeeVariables }) => (
                  <div key={employee.id} className="overflow-hidden rounded-xl border border-surface-border">
                    <div className="flex items-center justify-between gap-3 bg-surface-subtle/30 px-4 py-3"><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><span className="text-xs text-ink-faint">{employeeVariables.length} élément{employeeVariables.length > 1 ? "s" : ""}</span></div>
                    <div className="divide-y divide-surface-border">
                      {employeeVariables.map((variable) => (
                        <div key={variable.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0"><p className="text-sm font-medium text-ink">{variable.label}</p><p className="mt-0.5 text-xs text-ink-faint">{SOURCE_LABELS[variable.source] ?? variable.source}</p></div>
                          <div className="flex items-center gap-4"><p className="text-sm font-semibold text-ink">{variable.amount} {variable.unit === "EUR" ? "€" : variable.unit === "DAYS" ? "j" : variable.unit === "PERCENT" ? "%" : variable.unit === "UNITS" ? "titres" : "h"}</p>{canEdit ? <form action={deletePayrollVariable.bind(null, periodId, variable.id)}><button type="submit" className="text-xs font-medium text-ink-faint hover:text-accent-rose">Supprimer</button></form> : null}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "paid-leave" ? (
        <div className="p-5">
          <h3 className="font-semibold text-ink">Compteurs de congés payés</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Soldes après le calcul du mois : les congés pris viennent des absences validées, l&apos;indemnité est comparée au dixième et l&apos;acquisition tient compte des arrêts maladie.</p>
          {paidLeaveRows.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-surface-border px-5 py-9 text-center"><p className="text-sm font-medium text-ink">Aucun calcul enregistré</p><p className="mt-1 text-xs text-ink-faint">Les compteurs apparaîtront ici après le calcul de la période.</p></div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-surface-border">
              <table className="min-w-[760px] w-full text-sm">
                <thead><tr className="bg-surface-subtle/40 text-left text-xs font-semibold text-ink-faint"><th className="px-4 py-2.5">Salarié</th><th className="px-4 py-2.5 text-right">N-1 acquis</th><th className="px-4 py-2.5 text-right">N-1 pris</th><th className="px-4 py-2.5 text-right">N acquis</th><th className="px-4 py-2.5 text-right">N pris</th><th className="px-4 py-2.5 text-right">Pris ce mois</th><th className="px-4 py-2.5 text-right">Acquis ce mois</th><th className="px-4 py-2.5">Indemnité</th></tr></thead>
                <tbody className="divide-y divide-surface-border">
                  {paidLeaveRows.map((row) => {
                    const employee = employees.find((candidate) => candidate.id === row.employeeId);
                    return (
                      <tr key={row.employeeId}>
                        <td className="px-4 py-2.5 font-medium text-ink">{employee ? `${employee.firstName} ${employee.lastName}` : row.employeeId}</td>
                        <td className="px-4 py-2.5 text-right text-ink-soft">{days(row.previousAcquired)}</td>
                        <td className="px-4 py-2.5 text-right text-ink-soft">{days(row.previousTaken)}</td>
                        <td className="px-4 py-2.5 text-right text-ink-soft">{days(row.currentAcquired)}</td>
                        <td className="px-4 py-2.5 text-right text-ink-soft">{days(row.currentTaken)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-ink">{days(row.daysTaken)}</td>
                        <td className="px-4 py-2.5 text-right text-ink">{days(row.acquiredThisMonth)}</td>
                        <td className="px-4 py-2.5 text-xs text-ink-soft">{row.compensatedDays ? `Solde de ${days(row.compensatedDays)} j en indemnité compensatrice` : row.method === "TENTH" ? "Règle du dixième" : row.method === "SALARY_MAINTENANCE" ? "Maintien de salaire" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
      {activeTab === "minimum" ? <div className="p-5"><MinimumSalaryControlSection periodId={periodId} employees={employees} /></div> : null}
      {activeTab === "contributions" ? (
        <div className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-semibold text-ink">Détail des cotisations sociales</h3><p className="mt-1 text-xs text-ink-faint">Lecture du calcul enregistré par salarié. Aucune valeur n'est modifiée depuis cet écran.</p></div>
            {!contributionsLoading && contributions.some((item) => item.modelVersion) ? <span className="w-fit text-xs font-medium text-ink-faint">Moteur {contributions.find((item) => item.modelVersion)?.modelVersion}</span> : null}
          </div>
          {contributionsLoading ? <p className="mt-5 text-sm text-ink-faint">Chargement du détail…</p> : contributionsError ? <p className="mt-5 rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber">{contributionsError}</p> : contributions.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-surface-border px-5 py-9 text-center"><p className="text-sm font-medium text-ink">Aucun calcul enregistré</p><p className="mt-1 text-xs text-ink-faint">Les cotisations apparaîtront ici après un calcul de période.</p></div> : (
            <div className="mt-5 space-y-4">
              {employees.map((employee) => {
                const result = contributionByEmployee.get(employee.id);
                const details = result?.contributionDetails ?? [];
                if (!result) return null;
                const employeeTotal = details.filter((detail) => detail.side === "EMPLOYEE").reduce((total, detail) => total + detail.amount, 0);
                const employerTotal = details.filter((detail) => detail.side === "EMPLOYER").reduce((total, detail) => total + detail.amount, 0);
                return (
                  <details key={employee.id} className="group overflow-hidden rounded-xl border border-surface-border">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-surface-subtle/25 px-4 py-3 marker:hidden"><div><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-ink-faint">Salarié {formatPayrollEuros(employeeTotal)} · Employeur {formatPayrollEuros(employerTotal)}</p></div><span className="text-xs font-semibold text-ink-faint group-open:text-ink">Voir le détail</span></summary>
                    <div className="overflow-x-auto border-t border-surface-border">
                      {details.length === 0 ? <p className="px-4 py-4 text-sm text-ink-faint">Aucune ligne de cotisation détaillée n'a été exposée pour ce calcul.</p> : (
                        <table className="min-w-full text-sm"><thead><tr className="border-b border-surface-border text-left text-xs text-ink-faint"><th className="px-4 py-2.5 font-medium">Cotisation</th><th className="px-4 py-2.5 font-medium">Part</th><th className="px-4 py-2.5 text-right font-medium">Montant</th></tr></thead><tbody className="divide-y divide-surface-border">{details.map((detail) => <tr key={`${detail.code}-${detail.side}`}><td className="px-4 py-2.5"><p className="font-medium text-ink">{detail.label}</p><p className="mt-0.5 text-xs text-ink-faint">{detail.sourceRule}</p></td><td className="px-4 py-2.5 text-ink-soft">{detail.side === "EMPLOYEE" ? "Salarié" : "Employeur"}</td><td className="px-4 py-2.5 text-right font-semibold text-ink">{formatPayrollEuros(detail.amount)}</td></tr>)}</tbody></table>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
