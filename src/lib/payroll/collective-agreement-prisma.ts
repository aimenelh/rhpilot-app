import { prisma } from "@/lib/prisma";
import { resolveCollectiveAgreement, type CollectiveAgreementResolutionResult, type CollectiveAgreementRuleStatus, type CollectiveAgreementVersionStatus } from "./collective-agreement-resolver";
import { resolveApprenticeshipMinimum, resolveProfessionalisationMinimum } from "./alternance-minimum";
import { calculateAgeAtDate, resolveEmployeeAlternanceProfile } from "./alternance-profile";
import { resolveSmicMinimumFromPrisma } from "./minimum-wage-prisma";
import { evaluateCollectiveMinimumSalary } from "./collective-agreement-rule-engine";

function normalizeAgreementStatus(value: string): CollectiveAgreementVersionStatus { if (value === "VALIDATED") return "VALIDATED"; if (value === "ARCHIVED") return "ARCHIVED"; return "DRAFT"; }
function normalizeRuleStatus(value: string): CollectiveAgreementRuleStatus { if (value === "VALIDATED") return "VALIDATED"; if (value === "ARCHIVED") return "ARCHIVED"; return "DRAFT"; }

async function assertAlternanceMinimum(input: {
  organizationId: string; employeeId: string; periodDate: Date; payrollDepartment?: string | null;
  employee: { contractType: string | null; professionalCategory: string | null };
  profile: { baseSalaryCents: number | null; monthlyHours: unknown; classificationCode: string | null; collectiveAgreementId: string | null } | null;
  collectiveResolution: CollectiveAgreementResolutionResult;
}): Promise<void> {
  if (input.employee.contractType !== "APPRENTISSAGE" && input.employee.contractType !== "PROFESSIONNALISATION") return;
  const alternanceProfile = await resolveEmployeeAlternanceProfile({ organizationId: input.organizationId, employeeId: input.employeeId, periodDate: input.periodDate });
  if (!alternanceProfile) throw new Error(`Calcul bloqué pour le salarié ${input.employeeId} : le profil alternance versionné est manquant (date de naissance et données du contrat nécessaires au minimum légal).`);
  if (input.profile?.baseSalaryCents == null) throw new Error(`Calcul bloqué pour le salarié ${input.employeeId} : le salaire brut mensuel est requis pour contrôler le minimum alternance.`);
  const smicScope = input.payrollDepartment?.trim() === "976" ? "MAYOTTE" : "FRANCE_HORS_MAYOTTE";
  const smic = await resolveSmicMinimumFromPrisma({ periodDate: input.periodDate, scope: smicScope });
  if (!smic) throw new Error(`Calcul bloqué pour le salarié ${input.employeeId} : aucune version validée du SMIC n'est disponible pour le contrôle alternance (${smicScope}).`);
  const age = calculateAgeAtDate(alternanceProfile.birthDate, input.periodDate);
  let collectiveMinimumCents: number | null = null;
  if (input.collectiveResolution.status === "RESOLVED") {
    const collective = evaluateCollectiveMinimumSalary({ monthlyGrossCents: input.profile.baseSalaryCents, classificationCode: input.profile.classificationCode, professionalCategory: input.employee.professionalCategory, contractType: input.employee.contractType, parameters: input.collectiveResolution.rule.parameters });
    if (collective.status === "APPLICABLE") collectiveMinimumCents = collective.monthlyMinimumCents;
  }
  const result = input.employee.contractType === "APPRENTISSAGE"
    ? alternanceProfile.contractYear === null
      ? { status: "UNRESOLVED" as const, code: "MISSING_CONTRACT_YEAR", source: "APPRENTISSAGE_LEGAL" as const, explanation: "L'année d'exécution du contrat d'apprentissage est obligatoire." }
      : resolveApprenticeshipMinimum({ age, contractYear: alternanceProfile.contractYear, smicMonthlyCents: smic.monthlyGrossCentsAt35Hours, collectiveMinimumCents })
    : age >= 26
      ? resolveProfessionalisationMinimum({ age, hasBaccalaureateOrHigher: true, smicMonthlyCents: smic.monthlyGrossCentsAt35Hours, collectiveMinimumCents })
      : alternanceProfile.hasBaccalaureateOrHigher === null
        ? { status: "UNRESOLVED" as const, code: "MISSING_BACCALAUREATE_LEVEL", source: "PROFESSIONNALISATION_LEGAL" as const, explanation: "Le niveau de qualification est obligatoire pour déterminer le minimum de professionnalisation des moins de 26 ans." }
        : resolveProfessionalisationMinimum({ age, hasBaccalaureateOrHigher: alternanceProfile.hasBaccalaureateOrHigher, smicMonthlyCents: smic.monthlyGrossCentsAt35Hours, collectiveMinimumCents });
  if (result.status === "UNRESOLVED") throw new Error(`Calcul bloqué pour le salarié ${input.employeeId} : contrôle du minimum alternance non résolu (${result.code}). ${result.explanation}`);
  if (input.profile.baseSalaryCents < (result.monthlyMinimumCents ?? Number.POSITIVE_INFINITY)) throw new Error(`Calcul bloqué pour le salarié ${input.employeeId} : salaire brut mensuel ${input.profile.baseSalaryCents / 100} € inférieur au minimum alternance applicable ${((result.monthlyMinimumCents ?? 0) / 100).toFixed(2)} €. ${result.explanation}`);
}

async function resolvePayrollDepartment(organizationId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ payrollDepartment: string | null }>>`SELECT "payrollDepartment" FROM "organizations" WHERE "id" = ${organizationId} LIMIT 1`;
  return rows[0]?.payrollDepartment?.trim() || null;
}

export async function resolveCollectiveAgreementFromPrisma(input: { organizationId: string; employeeId: string; periodDate: Date; ruleCode: string }): Promise<CollectiveAgreementResolutionResult> {
  const [organization, profile, employee, payrollDepartment] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.organizationId }, select: { collectiveAgreementId: true } }),
    prisma.payrollProfile.findFirst({ where: { organizationId: input.organizationId, employeeId: input.employeeId, effectiveFrom: { lte: input.periodDate }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: input.periodDate } }] }, orderBy: { effectiveFrom: "desc" }, select: { collectiveAgreementId: true, baseSalaryCents: true, monthlyHours: true, classificationCode: true } }),
    prisma.employee.findFirst({ where: { id: input.employeeId, organizationId: input.organizationId, deletedAt: null }, select: { contractType: true, professionalCategory: true } }),
    resolvePayrollDepartment(input.organizationId),
  ]);
  if (!organization) return { status: "UNRESOLVED", code: "NO_COLLECTIVE_AGREEMENT", message: "Organisation introuvable pour la résolution conventionnelle." };
  const collectiveAgreementId = profile?.collectiveAgreementId ?? organization.collectiveAgreementId;
  if (!collectiveAgreementId) {
    const unresolved = resolveCollectiveAgreement({ organizationCollectiveAgreementId: null, employeeCollectiveAgreementId: null, periodDate: input.periodDate, ruleCode: input.ruleCode, versions: [], rules: [] });
    if (input.ruleCode === "MINIMUM_GROSS_MONTHLY" && employee) await assertAlternanceMinimum({ organizationId: input.organizationId, employeeId: input.employeeId, periodDate: input.periodDate, payrollDepartment, employee, profile, collectiveResolution: unresolved });
    return unresolved;
  }
  const [agreement, versions, rules] = await Promise.all([
    prisma.collectiveAgreement.findUnique({ where: { id: collectiveAgreementId }, select: { id: true, status: true } }),
    prisma.collectiveAgreementVersion.findMany({ where: { collectiveAgreementId }, select: { id: true, collectiveAgreementId: true, version: true, validFrom: true, validUntil: true, status: true } }),
    prisma.collectiveAgreementRule.findMany({ where: { version: { collectiveAgreementId }, code: input.ruleCode }, select: { id: true, versionId: true, code: true, parameters: true, validFrom: true, validUntil: true, status: true } }),
  ]);
  if (!agreement || agreement.status !== "ACTIVE") {
    const unresolved: CollectiveAgreementResolutionResult = { status: "UNRESOLVED", code: "NO_VALIDATED_VERSION", message: `La convention ${collectiveAgreementId} n'est pas active dans le référentiel.` };
    if (input.ruleCode === "MINIMUM_GROSS_MONTHLY" && employee) await assertAlternanceMinimum({ organizationId: input.organizationId, employeeId: input.employeeId, periodDate: input.periodDate, payrollDepartment, employee, profile, collectiveResolution: unresolved });
    return unresolved;
  }
  const resolution = resolveCollectiveAgreement({ organizationCollectiveAgreementId: organization.collectiveAgreementId, employeeCollectiveAgreementId: profile?.collectiveAgreementId, periodDate: input.periodDate, ruleCode: input.ruleCode, versions: versions.map((version) => ({ ...version, status: normalizeAgreementStatus(version.status) })), rules: rules.map((rule) => ({ ...rule, status: normalizeRuleStatus(rule.status) })) });
  if (input.ruleCode === "MINIMUM_GROSS_MONTHLY" && employee) await assertAlternanceMinimum({ organizationId: input.organizationId, employeeId: input.employeeId, periodDate: input.periodDate, payrollDepartment, employee, profile, collectiveResolution: resolution });
  return resolution;
}
