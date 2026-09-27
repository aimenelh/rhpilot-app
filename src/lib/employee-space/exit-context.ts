/**
 * Données des documents de sortie : employeur, salarié et dernier bulletin
 * validé du mois de sortie.
 */
import { prisma } from "@/lib/prisma";
import { bulletinFromSnapshot } from "@/lib/payroll/bulletin/prior-state";
import type { PayslipResult } from "@/lib/payroll/bulletin/types";
import type { ExitEmployee, ExitEmployer } from "./exit-documents";

const CATEGORY_LABELS: Record<string, string> = {
  CADRE: "Cadre",
  AGENT_DE_MAITRISE: "Agent de maîtrise",
  EMPLOYE: "Employé",
  OUVRIER: "Ouvrier",
};

export type ExitContext = {
  employer: ExitEmployer;
  employee: ExitEmployee;
  employeeName: string;
  /** Bulletin du mois de sortie, s'il est calculé et que le mois est clôturé. */
  finalBulletin: PayslipResult | null;
  finalPeriod: { id: string; year: number; month: number; status: string; paymentDate: Date | null } | null;
  healthCoverageDetected: boolean;
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

export async function loadExitContext(organizationId: string, employeeId: string): Promise<ExitContext | { error: string }> {
  const [organization, employee, profile] = await Promise.all([
    prisma.organization.findFirst({ where: { id: organizationId }, select: { name: true, siret: true, payrollAddress: true, payrollPostalCode: true, payrollCity: true } }),
    prisma.employee.findFirst({ where: { id: employeeId, organizationId }, select: { id: true, firstName: true, lastName: true, civility: true, position: true, professionalCategory: true, hireDate: true, contractEndDate: true, isDemoData: true } }),
    prisma.payrollProfile.findFirst({ where: { organizationId, employeeId }, orderBy: { effectiveFrom: "desc" }, select: { employeeAddress: true } }),
  ]);
  if (!organization || !employee) return { error: "Salarié introuvable." };
  if (!employee.contractEndDate) return { error: "Renseignez la date de fin de contrat sur la fiche du salarié." };

  const exitYear = employee.contractEndDate.getUTCFullYear();
  const exitMonth = employee.contractEndDate.getUTCMonth() + 1;
  const period = await prisma.payrollPeriod.findUnique({
    where: { organizationId_year_month: { organizationId, year: exitYear, month: exitMonth } },
    select: { id: true, year: true, month: true, status: true, paymentDate: true },
  });
  const calculation = period
    ? await prisma.payrollCalculation.findUnique({ where: { organizationId_payrollPeriodId_employeeId: { organizationId, payrollPeriodId: period.id, employeeId } }, select: { calculationSnapshot: true } })
    : null;
  const bulletin = period?.status === "LOCKED" && calculation ? bulletinFromSnapshot(calculation.calculationSnapshot) : null;

  let healthCoverageDetected = Boolean(bulletin?.lines.some((line) => line.code === "SANTE" || line.code.startsWith("PREVOYANCE")));
  if (!bulletin) {
    const rows = await prisma.$queryRaw<Array<{ prevoyanceRates: unknown }>>`SELECT "prevoyanceRates" FROM "organizations" WHERE "id" = ${organizationId}`.catch(() => []);
    healthCoverageDetected = Boolean(rows[0]?.prevoyanceRates);
  }

  return {
    employer: {
      name: organization.name,
      siret: organization.siret ?? "",
      address: organization.payrollAddress ?? "",
      postalCode: organization.payrollPostalCode ?? "",
      city: organization.payrollCity ?? "",
    },
    employee: {
      civility: employee.civility,
      firstName: employee.firstName,
      lastName: employee.lastName,
      address: profile?.employeeAddress ?? null,
      position: employee.position,
      category: employee.professionalCategory ? CATEGORY_LABELS[employee.professionalCategory] ?? null : null,
      hireDate: iso(employee.hireDate),
      exitDate: iso(employee.contractEndDate),
    },
    employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    finalBulletin: bulletin,
    finalPeriod: period,
    healthCoverageDetected,
  };
}
