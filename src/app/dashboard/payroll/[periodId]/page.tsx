import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { checkPayrollPeriodReadiness } from "@/lib/payroll/period-preflight";
import { loadTerminations } from "@/lib/payroll/bulletin/period-loader";
import { bulletinFromSnapshot } from "@/lib/payroll/bulletin/prior-state";
import { cellValues, type EntryTab } from "@/lib/payroll/entry-grid";
import PayrollPayslipGenerateButton from "../PayrollPayslipGenerateButton";
import PayrollReopenButton from "../PayrollReopenButton";
import MinimumSalaryControlSection from "../MinimumSalaryControlSection";
import PayrollTerminationSection, { type LeavingEmployee } from "../PayrollTerminationSection";
import PublishPayslipsPanel, { type PublishPanelData } from "./PublishPayslipsPanel";
import { ExitDocumentButtons, UploadEmployeeDocumentForm } from "../../employees/EmployeeSpaceSection";
import { loadAdminDocuments, loadSpaceStatuses } from "@/lib/employee-space/admin-summary";
import { EXIT_DOCUMENT_KINDS } from "@/lib/employee-space/labels";
import { electronicPayslipReadiness } from "@/lib/employee-space/notice-rules";
import PayrollEntryGrid, { type GridEmployee } from "./PayrollEntryGrid";
import PayrollAbsencesPanel, { type PeriodAbsenceRow } from "./PayrollAbsencesPanel";
import PayslipReview, { type PayslipReviewRow } from "./PayslipReview";
import { BackToEntryButton, ClosePeriodButton, RunCalculationButton } from "./PeriodActions";
import { getPayrollMembership } from "@/lib/payrollAccess";

export const dynamic = "force-dynamic";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const TABS = [
  ["saisie", "Saisie"],
  ["controle", "Contrôle"],
  ["bulletins", "Bulletins"],
  ["declaration", "Déclaration"],
] as const;
type Tab = (typeof TABS)[number][0];
const SUB_TABS = [
  ["heures", "Heures"],
  ["variables", "Primes et variables"],
  ["absences", "Absences"],
  ["mouvements", "Entrées et sorties"],
] as const;
type SubTab = (typeof SUB_TABS)[number][0];

const ABSENCE_LABELS: Record<string, string> = {
  PAID_LEAVE: "Congés payés", RTT: "RTT", SICK_LEAVE: "Maladie", WORK_ACCIDENT: "Accident du travail", UNPAID_LEAVE: "Sans solde",
  FAMILY_EVENT: "Événement familial", MATERNITY: "Maternité", PATERNITY: "Paternité", OTHER: "Autre",
};
const IJSS_TYPES = new Set(["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"]);

const frDate = (date: Date) => date.toISOString().slice(0, 10).split("-").reverse().join("/");
const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);

/** Où corriger ce que signale une remarque du calcul. */
function warningLink(periodId: string, employeeId: string, warning: string): { href: string; label: string } | null {
  const text = warning.toLowerCase();
  if (text.includes("ijss")) return { href: `/dashboard/payroll/${periodId}?tab=saisie&sub=absences`, label: "Saisir les IJSS" };
  if (text.includes("fiche de sortie") || text.includes("fin de contrat")) return { href: `/dashboard/payroll/${periodId}?tab=saisie&sub=mouvements`, label: "Ouvrir la fiche de sortie" };
  if (text.includes("compteurs") || text.includes("cumul") || text.includes("reprise") || text.includes("horaire") || text.includes("taux personnalisé")) return { href: `/dashboard/employees/${employeeId}?onglet=paie`, label: "Ouvrir la paie du salarié" };
  return null;
}

export default async function PayrollPeriodPage({ params, searchParams }: { params: { periodId: string }; searchParams: { tab?: string; sub?: string; focus?: string; absence?: string } }) {
  const membership = await getPayrollMembership();
  if (!membership) redirect("/dashboard");
  const organizationId = membership.organizationId;

  const period = await prisma.payrollPeriod.findFirst({ where: { id: params.periodId, organizationId } });
  if (!period) notFound();

  const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1));
  const periodEnd = new Date(Date.UTC(period.year, period.month, 0, 23, 59, 59, 999));
  const calculationDate = new Date(Date.UTC(period.year, period.month - 1, 1, 12));
  const periodFirstIso = periodStart.toISOString().slice(0, 10);
  const periodLastIso = periodEnd.toISOString().slice(0, 10);

  const [employees, profiles, calculations, variables, validatedRules, absences, pendingAbsences, payslips, terminations, reviewRows] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId, deletedAt: null, hireDate: { lte: periodEnd }, OR: [{ contractEndDate: null }, { contractEndDate: { gte: periodStart } }] },
      select: { id: true, firstName: true, lastName: true, position: true, contractType: true, hireDate: true, contractEndDate: true, isDemoData: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.payrollProfile.findMany({
      where: { organizationId, effectiveFrom: { lte: periodEnd }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: periodStart } }] },
      select: { employeeId: true, baseSalaryCents: true, monthlyHours: true, effectiveFrom: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.payrollCalculation.findMany({ where: { organizationId, payrollPeriodId: period.id }, select: { employeeId: true, calculationSnapshot: true } }),
    prisma.payrollVariable.findMany({ where: { organizationId, payrollPeriodId: period.id }, select: { employeeId: true, code: true, amount: true, reference: true } }),
    prisma.payrollRuleVersion.findMany({
      where: { status: "VALIDATED", validFrom: { lte: calculationDate }, OR: [{ validUntil: null }, { validUntil: { gte: calculationDate } }] },
      select: { id: true, code: true, version: true, scope: true, sourceName: true },
      orderBy: [{ code: "asc" }, { scope: "asc" }, { version: "desc" }],
    }),
    prisma.absence.findMany({ where: { organizationId, status: "VALIDATED", startDate: { lte: periodEnd }, endDate: { gte: periodStart } }, select: { id: true, employeeId: true, type: true, startDate: true, endDate: true }, orderBy: [{ startDate: "asc" }] }),
    prisma.absence.count({ where: { organizationId, status: { in: ["TO_VALIDATE", "TO_PROVIDE_JUSTIFICATION", "TO_REVIEW_JUSTIFICATION"] }, startDate: { lte: periodEnd }, endDate: { gte: periodStart } } }),
    prisma.payslip.findMany({ where: { organizationId, payrollPeriodId: period.id }, select: { id: true, employeeId: true, documentStatus: true } }),
    loadTerminations(organizationId, period.id).catch(() => new Map<string, never>()),
    prisma.$queryRaw<Array<{ employeeId: string }>>`SELECT "employeeId" FROM "payroll_entry_reviews" WHERE "organizationId" = ${organizationId} AND "payrollPeriodId" = ${period.id}`.catch(() => [] as Array<{ employeeId: string }>),
  ]);

  const activeIds = new Set(employees.map((employee) => employee.id));
  const profileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  const reviewedIds = new Set(reviewRows.map((row) => row.employeeId).filter((id) => activeIds.has(id)));
  const employeeName = (id: string) => { const employee = employees.find((candidate) => candidate.id === id); return employee ? `${employee.firstName} ${employee.lastName}`.trim() : "Salarié"; };

  const gridEmployees: GridEmployee[] = employees.map((employee) => {
    const profile = profileByEmployee.get(employee.id);
    const hours = profile?.monthlyHours == null ? null : Number(profile.monthlyHours);
    const partTime = hours !== null && hours < 151.66;
    const hint = hours === null ? "Profil paie à compléter" : `${partTime ? "Temps partiel" : "Temps plein"} · ${hours.toFixed(2).replace(".", ",")} h`;
    return { id: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), hint, partTime, reviewed: reviewedIds.has(employee.id) };
  });
  const values = Object.fromEntries(cellValues(variables.map((variable) => ({ employeeId: variable.employeeId, code: variable.code, amount: Number(variable.amount), reference: variable.reference }))));

  const readiness = checkPayrollPeriodReadiness(employees.map((employee) => {
    const profile = profileByEmployee.get(employee.id);
    return {
      employeeId: employee.id, firstName: employee.firstName, lastName: employee.lastName,
      baseSalaryCents: profile?.baseSalaryCents, monthlyHours: profile?.monthlyHours == null ? null : Number(profile.monthlyHours),
      hireDate: employee.hireDate, contractEndDate: employee.contractEndDate,
      profileCount: profiles.filter((row) => row.employeeId === employee.id).length,
      hasTermination: terminations.has(employee.id),
    };
  }), { year: period.year, month: period.month }, { bulletinEngine: true });

  const calculationRule = validatedRules.find((rule) => rule.code !== "FR.SMIC.MONTHLY_GROSS") ?? null;
  const isAdmin = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const editable = isAdmin && period.status === "DRAFT";
  const calculatedCount = calculations.filter((calculation) => activeIds.has(calculation.employeeId)).length;
  const hasResults = calculatedCount > 0;
  const resultsComplete = employees.length > 0 && calculatedCount === employees.length;

  const payslipByEmployee = new Map(payslips.map((payslip) => [payslip.employeeId, payslip]));
  const reviewRowsData: PayslipReviewRow[] = employees.flatMap((employee) => {
    const calculation = calculations.find((candidate) => candidate.employeeId === employee.id);
    const bulletin = calculation ? bulletinFromSnapshot(calculation.calculationSnapshot) : null;
    if (!bulletin) return [];
    const payslip = payslipByEmployee.get(employee.id);
    return [{
      employeeId: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      position: employee.position ?? "",
      grossTotal: bulletin.totals.grossTotal,
      employeeContributions: bulletin.totals.employeeContributions,
      employerContributions: bulletin.totals.employerContributions,
      netBeforeTax: bulletin.totals.netBeforeTax,
      netTaxable: bulletin.totals.netTaxable,
      withholdingTax: bulletin.totals.withholdingTax,
      withholdingRate: bulletin.totals.withholdingRate,
      withholdingMode: bulletin.withholding.mode,
      netPaid: bulletin.totals.netPaid,
      netSocial: bulletin.totals.netSocial,
      employerCost: bulletin.totals.employerCost,
      warnings: bulletin.warnings,
      payslipId: payslip && (payslip.documentStatus === "GENERATED" || payslip.documentStatus === "PUBLISHED") ? payslip.id : null,
      lines: bulletin.lines.map((line) => ({ code: line.code, label: line.label, section: line.section, base: line.base, quantity: line.quantity, unit: line.unit, rate: line.rate, employerRate: line.employerRate, amount: line.amount, employerAmount: line.employerAmount })),
    }];
  });
  const warningItems = reviewRowsData.flatMap((row) => row.warnings.map((warning) => ({ employeeId: row.employeeId, name: row.name, warning })));
  const generatedCount = payslips.filter((payslip) => payslip.documentStatus === "GENERATED" || payslip.documentStatus === "PUBLISHED").length;

  const defaultTab: Tab = period.status === "DRAFT" ? "saisie" : period.status === "LOCKED" ? "bulletins" : "controle";
  const tab: Tab = (TABS.map(([code]) => code) as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as Tab) : defaultTab;
  const sub: SubTab = (SUB_TABS.map(([code]) => code) as readonly string[]).includes(searchParams.sub ?? "") ? (searchParams.sub as SubTab) : "heures";
  const href = (next: { tab?: Tab; sub?: SubTab }) => `/dashboard/payroll/${period.id}?tab=${next.tab ?? tab}${(next.tab ?? tab) === "saisie" ? `&sub=${next.sub ?? sub}` : ""}`;

  const tabDone: Record<Tab, boolean> = {
    saisie: period.status !== "DRAFT",
    controle: period.status === "LOCKED",
    bulletins: period.status === "LOCKED" && generatedCount === employees.length && employees.length > 0,
    declaration: false,
  };
  const monthLabel = `${capitalize(MONTHS[period.month - 1])} ${period.year}`;
  const statusLine = period.status === "DRAFT"
    ? `Saisie en cours · ${reviewedIds.size}/${employees.length} salarié${employees.length > 1 ? "s" : ""} vérifié${reviewedIds.size > 1 ? "s" : ""}`
    : period.status === "LOCKED"
      ? `Clôturé${period.lockedAt ? ` le ${frDate(period.lockedAt)}` : ""} · ${generatedCount}/${employees.length} bulletin${employees.length > 1 ? "s" : ""} produit${generatedCount > 1 ? "s" : ""}`
      : "Paie calculée : relisez les bulletins puis validez";

  // Absences du mois.
  const ijssByAbsence = new Map(variables.filter((variable) => variable.code === "IJSS_GROSS" && variable.reference).map((variable) => [variable.reference!, Number(variable.amount)]));
  const absenceRows: PeriodAbsenceRow[] = absences.filter((absence) => activeIds.has(absence.employeeId)).map((absence) => {
    const start = absence.startDate > periodStart ? absence.startDate : periodStart;
    const end = absence.endDate < periodEnd ? absence.endDate : periodEnd;
    const daysInMonth = Math.round((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86_400_000) + 1;
    return {
      id: absence.id, employeeId: absence.employeeId, employeeName: employeeName(absence.employeeId),
      typeLabel: ABSENCE_LABELS[absence.type] ?? absence.type,
      dates: absence.startDate.getTime() === absence.endDate.getTime() ? `le ${frDate(absence.startDate)}` : `du ${frDate(absence.startDate)} au ${frDate(absence.endDate)}`,
      daysInMonth, ijssEligible: IJSS_TYPES.has(absence.type), ijssAmount: ijssByAbsence.get(absence.id) ?? null,
    };
  });

  // Entrées et sorties.
  const arrivals = employees.filter((employee) => { const hire = employee.hireDate.toISOString().slice(0, 10); return hire >= periodFirstIso && hire <= periodLastIso; });
  const leaving: LeavingEmployee[] = employees
    .filter((employee) => { const exit = employee.contractEndDate?.toISOString().slice(0, 10); return Boolean(exit && exit >= periodFirstIso && exit <= periodLastIso); })
    .map((employee) => {
      const stored = terminations.get(employee.id);
      return {
        id: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), contractType: employee.contractType, exitDate: employee.contractEndDate!.toISOString().slice(0, 10),
        termination: stored ? { reason: stored.reason, noticeCompensation: stored.noticeCompensation, severanceAmount: stored.severanceAmount, severanceLegalMinimum: stored.severanceLegalMinimum, previousYearGross: stored.previousYearGross, eligibleForFullPension: stored.eligibleForFullPension, cddEndAllowanceMode: stored.cddEndAllowanceMode, cddEndAllowanceAmount: stored.cddEndAllowanceAmount, cddEndAllowanceRate: stored.cddEndAllowanceRate, paidLeaveCompensationAmount: stored.paidLeaveCompensationAmount } : null,
      };
    });
  const subCounts: Record<SubTab, number> = {
    heures: Object.keys(values).filter((key) => ["OVERTIME_25", "OVERTIME_50", "COMPLEMENTARY_10", "COMPLEMENTARY_25", "NIGHT_WORK", "SUNDAY_WORK", "PUBLIC_HOLIDAY_WORK", "ON_CALL"].includes(key.split(":")[1])).length,
    variables: 0,
    absences: absenceRows.length,
    mouvements: arrivals.length + leaving.length,
  };
  subCounts.variables = Object.keys(values).length - subCounts.heures;

  // Espace salarié : mise à disposition des bulletins et documents de sortie.
  const realEmployees = employees.filter((employee) => !employee.isDemoData);
  const [spaceStatuses, exitDocuments] = await Promise.all([
    loadSpaceStatuses(organizationId, realEmployees.map((employee) => employee.id)),
    loadAdminDocuments(organizationId, leaving.map((employee) => employee.id), { kinds: EXIT_DOCUMENT_KINDS }),
  ]);
  const generatedIds = new Set(payslips.filter((payslip) => payslip.documentStatus === "GENERATED" || payslip.documentStatus === "PUBLISHED").map((payslip) => payslip.employeeId));
  const todayIso = new Date().toISOString().slice(0, 10);
  const readinessOf = (employeeId: string) => {
    const space = spaceStatuses.get(employeeId);
    return electronicPayslipReadiness({ noticeAt: space?.noticeAt ?? null, method: space?.noticeMethod ?? null, alreadyReceivedElectronic: space?.hasElectronicPayslip ?? false, today: todayIso });
  };
  const electronicCandidates = realEmployees.filter((employee) => generatedIds.has(employee.id) && !spaceStatuses.get(employee.id)?.paperSince);
  const publishable = electronicCandidates.filter((employee) => readinessOf(employee.id).ready);
  // Un bulletin régénéré à l'identique a la même empreinte que celui déjà publié : rien à republier.
  const upToDate = period.status === "LOCKED" && generatedIds.size > 0
    ? new Set((await prisma.$queryRaw<Array<{ employeeId: string }>>`
        SELECT p."employeeId" FROM "payslips" p
        JOIN "employee_documents" d ON d."organizationId" = p."organizationId" AND d."employeeId" = p."employeeId"
          AND d."kind" = 'PAYSLIP' AND d."periodYear" = ${period.year} AND d."periodMonth" = ${period.month} AND d."replacedAt" IS NULL
        WHERE p."organizationId" = ${organizationId} AND p."payrollPeriodId" = ${period.id}
          AND p."storageKey" LIKE 'inline-db-v1:%' AND substring(p."storageKey" from 14 for 64) = d."sha256"
      `.catch(() => [] as Array<{ employeeId: string }>)).map((row) => row.employeeId))
    : new Set<string>();
  const publishData: PublishPanelData = {
    periodId: period.id,
    generated: generatedIds.size,
    toPublish: publishable.filter((employee) => !upToDate.has(employee.id)).length,
    published: publishable.filter((employee) => upToDate.has(employee.id)).length,
    withSpace: publishable.filter((employee) => spaceStatuses.get(employee.id)?.status === "ACTIVE").length,
    withoutSpace: publishable.filter((employee) => spaceStatuses.get(employee.id)?.status !== "ACTIVE").map((employee) => ({ id: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), invited: spaceStatuses.get(employee.id)?.status === "INVITED" })),
    paper: realEmployees.filter((employee) => generatedIds.has(employee.id) && spaceStatuses.get(employee.id)?.paperSince).map((employee) => ({ id: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim() })),
    notInformed: electronicCandidates.flatMap((employee) => {
      const readiness = readinessOf(employee.id);
      return readiness.ready ? [] : [{ id: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), availableFrom: readiness.reason === "WAITING" ? readiness.availableFrom : null }];
    }),
    bundleUrl: `/api/payroll/periods/${encodeURIComponent(period.id)}/payslips`,
  };
  const leavingIsDemo = new Set(employees.filter((employee) => employee.isDemoData).map((employee) => employee.id));
  const healthCoverageByEmployee = new Map(calculations.map((calculation) => [calculation.employeeId, Boolean(bulletinFromSnapshot(calculation.calculationSnapshot)?.lines.some((line) => line.code === "SANTE" || line.code.startsWith("PREVOYANCE")))]));

  // Congés payés après calcul (panneau Détails).
  const leaveRows = calculations.flatMap((calculation) => {
    const leave = bulletinFromSnapshot(calculation.calculationSnapshot)?.paidLeave;
    if (!leave || !activeIds.has(calculation.employeeId)) return [];
    return [{ employeeId: calculation.employeeId, leave }];
  });

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/dashboard/payroll" className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"><ArrowLeft size={16} /> Paie</Link>

      <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Paie de {monthLabel.toLocaleLowerCase("fr-FR")}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{statusLine}</p>
        </div>
        <nav aria-label="Étapes du mois" className="flex overflow-x-auto rounded-xl border border-surface-border bg-white p-1">
          {TABS.map(([code, label]) => {
            const active = tab === code;
            return (
              <Link key={code} href={href({ tab: code })} aria-current={active ? "page" : undefined} className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition ${active ? "bg-ink text-white" : "text-ink-soft hover:bg-surface-subtle hover:text-ink"}`}>
                {tabDone[code] && !active ? <CheckCircle2 size={15} className="text-accent-teal" /> : null}{label}
              </Link>
            );
          })}
        </nav>
      </header>

      {tab === "saisie" ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-surface-border bg-white">
          <div className="flex flex-col gap-3 border-b border-surface-border px-3 pt-3 sm:flex-row sm:items-end sm:justify-between">
            <nav aria-label="Saisie" className="flex overflow-x-auto">
              {SUB_TABS.map(([code, label]) => {
                const active = sub === code;
                return (
                  <Link key={code} href={href({ tab: "saisie", sub: code })} aria-current={active ? "page" : undefined} className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3 pt-1.5 text-sm font-semibold transition ${active ? "border-brand-primary text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>
                    {label}{subCounts[code] > 0 ? <span className="text-xs font-medium text-ink-faint">{subCounts[code]}</span> : null}
                  </Link>
                );
              })}
            </nav>
            {!editable && period.status !== "LOCKED" && isAdmin ? <div className="pb-3 pr-2"><BackToEntryButton periodId={period.id} entryHref={href({ tab: "saisie" })} /></div> : null}
          </div>

          {employees.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-soft">Aucun salarié n&apos;est sous contrat sur ce mois.</p> : null}
          {employees.length > 0 && (sub === "heures" || sub === "variables") ? (
            <PayrollEntryGrid periodId={period.id} tab={sub as EntryTab} employees={gridEmployees} values={values} editable={editable} focusCell={searchParams.focus ?? null} />
          ) : null}
          {sub === "absences" ? <PayrollAbsencesPanel periodId={period.id} rows={absenceRows} pendingCount={pendingAbsences} editable={editable} focusAbsenceId={searchParams.absence ?? null} /> : null}
          {sub === "mouvements" ? (
            <div className="p-5">
              {arrivals.length === 0 && leaving.length === 0 ? <p className="py-6 text-center text-sm text-ink-soft">Aucune arrivée ni aucun départ ce mois-ci.</p> : null}
              {arrivals.length > 0 ? (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-ink">Arrivées</h3>
                  <ul className="mt-2 divide-y divide-surface-border rounded-xl border border-surface-border">
                    {arrivals.map((employee) => <li key={employee.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium text-ink">{employee.firstName} {employee.lastName}</span><span className="text-sm text-ink-soft">Arrivée le {frDate(employee.hireDate)} : le salaire du mois est proratisé sur son horaire réel.</span></li>)}
                  </ul>
                </div>
              ) : null}
              {leaving.length > 0 ? <PayrollTerminationSection periodId={period.id} employees={leaving} readOnly={!editable} embedded /> : null}
              {leaving.filter((employee) => !leavingIsDemo.has(employee.id)).length > 0 && isAdmin ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-ink">Documents de sortie</h3>
                  <p className="mt-1 text-sm text-ink-soft">Publiés dans l&apos;espace du salarié, qui les garde après son départ. Le reçu pour solde de tout compte reprend le bulletin de sortie : il se produit une fois le mois clôturé.</p>
                  <div className="mt-3 space-y-4">
                    {leaving.filter((employee) => !leavingIsDemo.has(employee.id)).map((employee) => {
                      const documents = exitDocuments.filter((document) => document.employeeId === employee.id && !document.replaced);
                      const space = spaceStatuses.get(employee.id);
                      return (
                        <div key={employee.id} className="rounded-xl border border-surface-border p-4">
                          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                            <p className="font-medium text-ink">{employee.name} <span className="text-sm font-normal text-ink-soft">· sortie le {frDate(new Date(`${employee.exitDate}T00:00:00Z`))}</span></p>
                            <Link href={`/dashboard/employees/${employee.id}?onglet=espace`} className="text-sm font-semibold text-brand-primary hover:underline">{space?.status === "ACTIVE" ? "Espace salarié activé" : "Inviter à l'espace salarié"}</Link>
                          </div>
                          <ExitDocumentButtons
                            employeeId={employee.id}
                            finalSettlementReady={period.status === "LOCKED" && calculations.some((calculation) => calculation.employeeId === employee.id)}
                            finalSettlementHint={period.status === "LOCKED" ? "Inventaire des sommes versées, repris du bulletin de sortie clôturé. À signer en deux exemplaires." : "Disponible une fois la paie du mois calculée et clôturée."}
                            healthCoverageDetected={healthCoverageByEmployee.get(employee.id) ?? false}
                            existingKinds={documents.map((document) => document.kind)}
                          />
                          <div className="mt-3"><UploadEmployeeDocumentForm employeeId={employee.id} defaultKind="FRANCE_TRAVAIL" /></div>
                          {documents.length > 0 ? (
                            <ul className="mt-3 space-y-1 text-sm">
                              {documents.map((document) => <li key={document.id} className="flex flex-wrap items-baseline gap-x-2"><a href={`/api/employee-documents/${document.id}`} target="_blank" rel="noopener" className="font-medium text-ink hover:underline">{document.title}</a><span className="text-xs text-ink-faint">publié le {frDate(document.publishedAt)}{document.employeeOpenedAt ? `, ouvert le ${frDate(document.employeeOpenedAt)}` : ""}</span></li>)}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-surface-border bg-surface-subtle/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">{reviewedIds.size}/{employees.length} salarié{employees.length > 1 ? "s" : ""} vérifié{reviewedIds.size > 1 ? "s" : ""}. Cochez « Vérifié » quand un salarié est complet, même s&apos;il n&apos;a rien ce mois-ci.</p>
            <Link href={href({ tab: "controle" })} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90">Passer au contrôle <ArrowRight size={16} /></Link>
          </div>
        </section>
      ) : null}

      {tab === "controle" ? (
        <section className="mt-5 space-y-5">
          <div className="rounded-2xl border border-surface-border bg-white p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-ink">{hasResults ? "Paie calculée" : "Calculer la paie du mois"}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  {period.status === "LOCKED" ? "Le mois est clôturé : les résultats ne changent plus." : hasResults && period.status === "DRAFT" ? "La saisie a été rouverte depuis le dernier calcul : recalculez pour tenir compte de vos modifications." : hasResults ? "Relisez les remarques ci-dessous, puis les bulletins." : "RH Pilot calcule chaque bulletin à partir des contrats, des absences validées et de votre saisie."}
                </p>
              </div>
              {isAdmin && period.status !== "LOCKED" && calculationRule ? (
                <RunCalculationButton periodId={period.id} ruleCode={calculationRule.code} ruleScope={calculationRule.scope} alreadyCalculated={hasResults} disabled={!readiness.ready || membership.accessRole !== "OWNER"} nextHref={href({ tab: "controle" })} />
              ) : null}
            </div>
            {!calculationRule ? <p className="mt-4 rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3 py-2 text-sm text-ink-soft">Aucune version de règle de paie validée n&apos;est disponible pour ce mois.</p> : null}
          </div>

          {!readiness.ready ? (
            <div className="rounded-2xl border border-accent-amber/30 bg-white">
              <div className="flex items-center gap-2 border-b border-accent-amber/20 px-5 py-3"><AlertTriangle size={16} className="text-accent-amber" /><h3 className="text-sm font-semibold text-ink">À régler avant de calculer</h3></div>
              <ul className="divide-y divide-surface-border">
                {readiness.issues.map((issue, index) => {
                  const link = issue.code === "EXIT_WITHOUT_TERMINATION" ? { href: href({ tab: "saisie", sub: "mouvements" }), label: "Ouvrir la fiche de sortie" } : issue.employeeId ? { href: `/dashboard/employees/${issue.employeeId}?onglet=paie`, label: "Ouvrir la paie du salarié" } : null;
                  return <li key={`${issue.code}-${index}`} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-ink-soft">{issue.message}</span>{link ? <Link href={link.href} className="shrink-0 font-semibold text-brand-primary hover:underline">{link.label}</Link> : null}</li>;
                })}
              </ul>
            </div>
          ) : null}

          {hasResults ? (
            <div className="rounded-2xl border border-surface-border bg-white">
              <div className="flex flex-col gap-1 border-b border-surface-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-ink">{warningItems.length === 0 ? "Aucune remarque" : `${warningItems.length} remarque${warningItems.length > 1 ? "s" : ""} à vérifier`}</h3>
                <span className="text-xs text-ink-faint">{calculatedCount}/{employees.length} salariés calculés</span>
              </div>
              {warningItems.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-soft">Le calcul n&apos;a rien relevé d&apos;anormal. Relisez les bulletins avant de valider.</p>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {warningItems.map((item, index) => {
                    const link = warningLink(period.id, item.employeeId, item.warning);
                    return <li key={`${item.employeeId}-${index}`} className="flex flex-col gap-1.5 px-5 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-6"><p className="leading-6 text-ink-soft"><span className="font-medium text-ink">{item.name} :</span> {item.warning}</p>{link ? <Link href={link.href} className="shrink-0 font-semibold text-brand-primary hover:underline">{link.label}</Link> : null}</li>;
                  })}
                </ul>
              )}
              <div className="flex justify-end border-t border-surface-border px-5 py-4">
                <Link href={href({ tab: "bulletins" })} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90">Relire les bulletins <ArrowRight size={16} /></Link>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "bulletins" ? (
        <section className="mt-5 space-y-5">
          {!hasResults ? (
            <div className="rounded-2xl border border-surface-border bg-white px-5 py-10 text-center"><FileText size={22} className="mx-auto text-ink-faint" /><p className="mt-2 text-sm font-medium text-ink">Pas encore de bulletin</p><p className="mt-1 text-sm text-ink-soft">Calculez la paie dans l&apos;onglet <Link href={href({ tab: "controle" })} className="font-semibold text-brand-primary hover:underline">Contrôle</Link>.</p></div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-white">
              <div className="border-b border-surface-border px-5 py-3"><p className="text-sm text-ink-soft">Cliquez sur un salarié pour ouvrir son bulletin ; les flèches du clavier passent au suivant.</p></div>
              <PayslipReview rows={reviewRowsData} periodLabel={monthLabel} />
            </div>
          )}

          {hasResults && period.status === "DRAFT" ? <p className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 px-4 py-3 text-sm text-ink-soft">La saisie a été rouverte : recalculez la paie dans l&apos;onglet Contrôle avant de la valider.</p> : null}

          {isAdmin && resultsComplete && ["CALCULATED", "REVIEW", "VALIDATED"].includes(period.status) ? (
            <div className="grid gap-5 rounded-2xl border border-surface-border bg-white p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6">
              <div>
                <h3 className="font-semibold text-ink">Valider le mois</h3>
                <p className="mt-1 text-sm leading-6 text-ink-soft">La clôture fige les calculs. Vous pourrez ensuite produire les PDF et les mettre à disposition des salariés.</p>
                <div className="mt-4"><ClosePeriodButton periodId={period.id} employeeCount={employees.length} /></div>
              </div>
              <BackToEntryButton periodId={period.id} entryHref={href({ tab: "saisie" })} />
            </div>
          ) : null}

          {period.status === "LOCKED" && isAdmin ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-5">
                <PayrollPayslipGenerateButton periodId={period.id} />
                {generatedCount > 0 ? <PublishPayslipsPanel data={publishData} /> : null}
              </div>
              <div className="min-w-0 rounded-2xl border border-surface-border bg-white p-5">
                <h3 className="font-semibold text-ink">Corriger un mois clôturé</h3>
                <p className="mt-1 text-sm leading-6 text-ink-soft">Possible tant que les bulletins n&apos;ont pas été produits.</p>
                <div className="mt-4">
                  <PayrollReopenButton
                    periodId={period.id}
                    disabledReason={payslips.length > 0 ? "Les bulletins de ce mois ont été produits : il ne peut plus être rouvert. Une erreur se corrige par une régularisation sur la paie du mois suivant." : null}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "declaration" ? (
        <section className="mt-5 rounded-2xl border border-surface-border bg-white p-5 md:p-6">
          <h2 className="text-lg font-semibold text-ink">Déclaration sociale nominative</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">{period.status === "LOCKED" ? "Le mois est clôturé : vous pouvez préparer le fichier DSN de pré-contrôle à partir des calculs figés." : "La DSN se prépare une fois le mois validé et clôturé dans l'onglet Bulletins."}</p>
          <Link href="/dashboard/payroll/dsn" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle">Ouvrir l&apos;espace DSN <ExternalLink size={15} /></Link>
        </section>
      ) : null}

      <details className="group mt-8 overflow-hidden rounded-2xl border border-surface-border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden"><span className="text-sm font-semibold text-ink-soft">Détails du mois</span><span className="text-xs text-ink-faint group-open:hidden">Congés, salaire minimum, référentiel</span></summary>
        <div className="space-y-6 border-t border-surface-border p-5">
          <div>
            <h3 className="text-sm font-semibold text-ink">Compteurs de congés payés après calcul</h3>
            {leaveRows.length === 0 ? <p className="mt-2 text-sm text-ink-faint">Disponibles après le calcul du mois.</p> : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="bg-surface-subtle/40 text-left text-xs font-semibold text-ink-faint"><th className="px-4 py-2">Salarié</th><th className="px-3 py-2 text-right">N-1 acquis</th><th className="px-3 py-2 text-right">N-1 pris</th><th className="px-3 py-2 text-right">N acquis</th><th className="px-3 py-2 text-right">N pris</th><th className="px-3 py-2 text-right">Pris ce mois</th></tr></thead>
                  <tbody className="divide-y divide-surface-border">
                    {leaveRows.map(({ employeeId, leave }) => <tr key={employeeId}><td className="px-4 py-2 font-medium text-ink">{employeeName(employeeId)}</td><td className="px-3 py-2 text-right tabular-nums">{leave.balancesAfter.previousAcquired.toFixed(2).replace(".", ",")}</td><td className="px-3 py-2 text-right tabular-nums">{leave.balancesAfter.previousTaken.toFixed(2).replace(".", ",")}</td><td className="px-3 py-2 text-right tabular-nums">{leave.balancesAfter.currentAcquired.toFixed(2).replace(".", ",")}</td><td className="px-3 py-2 text-right tabular-nums">{leave.balancesAfter.currentTaken.toFixed(2).replace(".", ",")}</td><td className="px-3 py-2 text-right tabular-nums">{leave.daysTaken.toFixed(2).replace(".", ",")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <MinimumSalaryControlSection periodId={period.id} employees={employees.map((employee) => ({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName }))} />
          <div>
            <h3 className="text-sm font-semibold text-ink">Référentiel</h3>
            <p className="mt-1 text-sm text-ink-soft">Moteur de bulletin RH Pilot, paramètres 2026 datés et sourcés.{calculationRule ? ` Règle de cycle : ${calculationRule.code} v${calculationRule.version}.` : ""}</p>
          </div>
        </div>
      </details>
    </div>
  );
}
