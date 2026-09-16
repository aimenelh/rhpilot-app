import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
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
  DRAFT: "À préparer",
  CALCULATED: "Calculée",
  REVIEW: "À contrôler",
  VALIDATED: "Prête à clôturer",
  LOCKED: "Clôturée",
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

function sum(values: unknown[]): number {
  return values.reduce<number>((total, value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

function statusIndex(status: string) {
  const index = STEPS.findIndex(([code]) => code === status);
  return index < 0 ? 0 : index;
}

function nextActionLabel(status: string) {
  if (status === "DRAFT") return "Calculer la période";
  if (status === "CALCULATED") return "Passer au contrôle";
  if (status === "REVIEW") return "Valider les résultats";
  if (status === "VALIDATED") return "Clôturer la période";
  return "Période clôturée";
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
      where: { organizationId: membership.organizationId, deletedAt: null, hireDate: { lte: periodEnd }, OR: [{ contractEndDate: null }, { contractEndDate: { gte: periodStart } }] },
      select: { id: true, firstName: true, lastName: true, position: true, contractType: true, hireDate: true, contractEndDate: true },
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
    const adjustments = variables.filter((variable) => variable.employeeId === employee.id && variable.code === "INCOMPLETE_MONTH");
    return {
      hasIncompleteMonthAdjustment: adjustments.length === 1 && adjustments[0].unit === "EUR",
      hireDate: employee.hireDate,
      contractEndDate: employee.contractEndDate,
      profileCount: profiles.filter((profileRow) => profileRow.employeeId === employee.id).length,
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      baseSalaryCents: profile?.baseSalaryCents,
      monthlyHours: profile?.monthlyHours == null ? null : Number(profile.monthlyHours),
    };
  }), { year: period.year, month: period.month });

  const variableRows = variables.map((variable) => ({ id: variable.id, employeeId: variable.employeeId, code: variable.code, label: variable.label, amount: String(variable.amount), unit: variable.unit, source: variable.source }));
  const calculatedRows = employees.map((employee) => calculationByEmployee.get(employee.id)).filter((calculation): calculation is (typeof calculations)[number] => Boolean(calculation));
  const calculationRule = validatedRules.find((rule) => rule.code !== "FR.SMIC.MONTHLY_GROSS") ?? null;
  const hasValidatedRule = calculationRule !== null;
  const isOwner = membership.accessRole === "OWNER";
  const calculationDisabled = !isOwner || period.status !== "DRAFT" || !readiness.ready || !hasValidatedRule;
  const reviewDisabled = !isOwner || period.status !== "CALCULATED" || calculatedCount !== employees.length || employees.length === 0;
  const validationDisabled = !isOwner || period.status !== "REVIEW" || calculatedCount !== employees.length || employees.length === 0;
  const lockDisabled = !isOwner || period.status !== "VALIDATED" || calculatedCount !== employees.length || employees.length === 0;

  const grossTotal = sum(calculatedRows.map((calculation) => calculation.grossAmount));
  const employeeContributionsTotal = sum(calculatedRows.map((calculation) => calculation.employeeContributions));
  const employerContributionsTotal = sum(calculatedRows.map((calculation) => calculation.employerContributions));
  const netBeforeTaxTotal = sum(calculatedRows.map((calculation) => calculation.netBeforeTax));
  const withholdingTaxTotal = sum(calculatedRows.map((calculation) => calculation.withholdingTax));
  const netPaidTotal = sum(calculatedRows.map((calculation) => calculation.netPaid));
  const currentStep = statusIndex(period.status);

  if (period.status === "LOCKED") {
    return (
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/payroll" className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"><ArrowLeft size={16} /> Retour au centre de paie</Link>

        <header className="mt-5 rounded-2xl border border-surface-border bg-white p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-teal/10 text-accent-teal"><LockKeyhole size={16} /></span><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-teal">Période clôturée</p></div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{MONTHS[period.month - 1]} {period.year}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">Le calcul est verrouillé. Cette vue ne propose plus de saisie : elle donne accès aux résultats, aux bulletins et à la réouverture contrôlée.</p>
            </div>
            <span className="w-fit rounded-full bg-accent-teal/10 px-3 py-1.5 text-xs font-semibold text-accent-teal">Clôturée</span>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Brut total", formatPayrollEuros(grossTotal)],
            ["Cotisations salariales", formatPayrollEuros(employeeContributionsTotal)],
            ["Cotisations employeur", formatPayrollEuros(employerContributionsTotal)],
            ["Net payé", formatPayrollEuros(netPaidTotal)],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">{label}</p><p className="mt-2 text-xl font-semibold text-ink">{value}</p></div>)}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
            <div className="flex items-center gap-2"><FileText size={17} className="text-brand-primary" /><h2 className="font-semibold text-ink">Bulletins de salaire</h2></div>
            <p className="mt-1 text-sm text-ink-soft">Générez les documents à partir du calcul verrouillé, sans recalculer la période.</p>
            <div className="mt-4"><PayrollPayslipGenerateButton periodId={period.id} /></div>
          </div>
          <div className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
            <h2 className="font-semibold text-ink">Correction exceptionnelle</h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">La réouverture remet le mois dans un nouveau cycle de contrôle. Elle ne doit être utilisée que lorsqu'une correction est réellement nécessaire.</p>
            <div className="mt-4"><PayrollReopenButton periodId={period.id} disabled={!isOwner} /></div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/dashboard/payroll" className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"><ArrowLeft size={16} /> Retour au centre de paie</Link>

      <header className="mt-5 overflow-hidden rounded-2xl border border-surface-border bg-white">
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Dossier de paie</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{MONTHS[period.month - 1]} {period.year}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">Travaillez par étape. L'écran met en avant la prochaine action et garde les détails techniques dans des zones dédiées.</p>
          </div>
          <div className="text-left lg:text-right"><span className="inline-flex w-fit rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-ink-soft">{STATUS_LABELS[period.status] ?? period.status}</span><p className="mt-2 text-xs text-ink-faint">Prochaine action : {nextActionLabel(period.status)}</p></div>
        </div>

        <div className="overflow-x-auto border-t border-surface-border bg-surface-subtle/25 px-5 py-4">
          <div className="flex min-w-[680px] items-center">
            {STEPS.map(([code, label], index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <div key={code} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-accent-teal text-white" : active ? "bg-brand-primary text-white" : "border border-surface-border bg-white text-ink-faint"}`}>{done ? <Check size={15} /> : index + 1}</span>
                    <span className={`text-xs font-semibold ${active ? "text-ink" : done ? "text-accent-teal" : "text-ink-faint"}`}>{label}</span>
                  </div>
                  {index < STEPS.length - 1 ? <div className={`mx-4 h-px min-w-10 flex-1 ${done ? "bg-accent-teal/40" : "bg-surface-border"}`} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-ink-faint">Salariés du mois</p><Users size={16} className="text-ink-faint" /></div><p className="mt-2 text-2xl font-semibold text-ink">{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-ink-faint">Profils prêts</p><ShieldCheck size={16} className="text-ink-faint" /></div><p className="mt-2 text-2xl font-semibold text-ink">{configuredCount}/{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-ink-faint">Calculs enregistrés</p><ReceiptText size={16} className="text-ink-faint" /></div><p className="mt-2 text-2xl font-semibold text-ink">{calculatedCount}/{employees.length}</p></div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className={`rounded-2xl border p-5 ${readiness.ready ? "border-accent-teal/25 bg-accent-teal/[0.035]" : "border-accent-amber/30 bg-accent-amber/5"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${readiness.ready ? "bg-accent-teal/10 text-accent-teal" : "bg-accent-amber/10 text-accent-amber"}`}>{readiness.ready ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
              <div><p className="text-sm font-semibold text-ink">{readiness.ready ? "Préparation de base prête" : "Préparation à terminer"}</p><p className="mt-1 text-xs leading-5 text-ink-soft">{readiness.ready ? "Les contrôles préalables actuellement disponibles sont satisfaits." : `${readiness.issues.length} point${readiness.issues.length > 1 ? "s" : ""} bloque${readiness.issues.length > 1 ? "nt" : ""} le calcul.`}</p></div>
            </div>
            {!readiness.ready ? <div className="mt-4 space-y-2">{readiness.issues.map((issue, index) => <div key={`${issue.code}-${issue.employeeId ?? "period"}-${index}`} className="rounded-lg bg-white/75 px-3 py-2 text-xs leading-5 text-ink-soft">{issue.message}{issue.employeeId ? <div><Link className="font-semibold text-brand-primary hover:underline" href={`/dashboard/employees/${issue.employeeId}`}>Ouvrir le dossier salarié</Link></div> : null}</div>)}</div> : null}
          </section>

          <details className="group overflow-hidden rounded-2xl border border-surface-border bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden"><div><p className="text-sm font-semibold text-ink">Salariés de la période</p><p className="mt-1 text-xs text-ink-faint">{employees.length} dossier{employees.length > 1 ? "s" : ""}</p></div><span className="text-xs font-semibold text-ink-faint group-open:text-ink">Afficher</span></summary>
            <div className="max-h-[420px] overflow-y-auto border-t border-surface-border divide-y divide-surface-border">
              {employees.map((employee) => {
                const profile = profileByEmployee.get(employee.id);
                const calculation = calculationByEmployee.get(employee.id);
                return <div key={employee.id} className="px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 truncate text-xs text-ink-faint">{employee.position || employee.contractType || "Dossier salarié"}</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${calculation ? "bg-accent-teal/10 text-accent-teal" : "bg-surface-subtle text-ink-faint"}`}>{calculation ? "Calculé" : "À calculer"}</span></div><p className="mt-2 text-xs text-ink-soft">{formatEuros(profile?.baseSalaryCents)} · {profile?.monthlyHours == null ? "—" : String(profile.monthlyHours)} h</p></div>;
              })}
            </div>
          </details>

          <details className="group overflow-hidden rounded-2xl border border-surface-border bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden"><div><p className="text-sm font-semibold text-ink">Référentiel utilisé</p><p className="mt-1 text-xs text-ink-faint">{validatedRules.length} version{validatedRules.length > 1 ? "s" : ""} disponible{validatedRules.length > 1 ? "s" : ""}</p></div><span className="text-xs font-semibold text-ink-faint group-open:text-ink">Afficher</span></summary>
            <div className="border-t border-surface-border p-4 text-xs text-ink-soft">{validatedRules.length === 0 ? <p>Aucune règle validée disponible pour cette date.</p> : <div className="space-y-2">{validatedRules.map((rule) => <div key={rule.id} className="rounded-lg bg-surface-subtle/40 px-3 py-2"><p className="font-medium text-ink">{rule.code} · v{rule.version}</p><p className="mt-0.5 text-ink-faint">{rule.scope} · {rule.sourceName}</p></div>)}</div>}</div>
          </details>
        </aside>

        <main className="min-w-0">
          <section className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Action requise</p><h2 className="mt-1 text-xl font-semibold text-ink">{nextActionLabel(period.status)}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">RH Pilot n'enchaîne aucune étape automatiquement. Vous gardez la main sur chaque passage du cycle.</p></div>
              <span className="w-fit rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-faint">Étape {currentStep + 1}/5</span>
            </div>

            {period.status === "DRAFT" ? (
              <div className="mt-5 border-t border-surface-border pt-5">
                {hasValidatedRule ? <PayrollCalculateButton periodId={period.id} disabled={calculationDisabled} ruleCode={calculationRule!.code} ruleScope={calculationRule!.scope} /> : <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 px-4 py-3 text-sm text-accent-amber">Aucune version de règle de paie validée n'est disponible pour cette période.</div>}
              </div>
            ) : null}
            {period.status === "CALCULATED" ? <PayrollReviewButton periodId={period.id} disabled={reviewDisabled} /> : null}
            {period.status === "REVIEW" ? <PayrollValidateButton periodId={period.id} disabled={validationDisabled} /> : null}
            {period.status === "VALIDATED" ? <PayrollLockButton periodId={period.id} disabled={lockDisabled} /> : null}
          </section>

          {calculatedRows.length > 0 ? (
            <section className="mt-5 overflow-hidden rounded-2xl border border-surface-border bg-white">
              <div className="flex flex-col gap-2 border-b border-surface-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-teal">Résultat enregistré</p><h2 className="mt-1 text-lg font-semibold text-ink">Synthèse de la période</h2></div><span className="text-xs font-semibold text-ink-faint">{calculatedRows.length}/{employees.length} salariés calculés</span></div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
                {[["Brut", grossTotal], ["Cotisations salarié", employeeContributionsTotal], ["Net avant impôt", netBeforeTaxTotal], ["PAS", withholdingTaxTotal], ["Net payé", netPaidTotal]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-surface-subtle/45 p-4"><p className="text-xs text-ink-faint">{label}</p><p className="mt-1.5 text-lg font-semibold text-ink">{formatPayrollEuros(value)}</p></div>)}
              </div>
              <details className="group border-t border-surface-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden"><div><p className="text-sm font-semibold text-ink">Détail par salarié</p><p className="mt-1 text-xs text-ink-faint">Ouvrir uniquement pour contrôler les résultats individuels.</p></div><span className="text-xs font-semibold text-ink-faint group-open:text-ink">Afficher</span></summary>
                <div className="overflow-x-auto border-t border-surface-border"><table className="min-w-[900px] w-full text-sm"><thead><tr className="bg-surface-subtle/40 text-left text-xs font-semibold text-ink-faint"><th className="px-5 py-3">Salarié</th><th className="px-5 py-3">Brut</th><th className="px-5 py-3">Cotisations</th><th className="px-5 py-3">Net avant impôt</th><th className="px-5 py-3">PAS</th><th className="px-5 py-3">Net payé</th></tr></thead><tbody className="divide-y divide-surface-border">{employees.map((employee) => { const calculation = calculationByEmployee.get(employee.id); if (!calculation) return null; return <tr key={employee.id}><td className="px-5 py-3.5"><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-ink-faint">{employee.position || "Poste non renseigné"}</p></td><td className="px-5 py-3.5 font-medium text-ink">{formatPayrollEuros(calculation.grossAmount)}</td><td className="px-5 py-3.5 text-ink-soft">{formatPayrollEuros(calculation.employeeContributions)}</td><td className="px-5 py-3.5 text-ink">{formatPayrollEuros(calculation.netBeforeTax)}</td><td className="px-5 py-3.5 text-ink-soft">{formatPayrollEuros(calculation.withholdingTax)}</td><td className="px-5 py-3.5 font-semibold text-ink">{formatPayrollEuros(calculation.netPaid)}</td></tr>; })}</tbody></table></div>
              </details>
            </section>
          ) : null}

          <PayrollVariablesSection periodId={period.id} employees={employees.map((employee) => ({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName }))} variables={variableRows} readOnly={!isOwner || period.status !== "DRAFT"} />
        </main>
      </div>
    </div>
  );
}
