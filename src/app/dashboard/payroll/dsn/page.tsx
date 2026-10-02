import Link from "next/link";

import { prisma } from "@/lib/prisma";
import DsnOrganizationForm from "./DsnOrganizationForm";
import DsnExportButton from "./DsnExportButton";
import DsnWorkEventButton from "./DsnWorkEventButton";
import { getPayrollMembership } from "@/lib/payrollAccess";

type OrganizationSettingsRow = {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  declaredContactType: string | null;
  enterpriseApenCode: string | null;
  urssafSiret: string | null;
  retirementSiret: string | null;
  paymentBic: string | null;
  paymentAccountConfigured: boolean;
  subrogationBic: string | null;
  subrogationAccountConfigured: boolean;
  sepaMandatesConfirmed: boolean;
};

type EmployeeDsnStatusRow = { employeeId: string };

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default async function DsnPreparationPage() {
  const membership = await getPayrollMembership();
  if (!membership) return null;
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return <div className="mx-auto max-w-4xl rounded-xl border border-surface-border bg-white p-6"><h1 className="text-xl font-semibold text-ink">DSN</h1><p className="mt-2 text-sm text-ink-soft">La préparation et l'export DSN sont réservés aux administrateurs.</p></div>;
  }

  const [settingsRows, employees, dsnStatusRows, lockedPeriods, archives, stoppages, workEvents] = await Promise.all([
    prisma.$queryRaw<OrganizationSettingsRow[]>`
      SELECT "contactName", "contactEmail", "contactPhone", "declaredContactType", "enterpriseApenCode", "urssafSiret", "retirementSiret", "paymentBic", ("paymentIbanCiphertext" IS NOT NULL) AS "paymentAccountConfigured", "subrogationBic", ("subrogationIbanCiphertext" IS NOT NULL) AS "subrogationAccountConfigured", "sepaMandatesConfirmed"
      FROM "dsn_organization_settings"
      WHERE "organizationId" = ${membership.organizationId}
      LIMIT 1
    `,
    prisma.employee.findMany({ where: { organizationId: membership.organizationId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, position: true, contractType: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.$queryRaw<EmployeeDsnStatusRow[]>`SELECT "employeeId" FROM "dsn_employee_profiles" WHERE "organizationId" = ${membership.organizationId}`,
    prisma.payrollPeriod.findMany({ where: { organizationId: membership.organizationId, status: "LOCKED", year: 2026 }, select: { id: true, year: true, month: true, paymentDate: true }, orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 }),
    prisma.dsn_declarations.findMany({ where: { organizationId: membership.organizationId }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, payrollPeriodId: true, version: true, fileName: true, sha256: true, employeeCount: true, createdAt: true } }),
    prisma.absence.findMany({ where: { organizationId: membership.organizationId, status: "VALIDATED", type: { in: ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"] }, startDate: { lte: new Date() }, endDate: { gte: new Date("2026-01-01T00:00:00Z") }, employee: { deletedAt: null } },
      orderBy: [{ startDate: "desc" }, { id: "asc" }], take: 50, select: { id: true, type: true, startDate: true, endDate: true, lastWorkedDate: true, returnDate: true, returnReasonCode: true, employee: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.dsn_work_events.findMany({ where: { organizationId: membership.organizationId }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, absenceId: true, nature: true, version: true, declarationOrder: true, fileName: true, sha256: true, warnings: true, createdAt: true } }),
  ]);

  const settings = settingsRows[0];
  const configuredIds = new Set(dsnStatusRows.map((row) => row.employeeId));
  const configuredCount = employees.filter((employee) => configuredIds.has(employee.id)).length;
  const organizationReady = Boolean(settings?.contactName && settings.contactEmail && settings.contactPhone && settings.declaredContactType && settings.enterpriseApenCode && settings.urssafSiret && settings.retirementSiret && settings.paymentAccountConfigured && settings.paymentBic && settings.sepaMandatesConfirmed);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Paie · DSN</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Préparer la DSN P26V01</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">La DSN est construite à partir des calculs de paie verrouillés. Les données déclaratives manquantes bloquent l'export au lieu d'être inventées.</p></div>
        <Link href="/dashboard/payroll" className="text-sm font-medium text-brand-primary hover:underline">Retour à la paie</Link>
      </div>

      <div className="mt-6 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-5"><p className="text-sm font-semibold text-ink">Mode pré-contrôle uniquement</p><p className="mt-1 text-sm leading-6 text-ink-soft">RH Pilot génère un fichier P26V01 en mode test. Le dépôt réel reste bloqué tant que les événements, régularisations et retours des organismes n’ont pas été validés. Un pré-contrôle accepté par Dsn-Val ne vaut pas acceptation métier.</p></div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Émetteur / déclaré</p><p className="mt-2 text-lg font-semibold text-ink">{organizationReady ? "Configuré" : "À compléter"}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Profils salariés DSN</p><p className="mt-2 text-lg font-semibold text-ink">{configuredCount}/{employees.length}</p></div>
        <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs text-ink-faint">Périodes 2026 clôturées</p><p className="mt-2 text-lg font-semibold text-ink">{lockedPeriods.length}</p></div>
      </div>

      <section className="mt-7 rounded-xl border border-surface-border bg-white p-5"><h2 className="font-semibold text-ink">Émetteur et contact chez le déclaré</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Ces données alimentent les blocs S10 et S20.G00.07 obligatoires de la DSN mensuelle.</p><DsnOrganizationForm initial={{ contactName: settings?.contactName ?? "", contactEmail: settings?.contactEmail ?? "", contactPhone: settings?.contactPhone ?? "", declaredContactType: settings?.declaredContactType ?? "", enterpriseApenCode: settings?.enterpriseApenCode ?? "", urssafSiret: settings?.urssafSiret ?? "", retirementSiret: settings?.retirementSiret ?? "", paymentBic: settings?.paymentBic ?? "", paymentAccountConfigured: settings?.paymentAccountConfigured ?? false, subrogationBic: settings?.subrogationBic ?? "", subrogationAccountConfigured: settings?.subrogationAccountConfigured ?? false, sepaMandatesConfirmed: settings?.sepaMandatesConfirmed ?? false }} /></section>

      <section className="mt-7 rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4"><h2 className="font-semibold text-ink">Données déclaratives des salariés</h2><p className="mt-1 text-xs leading-5 text-ink-faint">NIR chiffré, identité, adresse, affiliation et codes NEODeS du contrat. Aucune de ces données ne modifie le calcul de paie.</p></div>
        <div className="divide-y divide-surface-border">
          {employees.length === 0 ? <p className="px-5 py-8 text-sm text-ink-soft">Aucun salarié actif.</p> : null}
          {employees.map((employee) => { const configured = configuredIds.has(employee.id); return <div key={employee.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-ink-faint">{employee.position || "Poste non renseigné"} · {employee.contractType || "Contrat non renseigné"}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${configured ? "bg-surface-subtle text-ink-soft" : "bg-accent-amber/10 text-accent-amber"}`}>{configured ? "Profil présent" : "À configurer"}</span><Link href={`/dashboard/payroll/dsn/employees/${employee.id}`} className="rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle">{configured ? "Vérifier" : "Configurer"}</Link></div></div>; })}
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4"><h2 className="font-semibold text-ink">Signalements d'arrêt et de reprise anticipée</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Préparation depuis les arrêts validés, sans attendre la clôture mensuelle. Les prolongations continues conservent le DJT initial. La reprise à la date prévue est récapitulée dans la DSN mensuelle. Aucun fichier n'est transmis par RH Pilot.</p></div>
        <div className="divide-y divide-surface-border">
          {stoppages.length === 0 && <p className="px-5 py-8 text-sm text-ink-soft">Aucun arrêt validé disponible.</p>}
          {stoppages.map((absence) => <div key={absence.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div><p className="font-medium text-ink">{absence.employee.firstName} {absence.employee.lastName}</p><p className="mt-1 text-xs text-ink-faint">{{ SICK_LEAVE: "Maladie", WORK_ACCIDENT: "Accident du travail", MATERNITY: "Maternité", PATERNITY: "Paternité" }[absence.type as "SICK_LEAVE" | "WORK_ACCIDENT" | "MATERNITY" | "PATERNITY"]} · Du {absence.startDate.toLocaleDateString("fr-FR", { timeZone: "UTC" })} au {absence.endDate.toLocaleDateString("fr-FR", { timeZone: "UTC" })}</p>{!absence.lastWorkedDate && <p className="mt-1 text-xs text-accent-amber">Dernier jour travaillé à renseigner dans l'absence.</p>}</div>
            <DsnWorkEventButton absenceId={absence.id} anticipatedRecovery={Boolean(absence.returnDate && absence.returnDate <= absence.endDate && absence.returnDate <= new Date())} />
          </div>)}
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-surface-border bg-white">
        <div className="border-b border-surface-border px-5 py-4"><h2 className="font-semibold text-ink">Exports depuis les paies verrouillées</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Le taux PAS et les montants proviennent du snapshot de la période clôturée, pas des données vivantes du salarié.</p></div>
        <div className="divide-y divide-surface-border">
          {lockedPeriods.length === 0 ? <p className="px-5 py-8 text-sm text-ink-soft">Aucune période 2026 clôturée n'est disponible.</p> : null}
          {lockedPeriods.map((period) => <div key={period.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium text-ink">{MONTHS[period.month - 1]} {period.year}</p><p className="mt-0.5 text-xs text-ink-faint">Date de paiement : {period.paymentDate ? period.paymentDate.toLocaleDateString("fr-FR") : "non renseignée"}</p></div><DsnExportButton periodId={period.id} /></div>)}
        </div>
      </section>
      <section className="mt-7 rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Historique des signalements de pré-contrôle</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Les versions sont chiffrées et immuables. Le numéro d'ordre continue d'un mois à l'autre. Une nouvelle version de test ne remplace pas un dépôt réel accepté par un organisme.</p>
        <div className="mt-4 divide-y divide-surface-border">
          {workEvents.length === 0 && <p className="py-4 text-sm text-ink-soft">Aucun signalement archivé.</p>}
          {workEvents.map((event) => <div key={event.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-ink">{event.nature === "04" ? "Arrêt de travail" : "Reprise anticipée"} · Version {event.version} · Ordre {event.declarationOrder.toString()}</p><p className="mt-1 text-xs text-ink-faint">{event.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · Pré-contrôle</p><p className="mt-1 break-all font-mono text-xs text-ink-faint">SHA-256 : {event.sha256}</p>{Array.isArray(event.warnings) && event.warnings.filter((warning): warning is string => typeof warning === "string").map((warning) => <p key={warning} className="mt-1 max-w-3xl text-xs leading-5 text-ink-soft">{warning}</p>)}</div>
            <a href={`/api/payroll/absences/${event.absenceId}/dsn?mode=test&archiveId=${event.id}`} className="shrink-0 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink">Télécharger cette version</a>
          </div>)}
        </div>
      </section>
      <section className="mt-7 rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Historique des fichiers de pré-contrôle</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">Chaque fichier est conservé chiffré avec son empreinte. Un téléchargement reprend les octets de la version archivée. Une correction nécessite une nouvelle génération. Aucun fichier de cet historique n’a été déposé par RH Pilot.</p>
        <div className="mt-4 divide-y divide-surface-border">
          {archives.length === 0 && <p className="py-4 text-sm text-ink-soft">Aucun fichier archivé.</p>}
          {archives.map((archive) => <div key={archive.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-ink">{archive.fileName} · {archive.employeeCount} salarié(s)</p><p className="mt-1 text-xs text-ink-faint">{archive.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · Version {archive.version} · Pré-contrôle</p><p className="mt-1 break-all font-mono text-xs text-ink-faint">SHA-256 : {archive.sha256}</p></div>
            <a href={`/api/payroll/periods/${archive.payrollPeriodId}/dsn?mode=test&archiveId=${archive.id}`} className="shrink-0 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink">Télécharger cette version</a>
          </div>)}
        </div>
      </section>
    </div>
  );
}
