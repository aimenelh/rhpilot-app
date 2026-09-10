import type { AlternanceMinimumResult } from "./alternance-minimum";

export type AlternanceMinimumSnapshot = {
  status: AlternanceMinimumResult["status"];
  source: AlternanceMinimumResult["source"];
  code: string | null;
  explanation: string;
  age: number;
  contractYear: 1 | 2 | 3 | null;
  hasBaccalaureateOrHigher: boolean | null;
  smicMonthlyCents: number;
  smicScope: "FRANCE_HORS_MAYOTTE" | "MAYOTTE";
  legalMinimumCents: number | null;
  collectiveMinimumCents: number | null;
  applicableMinimumCents: number | null;
  percentageOfSmic: number | null;
  baseSalaryCents: number;
  profileValidFrom: string;
  profileValidUntil: string | null;
  profileSource: string;
  profileSourceReference: string | null;
};

/**
 * Construit une preuve immuable des données ayant servi au contrôle du
 * minimum alternance. Cette structure est destinée au snapshot de calcul :
 * elle ne recalcule aucune règle et ne dépend pas de la base de données.
 */
export function buildAlternanceMinimumSnapshot(input: {
  result: AlternanceMinimumResult;
  age: number;
  contractYear: 1 | 2 | 3 | null;
  hasBaccalaureateOrHigher: boolean | null;
  smicMonthlyCents: number;
  smicScope: "FRANCE_HORS_MAYOTTE" | "MAYOTTE";
  collectiveMinimumCents: number | null;
  baseSalaryCents: number;
  profileValidFrom: Date;
  profileValidUntil: Date | null;
  profileSource: string;
  profileSourceReference: string | null;
  legalMinimumCents: number | null;
}): AlternanceMinimumSnapshot {
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 100) throw new Error("L'âge du snapshot alternance est invalide.");
  if (!Number.isInteger(input.baseSalaryCents) || input.baseSalaryCents < 0) throw new Error("Le salaire brut du snapshot alternance est invalide.");
  if (!Number.isFinite(input.smicMonthlyCents) || input.smicMonthlyCents <= 0) throw new Error("Le SMIC du snapshot alternance est invalide.");
  if (!Number.isFinite(input.collectiveMinimumCents ?? 0) || (input.collectiveMinimumCents ?? 0) < 0) throw new Error("Le minimum conventionnel du snapshot alternance est invalide.");
  if (input.legalMinimumCents !== null && (!Number.isFinite(input.legalMinimumCents) || input.legalMinimumCents < 0)) throw new Error("Le minimum légal du snapshot alternance est invalide.");
  if (!Number.isFinite(input.profileValidFrom.getTime())) throw new Error("La date de début du profil alternance est invalide.");
  if (input.profileValidUntil && !Number.isFinite(input.profileValidUntil.getTime())) throw new Error("La date de fin du profil alternance est invalide.");

  const applicableMinimumCents = input.result.status === "APPLICABLE" ? input.result.monthlyMinimumCents ?? null : null;

  return {
    status: input.result.status,
    source: input.result.source,
    code: input.result.code ?? null,
    explanation: input.result.explanation,
    age: input.age,
    contractYear: input.contractYear,
    hasBaccalaureateOrHigher: input.hasBaccalaureateOrHigher,
    smicMonthlyCents: input.smicMonthlyCents,
    smicScope: input.smicScope,
    legalMinimumCents: input.legalMinimumCents,
    collectiveMinimumCents: input.collectiveMinimumCents,
    applicableMinimumCents,
    percentageOfSmic: input.result.percentageOfSmic ?? null,
    baseSalaryCents: input.baseSalaryCents,
    profileValidFrom: input.profileValidFrom.toISOString(),
    profileValidUntil: input.profileValidUntil?.toISOString() ?? null,
    profileSource: input.profileSource,
    profileSourceReference: input.profileSourceReference,
  };
}
