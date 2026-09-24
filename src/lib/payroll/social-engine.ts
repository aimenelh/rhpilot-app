import Engine from "publicodes";
import socialRules from "modele-social";

export const SOCIAL_MODEL_VERSION = "11.1.0";

// Le modèle signale ses règles expérimentales à chaque évaluation : on garde
// seulement les erreurs dans les journaux.
const SILENT_LOGGER = { log: () => undefined, warn: () => undefined, error: (message: string) => console.error(message) };

// Analyser les règles du modèle prend environ 300 ms ; une copie légère du moteur
// déjà analysé en prend 30 et donne les mêmes résultats. Chaque calcul part d'une
// copie neuve : aucune situation ne passe d'un salarié à l'autre.
let parsedEngine: Engine | null = null;
function freshEngine(): Engine {
  parsedEngine ??= new Engine(socialRules, { logger: SILENT_LOGGER });
  return parsedEngine.shallowCopy();
}

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
const PRORATED_SOCIAL_SECURITY_CEILING_RULE = "salarié . temps de travail . plafond sécurité sociale";
const CSG_BASE_RULE = "salarié . cotisations . CSG-CRDS . assiette de base";
const RGDU_RULE = "salarié . cotisations . exonérations . RGDU";
const RGDU_COEFFICIENT_RULE = "salarié . cotisations . exonérations . RGDU . coefficient";
const WORKING_TIME_RULE = "salarié . temps de travail";
const RGDU_SMIC_RULE = "salarié . temps de travail . SMIC";

/**
 * Smic retenu pour la RGDU quand un texte le fige pour l'année.
 * Décret n° 2026-509 du 12 juin 2026 : toute l'année 2026 se calcule avec le Smic
 * du 1er janvier (12,02 €/h), même après la revalorisation du 1er juin (12,31 €/h).
 * Le modèle social 11.1.0 applique encore 12,31 €/h à partir de juin.
 */
const RGDU_FROZEN_SMIC: ReadonlyArray<{ year: number; hourly: number; source: string }> = [
  { year: 2026, hourly: 12.02, source: "Décret n° 2026-509 du 12 juin 2026" },
];

type DetailRule = {
  code: string;
  label: string;
  rule: string;
  side: "EMPLOYEE" | "EMPLOYER";
  flat: boolean;
  baseRule?: string;
  baseCapMultiplier?: number;
  rateRule?: string;
  /** Taux exprimé directement en fraction par le modèle (coefficient sans unité). */
  fractionRateRule?: string;
  /** Réduction de cotisations : le modèle donne un montant positif, le bulletin l'affiche en négatif. */
  reduction?: boolean;
};

const DETAIL_RULES: readonly DetailRule[] = [
  { code: "maladie_salarie", label: "Assurance maladie, maternité, invalidité, décès", rule: "salarié . cotisations . maladie . salarié", side: "EMPLOYEE", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, rateRule: "salarié . cotisations . maladie . salarié . taux" },
  { code: "maladie_employeur", label: "Assurance maladie, maternité, invalidité, décès — part employeur", rule: "salarié . cotisations . maladie . employeur", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, rateRule: "salarié . cotisations . maladie . employeur . taux" },
  { code: "sante_salarie", label: "Complémentaire santé — part salarié", rule: "salarié . cotisations . prévoyances . santé . salarié", side: "EMPLOYEE", flat: true },
  { code: "sante_employeur", label: "Complémentaire santé — part employeur", rule: "salarié . cotisations . prévoyances . santé . employeur", side: "EMPLOYER", flat: true },
  { code: "atmp", label: "Accidents du travail et maladies professionnelles", rule: "salarié . cotisations . ATMP", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, rateRule: "salarié . cotisations . ATMP . taux" },
  { code: "vieillesse_plafonnee_salarie", label: "Assurance vieillesse plafonnée", rule: "salarié . cotisations . vieillesse . plafonnée . salarié", side: "EMPLOYEE", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, baseCapMultiplier: 1, rateRule: "salarié . cotisations . vieillesse . salarié . plafonnée . taux" },
  { code: "vieillesse_deplafonnee_salarie", label: "Assurance vieillesse déplafonnée", rule: "salarié . cotisations . vieillesse . déplafonnée . salarié", side: "EMPLOYEE", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, rateRule: "salarié . cotisations . vieillesse . salarié . déplafonnée . taux" },
  { code: "vieillesse_plafonnee_employeur", label: "Assurance vieillesse plafonnée", rule: "salarié . cotisations . vieillesse . plafonnée . employeur", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, baseCapMultiplier: 1, rateRule: "salarié . cotisations . vieillesse . employeur . plafonnée . taux" },
  { code: "vieillesse_deplafonnee_employeur", label: "Assurance vieillesse déplafonnée", rule: "salarié . cotisations . vieillesse . déplafonnée . employeur", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, rateRule: "salarié . cotisations . vieillesse . employeur . déplafonnée . taux" },
  { code: "retraite_complementaire_salarie", label: "Retraite complémentaire — part salarié", rule: "salarié . cotisations . retraite complémentaire-CEG-CET . salarié", side: "EMPLOYEE", flat: false },
  { code: "retraite_complementaire_employeur", label: "Retraite complémentaire — part employeur", rule: "salarié . cotisations . retraite complémentaire-CEG-CET . employeur", side: "EMPLOYER", flat: false },
  { code: "allocations_familiales", label: "Allocations familiales", rule: "salarié . cotisations . allocations familiales", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, rateRule: "salarié . cotisations . allocations familiales . taux" },
  { code: "assurance_chomage", label: "Assurance chômage", rule: "salarié . cotisations . assurance chômage", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, baseCapMultiplier: 4 },
  { code: "apec_salarie", label: "APEC — part salarié", rule: "salarié . cotisations . APEC . salarié", side: "EMPLOYEE", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, baseCapMultiplier: 4 },
  { code: "apec_employeur", label: "APEC — part employeur", rule: "salarié . cotisations . APEC . employeur", side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, baseCapMultiplier: 4 },
  { code: "csg_deductible", label: "CSG déductible", rule: "salarié . cotisations . CSG-CRDS . CSG . déductible", side: "EMPLOYEE", flat: false, baseRule: CSG_BASE_RULE, rateRule: "salarié . cotisations . CSG-CRDS . CSG . déductible . taux" },
  { code: "csg_non_deductible", label: "CSG/CRDS non déductible", rule: "salarié . cotisations . CSG-CRDS . sur revenus imposables non déductible", side: "EMPLOYEE", flat: false, baseRule: CSG_BASE_RULE },
  { code: "csg_non_imposable", label: "CSG/CRDS sur revenus non imposables", rule: "salarié . cotisations . CSG-CRDS . sur revenus non imposables", side: "EMPLOYEE", flat: false, baseRule: CSG_BASE_RULE },
  { code: "invalidite_deces_salarie", label: "Prévoyance incapacité, invalidité, décès — part salarié", rule: "salarié . cotisations . prévoyances . incapacité invalidité décès . salarié", side: "EMPLOYEE", flat: false },
  { code: "invalidite_deces_employeur", label: "Prévoyance incapacité, invalidité, décès — part employeur", rule: "salarié . cotisations . prévoyances . incapacité invalidité décès . employeur", side: "EMPLOYER", flat: false },
  { code: "autres_charges_employeur", label: "Autres charges dues par l'employeur", rule: "salarié . cotisations . autres employeur", side: "EMPLOYER", flat: true },
  { code: "rgdu", label: "Réduction générale dégressive unique (RGDU)", rule: RGDU_RULE, side: "EMPLOYER", flat: false, baseRule: GENERAL_CONTRIBUTION_BASE_RULE, fractionRateRule: RGDU_COEFFICIENT_RULE, reduction: true },
];

const MODEL_DEFAULT_SITUATION: SocialPayrollSituation = {
  "salarié . cotisations . exonérations . JEI": "non",
  "entreprise . salariés . effectif . seuil": "'moins de 5'",
  "salarié . cotisations . ATMP . taux fonctions support": "non",
  // Un bulletin RH Pilot concerne toujours un salarié. Sans cette précision, le
  // modèle traite la personne d'une SAS comme son président (assimilé salarié) :
  // ni RGDU ni assurance chômage.
  "dirigeant . assimilé salarié": "non",
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
  const normalized = {
    CDI: "CDI",
    CDD: "CDD",
    APPRENTISSAGE: "apprentissage",
    PROFESSIONNALISATION: "professionnalisation",
  }[value.trim().toUpperCase() as "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION"];

  if (normalized) return normalized as SocialContractType;
  throw new Error("Le calcul social est bloqué : le type de contrat est absent ou invalide.");
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Le modèle social n'a pas fourni une valeur numérique pour ${label}.`);
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertRawNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Le modèle social n'a pas fourni une valeur numérique pour ${label}.`);
  return value;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertRate(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Le modèle social n'a pas fourni un taux numérique pour ${label}.`);
  // Publicodes exposes the value of rules typed as percentages in percentage
  // points (for example 0.4 means 0.4 %). RH Pilot stores contribution rates
  // internally as fractions (0.004) so they can be formatted consistently.
  if (value < 0 || value > 100) throw new Error(`Le modèle social a fourni un taux invalide pour ${label}.`);
  return Math.round(((value / 100) + Number.EPSILON) * 1000000) / 1000000;
}

function assertNoMissingVariables(evaluation: ReturnType<Engine["evaluate"]>, label: string): void {
  const missingVariables = Object.keys(evaluation.missingVariables ?? {});
  if (missingVariables.length === 0 || evaluation.nodeValue !== undefined) return;
  throw new Error(`Le calcul social est bloqué : des données nécessaires manquent pour ${label} : ${missingVariables.join(", ")}.`);
}

function formatPublicodesDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getUTCFullYear()}`;
}

function evaluateContributionBase(engine: Engine, detail: DetailRule): number | null {
  if (!detail.baseRule) return null;
  const evaluation = engine.evaluate(detail.baseRule);
  assertNoMissingVariables(evaluation, detail.baseRule);
  const baseAmount = assertNumber(evaluation.nodeValue, detail.baseRule);
  if (!detail.baseCapMultiplier) return baseAmount;
  const ceilingEvaluation = engine.evaluate(PRORATED_SOCIAL_SECURITY_CEILING_RULE);
  assertNoMissingVariables(ceilingEvaluation, PRORATED_SOCIAL_SECURITY_CEILING_RULE);
  const ceiling = assertNumber(ceilingEvaluation.nodeValue, PRORATED_SOCIAL_SECURITY_CEILING_RULE);
  return Math.min(baseAmount, ceiling * detail.baseCapMultiplier);
}

function evaluateContributionRate(engine: Engine, detail: DetailRule): number | null {
  if (detail.fractionRateRule) {
    const evaluation = engine.evaluate(detail.fractionRateRule);
    assertNoMissingVariables(evaluation, detail.fractionRateRule);
    const value = evaluation.nodeValue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Le modèle social a fourni un taux invalide pour ${detail.fractionRateRule}.`);
    return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
  }
  if (!detail.rateRule) return null;
  const evaluation = engine.evaluate(detail.rateRule);
  assertNoMissingVariables(evaluation, detail.rateRule);
  return assertRate(evaluation.nodeValue, detail.rateRule);
}

function evaluateContributionDetails(engine: Engine): SocialContributionDetail[] {
  return DETAIL_RULES.flatMap((detail): SocialContributionDetail[] => {
    const evaluation = engine.evaluate(detail.rule);
    assertNoMissingVariables(evaluation, detail.rule);
    if (evaluation.nodeValue === null || evaluation.nodeValue === undefined) return [];
    const value = assertNumber(evaluation.nodeValue, detail.rule);
    if (value === 0) return [];
    if (detail.reduction && value < 0) throw new Error(`Le modèle social a fourni une réduction négative pour ${detail.rule}.`);
    const amount = detail.reduction ? -value : value;
    const baseAmount = detail.flat ? null : evaluateContributionBase(engine, detail);
    const rate = detail.flat ? null : evaluateContributionRate(engine, detail);
    if (baseAmount !== null && baseAmount < 0) throw new Error(`Le modèle social a fourni une assiette invalide pour ${detail.rule}.`);
    return [{ code: detail.code, label: detail.label, sourceRule: detail.rule, side: detail.side, amount, baseAmount, rate }];
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
  const engine = freshEngine();
  const situation: SocialPayrollSituation = {
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
  };
  engine.setSituation(situation as Parameters<Engine["setSituation"]>[0]);
  const frozenSmic = RGDU_FROZEN_SMIC.find((entry) => entry.year === input.calculationDate.getUTCFullYear());
  if (frozenSmic && !(RGDU_SMIC_RULE in situation)) {
    const workingTime = engine.evaluate(WORKING_TIME_RULE);
    assertNoMissingVariables(workingTime, WORKING_TIME_RULE);
    if (typeof workingTime.nodeValue !== "number" || !Number.isFinite(workingTime.nodeValue) || workingTime.nodeValue <= 0) throw new Error("Le modèle social n'a pas fourni un temps de travail valide pour la RGDU.");
    const monthlySmic = Math.round(workingTime.nodeValue * frozenSmic.hourly * 10000) / 10000;
    engine.setSituation({ ...situation, [RGDU_SMIC_RULE]: `${monthlySmic} €/mois` } as Parameters<Engine["setSituation"]>[0]);
  }

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

  const rawNetBeforeTax = assertRawNumber(netBeforeTaxEvaluation.nodeValue, NET_BEFORE_TAX_RULE);
  const rawNetTaxable = assertRawNumber(netTaxableEvaluation.nodeValue, NET_TAXABLE_RULE);
  const rawNetSocial = assertRawNumber(netSocialEvaluation.nodeValue, NET_SOCIAL_RULE);
  const rawEmployeeContributions = assertRawNumber(employeeContributionsEvaluation.nodeValue, EMPLOYEE_CONTRIBUTIONS_RULE);
  const employeeContributions = roundMoney(rawEmployeeContributions);
  const employerContributions = assertNumber(employerContributionsEvaluation.nodeValue, EMPLOYER_CONTRIBUTIONS_RULE);
  const contributionDetails = evaluateContributionDetails(engine);
  const employeeDetailTotal = contributionDetails.filter((contribution) => contribution.side === "EMPLOYEE").reduce((total, contribution) => total + contribution.amount, 0);
  const employerDetailTotal = contributionDetails.filter((contribution) => contribution.side === "EMPLOYER").reduce((total, contribution) => total + contribution.amount, 0);
  if (Math.abs(employeeDetailTotal - employeeContributions) > 0.02) {
    throw new Error(`Le détail des cotisations salariales (${employeeDetailTotal.toFixed(2)} €) ne réconcilie pas le total du modèle social (${employeeContributions.toFixed(2)} €). Le bulletin est bloqué pour éviter un détail incomplet.`);
  }
  if (Math.abs(employerDetailTotal - employerContributions) > 0.02) {
    throw new Error(`Le détail des cotisations patronales (${employerDetailTotal.toFixed(2)} €) ne réconcilie pas le total du modèle social (${employerContributions.toFixed(2)} €). Le bulletin est bloqué pour éviter un détail incomplet.`);
  }

  // Un bulletin additionne des lignes arrondies au centime : les totaux et les nets
  // sont recalés sur ces lignes pour qu'aucun total ne diffère d'un centime de leur somme.
  const employeeLinesTotal = roundMoney(employeeDetailTotal);
  const employerLinesTotal = roundMoney(employerDetailTotal);
  const roundingShift = rawEmployeeContributions - employeeLinesTotal;
  const netBeforeTax = roundMoney(rawNetBeforeTax + roundingShift);
  const netSocialAmount = roundMoney(rawNetSocial + roundingShift);

  // Net imposable = net avant impôt + CSG/CRDS non déductible + part patronale santé.
  // Le modèle 11.1.0 y ajoute aussi la prévoyance patronale (incapacité, invalidité,
  // décès), qui n'est pas imposable dans la limite de l'art. 83, 1° quater du CGI.
  const lineAmount = (code: string) => contributionDetails.find((contribution) => contribution.code === code)?.amount ?? 0;
  const socialSecurityCeiling = engine.evaluate(PRORATED_SOCIAL_SECURITY_CEILING_RULE);
  assertNoMissingVariables(socialSecurityCeiling, PRORATED_SOCIAL_SECURITY_CEILING_RULE);
  const ceiling = assertNumber(socialSecurityCeiling.nodeValue, PRORATED_SOCIAL_SECURITY_CEILING_RULE);
  const prevoyanceContributions = ["sante_salarie", "sante_employeur", "invalidite_deces_salarie", "invalidite_deces_employeur"].reduce((total, code) => total + lineAmount(code), 0);
  const prevoyanceTaxLimit = Math.min(0.05 * ceiling + 0.02 * input.grossAmount, 0.16 * ceiling);
  if (prevoyanceContributions > prevoyanceTaxLimit) {
    throw new Error("Le calcul est bloqué : les cotisations de prévoyance et de santé dépassent la limite d'exonération fiscale (art. 83, 1° quater du CGI). Cette situation n'est pas encore prise en charge.");
  }
  const netTaxableAmount = roundMoney(netBeforeTax + lineAmount("csg_non_deductible") + lineAmount("sante_employeur"));
  const modelNetTaxableWithoutDisability = rawNetTaxable - lineAmount("invalidite_deces_employeur");
  if (Math.abs(netTaxableAmount - modelNetTaxableWithoutDisability) > 0.05) {
    throw new Error(`Le net imposable (${netTaxableAmount.toFixed(2)} €) ne réconcilie pas le modèle social (${modelNetTaxableWithoutDisability.toFixed(2)} €). Le bulletin est bloqué pour éviter un net imposable inexact.`);
  }

  return {
    modelVersion: SOCIAL_MODEL_VERSION,
    grossAmount: roundMoney(input.grossAmount),
    legalCategory,
    employeeContributions: employeeLinesTotal,
    employerContributions: employerLinesTotal,
    netBeforeTax,
    netTaxableAmount,
    netSocialAmount,
    employerCost: roundMoney(input.grossAmount + employerLinesTotal),
    contributionDetails,
  };
}
