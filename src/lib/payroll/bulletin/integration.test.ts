import { describe, expect, it } from "vitest";
import { computePayslip } from "./compute";
import { FULL_TIME_SCHEDULE } from "./calendar";
import { mapAbsences, mapPayrollVariables, paidLeaveReferenceYear, resolveWeeklySchedule, rollPaidLeaveBalances } from "./inputs";
import { BULLETIN_SNAPSHOT_ENGINE, resolvePriorState, type PriorCalculation } from "./prior-state";
import { parsePayrollSettingsForm } from "./settings-form";
import { buildBulletinLedger, contributionDetailsFromBulletin } from "./ledger";
import { renderBulletinPdf } from "./pdf";
import { territoryFromDepartment } from "./period-loader";
import type { AbsenceInput, PayslipInput, PayslipResult } from "./types";

function input(overrides: Partial<PayslipInput> = {}): PayslipInput {
  return {
    period: { year: 2026, month: 1 },
    organization: { headcount: 8, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: { monthlyAmount: 60, employerShare: 0.5 }, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" },
    employee: { id: "e1", displayName: "Léa Martin", contract: "CDI", executive: false, hireDate: "2022-04-01" },
    pay: { monthlyBaseSalary: 2000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
    withholding: { mode: "PERSONALIZED", rate: 0.02 },
    ...overrides,
  };
}

function snapshotOf(result: PayslipResult): unknown {
  return { calculationSource: { engine: BULLETIN_SNAPSHOT_ENGINE }, bulletin: result };
}

describe("saisie des variables", () => {
  const sick: AbsenceInput = { id: "a1", kind: "SICK_LEAVE", start: "2026-03-02", end: "2026-03-06" };

  it("répartit heures, primes, avantages, frais, titres et retenues", () => {
    const mapped = mapPayrollVariables([
      { id: "v1", code: "OVERTIME_25", label: "HS", amount: 4, unit: "HOURS" },
      { id: "v2", code: "OVERTIME_25", label: "HS", amount: 2.5, unit: "HOURS" },
      { id: "v3", code: "YEAR_END_BONUS", label: "13e mois", amount: 2000, unit: "EUR" },
      { id: "v4", code: "SENIORITY_BONUS", label: "Ancienneté", amount: 60, unit: "EUR" },
      { id: "v5", code: "BENEFIT_VEHICLE", label: "Véhicule", amount: 180, unit: "EUR" },
      { id: "v6", code: "EXPENSE_MEAL", label: "Repas", amount: 42, unit: "EUR" },
      { id: "v7", code: "MEAL_VOUCHERS", label: "Titres", amount: 19, unit: "UNITS" },
      { id: "v8", code: "SALARY_ADVANCE", label: "Acompte", amount: 300, unit: "EUR" },
      { id: "v9", code: "IJSS_GROSS", label: "IJSS", amount: 120, unit: "EUR" },
    ], [sick]);
    expect(mapped.errors).toEqual([]);
    expect(mapped.overtime.hoursFirstBand).toBe(6.5);
    expect(mapped.bonuses).toEqual([{ code: "YEAR_END_BONUS", label: "Prime de fin d'année / 13e mois", amount: 2000, excludedFromPaidLeaveBase: true }, { code: "SENIORITY_BONUS", label: "Prime d'ancienneté", amount: 60 }]);
    expect(mapped.benefitsInKind).toHaveLength(1);
    expect(mapped.expenses).toHaveLength(1);
    expect(mapped.mealVoucherCount).toBe(19);
    expect(mapped.netAdjustments).toEqual([{ code: "SALARY_ADVANCE", label: "Acompte déjà versé", amount: -300 }]);
    expect(mapped.ijssByAbsence.get("a1")).toBe(120);
  });

  it("refuse les montants que le moteur calcule, les unités incohérentes et les IJSS ambiguës", () => {
    const other: AbsenceInput = { id: "a2", kind: "WORK_ACCIDENT", start: "2026-03-16", end: "2026-03-18" };
    const mapped = mapPayrollVariables([
      { id: "v1", code: "INCOMPLETE_MONTH", label: "Prorata", amount: 500, unit: "EUR" },
      { id: "v2", code: "OVERTIME_25", label: "HS", amount: 100, unit: "EUR" },
      { id: "v3", code: "IJSS_GROSS", label: "IJSS", amount: 80, unit: "EUR" },
      { id: "v4", code: "MEAL_VOUCHERS", label: "Titres", amount: 2.5, unit: "UNITS" },
    ], [sick, other]);
    expect(mapped.errors).toHaveLength(4);
    expect(mapped.errors[0]).toMatch(/n'est plus saisie/);
    expect(mapped.errors[1]).toMatch(/heures/);
    expect(mapped.errors[2]).toMatch(/Plusieurs arrêts/);
    expect(mapped.errors[3]).toMatch(/entier/);
    const referenced = mapPayrollVariables([{ id: "v3", code: "IJSS_GROSS", label: "IJSS", amount: 80, unit: "EUR", reference: "a2" }], [sick, other]);
    expect(referenced.ijssByAbsence.get("a2")).toBe(80);
  });
});

describe("absences validées", () => {
  it("relie un arrêt initial et ses prolongations pour ne compter la carence qu'une fois", () => {
    const { absences, chainIds } = mapAbsences(
      [{ id: "p1", type: "SICK_LEAVE", startDate: "2026-03-01", endDate: "2026-03-10" }, { id: "p2", type: "SICK_LEAVE", startDate: "2026-03-11", endDate: "2026-03-20" }],
      [{ id: "e1", type: "SICK_LEAVE", startDate: "2026-02-20", endDate: "2026-02-28" }],
    );
    expect(absences).toEqual([{ id: "p1", kind: "SICK_LEAVE", start: "2026-02-20", end: "2026-03-20" }]);
    expect(new Set(chainIds.get("p1"))).toEqual(new Set(["p1", "p2", "e1"]));
  });

  it("traite une absence « Autre » comme rémunérée et le signale", () => {
    const { absences, warnings } = mapAbsences([{ id: "o1", type: "OTHER", startDate: "2026-03-05", endDate: "2026-03-05" }]);
    expect(absences[0].kind).toBe("OTHER_PAID");
    expect(warnings[0]).toMatch(/Autre/);
  });

  it("déduit un horaire hebdomadaire d'un temps partiel non renseigné", () => {
    expect(resolveWeeklySchedule(null, 151.67)).toEqual({ schedule: FULL_TIME_SCHEDULE, derived: false });
    expect(resolveWeeklySchedule(null, 121.33)).toEqual({ schedule: [5.6, 5.6, 5.6, 5.6, 5.6, 0, 0], derived: true });
    expect(resolveWeeklySchedule([7, 7, 7, 7, 0, 0, 0], 121.33).derived).toBe(false);
    expect(() => resolveWeeklySchedule([7, 7, "7", 7, 7, 0, 0], 151.67)).toThrow(/invalide/);
    expect(() => resolveWeeklySchedule([7, 7, -1, 7, 7, 0, 0], 151.67)).toThrow(/invalide/);
  });
});

describe("congés payés : bascule au 1er juin", () => {
  it("fait passer N en N-1 et reporte le reliquat en le signalant", () => {
    expect(paidLeaveReferenceYear(2026, 5)).toBe(2025);
    expect(paidLeaveReferenceYear(2026, 6)).toBe(2026);
    const rolled = rollPaidLeaveBalances({ previousAcquired: 30, previousTaken: 27, currentAcquired: 27.5, currentTaken: 2, currentReferenceGross: 26000 }, { year: 2026, month: 5 }, { year: 2026, month: 6 });
    expect(rolled.rolled).toBe(1);
    expect(rolled.carriedOver).toBe(3);
    expect(rolled.balances).toEqual({ previousAcquired: 30.5, previousTaken: 2, currentAcquired: 0, currentTaken: 0, referenceGross: 26000, referenceAcquiredDays: 27.5, currentReferenceGross: 0 });
    expect(rollPaidLeaveBalances(rolled.balances, { year: 2026, month: 6 }, { year: 2026, month: 12 }).rolled).toBe(0);
  });
});

describe("état antérieur reconstitué depuis les bulletins validés", () => {
  const january = computePayslip(input({ paidLeave: { previousAcquired: 30, previousTaken: 10, currentAcquired: 15, currentTaken: 0, referenceGross: 24000, referenceAcquiredDays: 30, currentReferenceGross: 12000 } }));
  const januaryCalc: PriorCalculation = { year: 2026, month: 1, status: "LOCKED", grossAmount: january.totals.grossTotal, snapshot: snapshotOf(january) };

  it("enchaîne les cumuls : février calculé depuis janvier égale le calcul avec les cumuls fournis", () => {
    const prior = resolvePriorState({ year: 2026, month: 2, displayName: "Léa", hireDate: "2022-04-01", calculations: [januaryCalc] });
    expect(prior.yearToDate).toEqual(january.yearToDate);
    expect(prior.paidLeave.currentAcquired).toBe(17.5);
    expect(prior.paidLeave.currentReferenceGross).toBe(14000);
    const chained = computePayslip(input({ period: { year: 2026, month: 2 }, bonuses: [{ code: "ACTIVITY_BONUS", label: "Prime", amount: 500 }], yearToDate: prior.yearToDate, paidLeave: prior.paidLeave }));
    const direct = computePayslip(input({ period: { year: 2026, month: 2 }, bonuses: [{ code: "ACTIVITY_BONUS", label: "Prime", amount: 500 }], yearToDate: january.yearToDate }));
    expect(chained.totals).toEqual(direct.totals);
    expect(chained.yearToDate.rgduAmount).toBe(direct.yearToDate.rgduAmount);
  });

  it("bloque tant qu'un mois précédent n'est pas validé", () => {
    expect(() => resolvePriorState({ year: 2026, month: 2, displayName: "Léa", hireDate: "2022-04-01", calculations: [{ ...januaryCalc, status: "CALCULATED" }] })).toThrow(/n'est pas validée/);
  });

  it("utilise la reprise de cumuls quand aucun bulletin détaillé n'existe et signale les compteurs non initialisés", () => {
    const prior = resolvePriorState({ year: 2026, month: 4, displayName: "Léa", hireDate: "2022-04-01", calculations: [], payrollOpening: { year: 2026, throughMonth: 3, cumuls: { grossSubject: 6000, ceiling: 12015, baseT1: 6000, rgduSmic: 5469, rgduRemuneration: 6000, rgduAmount: 2100 } } });
    expect(prior.yearToDate?.grossSubject).toBe(6000);
    expect(prior.yearToDate?.rgduAmount).toBe(2100);
    expect(prior.warnings.some((warning) => warning.includes("congés payés"))).toBe(true);
  });

  it("compte les jours de maintien des douze derniers mois hors arrêt en cours et garde les trois derniers bruts dans l'ordre", () => {
    const withSick = { ...january, sickPayByAbsence: { old: { fullRateDaysUsed: 10, reducedRateDaysUsed: 0 }, chain: { fullRateDaysUsed: 5, reducedRateDaysUsed: 0 } } };
    const calcs: PriorCalculation[] = [
      { year: 2025, month: 12, status: "LOCKED", grossAmount: 1900, snapshot: null },
      { year: 2026, month: 1, status: "LOCKED", grossAmount: withSick.totals.grossTotal, snapshot: snapshotOf(withSick) },
      { year: 2025, month: 11, status: "VALIDATED", grossAmount: 1800, snapshot: null },
    ];
    const prior = resolvePriorState({ year: 2026, month: 2, displayName: "Léa", hireDate: "2025-11-01", calculations: calcs, currentChainAbsenceIds: new Set(["chain"]) });
    expect(prior.sickPayHistory).toEqual({ fullRateDaysUsed: 10, reducedRateDaysUsed: 0 });
    expect(prior.previousGrossSalaries).toEqual([1800, 1900, january.totals.grossSubject]);
    expect(prior.contractGrossBefore).toBe(Math.round((1800 + 1900 + january.totals.grossTotal) * 100) / 100);
  });
});

describe("corrections issues de la relecture", () => {
  it("bascule les compteurs au 1er juin entre un bulletin de mai et celui de juin", () => {
    const may = computePayslip(input({ period: { year: 2026, month: 5 }, paidLeave: { previousAcquired: 30, previousTaken: 27, currentAcquired: 25, currentTaken: 0, referenceGross: 24000, referenceAcquiredDays: 30, currentReferenceGross: 22000 } }));
    expect(may.paidLeave?.balancesAfter.currentAcquired).toBe(27.5);
    const prior = resolvePriorState({ year: 2026, month: 6, displayName: "Léa", hireDate: "2022-04-01", calculations: [{ year: 2026, month: 5, status: "LOCKED", grossAmount: may.totals.grossTotal, snapshot: snapshotOf(may) }] });
    expect(prior.paidLeave).toEqual({ previousAcquired: 30.5, previousTaken: 0, currentAcquired: 0, currentTaken: 0, referenceGross: 24000, referenceAcquiredDays: 27.5, currentReferenceGross: 0 });
    expect(prior.warnings.some((warning) => warning.includes("reportés"))).toBe(true);
  });

  it("applique une reprise de congés recopiée du bulletin de mai en juin, bascule comprise", () => {
    const prior = resolvePriorState({ year: 2026, month: 6, displayName: "Léa", hireDate: "2022-04-01", calculations: [], paidLeaveOpening: { asOf: "2026-06-01", balances: { previousAcquired: 30, previousTaken: 30, currentAcquired: 30, currentTaken: 0, currentReferenceGross: 24000 } } });
    expect(prior.paidLeave).toMatchObject({ previousAcquired: 30, previousTaken: 0, currentAcquired: 0, referenceGross: 24000, referenceAcquiredDays: 30 });
  });

  it("estime les IJSS d'un arrêt qui se poursuit sur les mois précédant son début, pas sur ceux de la paie", () => {
    const history = [{ year: 2026, month: 5, gross: 2000 }, { year: 2026, month: 6, gross: 2000 }, { year: 2026, month: 7, gross: 2000 }, { year: 2026, month: 8, gross: 1500 }];
    const sick: AbsenceInput = { id: "s1", kind: "SICK_LEAVE", start: "2026-08-10", end: "2026-09-20" };
    const august = computePayslip(input({ period: { year: 2026, month: 8 }, absences: [sick], grossSalaryHistory: history.slice(0, 3) }));
    const september = computePayslip(input({ period: { year: 2026, month: 9 }, absences: [sick], grossSalaryHistory: history }));
    const daily = (result: PayslipResult) => {
      const detail = result.lines.find((line) => line.code === "IJSS_SUBROGATION");
      return Number(detail?.detail?.ijssGross) / Number(detail?.quantity);
    };
    expect(daily(september)).toBeCloseTo(daily(august), 2);
  });

  it("exclut une prime annuelle du dixième de l'indemnité compensatrice de sortie", () => {
    const leaver = { id: "e1", displayName: "Léa", contract: "CDI" as const, executive: false, hireDate: "2020-01-06", contractEndDate: "2026-03-31" };
    const balances = { previousAcquired: 0, previousTaken: 0, currentAcquired: 22.5, currentTaken: 0, currentReferenceGross: 18000 };
    const without = computePayslip(input({ period: { year: 2026, month: 3 }, employee: leaver, paidLeave: balances, termination: { reason: "DEMISSION" } }));
    const withBonus = computePayslip(input({ period: { year: 2026, month: 3 }, employee: leaver, paidLeave: balances, bonuses: [{ code: "YEAR_END_BONUS", label: "13e mois", amount: 2000, excludedFromPaidLeaveBase: true }], termination: { reason: "DEMISSION" } }));
    const iccp = (result: PayslipResult) => result.lines.find((line) => line.code === "PAID_LEAVE_COMPENSATION")?.amount;
    expect(iccp(withBonus)).toBe(iccp(without));
    expect(iccp(without)).toBe(2000); // (18 000 + 2 000) / 10
  });

  it("ignore un brouillon abandonné d'une année précédente mais bloque sur un mois non validé de l'année", () => {
    const stale: PriorCalculation = { year: 2025, month: 10, status: "CALCULATED", grossAmount: 2000, snapshot: null };
    const prior = resolvePriorState({ year: 2026, month: 3, displayName: "Léa", hireDate: "2022-04-01", calculations: [stale] });
    expect(prior.warnings.some((warning) => warning.includes("10/2025") && warning.includes("ignorée"))).toBe(true);
    expect(() => resolvePriorState({ year: 2026, month: 1, displayName: "Léa", hireDate: "2022-04-01", calculations: [{ ...stale, month: 12 }] })).toThrow(/n'est pas validée/);
  });
});

describe("paramètres de paie et territoire", () => {
  it("convertit les pourcentages saisis en fractions et contrôle les bornes", () => {
    const values: Record<string, string> = { payrollHeadcount: "14", mobilityRate: "1,8", paidLeaveMethod: "OUVRES", ijssSubrogation: "0", workedSolidarityDay: "1", mealVoucherFaceValue: "10", mealVoucherEmployerShare: "55", transportEmployerShare: "60", "prevoyance.cadre.employerT1": "1,5", "prevoyance.cadre.employeeT2": "0,78" };
    const parsed = parsePayrollSettingsForm((name) => values[name] ?? null);
    expect(parsed).toMatchObject({ payrollHeadcount: 14, mobilityRate: 1.8, paidLeaveMethod: "OUVRES", ijssSubrogation: false, workedSolidarityDay: true, mealVoucherEmployerShare: 0.55, transportEmployerShare: 0.6 });
    expect(parsed.prevoyanceRates).toEqual({ cadre: { employerT1: 0.015, employeeT2: 0.0078 }, nonCadre: {} });
    expect(() => parsePayrollSettingsForm((name) => ({ ...values, mealVoucherEmployerShare: "70" })[name] ?? null)).toThrow(/50 % et 60 %/);
    expect(() => parsePayrollSettingsForm((name) => ({ ...values, mealVoucherFaceValue: "" })[name] ?? null)).toThrow(/à la fois/);
  });

  it("reconnaît le régime local et l'outre-mer par code ou par nom", () => {
    expect(territoryFromDepartment("57")).toEqual({ territory: "METROPOLE", alsaceMoselle: true });
    expect(territoryFromDepartment("Bas-Rhin").alsaceMoselle).toBe(true);
    expect(territoryFromDepartment("La Réunion").territory).toBe("ANTILLES_REUNION");
    expect(territoryFromDepartment("Gard")).toEqual({ territory: "METROPOLE", alsaceMoselle: false });
  });
});

describe("sorties du bulletin : cotisations, ledger et PDF", () => {
  const result = computePayslip(input({ period: { year: 2026, month: 3 }, organization: { ...input().organization, headcount: 25, mobilityRatePercent: 1.6 }, overtime: { hoursFirstBand: 5 }, expenses: [{ code: "EXPENSE_MEAL", label: "Repas", amount: 40 }], absences: [{ id: "cp", kind: "PAID_LEAVE", start: "2026-03-16", end: "2026-03-20" }], paidLeave: { previousAcquired: 30, previousTaken: 5, currentAcquired: 20, currentTaken: 0 } }));

  it("détaille une ligne par part et réconcilie les totaux", () => {
    const details = contributionDetailsFromBulletin(result);
    const employee = details.filter((detail) => detail.side === "EMPLOYEE").reduce((total, detail) => total + detail.amount, 0);
    const employer = details.filter((detail) => detail.side === "EMPLOYER").reduce((total, detail) => total + detail.amount, 0);
    expect(employee).toBeCloseTo(result.totals.employeeContributions, 2);
    expect(employer).toBeCloseTo(result.totals.employerContributions, 2);
  });

  it("produit un ledger dont les effets recomposent le net", () => {
    const ledger = buildBulletinLedger(result, "rule-1");
    const gross = ledger.reduce((total, entry) => total + entry.grossDelta, 0);
    const net = ledger.filter((entry) => entry.code !== "PAS").reduce((total, entry) => total + entry.netDelta, 0);
    expect(gross).toBeCloseTo(result.totals.grossTotal, 2);
    expect(gross + net).toBeCloseTo(result.totals.netBeforeTax, 2);
  });

  it("édite un bulletin clarifié d'une page", async () => {
    const pdf = await renderBulletinPdf({ result, employer: { name: "Atelier Nord", address: "12 rue des Tanneurs, 59000 Lille", siret: "12345678900021", nafCode: "6201Z", urssafReference: "597000001234567" }, employee: { name: "Léa Martin", address: "", position: "Assistante", classification: "Employée", hireDate: "2022-04-01" }, collectiveAgreement: "Code du travail", paymentDate: "2026-03-31", contractMonthlyHours: 151.67 });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    // Rendu reproductible : l'espace salarié ne republie pas un bulletin identique.
    const again = await renderBulletinPdf({ result, employer: { name: "Atelier Nord", address: "12 rue des Tanneurs, 59000 Lille", siret: "12345678900021", nafCode: "6201Z", urssafReference: "597000001234567" }, employee: { name: "Léa Martin", address: "", position: "Assistante", classification: "Employée", hireDate: "2022-04-01" }, collectiveAgreement: "Code du travail", paymentDate: "2026-03-31", contractMonthlyHours: 151.67 });
    expect(again.equals(pdf)).toBe(true);
  });

  it("refuse d'éditer un bulletin sans les mentions obligatoires", () => {
    expect(() => renderBulletinPdf({ result, employer: { name: "Atelier Nord", address: "", siret: "", nafCode: "6201Z" }, employee: { name: "Léa Martin", address: "", position: "", classification: "Employée", hireDate: "2022-04-01" }, collectiveAgreement: "Code du travail", paymentDate: "2026-03-31", contractMonthlyHours: 151.67 })).toThrow(/obligatoires/);
  });
});

describe("limites d'exonération des frais professionnels", () => {
  it("réintègre au brut le forfait mobilités durables au-delà de 600 € par an", () => {
    const withinCap = computePayslip(input({ period: { year: 2026, month: 3 }, expenses: [{ code: "SUSTAINABLE_MOBILITY", label: "Forfait mobilités durables", amount: 50 }] }));
    expect(withinCap.lines.some((line) => line.code === "SUSTAINABLE_MOBILITY_EXCESS")).toBe(false);
    expect(withinCap.yearToDate.sustainableMobility).toBe(50);

    const beyond = computePayslip(input({ period: { year: 2026, month: 3 }, expenses: [{ code: "SUSTAINABLE_MOBILITY", label: "Forfait mobilités durables", amount: 100 }], yearToDate: { ...withinCap.yearToDate, sustainableMobility: 550 } }));
    const excess = beyond.lines.find((line) => line.code === "SUSTAINABLE_MOBILITY_EXCESS");
    expect(excess?.amount).toBe(50);
    expect(beyond.lines.find((line) => line.code === "SUSTAINABLE_MOBILITY" && line.section !== "GROSS")?.amount).toBe(50);
  });

  it("signale la limite par repas des indemnités de repas", () => {
    const result = computePayslip(input({ period: { year: 2026, month: 3 }, expenses: [{ code: "EXPENSE_MEAL", label: "Indemnités de repas", amount: 40 }] }));
    expect(result.warnings.some((warning) => warning.includes("21,40 €"))).toBe(true);
    expect(result.lines.some((line) => line.code === "MEAL_ALLOWANCE_EXCESS")).toBe(false);
  });
});
