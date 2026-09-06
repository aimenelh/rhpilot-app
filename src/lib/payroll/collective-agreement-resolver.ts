export type CollectiveAgreementVersionStatus = "DRAFT" | "VALIDATED" | "ARCHIVED";
export type CollectiveAgreementRuleStatus = "DRAFT" | "VALIDATED" | "ARCHIVED";

export interface CollectiveAgreementVersionRef {
  id: string;
  collectiveAgreementId: string;
  version: number;
  validFrom: Date;
  validUntil?: Date | null;
  status: CollectiveAgreementVersionStatus;
}

export interface CollectiveAgreementRuleRef {
  id: string;
  versionId: string;
  code: string;
  validFrom: Date;
  validUntil?: Date | null;
  status: CollectiveAgreementRuleStatus;
}

export interface CollectiveAgreementResolutionInput {
  organizationCollectiveAgreementId?: string | null;
  employeeCollectiveAgreementId?: string | null;
  periodDate: Date;
  ruleCode: string;
  versions: CollectiveAgreementVersionRef[];
  rules: CollectiveAgreementRuleRef[];
}

export interface CollectiveAgreementResolution {
  status: "RESOLVED";
  collectiveAgreementId: string;
  version: CollectiveAgreementVersionRef;
  rule: CollectiveAgreementRuleRef;
}

export type CollectiveAgreementResolutionFailureCode =
  | "NO_COLLECTIVE_AGREEMENT"
  | "NO_VALIDATED_VERSION"
  | "NO_VALIDATED_RULE";

export interface CollectiveAgreementResolutionFailure {
  status: "UNRESOLVED";
  code: CollectiveAgreementResolutionFailureCode;
  message: string;
}

export type CollectiveAgreementResolutionResult =
  | CollectiveAgreementResolution
  | CollectiveAgreementResolutionFailure;

function isDateInRange(date: Date, validFrom: Date, validUntil?: Date | null): boolean {
  const time = date.getTime();
  return (
    time >= validFrom.getTime() &&
    (validUntil == null || time <= validUntil.getTime())
  );
}

/**
 * Résout la convention applicable à une période donnée sans jamais utiliser
 * une version ou une règle non validée.
 *
 * Priorité actuelle : convention du profil salarié > convention de
 * l'organisation. Les accords d'entreprise/établissement seront ajoutés
 * dans une couche de priorité dédiée lorsqu'ils seront modélisés.
 */
export function resolveCollectiveAgreement(
  input: CollectiveAgreementResolutionInput,
): CollectiveAgreementResolutionResult {
  if (!Number.isFinite(input.periodDate.getTime())) {
    throw new Error("La date de période de paie est invalide.");
  }

  const collectiveAgreementId =
    input.employeeCollectiveAgreementId ?? input.organizationCollectiveAgreementId ?? null;

  if (!collectiveAgreementId) {
    return {
      status: "UNRESOLVED",
      code: "NO_COLLECTIVE_AGREEMENT",
      message: "Aucune convention collective applicable n'est configurée pour ce salarié.",
    };
  }

  const candidateVersions = input.versions
    .filter(
      (version) =>
        version.collectiveAgreementId === collectiveAgreementId &&
        version.status === "VALIDATED" &&
        isDateInRange(input.periodDate, version.validFrom, version.validUntil),
    )
    .sort((a, b) => b.version - a.version);

  const version = candidateVersions[0];
  if (!version) {
    return {
      status: "UNRESOLVED",
      code: "NO_VALIDATED_VERSION",
      message: `Aucune version validée de la convention ${collectiveAgreementId} n'est applicable à cette date.`,
    };
  }

  const ruleCandidates = input.rules
    .filter(
      (rule) =>
        rule.versionId === version.id &&
        rule.code === input.ruleCode &&
        rule.status === "VALIDATED" &&
        isDateInRange(input.periodDate, rule.validFrom, rule.validUntil),
    )
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());

  const rule = ruleCandidates[0];
  if (!rule) {
    return {
      status: "UNRESOLVED",
      code: "NO_VALIDATED_RULE",
      message: `La règle conventionnelle ${input.ruleCode} n'est pas disponible et validée pour la période demandée.`,
    };
  }

  return {
    status: "RESOLVED",
    collectiveAgreementId,
    version,
    rule,
  };
}
