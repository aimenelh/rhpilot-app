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
    prisma.employee.findMany({ where: { organizationId: membership.organizationId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, position: true, contractType: true, isDemoData: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
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
  const demoOnly = employees.length > 0 && employees.every((employee) => employee.isDemoData);
  const configuredIds = new Set(dsnStatusRows.map((row) => row.employeeId));
  const configuredCount = employees.filter((employee) => configuredIds.has(employee.id)).length;
  const missingOrganization = [
    [settings?.contactName && settings.contactEmail && settings.contactPhone && settings.declaredContactType, "contact DSN"],
    [settings?.enterpriseApenCode, "code APEN de l'entreprise"],
    [settings?.urssafSiret, "SIRET de l'Urssaf"],
    [settings?.retirementSiret, "SIRET de la caisse de retraite"],
    [settings?.paymentAccountConfigured && settings.paymentBic, "compte de prélèvement"],
    [settings?.sepaMandatesConfirmed, "confirmation des mandats SEPA"],
  ].filter(([ok]) => !ok).map(([, label]) => label as string);
  const organizationReady = missingOrganization.length === 0;
  const sortedEmployees = [...employees].sort((left, right) => Number(configuredIds.has(left.id)) - Number(configuredIds.has(right.id)));
  const missingProfiles = employees.length - configuredCount;
  const status = (ok: boolean, text: string) => <p className={`mt-1 text-sm ${ok ? "text-ink-soft" : "text-accent-amber"}`}>{text}</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Paie</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">DSN du mois</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">RH Pilot construit la DSN à partir des paies clôturées. Une donnée manquante bloque le fichier : rien n&apos;est deviné.</p>
        </div>
        <Link href="/dashboard/payroll" className="text-sm font-medium text-brand-primary hover:underline">Retour à la paie</Link>
      </div>

      <div className="mt-6 border-l-2 border-ink pl-4">
        <p className="text-sm font-semibold text-ink">Phase pilote : vous déposez des DSN d&apos;essai</p>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">Votre déclaration réelle continue de partir de votre outil actuel. Le fichier d&apos;essai de RH Pilot passe tous les contrôles officiels de net-entreprises sans être transmis aux organismes : c&apos;est ce qui permet de comparer les deux, mois après mois, avant de basculer.</p>
      </div>
      {demoOnly ? (
        <div className="mt-4 rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-4 py-3">
          <p className="text-sm font-semibold text-ink">Entreprise de démonstration</p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">SIRET, salariés, NIR, organismes et comptes sont fictifs et déjà renseignés : vous pouvez générer la DSN d&apos;un mois clôturé pour voir le fichier, mais pas la déposer sur net-entreprises. Pour un vrai dépôt d&apos;essai, utilisez une organisation avec votre SIRET et vos salariés.</p>
        </div>
      ) : null}

      <section id="entreprise" className="mt-8 scroll-mt-24 border-t border-surface-border pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">L&apos;entreprise</h2>
          {status(organizationReady, organizationReady ? "Informations complètes" : `À compléter : ${missingOrganization.join(", ")}`)}
        </div>
        <p className="mt-1 text-xs leading-5 text-ink-faint">Contact, organismes et comptes de prélèvement, repris des notifications d&apos;affiliation. Ils alimentent les blocs émetteur et paiement de chaque DSN.</p>
        <details open={!organizationReady} className="group mt-3">
          <summary className="cursor-pointer text-sm font-medium text-brand-primary hover:underline">{organizationReady ? "Modifier les informations" : "Renseigner les informations"}</summary>
          <DsnOrganizationForm initial={{ contactName: settings?.contactName ?? "", contactEmail: settings?.contactEmail ?? "", contactPhone: settings?.contactPhone ?? "", declaredContactType: settings?.declaredContactType ?? "", enterpriseApenCode: settings?.enterpriseApenCode ?? "", urssafSiret: settings?.urssafSiret ?? "", retirementSiret: settings?.retirementSiret ?? "", paymentBic: settings?.paymentBic ?? "", paymentAccountConfigured: settings?.paymentAccountConfigured ?? false, subrogationBic: settings?.subrogationBic ?? "", subrogationAccountConfigured: settings?.subrogationAccountConfigured ?? false, sepaMandatesConfirmed: settings?.sepaMandatesConfirmed ?? false }} />
        </details>
      </section>

      <section id="salaries" className="mt-8 scroll-mt-24 border-t border-surface-border pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">Les salariés</h2>
          {status(missingProfiles === 0 && employees.length > 0, employees.length === 0 ? "Aucun salarié actif" : missingProfiles === 0 ? `${configuredCount} profils DSN enregistrés` : `${missingProfiles} profil${missingProfiles > 1 ? "s" : ""} DSN à créer sur ${employees.length}`)}
        </div>
        <p className="mt-1 text-xs leading-5 text-ink-faint">NIR chiffré, identité, adresse et codes du contrat. Ces données ne modifient pas le calcul de paie.</p>
        <div className="mt-3 divide-y divide-surface-border rounded-xl border border-surface-border bg-white">
          {sortedEmployees.map((employee) => { const configured = configuredIds.has(employee.id); return (
            <div key={employee.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium text-ink">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-ink-faint">{employee.position || "Poste non renseigné"} · {employee.contractType || "Contrat non renseigné"}</p></div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${configured ? "text-ink-faint" : "font-semibold text-accent-amber"}`}>{configured ? "Profil enregistré" : "Profil à créer"}</span>
                <Link href={`/dashboard/payroll/dsn/employees/${employee.id}`} className="rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-subtle">{configured ? "Vérifier" : "Créer"}</Link>
              </div>
            </div>
          ); })}
        </div>
      </section>

      <section id="mois" className="mt-8 scroll-mt-24 border-t border-surface-border pt-6">
        <h2 className="text-lg font-semibold text-ink">Les mois clôturés</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">Le fichier reprend les montants figés à la clôture, pas les données actuelles du salarié. S&apos;il est bloqué, le message indique quoi corriger et où.</p>
        <div className="mt-3 divide-y divide-surface-border rounded-xl border border-surface-border bg-white">
          {lockedPeriods.length === 0 ? <p className="px-4 py-6 text-sm text-ink-soft">Aucun mois de 2026 n&apos;est encore clôturé. Calculez, validez puis clôturez un mois dans la paie pour préparer sa DSN.</p> : null}
          {lockedPeriods.map((period) => {
            const versions = archives.filter((archive) => archive.payrollPeriodId === period.id);
            return (
              <div key={period.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-ink">{MONTHS[period.month - 1]} {period.year}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">Paiement le {period.paymentDate ? period.paymentDate.toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "date non renseignée"}{versions.length > 0 ? ` · ${versions.length} fichier${versions.length > 1 ? "s" : ""} généré${versions.length > 1 ? "s" : ""}, dernier le ${versions[0].createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}</p>
                </div>
                <DsnExportButton periodId={period.id} />
              </div>
            );
          })}
        </div>
      </section>

      <section id="depot" className="mt-8 scroll-mt-24 border-t border-surface-border pt-6">
        <h2 className="text-lg font-semibold text-ink">Le dépôt d&apos;essai sur net-entreprises</h2>
        <ol className="mt-3 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-soft marker:text-ink-faint">
          <li>Connectez-vous à net-entreprises.fr avec le compte qui sert déjà aux déclarations de l&apos;entreprise.</li>
          <li>Dans votre espace DSN, choisissez le dépôt d&apos;un fichier et sélectionnez le fichier téléchargé ici, sans l&apos;ouvrir ni le modifier.</li>
          <li>Le fichier est marqué « essai » : il est contrôlé comme une vraie déclaration, mais n&apos;est transmis à aucun organisme. Votre DSN réelle reste à déposer comme d&apos;habitude.</li>
          <li>Consultez le bilan du dépôt dans votre tableau de bord DSN. S&apos;il signale une anomalie, transmettez-le à RH Pilot avec le mois concerné.</li>
          <li>Comparez enfin les montants avec la DSN produite par votre outil actuel pour le même mois : bruts, cotisations par organisme et prélèvement à la source.</li>
        </ol>
      </section>

      <section id="signalements" className="mt-8 scroll-mt-24 border-t border-surface-border pt-6">
        <h2 className="text-lg font-semibold text-ink">Signalements d&apos;arrêt et de reprise anticipée</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">À préparer dès qu&apos;un arrêt est validé, sans attendre la clôture du mois. Une reprise à la date prévue se déclare dans la DSN mensuelle.</p>
        <div className="mt-3 divide-y divide-surface-border rounded-xl border border-surface-border bg-white">
          {stoppages.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">Aucun arrêt validé.</p>}
          {stoppages.map((absence) => <div key={absence.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div><p className="font-medium text-ink">{absence.employee.firstName} {absence.employee.lastName}</p><p className="mt-1 text-xs text-ink-faint">{{ SICK_LEAVE: "Maladie", WORK_ACCIDENT: "Accident du travail", MATERNITY: "Maternité", PATERNITY: "Paternité" }[absence.type as "SICK_LEAVE" | "WORK_ACCIDENT" | "MATERNITY" | "PATERNITY"]} · du {absence.startDate.toLocaleDateString("fr-FR", { timeZone: "UTC" })} au {absence.endDate.toLocaleDateString("fr-FR", { timeZone: "UTC" })}</p>{!absence.lastWorkedDate && <p className="mt-1 text-xs text-accent-amber">Dernier jour travaillé à renseigner dans l&apos;absence.</p>}</div>
            <DsnWorkEventButton absenceId={absence.id} anticipatedRecovery={Boolean(absence.returnDate && absence.returnDate <= absence.endDate && absence.returnDate <= new Date())} />
          </div>)}
        </div>
      </section>

      <section id="historique" className="mt-8 scroll-mt-24 border-t border-surface-border pt-6 pb-10">
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-ink">Historique des fichiers</summary>
          <p className="mt-2 text-xs leading-5 text-ink-faint">Chaque fichier est conservé chiffré avec son empreinte ; un téléchargement restitue exactement la version archivée. Aucun de ces fichiers n&apos;a été déposé par RH Pilot.</p>
          <div className="mt-4 divide-y divide-surface-border">
            {archives.length === 0 && workEvents.length === 0 && <p className="py-4 text-sm text-ink-soft">Aucun fichier archivé.</p>}
            {archives.map((archive) => <div key={archive.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium text-ink">{archive.fileName} · {archive.employeeCount} salarié(s)</p><p className="mt-1 text-xs text-ink-faint">{archive.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · version {archive.version} · essai</p><p className="mt-1 break-all font-mono text-xs text-ink-faint">SHA-256 : {archive.sha256}</p></div>
              <a href={`/api/payroll/periods/${archive.payrollPeriodId}/dsn?mode=test&archiveId=${archive.id}`} className="shrink-0 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink">Télécharger</a>
            </div>)}
            {workEvents.map((event) => <div key={event.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium text-ink">{event.nature === "04" ? "Signalement d'arrêt" : "Signalement de reprise anticipée"} · version {event.version} · ordre {event.declarationOrder.toString()}</p><p className="mt-1 text-xs text-ink-faint">{event.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · essai</p><p className="mt-1 break-all font-mono text-xs text-ink-faint">SHA-256 : {event.sha256}</p>{Array.isArray(event.warnings) && event.warnings.filter((warning): warning is string => typeof warning === "string").map((warning) => <p key={warning} className="mt-1 max-w-3xl text-xs leading-5 text-ink-soft">{warning}</p>)}</div>
              <a href={`/api/payroll/absences/${event.absenceId}/dsn?mode=test&archiveId=${event.id}`} className="shrink-0 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-ink">Télécharger</a>
            </div>)}
          </div>
        </details>
      </section>
    </div>
  );
}
