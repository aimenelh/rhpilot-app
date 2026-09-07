import Engine from "publicodes";
import socialRules from "modele-social";

export const SOCIAL_MODEL_VERSION = "11.1.0";

const GROSS_RULE = "salarié . contrat . salaire brut";
const LEGAL_CATEGORY_RULE = "entreprise . catégorie juridique";
const DATE_RULE = "date";
const CREATION_DATE_RULE = "entreprise . date de création";
const CONTRACT_RULE = "salarié . contrat";
const HIRE_DATE_RULE = "salarié . contrat . date d'embauche";
const EXECUTIVE_STATUS_RULE = "salarié . contrat . statut cadre";
const HEALTH_PLAN_RULE = "salarié . cotisations . prévoyances . santé . montant";
const HEALTH_EMPLOYER_RATE_RULE = "salarié . cotisations . prévoyances . santé . taux employeur";
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

export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "apprentissage",
  "professionnalisation",
] as const;

export type LegalCategory = (typeof LEGAL_CATEGORIES)[number];
export type SocialContractType = (typeof CONTRACT_TYPES)[number];
export type SocialPayrollSituation = Record<string, string | number | boolean | Date>;

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
  if ((LEGAL_CATEGORIES as readonly string[]).includes(value)) return value as LegalCategory;
  throw new Error("Le calcul social est bloqué : la forme juridique de l'organisation est absente ou invalide.");
}

function assertContractType(value: string): SocialContractType {
  if ((CONTRACT_TYPES as readonly string[]).includes(value)) return value as SocialContractType;
  throw new Error("Le calcul social est bloqué : le type de contrat est absent ou invalide.");
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Le modèle social n'a pas fourni une valeur numérique pour ${label}.`);
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertNoMissingVariables(evaluation: ReturnType<Engine["evaluate"]>, label: string): void {
  const missingVariables = Object.keys(evaluation.missingVariables ?? {});
  if (missingVariables.length === 0) return;
  throw new Error(`Le calcul social est bloqué : des données nécessaires manquent pour ${label} : ${missingVariables.join(", ")}.`);
}

function formatPublicodesDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getUTCFullYear()}`;
}

/**
 * Point d'entrée unique vers le modèle social officiel publié par Mon-entreprise.
 * RH Pilot fournit explicitement la forme juridique, la date de calcul, la
 * date de création, le contexte contractuel et la complémentaire santé déjà
 * présents dans le dossier. Aucun défaut métier n'est injecté par RH Pilot.
 */
export function calculateSocialPayroll(input: {
  grossAmount: number;
  legalCategory: string;
  calculationDate: Date;
  companyCreationDate: Date;
  contractType: string;
  hireDate: Date;
  executiveStatus: boolean;
  healthPlanMonthlyAmount: number;
  healthPlanEmployerRate: number;
  situation?: SocialPayrollSituation;
}): SocialPayrollResult {
  if (!Number.isFinite(input.grossAmount) || input.grossAmount < 0) {
    throw new Error("Le brut doit être un montant positif ou nul.");
  }
  if (!(input.calculationDate instanceof Date) || Number.isNaN(input.calculationDate.getTime())) {
    throw new Error("Le calcul social est bloqué : la date de calcul est absente ou invalide.");
  }
  if (!(input.companyCreationDate instanceof Date) || Number.isNaN(input.companyCreationDate.getTime())) {
    throw new Error("Le calcul social est bloqué : la date de création de l'entreprise est absente ou invalide.");
  }
  if (!(input.hireDate instanceof Date) || Number.isNaN(input.hireDate.getTime())) {
    throw new Error("Le calcul social est bloqué : la date d'embauche est absente ou invalide.");
  }
  if (typeof input.executiveStatus !== "boolean") {
    throw new Error("Le calcul social est bloqué : le statut cadre est absent ou invalide.");
  }
  if (!Number.isFinite(input.healthPlanMonthlyAmount) || input.healthPlanMonthlyAmount <= 0) {
    throw new Error("Le calcul social est bloqué : le montant mensuel de la complémentaire santé est absent ou invalide.");
  }
  if (!Number.isFinite(input.healthPlanEmployerRate) || input.healthPlanEmployerRate < 50 || input.healthPlanEmployerRate > 100) {
    throw new Error("Le calcul social est bloqué : la part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.");
  }

  const legalCategory = assertLegalCategory(input.legalCategory);
  const contractType = assertContractType(input.contractType);
  const engine = new Engine(socialRules);
  engine.setSituation({
    [GROSS_RULE]: `${input.grossAmount} €/mois`,
    [LEGAL_CATEGORY_RULE]: `'${legalCategory}'`,
    [DATE_RULE]: formatPublicodesDate(input.calculationDate),
    [CREATION_DATE_RULE]: formatPublicodesDate(input.companyCreationDate),
    [CONTRACT_RULE]: `'${contractType}'`,
    [HIRE_DATE_RULE]: formatPublicodesDate(input.hireDate),
    [EXECUTIVE_STATUS_RULE]: input.executiveStatus ? "oui" : "non",
    [HEALTH_PLAN_RULE]: `${input.healthPlanMonthlyAmount} €/mois`,
    [HEALTH_EMPLOYER_RATE_RULE]: `${input.healthPlanEmployerRate}%`,
    ...(input.situation ?? {}),
  });

  const netBeforeTaxEvaluation = engine.evaluate(NET_BEFORE_TAX_RULE);
  assertNoMissingVariables(netBeforeTaxEvaluation, NET_BEFORE_TAX_RULE);
  const employeeContributionsEvaluation = engine.evaluate(EMPLOYEE_CONTRIBUTIONS_RULE);
  assertNoMissingVariables(employeeContributionsEvaluation, EMPLOYEE_CONTRIBUTIONS_RULE);
  const employerContributionsEvaluation = engine.evaluate(EMPLOYER_CONTRIBUTIONS_RULE);
  assertNoMissingVariables(employerContributionsEvaluation, EMPLOYER_CONTRIBUTIONS_RULE);

  const netBeforeTax = assertNumber(netBeforeTaxEvaluation.nodeValue, NET_BEFORE_TAX_RULE);
  const employeeContributions = assertNumber(employeeContributionsEvaluation.nodeValue, EMPLOYEE_CONTRIBUTIONS_RULE);
  const employerContributions = assertNumber(employerContributionsEvaluation.nodeValue, EMPLOYER_CONTRIBUTIONS_RULE);

  return {
    modelVersion: SOCIAL_MODEL_VERSION,
    grossAmount: Math.round((input.grossAmount + Number.EPSILON) * 100) / 100,
    legalCategory,
    employeeContributions,
    employerContributions,
    netBeforeTax,
    employerCost: Math.round((input.grossAmount + employerContributions + Number.EPSILON) * 100) / 100,
  };
}
