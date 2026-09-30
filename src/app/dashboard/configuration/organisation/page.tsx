import { validateMaintenanceRule } from "@/lib/payroll/bulletin/maintenance-settings";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { countThresholdHeadcount } from "@/lib/payroll/headcount";
import { refreshOrganizationFromRegistry, updateOrganizationSettings } from "../../settings/organizationActions";
import { CollectiveAgreementFields } from "./CollectiveAgreementFields";
import { PayrollSettingsFields, type PayrollSettingsValues } from "./PayrollSettingsFields";

export const dynamic = "force-dynamic";

const LEGAL_CATEGORIES = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"] as const;
const LEGAL_CATEGORY_LABELS: Record<(typeof LEGAL_CATEGORIES)[number], string> = {
  EI: "Entreprise individuelle",
  SARL: "SARL ou EURL",
  SAS: "SAS ou SASU",
  SELARL: "SELARL",
  SELAS: "SELAS",
  association: "Association",
  autre: "Autre forme (SA, SNC, société civile...)",
};

type OrganisationConfigPageProps = { searchParams?: { saved?: string } };
type SocialRow = {
  legalCategory: string | null;
  atmpRate: unknown;
  healthPlanMonthlyAmount: unknown;
  healthPlanEmployerRate: unknown;
  companyCreationDate: Date | null;
  payrollDepartment: string | null;
  payrollCommuneCode: string | null;
  payrollHeadcount: unknown;
  mobilityRate: unknown;
  mobilityRateSource: string | null;
  mobilityRateCheckedAt: Date | null;
  mobilityRateDetail: string | null;
  registrySyncedAt: Date | null;
  registrySnapshot: unknown;
  paidLeaveMethod: string | null;
  paidLeaveWorkingDays: unknown;
  ijssSubrogation: boolean | null;
  workedSolidarityDay: boolean | null;
  sickPayRule: unknown;
  workAccidentPayRule: unknown;
  prevoyanceRates: unknown;
  mealVoucherFaceValue: unknown;
  mealVoucherEmployerShare: unknown;
  transportEmployerShare: unknown;
};
type RegistrySnapshot = { legalNatureCode?: string | null; conventions?: Array<{ idcc: string; title: string | null }>; establishmentMatched?: boolean; active?: boolean };

function asText(value: unknown, scale = 1): string {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * scale * 100000) / 100000) : "";
}

const frDate = (date: Date) => date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const frNumber = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const formatSiret = (siret: string) => siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

function payrollSettingsValues(row: SocialRow | undefined, automaticHeadcount: number): PayrollSettingsValues {
  const rates = (row?.prevoyanceRates ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const population = (key: "cadre" | "nonCadre") => ({
    employeeT1: asText(rates[key]?.employeeT1, 100),
    employerT1: asText(rates[key]?.employerT1, 100),
    employeeT2: asText(rates[key]?.employeeT2, 100),
    employerT2: asText(rates[key]?.employerT2, 100),
  });
  const storedRate = row?.mobilityRate === null || row?.mobilityRate === undefined ? null : Number(row.mobilityRate);
  const manual = row?.mobilityRateSource === "MANUEL";
  return {
    sickPayRule: validateMaintenanceRule(row?.sickPayRule, "sickPayRule"),
    workAccidentPayRule: validateMaintenanceRule(row?.workAccidentPayRule, "workAccidentPayRule"),
    payrollHeadcount: asText(row?.payrollHeadcount),
    automaticHeadcount: frNumber(automaticHeadcount),
    mobilityRate: manual ? asText(row?.mobilityRate) : "",
    mobilityAutomatic: !manual && storedRate !== null && Number.isFinite(storedRate)
      ? { rate: frNumber(storedRate), detail: row?.mobilityRateDetail ?? null, checkedAt: row?.mobilityRateCheckedAt ? frDate(row.mobilityRateCheckedAt) : null }
      : null,
    mobilityCommuneKnown: Boolean(row?.payrollCommuneCode),
    paidLeaveMethod: row?.paidLeaveMethod === "OUVRES" ? "OUVRES" : "OUVRABLES",
    paidLeaveWorkingDays: Array.isArray(row?.paidLeaveWorkingDays) ? row.paidLeaveWorkingDays as boolean[] : null,
    ijssSubrogation: row?.ijssSubrogation !== false,
    workedSolidarityDay: row?.workedSolidarityDay === true,
    mealVoucherFaceValue: asText(row?.mealVoucherFaceValue),
    mealVoucherEmployerShare: asText(row?.mealVoucherEmployerShare, 100),
    transportEmployerShare: asText(row?.transportEmployerShare ?? 0.5, 100),
    prevoyance: { cadre: population("cadre"), nonCadre: population("nonCadre") },
  };
}

function readRegistryFlash(): { ok: boolean; message: string } | null {
  const raw = cookies().get("rhpilot-registry-sync")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as { ok?: unknown; message?: unknown };
    return typeof parsed.message === "string" ? { ok: parsed.ok === true, message: parsed.message } : null;
  } catch {
    return null;
  }
}

function IdentityItem({ label, value, hint }: { label: string; value: string | null; hint?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-faint">{label}</dt>
      <dd className={`mt-0.5 text-sm ${value ? "text-ink" : "text-ink-faint"}`}>{value ?? "Non trouvé dans le répertoire"}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-ink-faint">{hint}</dd> : null}
    </div>
  );
}

export default async function OrganisationConfigPage({ searchParams }: OrganisationConfigPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  let organization: {
    siret: string | null;
    payrollAddress: string | null;
    payrollPostalCode: string | null;
    payrollCity: string | null;
    payrollNafCode: string | null;
    conventionCollective: string | null;
    collectiveAgreement: { idcc: string; name: string } | null;
  } | null = null;
  let collectiveAgreements: Array<{ id: string; idcc: string; name: string }> = [];
  let socialRows: SocialRow[] = [];
  let automaticHeadcount = 0;

  if (canEditOrganization) {
    const today = new Date();
    const lastDayOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 12));
    const [org, agreements, rows, employees, profiles] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: membership.organizationId },
        select: {
          siret: true,
          payrollAddress: true,
          payrollPostalCode: true,
          payrollCity: true,
          payrollNafCode: true,
          conventionCollective: true,
          collectiveAgreement: { select: { idcc: true, name: true } },
        },
      }),
      prisma.collectiveAgreement.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, idcc: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.$queryRaw<SocialRow[]>`SELECT "legalCategory", "atmpRate", "healthPlanMonthlyAmount", "healthPlanEmployerRate", "companyCreationDate", "payrollDepartment", "payrollCommuneCode", "payrollHeadcount", "mobilityRate", "mobilityRateSource", "mobilityRateCheckedAt", "mobilityRateDetail", "registrySyncedAt", "registrySnapshot", "paidLeaveMethod", "paidLeaveWorkingDays", "ijssSubrogation", "workedSolidarityDay", "sickPayRule", "workAccidentPayRule", "prevoyanceRates", "mealVoucherFaceValue", "mealVoucherEmployerShare", "transportEmployerShare" FROM "organizations" WHERE "id" = ${membership.organizationId} LIMIT 1`,
      prisma.employee.findMany({ where: { organizationId: membership.organizationId, deletedAt: null }, select: { id: true, contractType: true, hireDate: true, contractEndDate: true } }),
      prisma.payrollProfile.findMany({ where: { organizationId: membership.organizationId, effectiveFrom: { lte: lastDayOfMonth }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: lastDayOfMonth } }] }, select: { employeeId: true, monthlyHours: true } }),
    ]);
    organization = org;
    collectiveAgreements = agreements;
    socialRows = rows;
    const hoursByEmployee = new Map(profiles.map((profile) => [profile.employeeId, profile.monthlyHours === null ? null : Number(profile.monthlyHours)]));
    automaticHeadcount = countThresholdHeadcount(employees.map((employee) => ({ ...employee, monthlyHours: hoursByEmployee.get(employee.id) ?? null })), lastDayOfMonth);
  }
  const social = socialRows[0];
  const legalCategory = social?.legalCategory ?? "";
  const atmpRate = social?.atmpRate === null || social?.atmpRate === undefined ? "" : String(social.atmpRate);
  const healthPlanMonthlyAmount = social?.healthPlanMonthlyAmount === null || social?.healthPlanMonthlyAmount === undefined ? "" : String(social.healthPlanMonthlyAmount);
  const healthPlanEmployerRate = social?.healthPlanEmployerRate === null || social?.healthPlanEmployerRate === undefined ? "" : String(social.healthPlanEmployerRate);
  const companyCreationDate = social?.companyCreationDate ? social.companyCreationDate.toISOString().slice(0, 10) : "";
  const payrollDepartment = social?.payrollDepartment ?? "";
  const snapshot = (social?.registrySnapshot ?? null) as RegistrySnapshot | null;
  const declaredConventions = snapshot?.conventions ?? [];
  const saved = cookies().get("rhpilot-organization-saved")?.value === "1" || searchParams?.saved === "1";
  const registryFlash = readRegistryFlash();
  const place = [organization?.payrollAddress, [organization?.payrollPostalCode, organization?.payrollCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/configuration" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"><ArrowLeft size={14} /> Configuration</Link>
      <h1 className="mt-3 text-2xl font-semibold text-ink">Organisation</h1>
      <p className="mt-1 text-sm text-ink-soft">{canEditOrganization ? "L’identité de l’entreprise est reprise de son SIRET. Il ne vous reste que ce que RH Pilot ne peut pas savoir." : "Votre rôle dans l’organisation."}</p>
      {saved && <div role="status" className="mt-4 rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-4 py-3 text-sm font-medium text-accent-teal">✓ Modifications enregistrées.</div>}
      {registryFlash && <div role="status" className={`mt-4 rounded-lg border px-4 py-3 text-sm ${registryFlash.ok ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{registryFlash.message}</div>}

      {canEditOrganization && (
        <Card className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Identité de l&apos;entreprise</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {social?.registrySyncedAt
                  ? <>Reprise du répertoire Sirene de l&apos;Insee le {frDate(social.registrySyncedAt)}{organization?.siret ? <> (SIRET {formatSiret(organization.siret)})</> : null}. Elle alimente les bulletins, la DSN et le calcul des cotisations.</>
                  : <>Ces informations peuvent être reprises du répertoire Sirene de l&apos;Insee à partir de votre SIRET.</>}
              </p>
            </div>
            <form action={refreshOrganizationFromRegistry} className="shrink-0">
              <Button type="submit" variant="secondary"><RefreshCw size={14} /> Actualiser depuis le SIRET</Button>
            </form>
          </div>
          <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <IdentityItem label="Forme juridique" value={legalCategory ? LEGAL_CATEGORY_LABELS[legalCategory as (typeof LEGAL_CATEGORIES)[number]] ?? legalCategory : null} hint={snapshot?.legalNatureCode ? `Catégorie juridique Insee ${snapshot.legalNatureCode}` : null} />
            <IdentityItem label="Date de création" value={social?.companyCreationDate ? frDate(social.companyCreationDate) : null} />
            <IdentityItem label="Code APE" value={organization?.payrollNafCode ?? null} />
            <IdentityItem label="Établissement" value={place || null} hint={payrollDepartment ? `Département ${payrollDepartment}${social?.payrollCommuneCode ? `, code commune Insee ${social.payrollCommuneCode}` : ""}` : null} />
            <IdentityItem label="Convention collective" value={organization?.collectiveAgreement ? `${organization.collectiveAgreement.name} (IDCC ${organization.collectiveAgreement.idcc})` : null} hint={declaredConventions.length > 1 ? `Conventions déclarées pour ce SIRET : IDCC ${declaredConventions.map((convention) => convention.idcc).join(", ")}` : declaredConventions.length === 1 ? "Déclarée en DSN pour cet établissement" : null} />
          </dl>
          {snapshot?.establishmentMatched === false && <p className="mt-4 text-xs text-amber-800">Ce SIRET n&apos;a pas été retrouvé tel quel : l&apos;adresse reprise est celle du siège. Corrigez-la plus bas si la paie concerne un autre établissement.</p>}
          {snapshot?.active === false && <p className="mt-4 text-xs text-amber-800">Le répertoire Sirene indique que cet établissement est fermé.</p>}
        </Card>
      )}

      <form action={updateOrganizationSettings}>
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-ink">Votre rôle dans l&apos;organisation</h2>
          <p className="mt-1 text-sm text-ink-soft">Certaines tâches des parcours RH sont conçues pour être assignées automatiquement à &laquo;&nbsp;la personne RH&nbsp;&raquo; de l&apos;organisation. RH Pilot ne devine jamais qui occupe ce rôle.</p>
          <div className="mt-4"><Label htmlFor="functionalRole">Mon rôle</Label><Select id="functionalRole" name="functionalRole" defaultValue={membership.functionalRole ?? ""}><option value="">Non renseigné</option><option value="RH">RH</option><option value="DIRIGEANT">Dirigeant</option></Select><FieldHint>Si plusieurs personnes sont marquées &laquo;&nbsp;RH&nbsp;&raquo;, l&apos;assignation automatique reste désactivée.</FieldHint></div>
        </Card>
        {canEditOrganization && (<>
          <Card className="mt-4">
            <h2 className="text-sm font-semibold text-ink">À renseigner par vous</h2>
            <p className="mt-1 text-sm text-ink-soft">Ces deux informations ne figurent dans aucun registre public : elles dépendent de votre dossier auprès de la Carsat et de votre contrat de mutuelle.</p>
            <div className="mt-4">
              <Label htmlFor="atmpRate">Taux AT/MP de l&apos;établissement (%)</Label>
              <Input id="atmpRate" name="atmpRate" type="number" min="0" max="100" step="0.01" defaultValue={atmpRate} placeholder="Ex. 0,90" />
              <FieldHint>Il figure sur la notification annuelle de taux AT/MP, consultable dans le compte AT/MP de votre espace <Link href="https://www.net-entreprises.fr/" target="_blank" rel="noreferrer" className="font-medium text-brand-primary hover:underline">net-entreprises.fr</Link>. Il est propre à chaque entreprise, RH Pilot ne l&apos;estime pas.</FieldHint>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="healthPlanMonthlyAmount">Cotisation mensuelle de la mutuelle (€)</Label>
                <Input id="healthPlanMonthlyAmount" name="healthPlanMonthlyAmount" type="number" min="0.01" max="10000" step="0.01" defaultValue={healthPlanMonthlyAmount} placeholder="Ex. 40" />
                <FieldHint>Montant par salarié prévu par votre contrat de complémentaire santé.</FieldHint>
              </div>
              <div>
                <Label htmlFor="healthPlanEmployerRate">Part payée par l&apos;entreprise (%)</Label>
                <Input id="healthPlanEmployerRate" name="healthPlanEmployerRate" type="number" min="50" max="100" step="0.01" defaultValue={healthPlanEmployerRate} placeholder="Ex. 50" />
                <FieldHint>Au moins 50 %.</FieldHint>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-ink">Corriger l&apos;identité de l&apos;entreprise</summary>
              <p className="mt-2 text-sm text-ink-soft">Seulement si le répertoire Sirene n&apos;est pas à jour, ou si la paie concerne un autre établissement que celui du SIRET. Le bouton « Actualiser depuis le SIRET » remplace ces valeurs.</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div><Label htmlFor="legalCategory">Forme juridique</Label><Select id="legalCategory" name="legalCategory" defaultValue={legalCategory}><option value="">Non renseignée</option>{LEGAL_CATEGORIES.map((category) => <option key={category} value={category}>{LEGAL_CATEGORY_LABELS[category]}</option>)}</Select></div>
                <div><Label htmlFor="companyCreationDate">Date de création</Label><Input id="companyCreationDate" name="companyCreationDate" type="date" defaultValue={companyCreationDate} /></div>
                <div className="sm:col-span-2"><Label htmlFor="payrollAddress">Adresse de l&apos;établissement</Label><Input id="payrollAddress" name="payrollAddress" defaultValue={organization?.payrollAddress ?? ""} placeholder="Ex. 12 rue de la Loge" /></div>
                <div><Label htmlFor="payrollPostalCode">Code postal</Label><Input id="payrollPostalCode" name="payrollPostalCode" inputMode="numeric" maxLength={5} defaultValue={organization?.payrollPostalCode ?? ""} placeholder="Ex. 34000" /></div>
                <div><Label htmlFor="payrollCity">Commune</Label><Input id="payrollCity" name="payrollCity" defaultValue={organization?.payrollCity ?? ""} placeholder="Ex. Montpellier" /></div>
                <div><Label htmlFor="payrollDepartment">Département (code)</Label><Input id="payrollDepartment" name="payrollDepartment" defaultValue={payrollDepartment} placeholder="Ex. 34" /></div>
                <div><Label htmlFor="payrollNafCode">Code APE</Label><Input id="payrollNafCode" name="payrollNafCode" defaultValue={organization?.payrollNafCode ?? ""} placeholder="Ex. 6202A" /></div>
              </div>
            </details>
          </Card>

          <PayrollSettingsFields values={payrollSettingsValues(social, automaticHeadcount)} />
          <Card className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-sm font-semibold text-ink">Convention collective</h2><p className="mt-1 text-sm text-ink-soft">Reprise automatiquement de la DSN de votre établissement quand elle y est déclarée. Changez-la ici si une autre convention s&apos;applique.</p></div><Link href="https://code.travail.gouv.fr/outils/convention-collective/entreprise" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"><ExternalLink size={13} /> Vérifier l&apos;IDCC</Link></div>
            <div className="mt-4"><CollectiveAgreementFields defaultNaf={organization?.payrollNafCode ?? ""} agreements={collectiveAgreements} defaultIdcc={organization?.collectiveAgreement?.idcc ?? ""} defaultName={organization?.collectiveAgreement?.name ?? organization?.conventionCollective ?? ""} /></div>
          </Card>
        </>)}
        <div className="mt-6 flex justify-end"><Button type="submit">Enregistrer les modifications</Button></div>
      </form>
    </div>
  );
}
