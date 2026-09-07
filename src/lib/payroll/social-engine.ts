import Engine from "publicodes";
import socialRules from "modele-social";

export const SOCIAL_MODEL_VERSION = "11.1.0";

const GROSS_RULE = "salarié . contrat . salaire brut";
const NET_BEFORE_TAX_RULE = "salarié . rémunération . net . à payer avant impôt";
const EMPLOYEE_CONTRIBUTIONS_RULE = "salarié . cotisations . salarié";
const EMPLOYER_CONTRIBUTIONS_RULE = "salarié . cotisations . employeur";

export type SocialPayrollSituation = Record<string, string | number | boolean>;

export type SocialPayrollResult = {
  modelVersion: string;
  grossAmount: number;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  employerCost: number;
};

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
 * Le moteur Publicodes porte les règles sociales et leurs évolutions. RH Pilot
 * lui fournit uniquement la situation du salarié et conserve la version du
 * modèle utilisée pour assurer la traçabilité du calcul.
 */
export function calculateSocialPayroll(input: {
  grossAmount: number;
  situation?: SocialPayrollSituation;
}): SocialPayrollResult {
  if (!Number.isFinite(input.grossAmount) || input.grossAmount < 0) {
    throw new Error("Le brut doit être un montant positif ou nul.");
  }

  const engine = new Engine(socialRules);
  engine.setSituation({
    [GROSS_RULE]: `${input.grossAmount} €/mois`,
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
    employeeContributions,
    employerContributions,
    netBeforeTax,
    employerCost: Math.round(
      (input.grossAmount + employerContributions + Number.EPSILON) * 100,
    ) / 100,
  };
}
