import { prisma } from "@/lib/prisma";
import type { AbsencePayrollTreatmentRule } from "./absence-payroll-treatment";

const ABSENCE_RULE_PREFIX = "PAYROLL_ABSENCE_";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateInRange(date: Date, validFrom: Date, validUntil: Date | null): boolean {
  const time = date.getTime();
  return time >= validFrom.getTime() && (validUntil === null || time <= validUntil.getTime());
}

function parseTreatment(parameters: unknown, fallbackRuleVersionId: string, absenceType: string): AbsencePayrollTreatmentRule | null {
  if (!isRecord(parameters)) return null;

  const effect = parameters.effect === "ADD_TO_GROSS" || parameters.effect === "SUBTRACT_FROM_GROSS" || parameters.effect === "EXCLUDE_FROM_GROSS"
    ? parameters.effect
    : null;
  const basis = parameters.basis === "NONE" || parameters.basis === "CALENDAR_DAYS" || parameters.basis === "WORKING_DAYS" || parameters.basis === "WORKED_HOURS" || parameters.basis === "RULE_DEFINED"
    ? parameters.basis
    : null;
  const divisor = parameters.divisor === undefined ? undefined : typeof parameters.divisor === "number" ? parameters.divisor : null;
  const rate = parameters.rate === undefined ? undefined : typeof parameters.rate === "number" ? parameters.rate : null;
  const declaredRuleVersionId = typeof parameters.ruleVersionId === "string" && parameters.ruleVersionId.trim()
    ? parameters.ruleVersionId.trim()
    : fallbackRuleVersionId;

  if (!effect || !basis || divisor === null || rate === null) return null;
  if (divisor !== undefined && (!Number.isFinite(divisor) || divisor <= 0)) return null;
  if (rate !== undefined && (!Number.isFinite(rate) || rate < 0 || rate > 1)) return null;

  return {
    absenceType,
    effect,
    basis,
    ruleVersionId: declaredRuleVersionId,
    ...(divisor !== undefined ? { divisor } : {}),
    ...(rate !== undefined ? { rate } : {}),
  };
}

/**
 * Résout une règle d'impact paie propre à la convention collective du salarié.
 *
 * La convention du profil salarié est prioritaire sur celle de l'organisation,
 * puis seule une version/règle VALIDATED et applicable à la date de période
 * peut être utilisée. Les paramètres restent des données de référentiel :
 * aucune valeur métier n'est déduite ici.
 */
export async function resolveCollectiveAgreementAbsenceTreatment(input: {
  organizationId: string;
  employeeId: string;
  periodDate: Date;
  absenceType: string;
  fallbackRuleVersionId: string;
}): Promise<AbsencePayrollTreatmentRule | null> {
  const [organization, profile] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { collectiveAgreementId: true },
    }),
    prisma.payrollProfile.findFirst({
      where: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        effectiveFrom: { lte: input.periodDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: input.periodDate } }],
      },
      orderBy: { effectiveFrom: "desc" },
      select: { collectiveAgreementId: true },
    }),
  ]);

  const collectiveAgreementId = profile?.collectiveAgreementId ?? organization?.collectiveAgreementId;
  if (!collectiveAgreementId) return null;

  const versionCandidates = await prisma.collectiveAgreementVersion.findMany({
    where: {
      collectiveAgreementId,
      status: "VALIDATED",
      validFrom: { lte: input.periodDate },
      OR: [{ validUntil: null }, { validUntil: { gte: input.periodDate } }],
    },
    select: { id: true, validFrom: true, validUntil: true, version: true },
    orderBy: { version: "desc" },
  });

  const version = versionCandidates.find((candidate) =>
    isDateInRange(input.periodDate, candidate.validFrom, candidate.validUntil),
  );
  if (!version) return null;

  const rule = await prisma.collectiveAgreementRule.findFirst({
    where: {
      versionId: version.id,
      code: `${ABSENCE_RULE_PREFIX}${input.absenceType}`,
      status: "VALIDATED",
      validFrom: { lte: input.periodDate },
      OR: [{ validUntil: null }, { validUntil: { gte: input.periodDate } }],
    },
    orderBy: { validFrom: "desc" },
    select: { id: true, parameters: true },
  });

  if (!rule) return null;

  return parseTreatment(rule.parameters, input.fallbackRuleVersionId, input.absenceType);
}

export const ABSENCE_COLLECTIVE_RULE_PREFIX = ABSENCE_RULE_PREFIX;
