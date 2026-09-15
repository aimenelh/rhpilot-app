export type SourceTrace = {
  ruleVersionId: string;
  sourceName: string;
  sourceUrl?: string | null;
  sourceReference?: string | null;
};

export type MoneyFlow = {
  grossDelta: number;
  netAdjustment: number;
};

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} est invalide.`);
}

function assertNonNegative(value: number, label: string): void {
  assertFinite(value, label);
  if (value < 0) throw new Error(`${label} ne peut pas être négatif.`);
}

function assertPositive(value: number, label: string): void {
  assertFinite(value, label);
  if (value <= 0) throw new Error(`${label} doit être strictement positif.`);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export type HourlyPremiumInput = {
  hours: number;
  baseSalaryAmount: number;
  monthlyHours: number;
  premiumRate: number;
  source: SourceTrace;
};

export type HourlyPremiumResult = {
  hours: number;
  baseHourlyRate: number;
  premiumRate: number;
  grossAmount: number;
  source: SourceTrace;
};

/**
 * Valorise des heures uniquement à partir d'un taux de majoration déjà résolu.
 * Aucun taux légal ou conventionnel n'est déduit ici.
 */
export function calculateHourlyPremium(input: HourlyPremiumInput): HourlyPremiumResult {
  assertNonNegative(input.hours, "Le nombre d'heures");
  assertNonNegative(input.baseSalaryAmount, "Le salaire mensuel de base");
  assertPositive(input.monthlyHours, "Le volume horaire mensuel");
  assertNonNegative(input.premiumRate, "Le taux de majoration");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle des heures est obligatoire.");

  const baseHourlyRate = input.baseSalaryAmount / input.monthlyHours;
  const grossAmount = input.hours * baseHourlyRate * (1 + input.premiumRate);
  return {
    hours: roundQuantity(input.hours),
    baseHourlyRate: roundMoney(baseHourlyRate),
    premiumRate: input.premiumRate,
    grossAmount: roundMoney(grossAmount),
    source: input.source,
  };
}

export type IncompleteMonthProrationInput = {
  monthlySalaryAmount: number;
  referenceUnits: number;
  payableUnits: number;
  unit: "HOURS" | "WORKING_DAYS" | "CALENDAR_DAYS";
  source: SourceTrace;
};

export type IncompleteMonthProrationResult = {
  unit: IncompleteMonthProrationInput["unit"];
  referenceUnits: number;
  payableUnits: number;
  payableSalaryAmount: number;
  grossDeduction: number;
  source: SourceTrace;
};

/**
 * Proratise un mois incomplet selon une assiette de temps explicitement fournie.
 * Le moteur ne choisit jamais lui-même heures réelles, jours ouvrés ou calendrier.
 */
export function calculateIncompleteMonthProration(input: IncompleteMonthProrationInput): IncompleteMonthProrationResult {
  assertNonNegative(input.monthlySalaryAmount, "Le salaire mensuel");
  assertPositive(input.referenceUnits, "Le nombre d'unités de référence");
  assertNonNegative(input.payableUnits, "Le nombre d'unités payables");
  if (input.payableUnits > input.referenceUnits + 1e-8) throw new Error("Les unités payables dépassent les unités de référence.");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle de proratisation est obligatoire.");

  const ratio = input.payableUnits / input.referenceUnits;
  const payableSalaryAmount = roundMoney(input.monthlySalaryAmount * ratio);
  return {
    unit: input.unit,
    referenceUnits: roundQuantity(input.referenceUnits),
    payableUnits: roundQuantity(input.payableUnits),
    payableSalaryAmount,
    grossDeduction: roundMoney(input.monthlySalaryAmount - payableSalaryAmount),
    source: input.source,
  };
}

export type NonCashBenefitResult = MoneyFlow & {
  assessedValue: number;
  kind: "NON_CASH";
  source: SourceTrace;
};

/**
 * Un avantage déjà évalué entre dans le brut puis est retiré du net à payer.
 * La méthode d'évaluation (forfait, réel, véhicule, logement...) doit être
 * déterminée en amont par une règle validée et sourcée.
 */
export function calculateNonCashBenefit(input: { assessedValue: number; source: SourceTrace }): NonCashBenefitResult {
  assertNonNegative(input.assessedValue, "La valeur de l'avantage en nature");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle de l'avantage en nature est obligatoire.");
  const amount = roundMoney(input.assessedValue);
  return { assessedValue: amount, kind: "NON_CASH", grossDelta: amount, netAdjustment: -amount, source: input.source };
}

export type ExpenseReimbursementResult = MoneyFlow & {
  reimbursedAmount: number;
  kind: "REIMBURSEMENT";
  source: SourceTrace;
};

export function calculateExpenseReimbursement(input: { reimbursedAmount: number; source: SourceTrace }): ExpenseReimbursementResult {
  assertNonNegative(input.reimbursedAmount, "Le remboursement de frais");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle du remboursement est obligatoire.");
  const amount = roundMoney(input.reimbursedAmount);
  return { reimbursedAmount: amount, kind: "REIMBURSEMENT", grossDelta: 0, netAdjustment: amount, source: input.source };
}

export type MealVoucherRule = SourceTrace & {
  minEmployerShareRate: number;
  maxEmployerShareRate: number;
  exemptionCapPerVoucher: number;
};

export type MealVoucherResult = {
  count: number;
  faceValue: number;
  employerShareRate: number;
  employerSharePerVoucher: number;
  employeeSharePerVoucher: number;
  employerTotal: number;
  employeeTotal: number;
  compliantShareRate: boolean;
  withinExemptionCap: boolean;
  status: "COMPLIANT" | "REVIEW_REQUIRED";
  source: MealVoucherRule;
};

/**
 * Calcule les parts de titres-restaurant à partir d'un référentiel daté fourni
 * par l'appelant. Les seuils ne sont volontairement pas codés dans cette fonction.
 */
export function calculateMealVouchers(input: {
  count: number;
  faceValue: number;
  employerShareRate: number;
  rule: MealVoucherRule;
}): MealVoucherResult {
  assertNonNegative(input.count, "Le nombre de titres-restaurant");
  assertNonNegative(input.faceValue, "La valeur faciale");
  assertNonNegative(input.employerShareRate, "La part employeur");
  if (input.employerShareRate > 1) throw new Error("La part employeur des titres-restaurant ne peut pas dépasser 100 %.");
  assertNonNegative(input.rule.minEmployerShareRate, "Le taux minimum employeur");
  assertNonNegative(input.rule.maxEmployerShareRate, "Le taux maximum employeur");
  assertNonNegative(input.rule.exemptionCapPerVoucher, "Le plafond d'exonération par titre");
  if (input.rule.minEmployerShareRate > input.rule.maxEmployerShareRate) throw new Error("Les bornes de part employeur sont incohérentes.");
  if (!input.rule.ruleVersionId.trim()) throw new Error("La version de règle des titres-restaurant est obligatoire.");

  const employerSharePerVoucher = roundMoney(input.faceValue * input.employerShareRate);
  const employeeSharePerVoucher = roundMoney(input.faceValue - employerSharePerVoucher);
  const compliantShareRate = input.employerShareRate >= input.rule.minEmployerShareRate && input.employerShareRate <= input.rule.maxEmployerShareRate;
  const withinExemptionCap = employerSharePerVoucher <= input.rule.exemptionCapPerVoucher + 1e-8;
  return {
    count: roundQuantity(input.count),
    faceValue: roundMoney(input.faceValue),
    employerShareRate: input.employerShareRate,
    employerSharePerVoucher,
    employeeSharePerVoucher,
    employerTotal: roundMoney(employerSharePerVoucher * input.count),
    employeeTotal: roundMoney(employeeSharePerVoucher * input.count),
    compliantShareRate,
    withinExemptionCap,
    status: compliantShareRate && withinExemptionCap ? "COMPLIANT" : "REVIEW_REQUIRED",
    source: input.rule,
  };
}

export type PaidLeaveIndemnityResult = {
  tenthMethodAmount: number;
  salaryMaintenanceAmount: number;
  selectedAmount: number;
  selectedMethod: "TENTH" | "SALARY_MAINTENANCE";
  leaveDays: number;
  source: SourceTrace;
};

export function calculatePaidLeaveIndemnity(input: {
  referenceGrossAmount: number;
  leaveDays: number;
  referenceLeaveDays: number;
  currentMonthlyGrossAmount: number;
  referenceWorkUnitsInMonth: number;
  leaveWorkUnitsInMonth: number;
  source: SourceTrace;
}): PaidLeaveIndemnityResult {
  assertNonNegative(input.referenceGrossAmount, "Le brut de référence des congés");
  assertNonNegative(input.leaveDays, "Le nombre de jours de congés");
  assertPositive(input.referenceLeaveDays, "Le nombre de jours de référence des congés");
  assertNonNegative(input.currentMonthlyGrossAmount, "Le brut mensuel courant");
  assertPositive(input.referenceWorkUnitsInMonth, "Les unités de travail du mois");
  assertNonNegative(input.leaveWorkUnitsInMonth, "Les unités de congé du mois");
  if (input.leaveWorkUnitsInMonth > input.referenceWorkUnitsInMonth + 1e-8) throw new Error("Les unités de congé dépassent les unités de travail du mois.");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle des congés payés est obligatoire.");

  const tenthMethodAmount = roundMoney((input.referenceGrossAmount / 10) * (input.leaveDays / input.referenceLeaveDays));
  const salaryMaintenanceAmount = roundMoney(input.currentMonthlyGrossAmount * (input.leaveWorkUnitsInMonth / input.referenceWorkUnitsInMonth));
  const selectedMethod = tenthMethodAmount >= salaryMaintenanceAmount ? "TENTH" : "SALARY_MAINTENANCE";
  return {
    tenthMethodAmount,
    salaryMaintenanceAmount,
    selectedAmount: selectedMethod === "TENTH" ? tenthMethodAmount : salaryMaintenanceAmount,
    selectedMethod,
    leaveDays: roundQuantity(input.leaveDays),
    source: input.source,
  };
}

export type ReplacementIncomeFlowResult = {
  absenceGrossDeduction: number;
  employerMaintenanceGross: number;
  ijssGrossDeduction: number;
  ijssNetReintegration: number;
  grossDelta: number;
  netAdjustment: number;
  subrogated: boolean;
  source: SourceTrace;
};

/**
 * Assemble des flux maladie/AT-MP/maternité/paternité déjà déterminés par des
 * règles qualifiées. Aucun montant IJSS, délai de carence ou taux de maintien
 * n'est calculé ici sans donnée source explicite.
 */
export function composeReplacementIncomeFlows(input: {
  absenceGrossDeduction: number;
  employerMaintenanceGross: number;
  ijssGrossDeduction: number;
  ijssNetReintegration: number;
  subrogated: boolean;
  source: SourceTrace;
}): ReplacementIncomeFlowResult {
  assertNonNegative(input.absenceGrossDeduction, "La retenue brute d'absence");
  assertNonNegative(input.employerMaintenanceGross, "Le maintien employeur");
  assertNonNegative(input.ijssGrossDeduction, "La déduction brute IJSS");
  assertNonNegative(input.ijssNetReintegration, "La réintégration nette IJSS");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle du revenu de remplacement est obligatoire.");

  return {
    absenceGrossDeduction: roundMoney(input.absenceGrossDeduction),
    employerMaintenanceGross: roundMoney(input.employerMaintenanceGross),
    ijssGrossDeduction: roundMoney(input.ijssGrossDeduction),
    ijssNetReintegration: roundMoney(input.ijssNetReintegration),
    grossDelta: roundMoney(-input.absenceGrossDeduction + input.employerMaintenanceGross - input.ijssGrossDeduction),
    netAdjustment: roundMoney(input.ijssNetReintegration),
    subrogated: input.subrogated,
    source: input.source,
  };
}

export type PayrollAnnualCumuls = {
  grossAmount: number;
  netTaxableAmount: number;
  netSocialAmount: number;
  withholdingTax: number;
  netPaid: number;
  employeeContributions: number;
  employerContributions: number;
};

export function calculateAnnualCumuls(rows: ReadonlyArray<Partial<PayrollAnnualCumuls>>): PayrollAnnualCumuls {
  const total: PayrollAnnualCumuls = {
    grossAmount: 0,
    netTaxableAmount: 0,
    netSocialAmount: 0,
    withholdingTax: 0,
    netPaid: 0,
    employeeContributions: 0,
    employerContributions: 0,
  };
  for (const row of rows) {
    for (const key of Object.keys(total) as Array<keyof PayrollAnnualCumuls>) {
      const value = row[key] ?? 0;
      assertNonNegative(value, `Le cumul ${key}`);
      total[key] = roundMoney(total[key] + value);
    }
  }
  return total;
}

export type PayrollRegularizationResult = {
  previousAmount: number;
  correctedAmount: number;
  delta: number;
  direction: "ADD" | "DEDUCT" | "NONE";
  source: SourceTrace;
};

export function calculateRegularization(input: { previousAmount: number; correctedAmount: number; source: SourceTrace }): PayrollRegularizationResult {
  assertFinite(input.previousAmount, "Le montant historique");
  assertFinite(input.correctedAmount, "Le montant corrigé");
  if (!input.source.ruleVersionId.trim()) throw new Error("La version de règle de régularisation est obligatoire.");
  const delta = roundMoney(input.correctedAmount - input.previousAmount);
  return {
    previousAmount: roundMoney(input.previousAmount),
    correctedAmount: roundMoney(input.correctedAmount),
    delta,
    direction: delta > 0 ? "ADD" : delta < 0 ? "DEDUCT" : "NONE",
    source: input.source,
  };
}

export type FinalSettlementComponent = {
  code: string;
  label: string;
  amount: number;
  cashImpact: number;
  source: SourceTrace;
};

export type FinalSettlementResult = {
  components: FinalSettlementComponent[];
  totalCashImpact: number;
};

/**
 * Agrège un solde de tout compte dont chaque composant a déjà été calculé selon
 * sa règle propre (salaire, préavis, ICCP, fin de CDD, rupture, frais, retenues).
 */
export function calculateFinalSettlement(components: readonly FinalSettlementComponent[]): FinalSettlementResult {
  const normalized = components.map((component) => {
    if (!component.code.trim() || !component.label.trim()) throw new Error("Chaque composant du solde de tout compte doit être identifié.");
    assertNonNegative(component.amount, `Le montant ${component.code}`);
    assertFinite(component.cashImpact, `L'impact de trésorerie ${component.code}`);
    if (!component.source.ruleVersionId.trim()) throw new Error(`La version de règle ${component.code} est obligatoire.`);
    return { ...component, amount: roundMoney(component.amount), cashImpact: roundMoney(component.cashImpact) };
  });
  return {
    components: normalized,
    totalCashImpact: roundMoney(normalized.reduce((total, component) => total + component.cashImpact, 0)),
  };
}
