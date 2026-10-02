import type { IsoDay, WeeklySchedule } from "./calendar";
import type { PasTerritory, SickPayRule } from "./params";

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export type ContractKind = "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION";

export type OrganizationPayrollContext = {
  /** Effectif au sens de la sécurité sociale (moyenne de l'année précédente). */
  headcount: number;
  /** Taux AT/MP notifié, en pourcentage (1,2 pour 1,2 %). */
  atmpRatePercent: number;
  /** Taux de versement mobilité de la commune, en pourcentage (0 si non assujetti). */
  mobilityRatePercent: number;
  /** Ventilation officielle et commune retenues au calcul, nécessaires à la DSN. */
  mobilityDsn?: {
    communeCode: string;
    components: { vm: number; vma: number; vmr: number };
    validFrom: string | null;
    validUntil: string | null;
    source: "URSSAF";
  } | null;
  territory: PasTerritory;
  alsaceMoselle?: boolean;
  /** Complémentaire santé obligatoire : cotisation mensuelle totale et part employeur (0,5 à 1). */
  healthPlan: { monthlyAmount: number; employerShare: number } | null;
  /** Prévoyance : taux sur tranche 1 et tranche 2, par population. */
  prevoyance?: {
    cadre?: PrevoyanceRates;
    nonCadre?: PrevoyanceRates;
  };
  /** Le lundi de Pentecôte est travaillé (journée de solidarité). */
  workedSolidarityDay?: boolean;
  /** Subrogation : l'employeur perçoit les IJSS et les reverse sur le bulletin. */
  ijssSubrogation: boolean;
  /** Règle de maintien de salaire conventionnelle plus favorable que la loi, le cas échéant. */
  sickPayRule?: SickPayRule;
  workAccidentPayRule?: SickPayRule;
  /** Décompte des congés payés. */
  paidLeaveMethod: "OUVRABLES" | "OUVRES";
  paidLeaveWorkingDays?: readonly boolean[] | null;
};

export type PrevoyanceRates = {
  employeeT1: number;
  employerT1: number;
  employeeT2?: number;
  employerT2?: number;
};

export type EmployeePayrollContext = {
  id: string;
  displayName: string;
  contract: ContractKind;
  executive: boolean;
  hireDate: IsoDay;
  contractEndDate?: IsoDay | null;
  /** Date d'ancienneté retenue pour le maintien de salaire (par défaut l'embauche). */
  seniorityDate?: IsoDay | null;
  /** CDD : durée initiale ou minimale en jours, pour l'abattement « contrat court » du PAS. */
  plannedContractDays?: number | null;
  birthDate?: IsoDay | null;
};

export type PayContext = {
  /** Salaire mensuel de base correspondant à l'horaire contractuel. */
  monthlyBaseSalary: number;
  /** Horaire mensuel contractuel (151,67 pour 35 h ; 121,33 pour 28 h…). */
  contractMonthlyHours: number;
  /** Heures supplémentaires structurelles comprises dans l'horaire (17,33 pour un contrat à 39 h). */
  structuralOvertimeMonthlyHours?: number;
  /** Majoration des heures structurelles (25 % par défaut). */
  structuralOvertimeRate?: number;
  schedule: WeeklySchedule;
};

export type AbsenceKind =
  | "UNPAID_LEAVE"
  | "PAID_LEAVE"
  | "RTT"
  | "FAMILY_EVENT"
  | "SICK_LEAVE"
  | "WORK_ACCIDENT"
  | "MATERNITY"
  | "PATERNITY"
  | "OTHER_PAID"
  | "OTHER_UNPAID";

export type AbsenceInput = {
  id: string;
  kind: AbsenceKind;
  /** Premier et dernier jour d'absence (peuvent déborder de la période). */
  start: IsoDay;
  end: IsoDay;
  /** Heures d'absence d'un jour partiel (par défaut la journée programmée entière). */
  partialDayHours?: Record<IsoDay, number>;
  /** IJSS brutes de la période pour cette absence, quand l'attestation est connue. */
  ijssGrossAmount?: number | null;
  /** Arrêt de prolongation : pas de nouveau délai de carence. */
  continuation?: boolean;
  /** Premier jour de l'arrêt initial, pour une prolongation (compte des 60 jours d'IJSS imposables). */
  initialStart?: IsoDay | null;
};

export type OvertimeInput = {
  /** Heures supplémentaires majorées à 25 % (ou au taux conventionnel de première tranche). */
  hoursFirstBand?: number;
  hoursSecondBand?: number;
  firstBandRate?: number;
  secondBandRate?: number;
};

export type ComplementaryHoursInput = {
  /** Heures dans la limite du dixième de l'horaire contractuel (majoration 10 %). */
  hoursWithinTenth?: number;
  /** Heures au-delà du dixième (majoration 25 %). */
  hoursBeyondTenth?: number;
  withinTenthRate?: number;
  beyondTenthRate?: number;
};

export type BonusInput = {
  code: string;
  label: string;
  amount: number;
  /** Prime exclue de l'assiette du dixième des congés payés (prime annuelle non affectée par les congés). */
  excludedFromPaidLeaveBase?: boolean;
};
export type BenefitInKindInput = { code: "BENEFIT_MEAL" | "BENEFIT_HOUSING" | "BENEFIT_VEHICLE" | "BENEFIT_TECHNOLOGY" | "BENEFIT_OTHER"; label: string; amount: number };
export type ExpenseInput = { code: string; label: string; amount: number };
export type NetAdjustmentInput = { code: string; label: string; amount: number };

export type MealVoucherInput = { count: number; faceValue: number; employerShare: number };
export type PublicTransportInput = { monthlySubscription: number; employerShare: number };

export type PaidLeaveBalances = {
  /** Période précédente (N-1) : acquis et pris. */
  previousAcquired: number;
  previousTaken: number;
  /** Période en cours (N) : acquis et pris. */
  currentAcquired: number;
  currentTaken: number;
  /** Brut de la période de référence N-1 (règle du dixième) et droits acquis correspondants. */
  referenceGross?: number | null;
  referenceAcquiredDays?: number | null;
  /** Brut de la période d'acquisition en cours (indemnité compensatrice de fin de contrat). */
  currentReferenceGross?: number | null;
};

export type TerminationReason =
  | "DEMISSION"
  | "LICENCIEMENT"
  | "RUPTURE_CONVENTIONNELLE"
  | "FIN_CDD"
  | "FIN_PERIODE_ESSAI"
  | "MISE_A_LA_RETRAITE"
  | "DEPART_RETRAITE"
  | "AUTRE";

export type TerminationInput = {
  reason: TerminationReason;
  /** Indemnité compensatrice de congés payés : calculée sur les soldes si le montant n'est pas fourni. */
  paidLeaveCompensation?: { amount?: number | null } | null;
  noticeCompensation?: number | null;
  /** Indemnité de fin de CDD : montant, ou calcul à 10 % du brut total du contrat fourni. */
  cddEndAllowance?: { amount?: number | null; contractTotalGross?: number | null; rate?: number | null } | null;
  severance?: {
    amount: number;
    /** Indemnité légale ou conventionnelle minimale due pour ce motif. */
    legalOrConventionalMinimum: number;
    /** Brut annuel de l'année civile précédant la rupture (plafond fiscal « deux fois la rémunération »). */
    previousYearGross?: number | null;
    /** Rupture conventionnelle d'un salarié pouvant liquider une retraite à taux plein : indemnité entièrement soumise. */
    eligibleForFullPension?: boolean;
  } | null;
};

/** Cumuls de l'année civile arrêtés au mois précédent. */
export type YearToDate = {
  year: number;
  grossSubject: number;
  ceiling: number;
  baseT1: number;
  baseT2: number;
  baseFourCeilings: number;
  baseCet: number;
  /** Brut soumis à la CSG cumulé et part cumulée comprise dans la limite de 4 plafonds (abattement de 1,75 %). */
  csgGross: number;
  csgWithinFourCeilings: number;
  rgduSmic: number;
  rgduRemuneration: number;
  rgduAmount: number;
  overtimeTaxExemptGross: number;
  netTaxable: number;
  withholdingTax: number;
  netPaid: number;
  netSocial: number;
  employeeContributions: number;
  employerContributions: number;
  hoursPaid: number;
  grossTotal: number;
  employerCost: number;
  /** Forfait mobilités durables et prise en charge exonérée du transport public, cumulés sur l'année. */
  sustainableMobility?: number;
  publicTransportExempt?: number;
  /** Net fiscal des salaires d'apprentissage avant exonération annuelle, hors IJSS. */
  apprenticeFiscalIncome?: number;
};

export type SickPayHistory = {
  /** Jours déjà indemnisés par l'employeur sur les douze mois précédant l'arrêt. */
  fullRateDaysUsed: number;
  reducedRateDaysUsed: number;
};

export type WithholdingInput =
  | { mode: "PERSONALIZED"; rate: number; rateIdentifier?: string | null }
  | { mode: "DEFAULT_GRID" };

export type PayslipInput = {
  period: { year: number; month: number };
  /** Date de paiement (détermine la grille PAS applicable). Dernier jour du mois par défaut. */
  paymentDate?: IsoDay;
  organization: OrganizationPayrollContext;
  employee: EmployeePayrollContext;
  pay: PayContext;
  absences?: AbsenceInput[];
  overtime?: OvertimeInput;
  complementaryHours?: ComplementaryHoursInput;
  bonuses?: BonusInput[];
  benefitsInKind?: BenefitInKindInput[];
  expenses?: ExpenseInput[];
  mealVouchers?: MealVoucherInput | null;
  publicTransport?: PublicTransportInput | null;
  netAdjustments?: NetAdjustmentInput[];
  paidLeave?: PaidLeaveBalances | null;
  priorPaidLeaveIndemnities?: Record<string, { days: number; maintenance: number; paid: number; referenceGross: number | null; referenceDays: number | null }>;
  yearToDate?: YearToDate | null;
  sickPayHistory?: SickPayHistory | null;
  /** Trois derniers bruts mensuels avant l'arrêt, pour estimer les IJSS maladie. */
  previousGrossSalaries?: readonly number[] | null;
  /** Bruts soumis des mois antérieurs : les IJSS estimées se calculent sur les mois précédant chaque arrêt. */
  grossSalaryHistory?: ReadonlyArray<{ year: number; month: number; gross: number }> | null;
  withholding: WithholdingInput;
  termination?: TerminationInput | null;
};

// ---------------------------------------------------------------------------
// Sorties
// ---------------------------------------------------------------------------

export type PayslipSection =
  | "GROSS"
  | "SANTE"
  | "ACCIDENTS_TRAVAIL"
  | "RETRAITE"
  | "FAMILLE"
  | "CHOMAGE"
  | "AUTRES_EMPLOYEUR"
  | "CSG_CRDS"
  | "EXONERATIONS"
  | "NET_ITEMS";

export type PayslipLine = {
  code: string;
  label: string;
  section: PayslipSection;
  base?: number;
  quantity?: number;
  unit?: "HOURS" | "DAYS" | "UNITS";
  /** Taux salarial (fraction) ou taux horaire pour les lignes de brut. */
  rate?: number;
  employerRate?: number;
  /** Lignes de brut et d'éléments nets : montant signé. Cotisations : part salariale (positive = retenue). */
  amount?: number;
  /** Cotisations : part patronale (positive = charge ; négative = réduction). */
  employerAmount?: number;
  source: string;
  detail?: Record<string, string | number | boolean | null>;
};

export type PaidLeaveOutcome = {
  daysTaken: number;
  takenFromPrevious: number;
  takenFromCurrent: number;
  acquiredThisMonth: number;
  balancesAfter: PaidLeaveBalances;
  indemnityMethod: "SALARY_MAINTENANCE" | "TENTH" | null;
  tenthCompared: boolean;
  /** Jours soldés par l'indemnité compensatrice en fin de contrat. */
  compensatedDays?: number;
  compensationAmount?: number;
};

export type PayslipTotals = {
  grossTotal: number;
  grossSubject: number;
  employeeContributions: number;
  employerContributions: number;
  employerReductions: number;
  netSocial: number;
  netBeforeTax: number;
  netTaxable: number;
  withholdingBase: number;
  withholdingRate: number;
  withholdingTax: number;
  netPaid: number;
  employerCost: number;
  hoursPaid: number;
};

export type PayslipResult = {
  engineVersion: string;
  period: { year: number; month: number; first: IsoDay; last: IsoDay; paymentDate: IsoDay };
  employee: { id: string; displayName: string };
  lines: PayslipLine[];
  totals: PayslipTotals;
  ceiling: { monthly: number; prorated: number; reason: string };
  withholding: { mode: "PERSONALIZED" | "DEFAULT_GRID"; rate: number; base: number; amount: number; shortContractAllowance: number; rateIdentifier: string | null; source: string; fiscalNetBeforeExemption?: number; nonTaxableApprenticeIncome?: number; taxableSubrogatedIjss?: number };
  yearToDate: YearToDate;
  paidLeave: PaidLeaveOutcome | null;
  sickPayUsed: SickPayHistory;
  /** Jours de maintien consommés dans la période, par absence (historique des 12 mois glissants). */
  sickPayByAbsence: Record<string, SickPayHistory>;
  warnings: string[];
  sources: string[];
};
