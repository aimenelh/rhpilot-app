/**
 * Paramètres légaux datés utilisés par le moteur de bulletin.
 *
 * Chaque valeur porte sa date d'effet et sa source. Le moteur refuse de calculer
 * une date pour laquelle un paramètre n'est pas connu : aucune valeur n'est
 * extrapolée. Les taux sont cohérents avec le modèle social Urssaf (modele-social)
 * et un test compare le moteur à ce modèle sur les mois simples, pour qu'une
 * divergence apparaisse dès la mise à jour de l'un ou de l'autre.
 */

/** `until` (inclus) borne la dernière valeur connue : au-delà, le calcul est bloqué. */
export type Dated<T> = { from: string; until?: string; value: T; source: string };

export class MissingParameterError extends Error {}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Valeur en vigueur à la date donnée (dernière entrée dont la date d'effet est atteinte). */
export function valueAt<T>(list: readonly Dated<T>[], date: Date, label: string): { value: T; source: string; from: string } {
  const day = isoDay(date);
  let found: Dated<T> | undefined;
  for (const entry of list) if (entry.from <= day && (!found || entry.from > found.from)) found = entry;
  if (!found || (found.until && day > found.until)) throw new MissingParameterError(`Paramètre « ${label} » inconnu au ${day.split("-").reverse().join("/")} : le calcul est bloqué plutôt que d'utiliser une valeur non vérifiée.`);
  return { value: found.value, source: found.source, from: found.from };
}

/** Première date couverte par les paramètres du moteur. */
export const ENGINE_FIRST_SUPPORTED_DAY = "2026-01-01";

/**
 * Dernière date couverte. PMSS, Smic, taux de cotisations, RGDU et plafonds changent
 * au 1er janvier : sans cette borne, les valeurs 2026 s'appliqueraient en 2027 sans
 * prévenir. À repousser en même temps que la saisie des paramètres 2027, vérifiés.
 */
export const ENGINE_LAST_SUPPORTED_DAY = "2026-12-31";

// ---------------------------------------------------------------------------
// Plafond de la sécurité sociale et Smic
// ---------------------------------------------------------------------------

export const PMSS: readonly Dated<number>[] = [
  { from: "2026-01-01", value: 4005, source: "Arrêté portant fixation du plafond de la sécurité sociale pour 2026 (PASS 48 060 €, PMSS 4 005 €)" },
];

export const SMIC_HOURLY: readonly Dated<number>[] = [
  { from: "2026-01-01", value: 12.02, source: "Décret portant relèvement du salaire minimum de croissance au 1er janvier 2026 (12,02 €/h)" },
  { from: "2026-06-01", value: 12.31, source: "Revalorisation automatique du Smic au 1er juin 2026 (12,31 €/h, +2,41 %)" },
];

/** Smic retenu pour la RGDU lorsqu'un texte le fige pour l'année civile. */
export const RGDU_SMIC_HOURLY: readonly Dated<number>[] = [
  { from: "2026-01-01", value: 12.02, source: "Décret n° 2026-509 du 12 juin 2026 : Smic du 1er janvier retenu pour toute l'année 2026" },
];

export const LEGAL_MONTHLY_HOURS = 151.67;

// ---------------------------------------------------------------------------
// Taux de cotisations (fractions)
// ---------------------------------------------------------------------------

export type ContributionRates = {
  maladieEmployer: number;
  maladieEmployee: number;
  /** Régime local d'Alsace-Moselle : cotisation salariale maladie supplémentaire. */
  alsaceMoselleEmployee: number;
  vieillessePlafEmployee: number;
  vieillessePlafEmployer: number;
  vieillesseDeplafEmployee: number;
  vieillesseDeplafEmployer: number;
  allocationsFamiliales: number;
  csa: number;
  fnalUnder50: number;
  fnal50AndMore: number;
  chomage: number;
  ags: number;
  retraiteT1Employee: number;
  retraiteT1Employer: number;
  retraiteT2Employee: number;
  retraiteT2Employer: number;
  cegT1Employee: number;
  cegT1Employer: number;
  cegT2Employee: number;
  cegT2Employer: number;
  cetEmployee: number;
  cetEmployer: number;
  apecEmployee: number;
  apecEmployer: number;
  dialogueSocial: number;
  formationUnder11: number;
  formation11AndMore: number;
  cpfCdd: number;
  taxeApprentissage: number;
  taxeApprentissageSolde: number;
  /** Alsace-Moselle : taxe d'apprentissage au taux réduit, sans solde (CGI art. 1599 ter J). */
  taxeApprentissageAlsaceMoselle: number;
  forfaitSocialPrevoyance: number;
  prevoyanceCadreMinimumEmployer: number;
  csgDeductible: number;
  csgNonDeductible: number;
  crds: number;
  csgBaseAbatement: number;
};

export const CONTRIBUTION_RATES: readonly Dated<ContributionRates>[] = [
  {
    from: "2026-01-01",
    source: "Urssaf — taux de cotisations 2026 (modele-social 11.1.0) ; Agirc-Arrco — taux 2026 ; CSS art. D242-4, L136-8 ; ANI du 17 novembre 2017 (prévoyance cadres) ; régime local d'Alsace-Moselle 1,30 % (taux maintenu pour 2026 par le conseil d'administration du régime local)",
    value: {
      maladieEmployer: 0.13,
      maladieEmployee: 0,
      alsaceMoselleEmployee: 0.013,
      vieillessePlafEmployee: 0.069,
      vieillessePlafEmployer: 0.0855,
      vieillesseDeplafEmployee: 0.004,
      vieillesseDeplafEmployer: 0.0211,
      allocationsFamiliales: 0.0525,
      csa: 0.003,
      fnalUnder50: 0.001,
      fnal50AndMore: 0.005,
      chomage: 0.04,
      ags: 0.0025,
      retraiteT1Employee: 0.0315,
      retraiteT1Employer: 0.0472,
      retraiteT2Employee: 0.0864,
      retraiteT2Employer: 0.1295,
      cegT1Employee: 0.0086,
      cegT1Employer: 0.0129,
      cegT2Employee: 0.0108,
      cegT2Employer: 0.0162,
      cetEmployee: 0.0014,
      cetEmployer: 0.0021,
      apecEmployee: 0.00024,
      apecEmployer: 0.00036,
      dialogueSocial: 0.00016,
      formationUnder11: 0.0055,
      formation11AndMore: 0.01,
      cpfCdd: 0.01,
      taxeApprentissage: 0.0059,
      taxeApprentissageSolde: 0.0009,
      taxeApprentissageAlsaceMoselle: 0.0044,
      forfaitSocialPrevoyance: 0.08,
      prevoyanceCadreMinimumEmployer: 0.015,
      csgDeductible: 0.068,
      csgNonDeductible: 0.024,
      crds: 0.005,
      csgBaseAbatement: 0.0175,
    },
  },
];

// ---------------------------------------------------------------------------
// Réduction générale dégressive unique (RGDU)
// ---------------------------------------------------------------------------

export type RgduParameters = { tMin: number; tDeltaUnder50: number; tDelta50AndMore: number; exponent: number; exitSmicMultiple: number };

export const RGDU: readonly Dated<RgduParameters>[] = [
  { from: "2026-01-01", value: { tMin: 0.02, tDeltaUnder50: 0.3781, tDelta50AndMore: 0.3821, exponent: 1.75, exitSmicMultiple: 3 }, source: "CSS art. L241-13 et D241-7 ; BOSS — réforme des allègements généraux applicable au 1er janvier 2026" },
];

// ---------------------------------------------------------------------------
// Heures supplémentaires et complémentaires
// ---------------------------------------------------------------------------

export type OvertimeParameters = { employeeReductionCap: number; employerDeductionUnder20: number; employerDeduction20AndMore: number; annualTaxExemptNetCap: number };

export const OVERTIME: readonly Dated<OvertimeParameters>[] = [
  { from: "2026-01-01", value: { employeeReductionCap: 0.1131, employerDeductionUnder20: 1.5, employerDeduction20AndMore: 0.5, annualTaxExemptNetCap: 7500 }, source: "CSS art. L241-17, D241-21 et L241-18 (déduction patronale étendue par la LFSS pour 2026) ; CGI art. 81 quater" },
];

// ---------------------------------------------------------------------------
// Frais professionnels exonérés
// ---------------------------------------------------------------------------

export type ExpenseParameters = {
  mealVoucherEmployerExemptPerVoucher: number;
  mealVoucherEmployerShareMin: number;
  mealVoucherEmployerShareMax: number;
  publicTransportExemptShareCap: number;
  /** Indemnités de repas, par repas : sur le lieu de travail (horaires atypiques), hors des locaux, au restaurant en déplacement. */
  mealAllowanceOnSite: number;
  mealAllowanceOffSite: number;
  mealAllowanceRestaurant: number;
  /** Forfait mobilités durables : plafond annuel seul, et plafond cumulé avec la prise en charge du transport public. */
  sustainableMobilityAnnualCap: number;
  sustainableMobilityCombinedAnnualCap: number;
};

export const EXPENSES: readonly Dated<ExpenseParameters>[] = [
  {
    from: "2026-01-01",
    value: {
      mealVoucherEmployerExemptPerVoucher: 7.32,
      mealVoucherEmployerShareMin: 0.5,
      mealVoucherEmployerShareMax: 0.6,
      publicTransportExemptShareCap: 0.75,
      mealAllowanceOnSite: 7.5,
      mealAllowanceOffSite: 10.4,
      mealAllowanceRestaurant: 21.4,
      sustainableMobilityAnnualCap: 600,
      sustainableMobilityCombinedAnnualCap: 900,
    },
    source: "CSS art. L131-4 ; Urssaf — titres-restaurant 2026 (7,32 €) et frais de repas 2026 (7,50 € / 10,40 € / 21,40 €) ; C. trav. art. L3261-3-1 et CSS art. L136-1-1 (forfait mobilités durables : 600 €, 900 € en cumul) ; CGI art. 81, 19° ter a",
  },
];

// ---------------------------------------------------------------------------
// Indemnités journalières et maintien de salaire
// ---------------------------------------------------------------------------

export type IjssParameters = {
  sicknessRate: number;
  sicknessSalaryCapSmicMultiple: number;
  sicknessReferenceDays: number;
  sicknessWaitingDays: number;
  replacementIncomeCsgDeductible: number;
  replacementIncomeCsgNonDeductible: number;
  replacementIncomeCrds: number;
};

export const IJSS: readonly Dated<IjssParameters>[] = [
  { from: "2026-01-01", value: { sicknessRate: 0.5, sicknessSalaryCapSmicMultiple: 1.4, sicknessReferenceDays: 91.25, sicknessWaitingDays: 3, replacementIncomeCsgDeductible: 0.038, replacementIncomeCsgNonDeductible: 0.024, replacementIncomeCrds: 0.005 }, source: "CSS art. R323-4, R323-1 ; plafond du salaire de référence ramené à 1,4 Smic pour les arrêts débutant à compter du 1er avril 2025 ; CSS art. L136-8 (CSG sur revenus de remplacement 6,2 %)" },
];

export type SickPayTier = { minSeniorityYears: number; fullRateDays: number; reducedRateDays: number };
export type SickPayRule = { minSeniorityMonths: number; waitingDays: number; fullRate: number; reducedRate: number; tiers: readonly SickPayTier[]; source: string };

/** Maintien légal de salaire (C. trav. art. L1226-1, D1226-1 à D1226-8). */
export const LEGAL_SICK_PAY: SickPayRule = {
  minSeniorityMonths: 12,
  waitingDays: 7,
  fullRate: 0.9,
  reducedRate: 2 / 3,
  tiers: [
    { minSeniorityYears: 1, fullRateDays: 30, reducedRateDays: 30 },
    { minSeniorityYears: 6, fullRateDays: 40, reducedRateDays: 40 },
    { minSeniorityYears: 11, fullRateDays: 50, reducedRateDays: 50 },
    { minSeniorityYears: 16, fullRateDays: 60, reducedRateDays: 60 },
    { minSeniorityYears: 21, fullRateDays: 70, reducedRateDays: 70 },
    { minSeniorityYears: 26, fullRateDays: 80, reducedRateDays: 80 },
    { minSeniorityYears: 31, fullRateDays: 90, reducedRateDays: 90 },
  ],
  source: "Code du travail, art. L1226-1 et D1226-1 à D1226-8",
};

/** Accident du travail / maladie professionnelle : pas de carence pour le maintien légal. */
export const LEGAL_WORK_ACCIDENT_PAY: SickPayRule = { ...LEGAL_SICK_PAY, waitingDays: 0, source: "Code du travail, art. L1226-1 et D1226-3 (pas de délai de carence en cas d'AT/MP)" };

// ---------------------------------------------------------------------------
// Indemnités de rupture
// ---------------------------------------------------------------------------

export type SeveranceParameters = {
  /** Fraction exonérée de cotisations : dans la limite de 2 PASS. */
  socialExemptPassMultiple: number;
  /** Au-delà de 10 PASS, l'indemnité est soumise dès le premier euro (cotisations et CSG). */
  fullySubjectPassMultiple: number;
  /** Plafond de l'exonération fiscale (50 % ou deux fois la rémunération) : 6 PASS, 5 PASS en cas de mise à la retraite. */
  taxExemptPassCap: number;
  retirementTaxExemptPassCap: number;
  /** Contribution patronale spécifique sur la fraction exonérée des indemnités de rupture conventionnelle et de mise à la retraite. */
  employerSpecificContribution: number;
};

export const SEVERANCE: readonly Dated<SeveranceParameters>[] = [
  {
    from: "2026-01-01",
    value: { socialExemptPassMultiple: 2, fullySubjectPassMultiple: 10, taxExemptPassCap: 6, retirementTaxExemptPassCap: 5, employerSpecificContribution: 0.4 },
    source: "CSS art. L242-1 et L136-1-1 ; CSS art. L137-12 (40 % pour les ruptures dont le terme est postérieur au 1er janvier 2026, LFSS pour 2026, loi n° 2025-1403 du 30 décembre 2025, art. 15) ; CGI art. 80 duodecies ; BOSS, indemnités de rupture",
  },
];

// ---------------------------------------------------------------------------
// Prélèvement à la source : grilles de taux par défaut
// ---------------------------------------------------------------------------

export type PasTerritory = "METROPOLE" | "ANTILLES_REUNION" | "GUYANE_MAYOTTE";
export type PasBracket = { upTo: number | null; rate: number };

const PAS_2025_METROPOLE: PasBracket[] = [
  { upTo: 1620, rate: 0 }, { upTo: 1683, rate: 0.005 }, { upTo: 1791, rate: 0.013 }, { upTo: 1911, rate: 0.021 }, { upTo: 2042, rate: 0.029 },
  { upTo: 2151, rate: 0.035 }, { upTo: 2294, rate: 0.041 }, { upTo: 2714, rate: 0.053 }, { upTo: 3107, rate: 0.075 }, { upTo: 3539, rate: 0.099 },
  { upTo: 3983, rate: 0.119 }, { upTo: 4648, rate: 0.138 }, { upTo: 5574, rate: 0.158 }, { upTo: 6974, rate: 0.179 }, { upTo: 8711, rate: 0.2 },
  { upTo: 12091, rate: 0.24 }, { upTo: 16376, rate: 0.28 }, { upTo: 25706, rate: 0.33 }, { upTo: 55062, rate: 0.38 }, { upTo: null, rate: 0.43 },
];
const PAS_2025_ANTILLES: PasBracket[] = [
  { upTo: 1858, rate: 0 }, { upTo: 1971, rate: 0.005 }, { upTo: 2171, rate: 0.013 }, { upTo: 2371, rate: 0.021 }, { upTo: 2618, rate: 0.029 },
  { upTo: 2761, rate: 0.035 }, { upTo: 2855, rate: 0.041 }, { upTo: 3142, rate: 0.053 }, { upTo: 3885, rate: 0.075 }, { upTo: 4971, rate: 0.099 },
  { upTo: 5646, rate: 0.119 }, { upTo: 6540, rate: 0.138 }, { upTo: 7836, rate: 0.158 }, { upTo: 8711, rate: 0.179 }, { upTo: 9900, rate: 0.2 },
  { upTo: 13615, rate: 0.24 }, { upTo: 18090, rate: 0.28 }, { upTo: 27610, rate: 0.33 }, { upTo: 60350, rate: 0.38 }, { upTo: null, rate: 0.43 },
];
const PAS_2025_GUYANE: PasBracket[] = [
  { upTo: 1990, rate: 0 }, { upTo: 2151, rate: 0.005 }, { upTo: 2398, rate: 0.013 }, { upTo: 2704, rate: 0.021 }, { upTo: 2808, rate: 0.029 },
  { upTo: 2904, rate: 0.035 }, { upTo: 2999, rate: 0.041 }, { upTo: 3332, rate: 0.053 }, { upTo: 4598, rate: 0.075 }, { upTo: 5951, rate: 0.099 },
  { upTo: 6712, rate: 0.119 }, { upTo: 7788, rate: 0.138 }, { upTo: 8567, rate: 0.158 }, { upTo: 9492, rate: 0.179 }, { upTo: 11016, rate: 0.2 },
  { upTo: 14820, rate: 0.24 }, { upTo: 18850, rate: 0.28 }, { upTo: 30210, rate: 0.33 }, { upTo: 63767, rate: 0.38 }, { upTo: null, rate: 0.43 },
];
const PAS_2026_METROPOLE: PasBracket[] = [
  { upTo: 1635, rate: 0 }, { upTo: 1698, rate: 0.005 }, { upTo: 1807, rate: 0.013 }, { upTo: 1928, rate: 0.021 }, { upTo: 2060, rate: 0.029 },
  { upTo: 2170, rate: 0.035 }, { upTo: 2315, rate: 0.041 }, { upTo: 2738, rate: 0.053 }, { upTo: 3135, rate: 0.075 }, { upTo: 3571, rate: 0.099 },
  { upTo: 4019, rate: 0.119 }, { upTo: 4690, rate: 0.138 }, { upTo: 5624, rate: 0.158 }, { upTo: 7037, rate: 0.179 }, { upTo: 8789, rate: 0.2 },
  { upTo: 12200, rate: 0.24 }, { upTo: 16523, rate: 0.28 }, { upTo: 25937, rate: 0.33 }, { upTo: 55558, rate: 0.38 }, { upTo: null, rate: 0.43 },
];
const PAS_2026_ANTILLES: PasBracket[] = [
  { upTo: 1875, rate: 0 }, { upTo: 1989, rate: 0.005 }, { upTo: 2191, rate: 0.013 }, { upTo: 2392, rate: 0.021 }, { upTo: 2642, rate: 0.029 },
  { upTo: 2786, rate: 0.035 }, { upTo: 2881, rate: 0.041 }, { upTo: 3170, rate: 0.053 }, { upTo: 3920, rate: 0.075 }, { upTo: 5016, rate: 0.099 },
  { upTo: 5697, rate: 0.119 }, { upTo: 6599, rate: 0.138 }, { upTo: 7907, rate: 0.158 }, { upTo: 8789, rate: 0.179 }, { upTo: 9989, rate: 0.2 },
  { upTo: 13738, rate: 0.24 }, { upTo: 18253, rate: 0.28 }, { upTo: 27858, rate: 0.33 }, { upTo: 60893, rate: 0.38 }, { upTo: null, rate: 0.43 },
];
const PAS_2026_GUYANE: PasBracket[] = [
  { upTo: 2008, rate: 0 }, { upTo: 2170, rate: 0.005 }, { upTo: 2420, rate: 0.013 }, { upTo: 2728, rate: 0.021 }, { upTo: 2833, rate: 0.029 },
  { upTo: 2930, rate: 0.035 }, { upTo: 3026, rate: 0.041 }, { upTo: 3362, rate: 0.053 }, { upTo: 4639, rate: 0.075 }, { upTo: 6005, rate: 0.099 },
  { upTo: 6772, rate: 0.119 }, { upTo: 7858, rate: 0.138 }, { upTo: 8644, rate: 0.158 }, { upTo: 9577, rate: 0.179 }, { upTo: 11115, rate: 0.2 },
  { upTo: 14953, rate: 0.24 }, { upTo: 19020, rate: 0.28 }, { upTo: 30482, rate: 0.33 }, { upTo: 64341, rate: 0.38 }, { upTo: null, rate: 0.43 },
];

export const PAS_DEFAULT_GRIDS: readonly Dated<Record<PasTerritory, PasBracket[]>>[] = [
  // La loi de finances 2026 ayant été promulguée le 19 février 2026, les grilles du
  // 1er mai 2025 sont restées applicables jusqu'au 30 avril 2026.
  { from: "2025-05-01", value: { METROPOLE: PAS_2025_METROPOLE, ANTILLES_REUNION: PAS_2025_ANTILLES, GUYANE_MAYOTTE: PAS_2025_GUYANE }, source: "BOFiP BOI-BAREME-000037 (grilles applicables à compter du 1er mai 2025)" },
  { from: "2026-05-01", until: "2027-04-30", value: { METROPOLE: PAS_2026_METROPOLE, ANTILLES_REUNION: PAS_2026_ANTILLES, GUYANE_MAYOTTE: PAS_2026_GUYANE }, source: "BOFiP BOI-BAREME-000037-20260407 (grilles applicables à compter du 1er mai 2026, CGI art. 204 H)" },
];

/** Abattement des contrats courts (CDD de moins de deux mois) : 50 % du Smic net imposable mensuel. */
export const PAS_SHORT_CONTRACT_ALLOWANCE: readonly Dated<number>[] = [
  { from: "2026-01-01", value: 748, source: "BOFiP BOI-BAREME-000037 : 1 495,04 € / 2 au 1er janvier 2026" },
  { from: "2026-06-01", value: 766, source: "Revalorisation du Smic au 1er juin 2026 : 1 531,12 € / 2" },
];

export function pasBracketRate(grid: readonly PasBracket[], monthlyBase: number): number {
  for (const bracket of grid) if (bracket.upTo === null || monthlyBase < bracket.upTo) return bracket.rate;
  return grid[grid.length - 1].rate;
}
