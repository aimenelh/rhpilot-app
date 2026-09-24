"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Calculator, Clock3, FileSpreadsheet, Gauge, ReceiptText } from "lucide-react";
import { addPayrollVariable, deletePayrollVariable, type PayrollVariableFormState } from "./periodActions";
import MinimumSalaryControlSection from "./MinimumSalaryControlSection";
import PaidLeaveCalculator from "./PaidLeaveCalculator";
import WorkingTimeCalculator from "./WorkingTimeCalculator";

const VARIABLE_OPTIONS = [
  ["ACTIVITY_BONUS", "Prime liée à l'activité"],
  ["SENIORITY_BONUS", "Prime d'ancienneté"],
  ["YEAR_END_BONUS", "Prime de fin d'année / 13e mois"],
  ["OBJECTIVE_BONUS", "Prime sur objectifs"],
  ["EXCEPTIONAL_BONUS", "Prime exceptionnelle"],
  ["SUJETION_BONUS", "Prime de sujétion"],
  ["INCOMPLETE_MONTH", "Entrée / sortie en cours de mois — retenue calculée"],
  ["PAID_LEAVE_INDEMNITY", "Indemnité de congés payés"],
  ["SICK_PAY_MAINTENANCE", "Maintien employeur maladie"],
  ["IJSS_SUBROGATED", "IJSS subrogées nettes à réintégrer"],
  ["BENEFIT_MEAL", "Avantage en nature nourriture"],
  ["BENEFIT_HOUSING", "Avantage en nature logement"],
  ["BENEFIT_VEHICLE", "Avantage en nature véhicule"],
  ["BENEFIT_TECHNOLOGY", "Avantage en nature NTIC"],
  ["BENEFIT_OTHER", "Autre avantage en nature"],
  ["EXPENSE_REAL", "Frais professionnels au réel"],
  ["EXPENSE_MEAL", "Frais de repas"],
  ["EXPENSE_KILOMETRIC", "Indemnités kilométriques"],
  ["EXPENSE_TRAVEL", "Frais de grand déplacement"],
  ["EXPENSE_HOTEL", "Hébergement professionnel"],
  ["PUBLIC_TRANSPORT", "Transport public domicile-travail"],
  ["SUSTAINABLE_MOBILITY", "Forfait mobilités durables"],
  ["TRANSPORT_ALLOWANCE", "Prime / prise en charge de transport"],
  ["MEAL_VOUCHER_EMPLOYEE", "Titres-restaurant — part salarié"],
  ["MEAL_VOUCHER_EMPLOYER", "Titres-restaurant — part employeur"],
  ["CDD_END_ALLOWANCE", "Indemnité de fin de CDD"],
  ["PAID_LEAVE_COMPENSATION", "Indemnité compensatrice de congés payés"],
  ["NOTICE_COMPENSATION", "Indemnité compensatrice de préavis"],
  ["OTHER_NET_DEDUCTION", "Autre retenue sur net"],
] as const;

const SOURCE_LABELS: Record<string, string> = { MANUAL: "Saisie manuelle", IMPORT: "Import", SYSTEM: "Système" };
type VariableRow = { id: string; employeeId: string; code: string; label: string; amount: string; unit: string; source: string };
type Employee = { id: string; firstName: string; lastName: string };
type ContributionDetail = { code: string; label: string; sourceRule: string; side: "EMPLOYEE" | "EMPLOYER"; amount: number };
type ContributionResult = { employeeId: string; modelVersion: string | null; contributionDetails: ContributionDetail[] };
type TabKey = "variables" | "working-time" | "paid-leave" | "minimum" | "contributions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Enregistrement…" : "Ajouter"}</button>;
}

function formatPayrollEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function PayrollVariablesSection({ periodId, employees, variables, readOnly }: { periodId: string; employees: Employee[]; variables: VariableRow[]; readOnly: boolean }) {
  const action = addPayrollVariable.bind(null, periodId);
  const [state, formAction] = useFormState<PayrollVariableFormState, FormData>(action, undefined);
  const [selectedVariable, setSelectedVariable] = useState<string>(VARIABLE_OPTIONS[0][0]);
  const [activeTab, setActiveTab] = useState<TabKey>("variables");
  const [contributions, setContributions] = useState<ContributionResult[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState<string | null>(null);
  const canEdit = !readOnly;
  const selectedLabel = VARIABLE_OPTIONS.find(([code]) => code === selectedVariable)?.[1] ?? VARIABLE_OPTIONS[0][1];

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
    { key: "working-time", label: "Temps de travail", helper: "Valorisation", icon: Clock3 },
    { key: "paid-leave", label: "Congés payés", helper: "Calcul dédié", icon: Calculator },
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
            <form action={formAction} className="grid gap-3 border-b border-surface-border p-5 lg:grid-cols-[1.05fr_1.45fr_1fr_auto] lg:items-end">
              <label className="text-xs font-medium text-ink-soft">Salarié<select name="employeeId" required className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"><option value="">Sélectionner…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
              <label className="text-xs font-medium text-ink-soft">Élément de paie<select name="code" value={selectedVariable} onChange={(event) => setSelectedVariable(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10">{VARIABLE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
              <input type="hidden" name="label" value={selectedLabel} />
              <label className="text-xs font-medium text-ink-soft">Montant déjà déterminé<input name="amount" required inputMode="decimal" placeholder="200,00" className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" /><input type="hidden" name="unit" value="EUR" /></label>
              <SubmitButton />
            </form>
          ) : (
            <div className="border-b border-surface-border bg-surface-subtle/30 px-5 py-3 text-xs text-ink-faint">Cette période n'accepte plus de modification des variables.</div>
          )}
          {state?.error ? <div className="border-b border-surface-border bg-accent-amber/10 px-5 py-3 text-sm text-ink">{state.error}</div> : null}

          <div className="p-5">
            {employeesWithVariables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border px-5 py-10 text-center"><ReceiptText size={22} className="mx-auto text-ink-faint" /><p className="mt-2 text-sm font-medium text-ink">Aucun élément variable saisi</p><p className="mt-1 text-xs text-ink-faint">Ajoutez uniquement les montants déjà déterminés par une règle ou une source fiable.</p></div>
            ) : (
              <div className="space-y-4">
                {employeesWithVariables.map(({ employee, variables: employeeVariables }) => (
                  <div key={employee.id} className="overflow-hidden rounded-xl border border-surface-border">
                    <div className="flex items-center justify-between gap-3 bg-surface-subtle/30 px-4 py-3"><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><span className="text-xs text-ink-faint">{employeeVariables.length} élément{employeeVariables.length > 1 ? "s" : ""}</span></div>
                    <div className="divide-y divide-surface-border">
                      {employeeVariables.map((variable) => (
                        <div key={variable.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0"><p className="text-sm font-medium text-ink">{variable.label}</p><p className="mt-0.5 text-xs text-ink-faint">{SOURCE_LABELS[variable.source] ?? variable.source}</p></div>
                          <div className="flex items-center gap-4"><p className="text-sm font-semibold text-ink">{variable.amount} {variable.unit === "EUR" ? "€" : variable.unit === "DAYS" ? "j" : variable.unit === "PERCENT" ? "%" : "h"}</p>{canEdit ? <form action={deletePayrollVariable.bind(null, periodId, variable.id)}><button type="submit" className="text-xs font-medium text-ink-faint hover:text-accent-rose">Supprimer</button></form> : null}</div>
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

      {activeTab === "working-time" ? <div className="p-5"><WorkingTimeCalculator periodId={periodId} employees={employees} readOnly={!canEdit} /></div> : null}
      {activeTab === "paid-leave" ? <div className="p-5"><PaidLeaveCalculator periodId={periodId} employees={employees} readOnly={!canEdit} /></div> : null}
      {activeTab === "minimum" ? <div className="p-5"><MinimumSalaryControlSection periodId={periodId} employees={employees} /></div> : null}
      {activeTab === "contributions" ? (
        <div className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-semibold text-ink">Détail des cotisations sociales</h3><p className="mt-1 text-xs text-ink-faint">Lecture du calcul enregistré par salarié. Aucune valeur n'est modifiée depuis cet écran.</p></div>
            {!contributionsLoading && contributions.some((item) => item.modelVersion) ? <span className="w-fit rounded-full bg-accent-teal/10 px-3 py-1.5 text-xs font-semibold text-accent-teal">Publicodes {contributions.find((item) => item.modelVersion)?.modelVersion}</span> : null}
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
                        <table className="min-w-full text-sm"><thead><tr className="border-b border-surface-border text-left text-xs text-ink-faint"><th className="px-4 py-2.5 font-medium">Cotisation</th><th className="px-4 py-2.5 font-medium">Part</th><th className="px-4 py-2.5 text-right font-medium">Montant</th></tr></thead><tbody className="divide-y divide-surface-border">{details.map((detail) => <tr key={detail.code}><td className="px-4 py-2.5"><p className="font-medium text-ink">{detail.label}</p><p className="mt-0.5 text-xs text-ink-faint">{detail.sourceRule}</p></td><td className="px-4 py-2.5 text-ink-soft">{detail.side === "EMPLOYEE" ? "Salarié" : "Employeur"}</td><td className="px-4 py-2.5 text-right font-semibold text-ink">{formatPayrollEuros(detail.amount)}</td></tr>)}</tbody></table>
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
