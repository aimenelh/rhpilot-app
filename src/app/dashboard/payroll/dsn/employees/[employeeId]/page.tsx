import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DsnEmployeeForm, { type DsnEmployeeFormInitial } from "../../DsnEmployeeForm";

type DsnProfileRow = {
  nirCiphertext: string; birthDate: Date; birthPlace: string; birthDepartment: string; birthCountryCode: string | null; euClassificationCode: string | null;
  addressLine: string; postalCode: string; city: string; countryCode: string | null; contractNumber: string; contractNatureCode: string;
  publicPolicyCode: string; pcsEsecCode: string; conventionalStatusCode: string; retirementStatusCode: string; workUnitCode: string;
  referenceWorkQuota: unknown; contractWorkQuota: unknown; workModalityCode: string; baseSchemeSupplementCode: string | null;
  sicknessRegimeCode: string; workLocationId: string | null; oldAgeRegimeCode: string; foreignWorkerCode: string | null; employmentStatusCode: string | null;
  multipleJobsCode: string | null; multipleEmployersCode: string | null; workAccidentRegimeCode: string | null; workAccidentRiskCode: string | null;
};

function dateInput(date: Date | null | undefined): string { return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : ""; }

export default async function DsnEmployeeSetupPage({ params }: { params: { employeeId: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return null;
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return <div className="mx-auto max-w-3xl rounded-xl border border-surface-border bg-white p-6"><h1 className="text-xl font-semibold text-ink">Configuration DSN</h1><p className="mt-2 text-sm text-ink-soft">Seuls les administrateurs peuvent consulter et modifier les données déclaratives DSN.</p></div>;

  const employee = await prisma.employee.findFirst({ where: { id: params.employeeId, organizationId: membership.organizationId }, select: { id: true, firstName: true, lastName: true, position: true, contractType: true } });
  if (!employee) notFound();

  const [rows, payrollProfile, organization] = await Promise.all([
    prisma.$queryRaw<DsnProfileRow[]>`
      SELECT "nirCiphertext", "birthDate", "birthPlace", "birthDepartment", "birthCountryCode", "euClassificationCode",
             "addressLine", "postalCode", "city", "countryCode", "contractNumber", "contractNatureCode", "publicPolicyCode", "pcsEsecCode",
             "conventionalStatusCode", "retirementStatusCode", "workUnitCode", "referenceWorkQuota", "contractWorkQuota", "workModalityCode",
             "baseSchemeSupplementCode", "sicknessRegimeCode", "workLocationId", "oldAgeRegimeCode", "foreignWorkerCode", "employmentStatusCode",
             "multipleJobsCode", "multipleEmployersCode", "workAccidentRegimeCode", "workAccidentRiskCode"
      FROM "dsn_employee_profiles"
      WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employee.id}
      LIMIT 1
    `,
    prisma.payrollProfile.findFirst({ where: { organizationId: membership.organizationId, employeeId: employee.id }, select: { monthlyHours: true, employeeAddress: true }, orderBy: { effectiveFrom: "desc" } }),
    prisma.organization.findUnique({ where: { id: membership.organizationId }, select: { siret: true } }),
  ]);
  const row = rows[0];
  const safeContractNature = employee.contractType === "CDI" ? "01" : employee.contractType === "CDD" ? "02" : "";
  const safePublicPolicy = employee.contractType === "CDI" || employee.contractType === "CDD" ? "99" : "";
  const monthlyHours = payrollProfile?.monthlyHours ? String(payrollProfile.monthlyHours) : "";
  const initial: DsnEmployeeFormInitial = {
    hasNir: Boolean(row?.nirCiphertext), birthDate: dateInput(row?.birthDate), birthPlace: row?.birthPlace ?? "", birthDepartment: row?.birthDepartment ?? "",
    birthCountryCode: row?.birthCountryCode ?? "FR", euClassificationCode: row?.euClassificationCode ?? "01", addressLine: row?.addressLine ?? payrollProfile?.employeeAddress ?? "",
    postalCode: row?.postalCode ?? "", city: row?.city ?? "", countryCode: row?.countryCode ?? "", contractNumber: row?.contractNumber ?? "",
    contractNatureCode: row?.contractNatureCode ?? safeContractNature, publicPolicyCode: row?.publicPolicyCode ?? safePublicPolicy, pcsEsecCode: row?.pcsEsecCode ?? "",
    conventionalStatusCode: row?.conventionalStatusCode ?? "", retirementStatusCode: row?.retirementStatusCode ?? "", workUnitCode: row?.workUnitCode ?? (monthlyHours ? "10" : ""),
    referenceWorkQuota: row ? String(row.referenceWorkQuota) : monthlyHours, contractWorkQuota: row ? String(row.contractWorkQuota) : monthlyHours,
    workModalityCode: row?.workModalityCode ?? "", baseSchemeSupplementCode: row?.baseSchemeSupplementCode ?? "99", sicknessRegimeCode: row?.sicknessRegimeCode ?? "200",
    workLocationId: row?.workLocationId ?? organization?.siret ?? "", oldAgeRegimeCode: row?.oldAgeRegimeCode ?? "200", foreignWorkerCode: row?.foreignWorkerCode ?? "99",
    employmentStatusCode: row?.employmentStatusCode ?? "99", multipleJobsCode: row?.multipleJobsCode ?? "01", multipleEmployersCode: row?.multipleEmployersCode ?? "01",
    workAccidentRegimeCode: row?.workAccidentRegimeCode ?? "200", workAccidentRiskCode: row?.workAccidentRiskCode ?? "",
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/payroll/dsn" className="text-sm font-medium text-brand-primary hover:underline">← Retour à la préparation DSN</Link>
      <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Paie · DSN P26V01</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{employee.firstName} {employee.lastName}</h1><p className="mt-1 text-sm text-ink-soft">{employee.position || "Poste non renseigné"} · {employee.contractType || "Contrat non renseigné"}</p></div>
      <div className="mt-6 rounded-xl border border-accent-amber/30 bg-accent-amber/5 px-4 py-3 text-sm leading-6 text-ink-soft">Les codes NEODeS sont des données déclaratives. Les valeurs préremplies correspondent uniquement au périmètre privé/régime général déjà supporté par le moteur social et doivent être confirmées avant export.</div>
      <div className="mt-6"><DsnEmployeeForm employeeId={employee.id} initial={initial} /></div>
    </div>
  );
}
