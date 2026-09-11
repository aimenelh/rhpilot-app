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
const NET_TAXABLE_RULE = "salarié . rémunération . net . imposable";
const NET_SOCIAL_RULE = "salarié . rémunération . montant net social";
const EMPLOYEE_CONTRIBUTIONS_RULE = "salarié . cotisations . salarié";
const EMPLOYER_CONTRIBUTIONS_RULE = "salarié . cotisations . employeur";
const GENERAL_CONTRIBUTION_BASE_RULE = "salarié . cotisations . assiette";

const DETAIL_RULES = [
  { code: "maladie_salarie", label: "Assurance maladie, maternité, invalidité, décès", rule: "salarié . cotisations . maladie . salarié", side: "EMPLOYEE", flat: false },
  { code: "sante_employeur", label: "Complémentaire santé — part employeur", rule: "salarié . cotisations . prévoyances . santé . employeur", side: "EMPLOYER", flat: true },
  { code: "atmp", label: "Accidents du travail et maladies professionnelles", rule: "salarié . cotisations . ATMP", side: "EMPLOYER", flat: false },
  { code: "vieillesse_plafonnee_salarie", label: "Assurance vieillesse plafonnée", rule: "salarié . cotisations . vieillesse . plafonnée . salarié", side: "EMPLOYEE", flat: false },
  { code: "vieillesse_deplafonnee_salarie", label: "Assurance vieillesse déplafonnée", rule: "salarié . cotisations . vieillesse . déplafonnée . salarié", side: "EMPLOYEE", flat: false },
  { code: "vieillesse_plafonnee_employeur", label: "Assurance vieillesse plafonnée", rule: "salarié . cotisations . vieillesse . plafonnée . employeur", side: "EMPLOYER", flat: false },
  { code: "vieillesse_deplafonnee_employeur", label: "Assurance vieillesse déplafonnée", rule: "salarié . cotisations . vieillesse . déplafonnée . employeur", side: "EMPLOYER", flat: false },
  { code: "retraite_complementaire_salarie", label: "Retraite complémentaire — part salarié", rule: "salarié . cotisations . retraite complémentaire-CEG-CET . salarié", side: "EMPLOYEE", flat: false },
  { code: "retraite_complementaire_employeur", label: "Retraite complémentaire — part employeur", rule: "salarié . cotisations . retraite complémentaire-CEG-CET . employeur", side: "EMPLOYER", flat: false },
  { code: "allocations_familiales", label: "Allocations familiales", rule: "salarié . cotisations . allocations familiales", side: "EMPLOYER", flat: false },
  { code: "assurance_chomage", label: "Assurance chômage", rule: "salarié . cotisations . chômage", side: "EMPLOYER", flat: false },
  { code: "apec_salarie", label: "APEC — part salarié", rule: "salarié . cotisations . APEC . salarié", side: "EMPLOYEE", flat: false },
  { code: "apec_employeur", label: "APEC — part employeur", rule: "salarié . cotisations . APEC . employeur", side: "EMPLOYER", flat: false },
  { code: "csg_deductible", label: "CSG déductible", rule: "salarié . cotisations . CSG-CRDS . CSG . déductible", side: "EMPLOYEE", flat: false },
  { code: "csg_non_deductible", label: "CSG/CRDS non déductible", rule: "salarié . cotisations . CSG-CRDS . sur revenus imposables non déductible", side: "EMPLOYEE", flat: false },
  { code: "csg_non_imposable", label: "CSG/CRDS sur revenus non imposables", rule: "salarié . cotisations . CSG-CRDS . sur revenus non imposables", side: "EMPLOYEE", flat: false },
  { code: "invalidite_deces_salarie", label: "Prévoyance incapacité, invalidité, décès — part salarié", rule: "salarié . cotisations . prévoyances . incapacité invalidité décès . salarié", side: "EMPLOYEE", flat: false },
  { code: "invalidite_deces_employeur", label: "Prévoyance incapacité, invalidité, décès — part employeur", rule: "salarié . cotisations . prévoyances . incapacité invalidité décès . employeur", side: "EMPLOYER", flat: false },
] as const;

const MODEL_DEFAULT_SITUATION: SocialPayrollSituation = {
  "salarié . cotisations . exonérations . JEI": "non",
  "entreprise . salariés . effectif . seuil": "'moins de 5'",
  "salarié . cotisations . ATMP . taux fonctions support": "non",
};

export const LEGAL_CATEGORIES = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"] as const;
export const CONTRACT_TYPES = ["CDI", "CDD", "apprentissage", "professionnalisation"] as const;

export type LegalCategory = (typeof LEGAL_CATEGORIES)[number];
export type SocialContractType = (typeof CONTRACT_TYPES)[number];
export type SocialPayrollSituation = Record<string, string | number | boolean | Date>;

export type SocialContributionDetail = {
  code: string;
  label: string;
  sourceRule: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount: number | null;
  rate: number | null;
};

export type SocialPayrollResult = {
  modelVersion: string;
  grossAmount: number;
  legalCategory: LegalCategory;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  netTaxableAmount: number;
  netSocialAmount: number;
  employerCost: number;
  contributionDetails: SocialContributionDetail[];
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
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Le modèle social n'a pas fourni une valeur numérique pour ${label}.`);
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertNoMissingVariables(evaluation: ReturnType<Engine["evaluate"]>, label: string): void {
  const missingVariables = Object.keys(evaluation.missingVariables ?? {});
  if (missingVariables.length === 0) return;
  if (evaluation.nodeValue !== undefined) return;
  throw new Error(`Le calcul social est bloqué : des données nécessaires manquent pour ${label} : ${missingVariables.join(", ")}.`);
}

function formatPublicodesDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getUTCFullYear()}`;
}

function evaluateContributionDetails(engine: Engine): SocialContributionDetail[] {
  return DETAIL_RULES.flatMap((detail): SocialContributionDetail[] => {
    const evaluation = engine.evaluate(detail.rule);
    assertNoMissingVariables(evaluation, detail.rule);
    if (evaluation.nodeValue === null || evaluation.nodeValue === undefined) return [];
    const amount = assertNumber(evaluation.nodeValue, detail.rule);
    if (amount === 0) return [];

    if (detail.flat) {
      const contribution: SocialContributionDetail = {
        code: detail.code,
        label: detail.label,
        sourceRule: detail.rule,
        side: detail.side,
        amount,
        baseAmount: amount,
        rate: null,
      };
      return [contribution];
    }

    const baseRule = detail.code === "atmp" ? GENERAL_CONTRIBUTION_BASE_RULE : `${detail.rule} . assiette`;
    const baseEvaluation = engine.evaluate(baseRule);
    const rateEvaluation = engine.evaluate(`${detail.rule} . taux`);
    assertNoMissingVariables(baseEvaluation, baseRule);
    assertNoMissingVariables(rateEvaluation, `${detail.rule} . taux`);
    const baseAmount = assertNumber(baseEvaluation.nodeValue, baseRule);
    const rate = assertNumber(rateEvaluation.nodeValue, `${detail.rule} . taux`);
    if (baseAmount < 0 || rate < 0 || rate > 1) throw new Error(`Le modèle social a fourni une assiette ou un taux invalide pour ${detail.rule}.`);

    const contribution: SocialContributionDetail = {
      code: detail.code,
      label: detail.label,
      sourceRule: detail.rule,
      side: detail.side,
      amount,
      baseAmount,
      rate,
    };
    return [contribution];
  });
}

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
  if (!Number.isFinite(input.grossAmount) || input.grossAmount < 0) throw new Error("Le brut doit être un montant positif ou nul.");
  if (!(input.calculationDate instanceof Date) || Number.isNaN(input.calculationDate.getTime())) throw new Error("Le calcul social est bloqué : la date de calcul est absente ou invalide.");
  if (!(input.companyCreationDate instanceof Date) || Number.isNaN(input.companyCreationDate.getTime())) throw new Error("Le calcul social est bloqué : la date de création de l'entreprise est absente ou invalide.");
  if (!(input.hireDate instanceof Date) || Number.isNaN(input.hireDate.getTime())) throw new Error("Le calcul social est bloqué : la date d'embauche est absente ou invalide.");
  if (typeof input.executiveStatus !== "boolean") throw new Error("Le calcul social est bloqué : le statut cadre est absent ou invalide.");
  if (!Number.isFinite(input.healthPlanMonthlyAmount) || input.healthPlanMonthlyAmount <= 0) throw new Error("Le calcul social est bloqué : le montant mensuel de la complémentaire santé est absent ou invalide.");
  if (!Number.isFinite(input.healthPlanEmployerRate) || input.healthPlanEmployerRate < 50 || input.healthPlanEmployerRate > 100) throw new Error("Le calcul social est bloqué : la part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.");

  const legalCategory = assertLegalCategory(input.legalCategory);
  const contractType = assertContractType(input.contractType);
  const engine = new Engine(socialRules);
  engine.setSituation({
    ...MODEL_DEFAULT_SITUATION,
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
  const netTaxableEvaluation = engine.evaluate(NET_TAXABLE_RULE);
  assertNoMissingVariables(netTaxableEvaluation, NET_TAXABLE_RULE);
  const netSocialEvaluation = engine.evaluate(NET_SOCIAL_RULE);
  assertNoMissingVariables(netSocialEvaluation, NET_SOCIAL_RULE);
  const employeeContributionsEvaluation = engine.evaluate(EMPLOYEE_CONTRIBUTIONS_RULE);
  assertNoMissingVariables(employeeContributionsEvaluation, EMPLOYEE_CONTRIBUTIONS_RULE);
  const employerContributionsEvaluation = engine.evaluate(EMPLOYER_CONTRIBUTIONS_RULE);
  assertNoMissingVariables(employerContributionsEvaluation, EMPLOYER_CONTRIBUTIONS_RULE);

  const netBeforeTax = assertNumber(netBeforeTaxEvaluation.nodeValue, NET_BEFORE_TAX_RULE);
  const netTaxableAmount = assertNumber(netTaxableEvaluation.nodeValue, NET_TAXABLE_RULE);
  const netSocialAmount = assertNumber(netSocialEvaluation.nodeValue, NET_SOCIAL_RULE);
  const employeeContributions = assertNumber(employeeContributionsEvaluation.nodeValue, EMPLOYEE_CONTRIBUTIONS_RULE);
  const employerContributions = assertNumber(employerContributionsEvaluation.nodeValue, EMPLOYER_CONTRIBUTIONS_RULE);
  const contributionDetails = evaluateContributionDetails(engine);

  return {
    modelVersion: SOCIAL_MODEL_VERSION,
    grossAmount: Math.round((input.grossAmount + Number.EPSILON) * 100) / 100,
    legalCategory,
    employeeContributions,
    employerContributions,
    netBeforeTax,
    netTaxableAmount,
    netSocialAmount,
    employerCost: Math.round((input.grossAmount + employerContributions + Number.EPSILON) * 100) / 100,
    contributionDetails,
  };
}
