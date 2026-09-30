import { canUsePayroll } from "@/lib/payrollAccess";
import { weeklyHoursFromMonthly } from "@/lib/contractWorkTime";
import { resolveWeeklySchedule } from "@/lib/payroll/bulletin/inputs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateEmployee, archiveEmployee } from "../actions";
import { triggerEvent } from "../../events/actions";
import { EmployeeForm } from "../EmployeeForm";
import { ConfirmArchiveButton } from "../ConfirmArchiveButton";
import { TriggerEventForm } from "../../events/TriggerEventForm";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate, formatDuration } from "@/lib/format";
import { isOverdue, daysUntil } from "@/lib/urgency";
import {
  getProbationEndDate,
  isProbationActive,
  isProbationHistoricalAtEntry,
  shouldOfferProbationWorkflow,
} from "@/lib/probationTracking";
import { ArrowUpRight, CalendarClock, Hourglass, Stethoscope, TriangleAlert, Wallet, UserRound } from "lucide-react";
import { getEventTemplateDotColor } from "@/lib/eventTemplateStyle";
import { summarizeParcours } from "@/lib/parcoursSummary";
import { CcnHint } from "@/components/CcnHint";
import { PayrollProfileSection } from "../../payroll/PayrollProfileSection";
import { loadClassificationGrids } from "@/lib/payroll/collective-classifications";
import { EmployeeDocumentsTable, EmployeeSpaceCard, ExitDocumentButtons, UploadEmployeeDocumentForm } from "../EmployeeSpaceSection";
import { loadAdminDocuments, loadSpaceStatuses } from "@/lib/employee-space/admin-summary";
import { loadExitContext } from "@/lib/employee-space/exit-context";
import { electronicPayslipReadiness } from "@/lib/employee-space/notice-rules";
import { employeeArchiveParts } from "@/lib/employee-space/archive-server";
import { employeeAccessWhere, eventAccessWhere, isOrganizationAdmin, taskAccessWhere } from "@/lib/accessPolicy";

export const dynamic = "force-dynamic";

// La fiche se lit en quatre onglets : l'essentiel d'abord, le détail à la demande.
const TABS = [
  { key: "apercu", label: "Aperçu" },
  { key: "paie", label: "Paie" },
  { key: "espace", label: "Espace salarié" },
  { key: "informations", label: "Informations" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const CONTRACT_LABELS: Record<string, string> = { CDI: "CDI", CDD: "CDD", APPRENTISSAGE: "Apprentissage", PROFESSIONNALISATION: "Contrat de professionnalisation" };

const SPACE_LABELS: Record<string, string> = { ACTIVE: "Activé", INVITED: "Invitation envoyée", EXPIRED: "Invitation expirée", REVOKED: "Accès retiré", NONE: "Pas encore invité" };

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { welcome?: string; onglet?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  // Filtre explicite par organizationId : ne jamais se fier uniquement
  // à l'id reçu dans l'URL, même si le schéma protège déjà les
  // écritures croisées entre organisations (point 6 — voir aussi
  // actions.ts qui applique la même règle sur les mutations).
  const employee = await prisma.employee.findFirst({
    where: {
      id: params.id,
      organizationId: membership.organizationId,
      deletedAt: null,
      ...employeeAccessWhere(membership),
    },
  });

  if (!employee) notFound();

  const canManageEmployee = isOrganizationAdmin(membership);
  // L'onglet Paie suit l'accès anticipé au module Paie (lib/payrollAccess).
  const canSeePayroll = canUsePayroll(membership);
  const visibleTabs = TABS.filter((item) => item.key !== "paie" || canSeePayroll);

  const [memberships, eventTemplates, employeeEvents, organization, payrollProfile, workProfile, collectiveAgreements] = await Promise.all([
    prisma.membership.findMany({
      where: {
        organizationId: membership.organizationId,
        deletedAt: null,
        ...(canManageEmployee
          ? {}
          : {
              id: {
                in: [
                  membership.id,
                  ...(employee.managerMembershipId ? [employee.managerMembershipId] : []),
                ],
              },
            }),
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    canManageEmployee
      ? prisma.eventTemplate.findMany({
          where: { archivedAt: null },
          orderBy: { label: "asc" },
        })
      : Promise.resolve([]),
    prisma.employeeEvent.findMany({
      where: { employeeId: employee.id, organizationId: membership.organizationId, deletedAt: null, ...eventAccessWhere(membership) },
      include: {
        eventTemplate: true,
        tasks: { where: taskAccessWhere(membership) },
      },
      orderBy: { triggerDate: "desc" },
    }),
    prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { conventionCollective: true, collectiveAgreementId: true },
    }),
    canSeePayroll
      ? prisma.payrollProfile.findFirst({
          where: {
            organizationId: membership.organizationId,
            employeeId: employee.id,
            effectiveFrom: { lte: new Date() },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
          },
          orderBy: { effectiveFrom: "desc" },
        })
      : Promise.resolve(null),
    canManageEmployee
      ? prisma.payrollProfile.findFirst({
          where: {
            organizationId: membership.organizationId,
            employeeId: employee.id,
          },
          orderBy: { effectiveFrom: "desc" },
        })
      : Promise.resolve(null),
    canManageEmployee
      ? prisma.collectiveAgreement.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, idcc: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  type ProfileExtrasRow = { weeklySchedule: unknown; structuralOvertimeHours: unknown; structuralOvertimeRate: unknown; healthPlanWaiver: boolean | null };
  type LeaveOpeningRow = { asOf: Date; previousAcquired: unknown; previousTaken: unknown; currentAcquired: unknown; currentTaken: unknown; referenceGross: unknown; referenceAcquiredDays: unknown; currentReferenceGross: unknown };
  type PayrollOpeningRow = { year: number; throughMonth: number; cumuls: unknown; sickPayHistory: unknown };
  const toNullableNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));
  const [profileExtrasRows, leaveOpeningRows, payrollOpeningRows] = canSeePayroll && searchParams.onglet === "paie"
    ? await Promise.all([
        payrollProfile ? prisma.$queryRaw<ProfileExtrasRow[]>`SELECT "weeklySchedule", "structuralOvertimeHours", "structuralOvertimeRate", "healthPlanWaiver" FROM "payroll_profiles" WHERE "id" = ${payrollProfile.id}` : Promise.resolve([] as ProfileExtrasRow[]),
        prisma.$queryRaw<LeaveOpeningRow[]>`SELECT "asOf", "previousAcquired", "previousTaken", "currentAcquired", "currentTaken", "referenceGross", "referenceAcquiredDays", "currentReferenceGross" FROM "employee_paid_leave_openings" WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employee.id} ORDER BY "asOf" DESC LIMIT 1`,
        prisma.$queryRaw<PayrollOpeningRow[]>`SELECT "year", "throughMonth", "cumuls", "sickPayHistory" FROM "employee_payroll_openings" WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employee.id} ORDER BY "year" DESC LIMIT 1`,
      ]).catch(() => [[], [], []] as [ProfileExtrasRow[], LeaveOpeningRow[], PayrollOpeningRow[]])
    : [[], [], []] as [ProfileExtrasRow[], LeaveOpeningRow[], PayrollOpeningRow[]];
  // Grilles de classification des conventions intégrées : le profil propose une liste
  // au lieu d'un code à taper, pour que le contrôle des minima retrouve la bonne règle.
  const classificationGrids = canSeePayroll && searchParams.onglet === "paie"
    ? await loadClassificationGrids().catch(() => ({} as Awaited<ReturnType<typeof loadClassificationGrids>>))
    : {};
  const profileExtras = profileExtrasRows[0];
  const leaveOpening = leaveOpeningRows[0];
  const payrollOpeningRow = payrollOpeningRows[0];

  // Espace salarié : accès, documents publiés et documents de sortie.
  // Fiche en onglets : les données lourdes ne sont lues que pour l'onglet ouvert.
  const tab: TabKey = canManageEmployee && visibleTabs.some((item) => item.key === searchParams.onglet) ? (searchParams.onglet as TabKey) : "apercu";
  const onSpaceTab = tab === "espace";
  const [spaceStatuses, spaceDocuments, exitContext] = canManageEmployee
    ? await Promise.all([
        loadSpaceStatuses(membership.organizationId, [employee.id]),
        onSpaceTab ? loadAdminDocuments(membership.organizationId, [employee.id]) : Promise.resolve([] as Awaited<ReturnType<typeof loadAdminDocuments>>),
        onSpaceTab && employee.contractEndDate ? loadExitContext(membership.organizationId, employee.id).catch(() => null) : Promise.resolve(null),
      ])
    : [new Map(), [], null] as const;
  const spaceStatus = spaceStatuses.get(employee.id);
  const archiveParts = canManageEmployee && spaceDocuments.length > 0 ? await employeeArchiveParts(membership.organizationId, employee.id).catch(() => []) : [];
  const exitReady = exitContext && !("error" in exitContext) ? exitContext : null;
  const exitMonthLabel = employee.contractEndDate ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(employee.contractEndDate) : "";

  const potentialManagers = memberships.map((m) => ({
    id: m.id,
    label: `${getUserDisplayName(m.user)} (${m.user.email})`,
  }));

  const updateEmployeeWithId = updateEmployee.bind(null, employee.id);
  const archiveEmployeeWithId = archiveEmployee.bind(null, employee.id);
  const triggerEventForEmployee = triggerEvent.bind(null, employee.id);

  const medicalVisitOverdue =
    employee.nextMedicalVisitDate && isOverdue(employee.nextMedicalVisitDate, "TODO");

  const probationEndDate = getProbationEndDate(employee);
  const probationHistoricalAtEntry = isProbationHistoricalAtEntry(employee);
  const probationActive = isProbationActive(employee);
  const probationTrackable = shouldOfferProbationWorkflow(employee);
  const visibleEmployeeEvents = employeeEvents.filter(
    (event) =>
      !(
        event.eventTemplate.key === "fin_periode_essai" &&
        probationHistoricalAtEntry
      )
  );

  const manager = memberships.find((m: { id: string }) => m.id === employee.managerMembershipId);
  const workMonthlyHours = workProfile?.monthlyHours == null ? null : Number(workProfile.monthlyHours);
  const workSchedule = workMonthlyHours && workMonthlyHours > 0
    ? resolveWeeklySchedule(workProfile?.weeklySchedule ?? null, workMonthlyHours).schedule
    : null;
  const workWeeklyHours = workMonthlyHours && workMonthlyHours > 0 ? weeklyHoursFromMonthly(workMonthlyHours) : null;
  const workTimeSummary = workWeeklyHours == null
    ? "À compléter"
    : workWeeklyHours > 35.01
      ? `${workWeeklyHours.toLocaleString("fr-FR")} h/semaine · ${(workWeeklyHours - 35).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h au-delà de 35 h`
      : `${workWeeklyHours.toLocaleString("fr-FR")} h/semaine`;
  const href = (key: TabKey) => `/dashboard/employees/${employee.id}${key === "apercu" ? "" : `?onglet=${key}`}`;
  const contractEnded = Boolean(employee.contractEndDate && employee.contractEndDate < new Date());
  const statusLabel = employee.contractEndDate ? (contractEnded ? `Sorti·e le ${formatDate(employee.contractEndDate)}` : `Sortie prévue le ${formatDate(employee.contractEndDate)}`) : "En poste";
  const overdueTasks = visibleEmployeeEvents.reduce((total, event) => total + summarizeParcours(event.tasks).overdueCount, 0);
  const spaceLabel = SPACE_LABELS[spaceStatus?.status ?? "NONE"] ?? "Pas encore invité";

  // Ce qui demande de l'attention, en quelques cartes courtes plutôt qu'en bandeaux empilés.
  const highlights: Array<{ key: string; icon: typeof Hourglass; label: string; value: string; tone: "alert" | "info" | "muted"; link?: string }> = [];
  if (probationEndDate && !probationHistoricalAtEntry) {
    highlights.push({ key: "essai", icon: Hourglass, label: "Période d'essai", value: probationActive ? `Fin le ${formatDate(probationEndDate)}` : `Terminée le ${formatDate(probationEndDate)}`, tone: probationActive ? "info" : "muted" });
  }
  if (employee.nextMedicalVisitDate) {
    highlights.push({ key: "visite", icon: Stethoscope, label: "Visite médicale", value: medicalVisitOverdue ? `Dépassée de ${Math.abs(daysUntil(employee.nextMedicalVisitDate))} j` : formatDate(employee.nextMedicalVisitDate), tone: medicalVisitOverdue ? "alert" : "info" });
  }
  if (canManageEmployee) {
    if (canSeePayroll) highlights.push({ key: "paie", icon: Wallet, label: "Salaire brut mensuel", value: payrollProfile?.baseSalaryCents != null ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(payrollProfile.baseSalaryCents / 100) : "À renseigner", tone: payrollProfile?.baseSalaryCents != null ? "muted" : "alert", link: href("paie") });
    if (!employee.isDemoData) highlights.push({ key: "espace", icon: UserRound, label: "Espace salarié", value: spaceLabel, tone: spaceStatus?.status === "ACTIVE" ? "muted" : "info", link: href("espace") });
  }
  const toneClass = { alert: "border-accent-rose/30 bg-accent-rose/[0.04]", info: "border-brand-primary/20 bg-brand-primary/[0.03]", muted: "border-surface-border bg-white" };
  const iconClass = { alert: "text-accent-rose", info: "text-brand-primary", muted: "text-ink-faint" };

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/employees" className="text-sm text-ink-soft hover:text-ink">
        ← Retour aux salariés
      </Link>

      <header className="mt-3 rounded-2xl border border-surface-border bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-base font-semibold text-white" aria-hidden="true">
              {`${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-ink">{employee.firstName} {employee.lastName}</h1>
              <p className="mt-0.5 text-sm text-ink-soft">
                {employee.position || "Poste non renseigné"} · {employee.contractType ? CONTRACT_LABELS[employee.contractType] ?? employee.contractType : "Contrat non renseigné"} · depuis le {formatDate(employee.hireDate)}
              </p>
            </div>
          </div>
          <span className={`mt-1 rounded-full px-3 py-1 text-xs font-semibold ${contractEnded ? "bg-surface-subtle text-ink-soft" : "bg-accent-teal/10 text-accent-teal"}`}>{statusLabel}</span>
        </div>
        {canManageEmployee ? (
          <nav aria-label="Rubriques de la fiche" className="flex gap-1 overflow-x-auto border-t border-surface-border px-4">
            {visibleTabs.map((item) => {
              const active = item.key === tab;
              return (
                <Link key={item.key} href={href(item.key)} aria-current={active ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition ${active ? "border-brand-primary text-ink" : "border-transparent text-ink-faint hover:text-ink"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      {tab === "apercu" ? (
        <div className="mt-5 space-y-6">
          {searchParams.welcome === "1" && (
            <div className="rounded-2xl border border-brand-primary/25 bg-brand-primary/5 px-5 py-4">
              <p className="text-sm font-semibold text-ink">Bienvenue à {employee.firstName} !</p>
              <p className="mt-1 text-sm text-ink-soft">La fiche est créée. Déclenchez son premier parcours RH ci-dessous, puis complétez sa paie dans l&apos;onglet Paie.</p>
            </div>
          )}

          {highlights.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass[item.tone]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink-faint">{item.label}</span>
                      <span className="block text-sm font-semibold text-ink">{item.value}</span>
                    </span>
                    {item.link ? <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-ink-faint" /> : null}
                  </>
                );
                return item.link ? (
                  <Link key={item.key} href={item.link} className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition hover:border-ink-faint ${toneClass[item.tone]}`}>{content}</Link>
                ) : (
                  <div key={item.key} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${toneClass[item.tone]}`}>{content}</div>
                );
              })}
            </div>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">Parcours RH</h2>
              {overdueTasks > 0 ? <span className="flex items-center gap-1 text-xs font-medium text-accent-rose"><TriangleAlert size={12} />{overdueTasks} tâche{overdueTasks > 1 ? "s" : ""} en retard</span> : null}
            </div>
            {visibleEmployeeEvents.length > 0 ? (
              <div className="mt-3 divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border bg-white">
                {visibleEmployeeEvents.map((event) => {
                  const doneCount = event.tasks.filter((task) => task.status === "DONE").length;
                  const summary = summarizeParcours(event.tasks);
                  return (
                    <Link key={event.id} href={`/dashboard/events/${event.id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-subtle/60">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${getEventTemplateDotColor(event.eventTemplate.key)}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{event.eventTemplate.label}</span>
                          <span className="block text-xs text-ink-soft">
                            Depuis le {formatDate(event.triggerDate)}
                            {summary.overdueCount > 0 ? <span className="text-accent-rose"> · {summary.overdueCount} en retard</span> : null}
                          </span>
                        </span>
                      </span>
                      <span className="flex w-40 shrink-0 items-center gap-3">
                        <span className="flex-1"><ProgressBar value={doneCount} max={event.tasks.length} /></span>
                        <span className="text-xs tabular-nums text-ink-faint">{doneCount}/{event.tasks.length}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">Aucun parcours en cours pour {employee.firstName}.</p>
            )}
            {canManageEmployee && (
              <div id="lancer-parcours" className="mt-4 scroll-mt-24">
                <TriggerEventForm
                  action={triggerEventForEmployee}
                  eventTemplates={eventTemplates.map((t) => ({ key: t.key, label: t.label }))}
                  employee={{
                    hireDate: employee.hireDate.toISOString(),
                    probationDuration: employee.probationDuration,
                    probationDurationUnit: employee.probationDurationUnit,
                  }}
                  conventionCollective={organization?.conventionCollective}
                  probationTrackable={probationTrackable}
                />
              </div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">En bref</h2>
              {canManageEmployee ? <Link href={href("informations")} className="text-sm font-medium text-brand-primary hover:underline">Modifier</Link> : null}
            </div>
            <dl className="mt-3 grid gap-x-8 gap-y-3 rounded-xl border border-surface-border bg-white px-5 py-4 sm:grid-cols-3">
              <div><dt className="text-xs text-ink-faint">Manager direct</dt><dd className="mt-0.5 text-sm text-ink">{manager ? getUserDisplayName(manager.user) : "Non défini"}</dd></div>
              <div><dt className="text-xs text-ink-faint">Catégorie professionnelle</dt><dd className="mt-0.5 text-sm text-ink">{employee.professionalCategory ?? "Non renseigné"}</dd></div>
              <div><dt className="text-xs text-ink-faint">Date d&apos;entrée</dt><dd className="mt-0.5 text-sm text-ink">{formatDate(employee.hireDate)}</dd></div>
              <div><dt className="text-xs text-ink-faint">Temps de travail</dt><dd className="mt-0.5 text-sm text-ink">{workTimeSummary}</dd></div>
              {employee.probationDuration && employee.probationDurationUnit ? <div><dt className="text-xs text-ink-faint">Période d&apos;essai</dt><dd className="mt-0.5 text-sm text-ink">{formatDuration(employee.probationDuration, employee.probationDurationUnit)}</dd></div> : null}
              <div><dt className="text-xs text-ink-faint">Fin de contrat</dt><dd className="mt-0.5 text-sm text-ink">{employee.contractEndDate ? formatDate(employee.contractEndDate) : "Non renseigné"}</dd></div>
              <div><dt className="flex items-center gap-1 text-xs text-ink-faint"><CalendarClock size={12} />Prochaine visite médicale</dt><dd className="mt-0.5 text-sm text-ink">{employee.nextMedicalVisitDate ? formatDate(employee.nextMedicalVisitDate) : "Non renseigné"}</dd></div>
            </dl>
          </section>

          {organization?.conventionCollective && (
            <CcnHint conventionCollective={organization.conventionCollective} context="fiche_salarie" />
          )}
        </div>
      ) : null}

      {tab === "paie" && canSeePayroll ? (
        <div className="-mt-3">
          <PayrollProfileSection
            employeeId={employee.id}
            firstName={employee.firstName}
            canEdit={["OWNER", "ADMIN"].includes(membership.accessRole)}
            profile={
              payrollProfile
                ? {
                    baseSalaryCents: payrollProfile.baseSalaryCents,
                    monthlyHours: payrollProfile.monthlyHours?.toString() ?? null,
                    collectiveAgreementId: payrollProfile.collectiveAgreementId,
                    classificationCode: payrollProfile.classificationCode,
                    classificationLabel: payrollProfile.classificationLabel,
                    level: payrollProfile.level,
                    coefficient: payrollProfile.coefficient,
                    seniorityDate: payrollProfile.seniorityDate?.toISOString() ?? null,
                    effectiveFrom: payrollProfile.effectiveFrom.toISOString(),
                    weeklySchedule: Array.isArray(profileExtras?.weeklySchedule) ? (profileExtras.weeklySchedule as number[]) : null,
                    structuralOvertimeHours: profileExtras?.structuralOvertimeHours == null ? null : String(profileExtras.structuralOvertimeHours),
                    structuralOvertimeRate: profileExtras?.structuralOvertimeRate == null ? null : String(Math.round(Number(profileExtras.structuralOvertimeRate) * 10000) / 100),
                    healthPlanWaiver: profileExtras?.healthPlanWaiver === true,
                  }
                : null
            }
            agreements={collectiveAgreements}
            classificationGrids={classificationGrids}
            organizationAgreementId={organization?.collectiveAgreementId ?? null}
            paidLeaveOpening={leaveOpening ? {
              asOf: leaveOpening.asOf.toISOString().slice(0, 10),
              previousAcquired: Number(leaveOpening.previousAcquired),
              previousTaken: Number(leaveOpening.previousTaken),
              currentAcquired: Number(leaveOpening.currentAcquired),
              currentTaken: Number(leaveOpening.currentTaken),
              referenceGross: toNullableNumber(leaveOpening.referenceGross),
              referenceAcquiredDays: toNullableNumber(leaveOpening.referenceAcquiredDays),
              currentReferenceGross: toNullableNumber(leaveOpening.currentReferenceGross),
            } : null}
            payrollOpening={payrollOpeningRow ? { year: Number(payrollOpeningRow.year), throughMonth: Number(payrollOpeningRow.throughMonth), cumuls: (payrollOpeningRow.cumuls ?? {}) as Record<string, number>, sickPayHistory: (payrollOpeningRow.sickPayHistory ?? null) as Record<string, number> | null } : null}
          />
        </div>
      ) : null}

      {tab === "espace" && canManageEmployee ? (
        <section id="espace-salarie" className="mt-5 space-y-4">
          <EmployeeSpaceCard
            summary={{
              employeeId: employee.id,
              firstName: employee.firstName,
              isDemo: employee.isDemoData,
              personalEmail: spaceStatus?.personalEmail ?? null,
              paperSince: spaceStatus?.paperSince?.toISOString() ?? null,
              paperSource: spaceStatus?.paperSource ?? null,
              account: { status: spaceStatus?.status ?? "NONE", email: spaceStatus?.email ?? null, invitedAt: spaceStatus?.invitedAt?.toISOString() ?? null, activatedAt: spaceStatus?.activatedAt?.toISOString() ?? null },
              notice: {
                at: spaceStatus?.noticeAt ?? null,
                method: spaceStatus?.noticeMethod ?? null,
                readiness: electronicPayslipReadiness({ noticeAt: spaceStatus?.noticeAt ?? null, method: spaceStatus?.noticeMethod ?? null, alreadyReceivedElectronic: spaceStatus?.hasElectronicPayslip ?? false, today: new Date().toISOString().slice(0, 10) }),
              },
            }}
          />
          {employee.contractEndDate && !employee.isDemoData ? (
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h3 className="font-semibold text-ink">Documents de fin de contrat</h3>
              <p className="mt-1 text-sm text-ink-soft">Contrat terminé le {formatDate(employee.contractEndDate)}. Les documents publiés restent accessibles au salarié après son départ.</p>
              <div className="mt-4">
                <ExitDocumentButtons
                  employeeId={employee.id}
                  finalSettlementReady={Boolean(exitReady?.finalBulletin)}
                  finalSettlementHint={exitReady?.finalBulletin ? "Inventaire des sommes versées, repris du bulletin de sortie clôturé. À signer en deux exemplaires." : `Disponible une fois la paie de ${exitMonthLabel} calculée et clôturée : l'inventaire reprend le bulletin de sortie.`}
                  healthCoverageDetected={exitReady?.healthCoverageDetected ?? false}
                  existingKinds={spaceDocuments.filter((document) => !document.replaced).map((document) => document.kind)}
                />
              </div>
            </div>
          ) : null}
          {!employee.isDemoData ? (
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-5 py-3">
                <h3 className="font-semibold text-ink">Documents publiés</h3>
                {archiveParts.length > 0 ? (
                  <span className="flex flex-wrap gap-3 text-sm">
                    {archiveParts.map((part) => <a key={part.index} href={`/api/employee-documents/archive/${employee.id}?partie=${part.index}`} className="font-semibold text-brand-primary hover:underline">{archiveParts.length === 1 ? "Tout télécharger (ZIP)" : `ZIP ${part.label}`}</a>)}
                  </span>
                ) : null}
              </div>
              <EmployeeDocumentsTable documents={spaceDocuments.map((document) => ({ ...document, publishedAt: document.publishedAt.toISOString(), employeeOpenedAt: document.employeeOpenedAt?.toISOString() ?? null }))} />
              <div className="border-t border-surface-border p-5"><UploadEmployeeDocumentForm employeeId={employee.id} defaultKind={employee.contractEndDate ? "FRANCE_TRAVAIL" : "OTHER"} compact /></div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "informations" && canManageEmployee ? (
        <div className="mt-5 max-w-xl">
          <EmployeeForm
            action={updateEmployeeWithId}
            submitLabel="Enregistrer les modifications"
            potentialManagers={potentialManagers}
            defaultValues={{
              firstName: employee.firstName,
              lastName: employee.lastName,
              civility: employee.civility ?? "",
              professionalCategory: employee.professionalCategory ?? "",
              position: employee.position ?? "",
              hireDate: employee.hireDate.toISOString().slice(0, 10),
              contractType: employee.contractType ?? "",
              contractEndDate: employee.contractEndDate
                ? employee.contractEndDate.toISOString().slice(0, 10)
                : "",
              weeklyHours: workWeeklyHours == null ? "" : String(workWeeklyHours),
              weeklySchedule: workSchedule ? workSchedule.map((hours) => String(hours)) : ["", "", "", "", "", "", ""],
              workScheduleEffectiveFrom: workProfile?.effectiveFrom.toISOString().slice(0, 10) ?? employee.hireDate.toISOString().slice(0, 10),
              probationDuration: employee.probationDuration?.toString() ?? "",
              probationDurationUnit: employee.probationDurationUnit ?? "",
              nextMedicalVisitDate: employee.nextMedicalVisitDate
                ? employee.nextMedicalVisitDate.toISOString().slice(0, 10)
                : "",
              managerMembershipId: employee.managerMembershipId ?? "",
            }}
          />

          <Card id="archiver" className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">Archiver ce salarié</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Le salarié disparaît des listes actives mais reste conservé pour
                  l&apos;historique, rien n&apos;est supprimé définitivement.
                </p>
              </div>
              <ConfirmArchiveButton
                action={archiveEmployeeWithId}
                employeeName={`${employee.firstName} ${employee.lastName}`}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
