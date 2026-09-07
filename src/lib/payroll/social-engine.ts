import Engine from "publicodes";
import socialRules from "modele-social";

export const SOCIAL_MODEL_VERSION = "11.1.0";

const GROSS_RULE = "salarié . contrat . salaire brut";
const LEGAL_CATEGORY_RULE = "entreprise . catégorie juridique";
const NET_BEFORE_TAX_RULE = "salarié . rémunération . net . à payer avant impôt";
const EMPLOYEE_CONTRIBUTIONS_RULE = "salarié . cotisations . salarié";
const EMPLOYER_CONTRIBUTIONS_RULE = "salarié . cotisations . employeur";

export const LEGAL_CATEGORIES = [
  "EI",
  "SARL",
  "SAS",
  "SELARL",
  "SELAS",
  "association",
  "autre",
] as const;

export type LegalCategory = (typeof LEGAL_CATEGORIES)[number];
export type SocialPayrollSituation = Record<string, string | number | boolean>;

export type SocialPayrollResult = {
  modelVersion: string;
  grossAmount: number;
  legalCategory: LegalCategory;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  employerCost: number;
};

function assertLegalCategory(value: string): LegalCategory {
  if ((LEGAL_CATEGORIES as readonly string[]).includes(value)) {
    return value as LegalCategory;
  }
  throw new Error(
    "Le calcul social est bloqué : la forme juridique de l'organisation est absente ou invalide.",
  );
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Le modèle social n'a pas fourni une valeur numérique pour ${label}.`);
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertNoMissingVariables(
  evaluation: ReturnType<Engine["evaluate"]>,
  label: string,
): void {
  const missingVariables = Object.keys(evaluation.missingVariables ?? {});
  if (missingVariables.length === 0) return;

  throw new Error(
    `Le calcul social est bloqué : des données nécessaires manquent pour ${label} : ${missingVariables.join(", ")}.`,
  );
}

/**
 * Point d'entrée unique vers le modèle social officiel publié par Mon-entreprise.
 *
 * RH Pilot fournit explicitement la situation de l'organisation et du salarié.
 * La forme juridique est transmise à Publicodes sans être déduite du nom,
 * du SIRET ou d'une autre donnée indirecte.
 */
export function calculateSocialPayroll(input: {
  grossAmount: number;
  legalCategory: string;
  situation?: SocialPayrollSituation;
}): SocialPayrollResult {
  if (!Number.isFinite(input.grossAmount) || input.grossAmount < 0) {
    throw new Error("Le brut doit être un montant positif ou nul.");
  }

  const legalCategory = assertLegalCategory(input.legalCategory);
  const engine = new Engine(socialRules);
  engine.setSituation({
    [GROSS_RULE]: `${input.grossAmount} €/mois`,
    [LEGAL_CATEGORY_RULE]: `'${legalCategory}'`,
    ...(input.situation ?? {}),
  });

  const netBeforeTaxEvaluation = engine.evaluate(NET_BEFORE_TAX_RULE);
  assertNoMissingVariables(netBeforeTaxEvaluation, NET_BEFORE_TAX_RULE);

  const employeeContributionsEvaluation = engine.evaluate(EMPLOYEE_CONTRIBUTIONS_RULE);
  assertNoMissingVariables(employeeContributionsEvaluation, EMPLOYEE_CONTRIBUTIONS_RULE);

  const employerContributionsEvaluation = engine.evaluate(EMPLOYER_CONTRIBUTIONS_RULE);
  assertNoMissingVariables(employerContributionsEvaluation, EMPLOYER_CONTRIBUTIONS_RULE);

  const netBeforeTax = assertNumber(netBeforeTaxEvaluation.nodeValue, NET_BEFORE_TAX_RULE);
  const employeeContributions = assertNumber(
    employeeContributionsEvaluation.nodeValue,
    EMPLOYEE_CONTRIBUTIONS_RULE,
  );
  const employerContributions = assertNumber(
    employerContributionsEvaluation.nodeValue,
    EMPLOYER_CONTRIBUTIONS_RULE,
  );

  return {
    modelVersion: SOCIAL_MODEL_VERSION,
    grossAmount: Math.round((input.grossAmount + Number.EPSILON) * 100) / 100,
    legalCategory,
    employeeContributions,
    employerContributions,
    netBeforeTax,
    employerCost: Math.round(
      (input.grossAmount + employerContributions + Number.EPSILON) * 100,
    ) / 100,
  };
}
