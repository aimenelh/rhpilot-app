export const BENEFITS_EXPENSES_RULE_VERSION = "FR-BENEFITS-EXPENSES-2026-01";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être un montant positif ou nul.`);
}

export type PayrollElementAmount = {
  amount: number;
  grossDelta: number;
  netAdjustment: number;
  kind: "NON_CASH" | "REIMBURSEMENT" | "DEDUCT_FROM_NET" | "INFORMATIONAL";
  ruleVersionId: string;
  sourceReference: string;
  metadata: Record<string, string | number | boolean | null>;
};

export function calculateMealBenefit2026(input: {
  meals: number;
  employeeContributionPerMeal?: number;
  hcr?: boolean;
  benefitDate?: Date;
}): PayrollElementAmount {
  if (!Number.isInteger(input.meals) || input.meals < 0) throw new Error("Le nombre de repas doit être un entier positif ou nul.");
  const employeeContribution = input.employeeContributionPerMeal ?? 0;
  assertFiniteNonNegative(employeeContribution, "La participation du salarié par repas");

  const date = input.benefitDate ?? new Date(Date.UTC(2026, 6, 1));
  const hcrValue = date < new Date(Date.UTC(2026, 5, 1)) ? 4.25 : 4.35;
  const forfait = input.hcr ? hcrValue : 5.5;
  const perMealBenefit = employeeContribution >= forfait / 2 ? 0 : Math.max(0, forfait - employeeContribution);
  const amount = roundMoney(input.meals * perMealBenefit);

  return {
    amount,
    grossDelta: amount,
    netAdjustment: -amount,
    kind: "NON_CASH",
    ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
    sourceReference: "Urssaf — avantages en nature, barèmes 2026",
    metadata: {
      meals: input.meals,
      forfaitPerMeal: forfait,
      employeeContributionPerMeal: employeeContribution,
      hcr: Boolean(input.hcr),
    },
  };
}

const HOUSING_2026 = [
  { max: 2002.5, oneRoom: 79.7, perRoom: 42.6 },
  { max: 2403, oneRoom: 93.0, perRoom: 59.7 },
  { max: 2803.5, oneRoom: 106.2, perRoom: 79.7 },
  { max: 3604.5, oneRoom: 119.4, perRoom: 99.5 },
  { max: 4405.5, oneRoom: 146.4, perRoom: 126.1 },
  { max: 5206.5, oneRoom: 172.6, perRoom: 152.4 },
  { max: 6007.5, oneRoom: 199.4, perRoom: 185.7 },
  { max: Number.POSITIVE_INFINITY, oneRoom: 225.6, perRoom: 212.3 },
] as const;

export function calculateHousingBenefit2026(input: {
  monthlyGrossReference: number;
  principalRooms: number;
  employeeContribution?: number;
}): PayrollElementAmount {
  assertFiniteNonNegative(input.monthlyGrossReference, "La rémunération brute mensuelle de référence");
  if (!Number.isInteger(input.principalRooms) || input.principalRooms < 1) throw new Error("Le nombre de pièces principales doit être au moins égal à 1.");
  const contribution = input.employeeContribution ?? 0;
  assertFiniteNonNegative(contribution, "La participation du salarié au logement");

  const band = HOUSING_2026.find((candidate) => input.monthlyGrossReference < candidate.max) ?? HOUSING_2026[HOUSING_2026.length - 1];
  const forfait = input.principalRooms === 1 ? band.oneRoom : band.perRoom * input.principalRooms;
  const amount = roundMoney(Math.max(0, forfait - contribution));
  return {
    amount,
    grossDelta: amount,
    netAdjustment: -amount,
    kind: "NON_CASH",
    ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
    sourceReference: "Urssaf — avantage en nature logement, barème 2026",
    metadata: {
      monthlyGrossReference: input.monthlyGrossReference,
      principalRooms: input.principalRooms,
      forfait: roundMoney(forfait),
      employeeContribution: contribution,
    },
  };
}

export function calculateNticBenefit(input: {
  equipmentPurchaseCost: number;
  monthlySubscriptionCost?: number;
  privateUseShare?: number;
}): PayrollElementAmount {
  assertFiniteNonNegative(input.equipmentPurchaseCost, "Le coût d'achat des équipements NTIC");
  const subscription = input.monthlySubscriptionCost ?? 0;
  assertFiniteNonNegative(subscription, "Le coût mensuel des abonnements NTIC");
  const privateUseShare = input.privateUseShare ?? 1;
  if (!Number.isFinite(privateUseShare) || privateUseShare < 0 || privateUseShare > 1) throw new Error("La quote-part d'usage privé NTIC doit être comprise entre 0 et 1.");
  const annualBase = input.equipmentPurchaseCost + subscription * 12;
  const amount = roundMoney((annualBase * 0.1 * privateUseShare) / 12);
  return {
    amount,
    grossDelta: amount,
    netAdjustment: -amount,
    kind: "NON_CASH",
    ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
    sourceReference: "Urssaf / Mon-entreprise — avantage en nature NTIC, forfait 10 % annuel",
    metadata: { annualBase: roundMoney(annualBase), privateUseShare },
  };
}

export function calculateVehicleBenefit2026(input: {
  assignmentDate: Date;
  ownership: "PURCHASED" | "LEASED";
  purchaseCost?: number;
  vehicleOlderThanFiveYears?: boolean;
  annualLeaseInsuranceMaintenanceCost?: number;
  employerPaysFuel?: boolean;
  annualPrivateFuelCost?: number;
  useAllInclusiveFuelRate?: boolean;
  electricEligible?: boolean;
}): PayrollElementAmount {
  if (!(input.assignmentDate instanceof Date) || Number.isNaN(input.assignmentDate.getTime())) throw new Error("La date de mise à disposition du véhicule est invalide.");
  const postReform = input.assignmentDate >= new Date(Date.UTC(2025, 1, 1));
  const fuel = input.employerPaysFuel ? input.annualPrivateFuelCost ?? 0 : 0;
  assertFiniteNonNegative(fuel, "Les frais annuels de carburant privé");

  let annual = 0;
  if (input.ownership === "PURCHASED") {
    const cost = input.purchaseCost ?? Number.NaN;
    assertFiniteNonNegative(cost, "Le coût d'achat du véhicule");
    const old = Boolean(input.vehicleOlderThanFiveYears);
    const noFuelRate = postReform ? (old ? 0.1 : 0.15) : (old ? 0.06 : 0.09);
    const allInclusiveFuelRate = postReform ? (old ? 0.15 : 0.2) : (old ? 0.09 : 0.12);
    annual = input.employerPaysFuel
      ? input.useAllInclusiveFuelRate
        ? cost * allInclusiveFuelRate
        : cost * noFuelRate + fuel
      : cost * noFuelRate;
  } else {
    const cost = input.annualLeaseInsuranceMaintenanceCost ?? Number.NaN;
    assertFiniteNonNegative(cost, "Le coût global annuel de location, entretien et assurance");
    const noFuelRate = postReform ? 0.5 : 0.3;
    const allInclusiveFuelRate = postReform ? 0.67 : 0.4;
    annual = input.employerPaysFuel
      ? input.useAllInclusiveFuelRate
        ? (cost + fuel) * allInclusiveFuelRate
        : cost * noFuelRate + fuel
      : cost * noFuelRate;
  }

  if (input.electricEligible) {
    const reductionRate = postReform ? 0.7 : 0.5;
    const annualCap = postReform ? 4641.6 : 2026.3;
    annual = Math.max(0, annual - Math.min(annual * reductionRate, annualCap));
  }

  const amount = roundMoney(annual / 12);
  return {
    amount,
    grossDelta: amount,
    netAdjustment: -amount,
    kind: "NON_CASH",
    ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
    sourceReference: "Urssaf — avantage en nature véhicule, règles applicables en 2026",
    metadata: {
      postFebruary2025Rules: postReform,
      annualBenefit: roundMoney(annual),
      employerPaysFuel: Boolean(input.employerPaysFuel),
      electricEligible: Boolean(input.electricEligible),
    },
  };
}

export function calculateMealVouchers2026(input: {
  count: number;
  faceValue: number;
  employerContributionPerVoucher: number;
}): {
  employeeDeduction: PayrollElementAmount;
  employerExemptAmount: number;
  employerSubjectToContributions: number;
  employerShareRate: number;
  exemptionConditionsMet: boolean;
} {
  if (!Number.isInteger(input.count) || input.count < 0) throw new Error("Le nombre de titres-restaurant doit être un entier positif ou nul.");
  assertFiniteNonNegative(input.faceValue, "La valeur faciale du titre-restaurant");
  assertFiniteNonNegative(input.employerContributionPerVoucher, "La participation employeur au titre-restaurant");
  if (input.employerContributionPerVoucher > input.faceValue) throw new Error("La participation employeur ne peut pas dépasser la valeur faciale du titre-restaurant.");

  const employerShareRate = input.faceValue === 0 ? 0 : input.employerContributionPerVoucher / input.faceValue;
  const exemptionConditionsMet = employerShareRate >= 0.5 && employerShareRate <= 0.6;
  const exemptPerVoucher = exemptionConditionsMet ? Math.min(input.employerContributionPerVoucher, 7.32) : 0;
  const employerExemptAmount = roundMoney(exemptPerVoucher * input.count);
  const totalEmployer = roundMoney(input.employerContributionPerVoucher * input.count);
  const employerSubjectToContributions = roundMoney(Math.max(0, totalEmployer - employerExemptAmount));
  const employeeContribution = roundMoney((input.faceValue - input.employerContributionPerVoucher) * input.count);

  return {
    employeeDeduction: {
      amount: employeeContribution,
      grossDelta: 0,
      netAdjustment: -employeeContribution,
      kind: "DEDUCT_FROM_NET",
      ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
      sourceReference: "Urssaf — titres-restaurant, barèmes 2026",
      metadata: { count: input.count, faceValue: input.faceValue, employerContributionPerVoucher: input.employerContributionPerVoucher },
    },
    employerExemptAmount,
    employerSubjectToContributions,
    employerShareRate,
    exemptionConditionsMet,
  };
}

export function calculateActualExpenseReimbursement(input: {
  amount: number;
  justified: boolean;
  code?: string;
}): PayrollElementAmount {
  assertFiniteNonNegative(input.amount, "Le montant des frais professionnels");
  if (!input.justified) throw new Error("Le remboursement de frais réels est bloqué tant que la dépense professionnelle n'est pas justifiée.");
  return {
    amount: roundMoney(input.amount),
    grossDelta: 0,
    netAdjustment: roundMoney(input.amount),
    kind: "REIMBURSEMENT",
    ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
    sourceReference: "Urssaf — frais professionnels 2026",
    metadata: { justified: true, code: input.code ?? "EXPENSE_REAL" },
  };
}

export function calculatePublicTransportReimbursement2026(input: {
  subscriptionCost: number;
  employerRate?: number;
  partTimeRatio?: number;
}): PayrollElementAmount & { exemptAmount: number; subjectToContributions: number } {
  assertFiniteNonNegative(input.subscriptionCost, "Le coût de l'abonnement de transport");
  const employerRate = input.employerRate ?? 0.5;
  if (!Number.isFinite(employerRate) || employerRate < 0.5 || employerRate > 1) throw new Error("Le taux de prise en charge transport doit être compris entre 50 % et 100 %.");
  const partTimeRatio = input.partTimeRatio ?? 1;
  if (!Number.isFinite(partTimeRatio) || partTimeRatio < 0 || partTimeRatio > 1) throw new Error("Le ratio temps partiel transport est invalide.");

  const amount = roundMoney(input.subscriptionCost * employerRate * partTimeRatio);
  const exemptCeiling = roundMoney(input.subscriptionCost * 0.75 * partTimeRatio);
  const exemptAmount = Math.min(amount, exemptCeiling);
  const subjectToContributions = roundMoney(Math.max(0, amount - exemptAmount));
  return {
    amount,
    grossDelta: 0,
    netAdjustment: amount,
    kind: "REIMBURSEMENT",
    ruleVersionId: BENEFITS_EXPENSES_RULE_VERSION,
    sourceReference: "Urssaf / Service-Public — transport public domicile-travail 2026",
    metadata: { subscriptionCost: input.subscriptionCost, employerRate, partTimeRatio },
    exemptAmount,
    subjectToContributions,
  };
}
