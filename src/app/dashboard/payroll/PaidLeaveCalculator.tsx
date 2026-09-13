"use client";

import { useMemo, useState } from "react";
import { addPayrollVariable } from "./periodActions";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
type Employee = { id: string; firstName: string; lastName: string };

function parse(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PaidLeaveCalculator({ periodId, employees, readOnly }: { periodId: string; employees: Employee[]; readOnly: boolean }) {
  const [employeeId, setEmployeeId] = useState("");
  const [referenceGross, setReferenceGross] = useState("30000");
  const [currentMonthlyGross, setCurrentMonthlyGross] = useState("2500");
  const [daysTaken, setDaysTaken] = useState("5");
  const [workDaysInMonth, setWorkDaysInMonth] = useState("21");
  const [unit, setUnit] = useState<"ouvrables" | "ouvres">("ouvrables");

  const daysDenominator = unit === "ouvrables" ? 30 : 25;
  const leaveDays = parse(daysTaken);
  const annualReference = parse(referenceGross);
  const monthlyGross = parse(currentMonthlyGross);
  const monthWorkDays = Math.max(parse(workDaysInMonth), 1);
  const tenthMethod = useMemo(() => (annualReference / 10) * (leaveDays / daysDenominator), [annualReference, leaveDays, daysDenominator]);
  const maintenanceMethod = useMemo(() => monthlyGross * (leaveDays / monthWorkDays), [monthlyGross, leaveDays, monthWorkDays]);
  const favorable = Math.max(tenthMethod, maintenanceMethod);
  const selectedMethod = tenthMethod >= maintenanceMethod ? "1/10e" : "maintien de salaire";

  if (readOnly) return null;

  return (
    <section className="border-t border-surface-border bg-white px-5 py-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Congés payés</p>
        <h2 className="text-lg font-semibold text-ink">Calculer une indemnité de congés payés</h2>
        <p className="max-w-3xl text-xs leading-5 text-ink-faint">RH Pilot compare la règle du 1/10e et le maintien de salaire et retient la méthode la plus favorable. Vérifiez la rémunération de référence et les paramètres avant d&apos;ajouter l&apos;indemnité à la paie.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-ink-soft">
          Salarié
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink">
            <option value="">Sélectionner…</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">Brut période de référence<input value={referenceGross} onChange={(event) => setReferenceGross(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" /></label>
        <label className="text-xs font-medium text-ink-soft">Brut mensuel actuel<input value={currentMonthlyGross} onChange={(event) => setCurrentMonthlyGross(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" /></label>
        <label className="text-xs font-medium text-ink-soft">Jours de congé<input value={daysTaken} onChange={(event) => setDaysTaken(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" /></label>
        <label className="text-xs font-medium text-ink-soft">Décompte<select value={unit} onChange={(event) => setUnit(event.target.value as "ouvrables" | "ouvres")} className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"><option value="ouvrables">Jours ouvrables · 30</option><option value="ouvres">Jours ouvrés · 25</option></select></label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-medium text-ink-soft">Jours ouvrés du mois pour le maintien<input value={workDaysInMonth} onChange={(event) => setWorkDaysInMonth(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" /></label>
        <div className="rounded-lg border border-surface-border bg-surface-subtle/30 px-4 py-3"><p className="text-xs text-ink-faint">Méthode du 1/10e</p><p className="mt-1 font-semibold text-ink">{EUR.format(tenthMethod)}</p></div>
        <div className="rounded-lg border border-surface-border bg-surface-subtle/30 px-4 py-3"><p className="text-xs text-ink-faint">Maintien de salaire</p><p className="mt-1 font-semibold text-ink">{EUR.format(maintenanceMethod)}</p></div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 p-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-teal">Montant retenu</p><p className="mt-1 text-lg font-semibold text-ink">{EUR.format(favorable)}</p><p className="mt-1 text-xs text-ink-soft">Méthode la plus favorable : {selectedMethod} · {leaveDays.toFixed(2)} jour{leaveDays > 1 ? "s" : ""}.</p></div>
        <form action={addPayrollVariable.bind(null, periodId)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="code" value="PAID_LEAVE" />
          <input type="hidden" name="label" value={`Indemnité de congés payés (${leaveDays.toFixed(2)} j)`} />
          <input type="hidden" name="amount" value={favorable.toFixed(2)} />
          <input type="hidden" name="unit" value="EUR" />
          <button type="submit" disabled={!employeeId || favorable <= 0} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Ajouter à la paie</button>
        </form>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-ink-faint">Le calcul automatique doit être contrôlé lorsque des éléments de rémunération, absences ou règles conventionnelles particulières modifient l&apos;assiette. Les congés payés sont soumis aux règles applicables à l&apos;entreprise et au salarié.</p>
    </section>
  );
}
