import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPayrollPeriodReadiness } from "@/lib/payroll/period-preflight";
import PayrollVariablesSection from "../PayrollVariablesSection";
import PayrollCalculateButton from "../PayrollCalculateButton";
import PayrollReviewButton from "../PayrollReviewButton";
import PayrollValidateButton from "../PayrollValidateButton";
import PayrollLockButton from "../PayrollLockButton";
import PayrollReopenButton from "../PayrollReopenButton";
import PayrollPayslipGenerateButton from "../PayrollPayslipGenerateButton";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  CALCULATED: "Calculée",
  REVIEW: "À contrôler",
  VALIDATED: "Validée",
  LOCKED: "Verrouillée",
};

const STEPS = [
  ["DRAFT", "Préparer"],
  ["CALCULATED", "Calculer"],
  ["REVIEW", "Contrôler"],
  ["VALIDATED", "Valider"],
  ["LOCKED", "Clôturer"],
] as const;

function formatEuros(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(cents) / 100);
}

function formatPayrollEuros(value: unknown) {
  if (value === null || value === undefined) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function sum(values: unknown[]) {
  return values.reduce((total, value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

function statusIndex(status: string) {
  const index = STEPS.findIndex(([code]) => code === status);
  return index < 0 ? 0 : index;
}

export default async function PayrollPeriodPage({ params }: { params: { periodId: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const period = await prisma.payrollPeriod.findFirst({ where: { id: params.periodId, organizationId: membership.organizationId } });
  if (!period) notFound();

  const periodStart = new Date(period.year, period.month - 1, 1);
  const periodEnd = new Date(period.year, period.month, 0);
  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(23, 59, 59, 999);
  const calculationDate = new Date(period.year, period.month - 1, 1, 12, 0, 0, 0);

  const [employees, profiles, calculations, variables, validatedRules] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, position: true, contractType: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.payrollProfile.findMany({
      where: { organizationId: membership.organizationId, effectiveFrom: { lte: periodEnd }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: periodStart } }] },
      select: { employeeId: true, baseSalaryCents: true, monthlyHours: true, effectiveFrom: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.payrollCalculation.findMany({
      where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
      select: { employeeId: true, grossAmount: true, employeeContributions: true, employerContributions: true, netBeforeTax: true, withholdingTax: true, netPaid: true },
    }),
    prisma.payrollVariable.findMany({
      where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
      select: { id: true, employeeId: true, code: true, label: true, amount: true, unit: true, source: true },
      orderBy: [{ employeeId: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payrollRuleVersion.findMany({
      where: { status: "VALIDATED", validFrom: { lte: calculationDate }, OR: [{ validUntil: null }, { validUntil: { gte: calculationDate } }] },
      select: { id: true, code: true, version: true, scope: true, sourceName: true, sourceUrl: true },
      orderBy: [{ code: "asc" }, { scope: "asc" }, { version: "desc" }],
    }),
  ]);

  const profileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  const calculationByEmployee = new Map<string, (typeof calculations)[number]>();
  for (const calculation of calculations) calculationByEmployee.set(calculation.employeeId, calculation);

  const configuredCount = employees.filter((employee) => profileByEmployee.has(employee.id)).length;
  const calculatedCount = employees.filter((employee) => calculationByEmployee.has(employee.id)).length;
  const readiness = checkPayrollPeriodReadiness(employees.map((employee) => {
    const profile = profileByEmployee.get(employee.id);
    return { employeeId: employee.id, firstName: employee.firstName, lastName: employee.lastName, baseSalaryCents: profile?.baseSalaryCents, monthlyHours: profile?.monthlyHours == null ? null : Number(profile.monthlyHours) };
  }));

  const variableRows = variables.map((variable) => ({ id: variable.id, employeeId: variable.employeeId, code: variable.code, label: variable.label, amount: String(variable.amount), unit: variable.unit, source: variable.source }));
  const calculatedRows = employees.map((employee) => calculationByEmployee.get(employee.id)).filter((calculation): calculation is (typeof calculations)[number] => Boolean(calculation));
  const calculationRule = validatedRules.find((rule) => rule.code !== "FR.SMIC.MONTHLY_GROSS") ?? null;
  const hasValidatedRule = calculationRule !== null;
  const isAdmin = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const calculationDisabled = !isAdmin || period.status !== "DRAFT" || !readiness.ready || !hasValidatedRule;
  const reviewDisabled = !isAdmin || period.status !== "CALCULATED" || calculatedCount !== employees.length || employees.length === 0;
  const validationDisabled = !isAdmin || period.status !== "REVIEW" || calculatedCount !== employees.length || employees.length === 0;
  const lockDisabled = !isAdmin || period.status !== "VALIDATED" || calculatedCount !== employees.length || employees.length === 0;

  const grossTotal = sum(calculatedRows.map((calculation) => calculation.grossAmount));
  const employeeContributionsTotal = sum(calculatedRows.map((calculation) => calculation.employeeContributions));
  const employerContributionsTotal = sum(calculatedRows.map((calculation) => calculation.employerContributions));
  const netPaidTotal = sum(calculatedRows.map((calculation) => calculation.netPaid));
  const currentStep = statusIndex(period.status);

  if (period.status === "LOCKED") {
    return (
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/payroll" className="text-sm font-medium text-ink-soft transition hover:text-ink">← Retour à la paie</Link>

        <header className="mt-5 rounded-2xl border border-surface-border bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent-teal" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Paie clôturée</p>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{MONTHS[period.month - 1]} {period.year}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">La période est verrouillée. Les données du calcul sont conservées dans le dossier de paie ; cette page se concentre désormais sur les documents et les actions de clôture.</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-accent-teal/10 px-3 py-1.5 text-xs font-semibold text-accent-teal">Verrouillée</span>
          </div>
        </header>

        {calculatedRows.length > 0 ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Brut total", formatPayrollEuros(grossTotal)],
              ["Cotisations salariales", formatPayrollEuros(employeeContributionsTotal)],
              ["Cotisations employeur", formatPayrollEuros(employerContributionsTotal)],
              ["Net payé", formatPayrollEuros(netPaidTotal)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-surface-border bg-white px-5 py-4">
                <p className="text-xs text-ink-faint">{label}</p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">{value}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="mt-5 rounded-xl border border-surface-border bg-white p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Documents</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Bulletins de salaire</h2>
            <p className="mt-1 text-sm text-ink-soft">Un bulletin par salarié, réunis dans un seul PDF propre à transmettre ou archiver.</p>
          </div>
          <PayrollPayslipGenerateButton periodId={period.id} />
        </section>

        <section className="mt-5 rounded-xl border border-surface-border bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-ink">Besoin de corriger la période ?</p><p className="mt-1 text-xs text-ink-faint">La réouverture remet la période dans un nouveau cycle de contrôle.</p></div>
            <PayrollReopenButton periodId={period.id} disabled={!isAdmin} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/payroll" className="text-sm font-medium text-ink-soft transition hover:text-ink">← Retour à la paie</Link>

      <header className="mt-5 rounded-2xl border border-surface-border bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Période de paie</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{MONTHS[period.month - 1]} {period.year}</h1>
            <p className="mt-2 text-sm text-ink-soft">Préparez, calculez, contrôlez et validez la paie avant son verrouillage.</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-ink-soft">{STATUS_LABELS[period.status] ?? period.status}</span>
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div className="flex min-w-[620px] items-center">
            {STEPS.map(([code, label], index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <div key={code} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-accent-teal text-white" : active ? "bg-brand-primary text-white" : "bg-surface-subtle text-ink-faint"}`}>{done ? "✓" : index + 1}</span>
                    <span className={`text-xs font-semibold ${active ? "text-ink" : "text-ink-faint"}`}>{label}</span>
                  </div>
                  {index < STEPS.length - 1 ? <div className={`mx-3 h-px min-w-8 flex-1 ${done ? "bg-accent-teal/40" : "bg-surface-border"}`} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Salariés actifs</p><p className="mt-1.5 text-2xl font-semibold text-ink">{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Profils paie</p><p className="mt-1.5 text-2xl font-semibold text-ink">{configuredCount}/{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Calculs enregistrés</p><p className="mt-1.5 text-2xl font-semibold text-ink">{calculatedCount}/{employees.length}</p></div>
      </section>

      {!readiness.ready ? (
        <section className="mt-5 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-amber">Préparation</p><p className="mt-1 font-semibold text-ink">Le calcul est bloqué tant que les données de base ne sont pas complètes.</p></div><span className="text-xs font-semibold text-accent-amber">{readiness.issues.length} point{readiness.issues.length > 1 ? "s" : ""}</span></div>
          <div className="mt-3 grid gap-1.5 text-sm text-ink-soft">{readiness.issues.map((issue, index) => <p key={`${issue.code}-${issue.employeeId ?? "period"}-${index}`}>• {issue.message}</p>)}</div>
        </section>
      ) : (
        <section className="mt-5 rounded-xl border border-surface-border bg-surface-subtle/30 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-teal">Préparation terminée</p><p className="mt-1 font-semibold text-ink">Les données salarié de base sont prêtes.</p><p className="mt-1 text-sm text-ink-soft">Le moteur utilisera uniquement les règles réglementaires et conventionnelles validées disponibles pour la période.</p></section>
      )}

      <section className="mt-5 rounded-xl border border-surface-border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Calcul</p><h2 className="mt-1 text-lg font-semibold text-ink">Règle de paie applicable</h2><p className="mt-1 text-sm text-ink-soft">Une règle validée doit être disponible avant de lancer le calcul de la période.</p></div><span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-ink-faint">{validatedRules.length} version{validatedRules.length > 1 ? "s" : ""}</span></div>
        {hasValidatedRule ? <PayrollCalculateButton periodId={period.id} disabled={calculationDisabled} ruleCode={calculationRule!.code} ruleScope={calculationRule!.scope} /> : <p className="mt-4 rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber">Aucune version de règle de paie validée n’est disponible pour cette période.</p>}
      </section>

      {calculatedRows.length > 0 ? (
        <section className="mt-5 overflow-hidden rounded-xl border border-surface-border bg-white">
          <div className="flex flex-col gap-2 border-b border-surface-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-teal">Résultat enregistré</p><h2 className="mt-1 text-lg font-semibold text-ink">Synthèse de la période</h2></div><span className="text-xs font-semibold text-ink-faint">{calculatedRows.length}/{employees.length} salariés calculés</span></div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {[["Brut total", grossTotal], ["Cotisations salariales", employeeContributionsTotal], ["Net avant impôt", sum(calculatedRows.map((calculation) => calculation.netBeforeTax))], ["PAS", sum(calculatedRows.map((calculation) => calculation.withholdingTax))], ["Net payé", netPaidTotal]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-surface-border bg-surface-subtle/30 p-4"><p className="text-xs text-ink-faint">{label}</p><p className="mt-1.5 text-lg font-semibold text-ink">{formatPayrollEuros(value)}</p></div>)}
          </div>
          <div className="overflow-x-auto border-t border-surface-border"><table className="min-w-[980px] w-full text-sm"><thead><tr className="border-b border-surface-border bg-surface-subtle/40 text-left text-xs font-semibold text-ink-faint"><th className="px-5 py-3">Salarié</th><th className="px-5 py-3">Brut</th><th className="px-5 py-3">Cotisations</th><th className="px-5 py-3">Net avant impôt</th><th className="px-5 py-3">PAS</th><th className="px-5 py-3">Net payé</th></tr></thead><tbody className="divide-y divide-surface-border">{employees.map((employee) => { const calculation = calculationByEmployee.get(employee.id); if (!calculation) return null; return <tr key={employee.id}><td className="px-5 py-3.5"><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-ink-faint">{employee.position || "Poste non renseigné"}</p></td><td className="px-5 py-3.5 font-medium text-ink">{formatPayrollEuros(calculation.grossAmount)}</td><td className="px-5 py-3.5 text-ink-soft">{formatPayrollEuros(calculation.employeeContributions)}</td><td className="px-5 py-3.5 font-medium text-ink">{formatPayrollEuros(calculation.netBeforeTax)}</td><td className="px-5 py-3.5 text-ink-soft">{formatPayrollEuros(calculation.withholdingTax)}</td><td className="px-5 py-3.5 font-semibold text-ink">{formatPayrollEuros(calculation.netPaid)}</td></tr>; })}</tbody></table></div>
        </section>
      ) : null}

      {period.status === "CALCULATED" ? <PayrollReviewButton periodId={period.id} disabled={reviewDisabled} /> : null}
      {period.status === "REVIEW" ? <PayrollValidateButton periodId={period.id} disabled={validationDisabled} /> : null}
      {period.status === "VALIDATED" ? <PayrollLockButton periodId={period.id} disabled={lockDisabled} /> : null}

      <section className="mt-5 overflow-hidden rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Salariés</p><h2 className="mt-1 text-lg font-semibold text-ink">Préparation de la période</h2><p className="mt-1 text-sm text-ink-soft">Vérifiez rapidement les données utilisées avant le calcul.</p></div>
        <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-sm"><thead><tr className="border-b border-surface-border bg-surface-subtle/40 text-left text-xs font-semibold text-ink-faint"><th className="px-5 py-3">Salarié</th><th className="px-5 py-3">Contrat</th><th className="px-5 py-3">Salaire de référence</th><th className="px-5 py-3">Heures</th><th className="px-5 py-3">État</th></tr></thead><tbody className="divide-y divide-surface-border">{employees.map((employee) => { const profile = profileByEmployee.get(employee.id); const calculation = calculationByEmployee.get(employee.id); return <tr key={employee.id}><td className="px-5 py-3.5"><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-ink-faint">{employee.position || "Poste non renseigné"}</p></td><td className="px-5 py-3.5 text-ink-soft">{employee.contractType ?? "Non renseigné"}</td><td className="px-5 py-3.5 text-ink-soft">{formatEuros(profile?.baseSalaryCents)}</td><td className="px-5 py-3.5 text-ink-soft">{profile?.monthlyHours == null ? "—" : String(profile.monthlyHours)}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${calculation ? "bg-accent-teal/10 text-accent-teal" : "bg-surface-subtle text-ink-faint"}`}>{calculation ? "Calculé" : "À calculer"}</span></td></tr>; })}</tbody></table></div>
      </section>

      <PayrollVariablesSection periodId={period.id} employees={employees.map((employee) => ({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName }))} variables={variableRows} readOnly={!isAdmin || period.status !== "DRAFT"} />
    </div>
  );
}
