import { prisma } from "@/lib/prisma";
import {
  resolveCollectiveAgreement,
  type CollectiveAgreementResolutionResult,
  type CollectiveAgreementRuleStatus,
  type CollectiveAgreementVersionStatus,
} from "./collective-agreement-resolver";

function normalizeAgreementStatus(value: string): CollectiveAgreementVersionStatus {
  if (value === "VALIDATED") return "VALIDATED";
  if (value === "ARCHIVED") return "ARCHIVED";
  return "DRAFT";
}

function normalizeRuleStatus(value: string): CollectiveAgreementRuleStatus {
  if (value === "VALIDATED") return "VALIDATED";
  if (value === "ARCHIVED") return "ARCHIVED";
  return "DRAFT";
}

/**
 * Résolution conventionnelle depuis les données persistées.
 *
 * Cette couche ne calcule aucune règle sociale : elle sélectionne uniquement
 * la convention, sa version et sa règle déjà validées et applicables à la
 * date de paie. En cas d'incertitude, le résultat reste UNRESOLVED.
 */
export async function resolveCollectiveAgreementFromPrisma(input: {
  organizationId: string;
  employeeId: string;
  periodDate: Date;
  ruleCode: string;
}): Promise<CollectiveAgreementResolutionResult> {
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
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: input.periodDate } },
        ],
      },
      orderBy: { effectiveFrom: "desc" },
      select: { collectiveAgreementId: true },
    }),
  ]);

  if (!organization) {
    return {
      status: "UNRESOLVED",
      code: "NO_COLLECTIVE_AGREEMENT",
      message: "Organisation introuvable pour la résolution conventionnelle.",
    };
  }

  const collectiveAgreementId =
    profile?.collectiveAgreementId ?? organization.collectiveAgreementId;

  if (!collectiveAgreementId) {
    return resolveCollectiveAgreement({
      organizationCollectiveAgreementId: null,
      employeeCollectiveAgreementId: null,
      periodDate: input.periodDate,
      ruleCode: input.ruleCode,
      versions: [],
      rules: [],
    });
  }

  const [agreement, versions, rules] = await Promise.all([
    prisma.collectiveAgreement.findUnique({
      where: { id: collectiveAgreementId },
      select: { id: true, status: true },
    }),
    prisma.collectiveAgreementVersion.findMany({
      where: { collectiveAgreementId },
      select: {
        id: true,
        collectiveAgreementId: true,
        version: true,
        validFrom: true,
        validUntil: true,
        status: true,
      },
    }),
    prisma.collectiveAgreementRule.findMany({
      where: {
        version: { collectiveAgreementId },
        code: input.ruleCode,
      },
      select: {
        id: true,
        versionId: true,
        code: true,
        validFrom: true,
        validUntil: true,
        status: true,
      },
    }),
  ]);

  if (!agreement || agreement.status !== "ACTIVE") {
    return {
      status: "UNRESOLVED",
      code: "NO_VALIDATED_VERSION",
      message: `La convention ${collectiveAgreementId} n'est pas active dans le référentiel.`,
    };
  }

  return resolveCollectiveAgreement({
    organizationCollectiveAgreementId: organization.collectiveAgreementId,
    employeeCollectiveAgreementId: profile?.collectiveAgreementId,
    periodDate: input.periodDate,
    ruleCode: input.ruleCode,
    versions: versions.map((version) => ({
      ...version,
      status: normalizeAgreementStatus(version.status),
    })),
    rules: rules.map((rule) => ({
      ...rule,
      status: normalizeRuleStatus(rule.status),
    })),
  });
}
