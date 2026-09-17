"use client";

import { useMemo, useState } from "react";
import { addPayrollVariable } from "./periodActions";
import { calculatePaidLeaveIndemnity2026 } from "@/lib/payroll/paid-leave-2026";

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Employee = { id: string; firstName: string; lastName: string };

function parse(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export default function PaidLeaveCalculator({
  periodId,
  employees,
  readOnly,
}: {
  periodId: string;
  employees: Employee[];
  readOnly: boolean;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [referenceGross, setReferenceGross] = useState("30000");
  const [monthlySalary, setMonthlySalary] = useState("2500");
  const [leaveDays, setLeaveDays] = useState("5");
  const [leaveDayDenominator, setLeaveDayDenominator] = useState<25 | 30>(30);
  const [actualHoursInMonth, setActualHoursInMonth] = useState("151.67");
  const [leaveHoursInMonth, setLeaveHoursInMonth] = useState("35");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");

  const calculation = useMemo(() => {
    if (!leaveStartDate || !leaveEndDate) return null;
    try {
      return calculatePaidLeaveIndemnity2026({
        referencePeriodGrossAmount: parse(referenceGross),
        leaveDays: parse(leaveDays),
        leaveDayDenominator,
        monthlySalaryAmount: parse(monthlySalary),
        actualHoursInMonth: parse(actualHoursInMonth),
        leaveHoursInMonth: parse(leaveHoursInMonth),
        leaveStartDate: toDate(leaveStartDate),
        leaveEndDate: toDate(leaveEndDate),
      });
    } catch {
      return null;
    }
  }, [
    actualHoursInMonth,
    leaveDayDenominator,
    leaveDays,
    leaveEndDate,
    leaveHoursInMonth,
    leaveStartDate,
    monthlySalary,
    referenceGross,
  ]);

  if (readOnly) return null;

  const selectedMethod = calculation?.selectedMethod === "TENTH" ? "règle du 1/10e" : "maintien de salaire";
  const canAdd = Boolean(employeeId && calculation && calculation.grossIndemnity > 0);

  return (
    <section className="border-t border-surface-border bg-white px-5 py-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Congés payés</p>
        <h2 className="text-lg font-semibold text-ink">Calculer une indemnité de congés payés</h2>
        <p className="max-w-3xl text-xs leading-5 text-ink-faint">
          RH Pilot compare le dixième et le maintien de salaire selon l&apos;horaire réel du mois, puis retient la méthode la plus favorable. Les montants restent contrôlables avant ajout à la paie.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-ink-soft">
          Salarié
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink">
            <option value="">Sélectionner…</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Brut période de référence
          <input value={referenceGross} onChange={(event) => setReferenceGross(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Salaire mensuel de référence
          <input value={monthlySalary} onChange={(event) => setMonthlySalary(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Jours de congé
          <input value={leaveDays} onChange={(event) => setLeaveDays(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Décompte des congés
          <select value={leaveDayDenominator} onChange={(event) => setLeaveDayDenominator(Number(event.target.value) as 25 | 30)} className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink">
            <option value={30}>Jours ouvrables · base 30</option>
            <option value={25}>Jours ouvrés · base 25</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Heures réelles du mois
          <input value={actualHoursInMonth} onChange={(event) => setActualHoursInMonth(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Heures de congé du mois
          <input value={leaveHoursInMonth} onChange={(event) => setLeaveHoursInMonth(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-ink-soft">
            Début
            <input type="date" value={leaveStartDate} onChange={(event) => setLeaveStartDate(event.target.value)} className="mt-1 w-full rounded-lg border border-surface-border bg-white px-2 py-2 text-sm text-ink" />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Fin
            <input type="date" value={leaveEndDate} onChange={(event) => setLeaveEndDate(event.target.value)} className="mt-1 w-full rounded-lg border border-surface-border bg-white px-2 py-2 text-sm text-ink" />
          </label>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-surface-border bg-surface-subtle/30 px-4 py-3">
          <p className="text-xs text-ink-faint">Méthode du 1/10e</p>
          <p className="mt-1 font-semibold text-ink">{calculation ? EUR.format(calculation.tenthMethodAmount) : "—"}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-subtle/30 px-4 py-3">
          <p className="text-xs text-ink-faint">Maintien de salaire</p>
          <p className="mt-1 font-semibold text-ink">{calculation ? EUR.format(calculation.salaryMaintenanceAmount) : "—"}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-subtle/30 px-4 py-3">
          <p className="text-xs text-ink-faint">Retenue d&apos;absence correspondante</p>
          <p className="mt-1 font-semibold text-ink">{calculation ? EUR.format(calculation.grossDeductionForAbsence) : "—"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-teal">Indemnité retenue</p>
          <p className="mt-1 text-lg font-semibold text-ink">{calculation ? EUR.format(calculation.grossIndemnity) : "—"}</p>
          <p className="mt-1 text-xs text-ink-soft">{calculation ? `Méthode la plus favorable : ${selectedMethod}.` : "Renseignez les dates et les paramètres du mois pour calculer l’indemnité."}</p>
        </div>
        <form action={addPayrollVariable.bind(null, periodId, undefined)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="code" value="PAID_LEAVE_INDEMNITY" />
          <input type="hidden" name="label" value={calculation ? `Indemnité de congés payés (${calculation.leaveStartDate} au ${calculation.leaveEndDate})` : "Indemnité de congés payés"} />
          <input type="hidden" name="amount" value={(calculation?.grossIndemnity ?? 0).toFixed(2)} />
          <input type="hidden" name="unit" value="EUR" />
          <button type="submit" disabled={!canAdd} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Ajouter à la paie</button>
        </form>
      </div>

      {calculation ? (
        <p className="mt-3 text-[11px] leading-4 text-ink-faint">
          Référentiel : {calculation.ruleVersionId} · {calculation.sourceReference}. Le calcul doit être revu si une règle conventionnelle ou une situation particulière modifie la rémunération de référence.
        </p>
      ) : null}
    </section>
  );
}
