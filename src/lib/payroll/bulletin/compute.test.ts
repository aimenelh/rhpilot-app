import { describe, expect, it } from "vitest";
import { computePayslip, emptyYearToDate } from "./compute";
import { FULL_TIME_SCHEDULE, easterSunday, paidLeaveDaysForAbsence, publicHolidays } from "./calendar";
import { PAS_DEFAULT_GRIDS, pasBracketRate, valueAt } from "./params";
import type { PayslipInput, PayslipResult } from "./types";

function base(overrides: Partial<PayslipInput> = {}): PayslipInput {
  return {
    period: { year: 2026, month: 3 },
    organization: { headcount: 4, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: { monthlyAmount: 60, employerShare: 0.5 }, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" },
    employee: { id: "e1", displayName: "Léa Martin", contract: "CDI", executive: false, hireDate: "2023-01-15" },
    pay: { monthlyBaseSalary: 2500, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
    withholding: { mode: "PERSONALIZED", rate: 0 },
    ...overrides,
  };
}

const lineOf = (result: PayslipResult, code: string) => result.lines.find((line) => line.code === code);
const amountOf = (result: PayslipResult, code: string) => lineOf(result, code)?.amount ?? 0;
const employerOf = (result: PayslipResult, code: string) => lineOf(result, code)?.employerAmount ?? 0;

describe("calendrier de paie", () => {
  it("calcule Pâques et les jours fériés 2026", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    const holidays = publicHolidays(2026);
    expect(holidays.get("2026-04-06")).toBe("Lundi de Pâques");
    expect(holidays.get("2026-05-14")).toBe("Ascension");
    expect(holidays.get("2026-05-25")).toBe("Lundi de Pentecôte");
    expect(publicHolidays(2026, { workedSolidarityDay: true }).has("2026-05-25")).toBe(false);
  });

  it("décompte une semaine de congés du lundi au vendredi comme 6 jours ouvrables ou 5 jours ouvrés", () => {
    const holidays = publicHolidays(2026);
    const common = { absenceStart: "2026-03-23", absenceEnd: "2026-03-27", windowStart: "2026-03-01", windowEnd: "2026-03-31", schedule: FULL_TIME_SCHEDULE, holidays };
    expect(paidLeaveDaysForAbsence({ ...common, method: "OUVRABLES" })).toBe(6);
    expect(paidLeaveDaysForAbsence({ ...common, method: "OUVRES" })).toBe(5);
    // Semaine du lundi de Pâques : le jour férié n'est pas décompté.
    expect(paidLeaveDaysForAbsence({ ...common, absenceStart: "2026-04-06", absenceEnd: "2026-04-10", windowStart: "2026-04-01", windowEnd: "2026-04-30", method: "OUVRABLES" })).toBe(5);
  });
});

describe("moteur de bulletin — mois incomplets et absences", () => {
  it("proratise une entrée en cours de mois sur l'horaire réel et le plafond sur les jours civils", () => {
    const result = computePayslip(base({ employee: { id: "e1", displayName: "Léa Martin", contract: "CDI", executive: false, hireDate: "2026-03-16" } }));
    expect(amountOf(result, "ENTRY_EXIT")).toBe(-1136.36); // 2 500 × 70 h / 154 h
    expect(result.totals.grossTotal).toBe(1363.64);
    expect(result.ceiling.prorated).toBe(2067.1); // 4 005 × 16 / 31
    expect(lineOf(result, "VIEILLESSE_PLAF")?.base).toBe(1363.64);
    // Même coefficient qu'un mois complet à 2 500 € : la RGDU est proportionnelle.
    expect(lineOf(result, "RGDU")?.employerRate).toBe(0.1719);
    expect(employerOf(result, "RGDU")).toBe(-234.41);
  });

  it("retient une absence non rémunérée et réduit le plafond des jours civils entiers", () => {
    const result = computePayslip(base({ absences: [{ id: "a1", kind: "UNPAID_LEAVE", start: "2026-03-10", end: "2026-03-11" }] }));
    expect(amountOf(result, "ABS_UNPAID_LEAVE")).toBe(-227.27);
    expect(result.totals.grossTotal).toBe(2272.73);
    expect(result.ceiling.prorated).toBe(3746.61);
  });

  it("n'abaisse pas le plafond pour une absence d'une demi-journée", () => {
    const result = computePayslip(base({ absences: [{ id: "a1", kind: "UNPAID_LEAVE", start: "2026-03-10", end: "2026-03-10", partialDayHours: { "2026-03-10": 3.5 } }] }));
    expect(amountOf(result, "ABS_UNPAID_LEAVE")).toBe(-56.82);
    expect(result.ceiling.prorated).toBe(4005);
  });

  it("calcule le maintien légal maladie après 7 jours de carence, IJSS déduites, avec subrogation", () => {
    const result = computePayslip(base({ absences: [{ id: "m1", kind: "SICK_LEAVE", start: "2026-03-09", end: "2026-03-18", ijssGrossAmount: 210 }] }));
    expect(amountOf(result, "ABS_SICK_LEAVE")).toBe(-909.09); // 56 h
    expect(amountOf(result, "SICK_MAINTENANCE")).toBe(216.82); // 90 % × 3 jours − 90 € d'IJSS
    expect(result.sickPayUsed).toEqual({ fullRateDaysUsed: 3, reducedRateDaysUsed: 0 });
    expect(amountOf(result, "IJSS_SUBROGATION")).toBe(195.93); // 210 × (1 − 6,7 %)
    expect(result.totals.grossTotal).toBe(1807.73);
    expect(result.ceiling.prorated).toBe(3100.65); // 7 jours de carence non payés
    const withoutIjss = result.totals.grossTotal - result.totals.employeeContributions;
    expect(result.totals.netBeforeTax).toBeCloseTo(withoutIjss + 195.93, 2);
    expect(result.totals.netSocial).toBeCloseTo(withoutIjss + 195.93, 2);
  });

  it("n'indemnise pas la maladie d'un salarié de moins d'un an d'ancienneté mais reverse les IJSS subrogées", () => {
    const result = computePayslip(base({ employee: { id: "e1", displayName: "Léa Martin", contract: "CDI", executive: false, hireDate: "2025-10-01" }, absences: [{ id: "m1", kind: "SICK_LEAVE", start: "2026-03-09", end: "2026-03-18", ijssGrossAmount: 210 }] }));
    expect(lineOf(result, "SICK_MAINTENANCE")).toBeUndefined();
    expect(amountOf(result, "IJSS_SUBROGATION")).toBe(195.93);
    expect(result.ceiling.prorated).toBe(round(4005 * 21 / 31));
  });

  it("bloque un arrêt maladie sans IJSS connues ni salaires de référence", () => {
    expect(() => computePayslip(base({ absences: [{ id: "m1", kind: "SICK_LEAVE", start: "2026-03-09", end: "2026-03-18" }] }))).toThrow(/trois derniers salaires/);
  });

  it("estime les IJSS maladie à partir des trois derniers bruts et le signale", () => {
    const result = computePayslip(base({ previousGrossSalaries: [2500, 2500, 2500], absences: [{ id: "m1", kind: "SICK_LEAVE", start: "2026-03-09", end: "2026-03-18" }] }));
    // SJB = 7 500 / 91,25 = 82,19 ; 50 % = 41,09 € par jour ; 7 jours indemnisés.
    const ijssGross = lineOf(result, "IJSS_SUBROGATION")?.detail?.ijssGross;
    expect(ijssGross).toBe(287.63);
    expect(result.warnings.some((warning) => warning.includes("IJSS estimées"))).toBe(true);
  });

  it("paie les congés payés au maintien et décompte 6 jours ouvrables sur le solde N-1", () => {
    const result = computePayslip(base({ absences: [{ id: "c1", kind: "PAID_LEAVE", start: "2026-03-23", end: "2026-03-27" }], paidLeave: { previousAcquired: 25, previousTaken: 10, currentAcquired: 20, currentTaken: 0 } }));
    expect(amountOf(result, "ABS_PAID_LEAVE")).toBe(-568.18);
    expect(amountOf(result, "CP_INDEMNITY")).toBe(568.18);
    expect(result.totals.grossTotal).toBe(2500);
    expect(result.paidLeave?.daysTaken).toBe(6);
    expect(result.paidLeave?.balancesAfter.previousTaken).toBe(16);
    expect(result.paidLeave?.acquiredThisMonth).toBe(2.5);
    expect(result.paidLeave?.balancesAfter.currentAcquired).toBe(22.5);
  });

  it("retient la règle du dixième quand elle est plus favorable", () => {
    const result = computePayslip(base({ absences: [{ id: "c1", kind: "PAID_LEAVE", start: "2026-03-23", end: "2026-03-27" }], paidLeave: { previousAcquired: 30, previousTaken: 0, currentAcquired: 0, currentTaken: 0, referenceGross: 30000, referenceAcquiredDays: 30 } }));
    expect(amountOf(result, "CP_INDEMNITY")).toBe(600); // 30 000 / 10 × 6 / 30
    expect(result.paidLeave?.indemnityMethod).toBe("TENTH");
    expect(result.totals.grossTotal).toBe(2531.82);
  });
});

describe("moteur de bulletin — cumuls et régularisation progressive", () => {
  it("régularise la tranche 2 et la CET quand le cumul repasse sous le plafond cumulé", () => {
    const cadre = { id: "c1", displayName: "Marc Dubois", contract: "CDI" as const, executive: true, hireDate: "2020-01-01" };
    const january = computePayslip(base({ period: { year: 2026, month: 1 }, employee: cadre, pay: { monthlyBaseSalary: 5000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } }));
    expect(lineOf(january, "RETRAITE_T1")?.base).toBe(4005);
    expect(lineOf(january, "RETRAITE_T2")?.base).toBe(995);
    expect(lineOf(january, "CET")?.base).toBe(5000);
    const february = computePayslip(base({ period: { year: 2026, month: 2 }, employee: cadre, pay: { monthlyBaseSalary: 3000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE }, yearToDate: january.yearToDate }));
    expect(lineOf(february, "RETRAITE_T1")?.base).toBe(3995);
    expect(lineOf(february, "RETRAITE_T2")?.base).toBe(-995);
    expect(amountOf(february, "RETRAITE_T2")).toBe(-96.71); // 995 × 9,72 %
    expect(lineOf(february, "CET")?.base).toBe(-5000);
    expect(amountOf(february, "CET")).toBe(-7);
    expect(february.yearToDate.baseT1).toBe(8000);
    expect(february.yearToDate.baseT2).toBe(0);
  });

  it("calcule la RGDU sur les cumuls annuels et régularise le mois de prime", () => {
    const smic = base({ period: { year: 2026, month: 1 }, pay: { monthlyBaseSalary: 1823.03, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } });
    const january = computePayslip(smic);
    expect(lineOf(january, "RGDU")?.employerRate).toBe(0.3981);
    expect(employerOf(january, "RGDU")).toBe(-725.75);
    const february = computePayslip({ ...smic, period: { year: 2026, month: 2 }, bonuses: [{ code: "EXCEPTIONAL_BONUS", label: "Prime exceptionnelle", amount: 500 }], yearToDate: january.yearToDate });
    expect(lineOf(february, "RGDU")?.employerRate).toBe(0.2867);
    expect(employerOf(february, "RGDU")).toBe(-462.93);
    expect(february.yearToDate.rgduAmount).toBe(1188.68);
  });

  it("garde le Smic du 1er janvier pour la RGDU après la revalorisation de juin 2026", () => {
    const june = computePayslip(base({ period: { year: 2026, month: 9 }, pay: { monthlyBaseSalary: 1867.02, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } }));
    // 1 867,02 € (Smic de juin) est au-dessus du Smic figé à 12,02 €/h : coefficient inférieur au maximum.
    expect(lineOf(june, "RGDU")?.employerRate).toBeLessThan(0.3981);
    expect(lineOf(june, "RGDU")?.detail?.cumulativeSmic).toBe(1823.07);
  });

  it("ignore des cumuls d'une autre année", () => {
    const result = computePayslip(base({ yearToDate: { ...emptyYearToDate(2025), grossSubject: 30000 } }));
    expect(result.yearToDate.grossSubject).toBe(2500);
    expect(result.warnings.some((warning) => warning.includes("autre année"))).toBe(true);
  });
});

describe("moteur de bulletin — heures supplémentaires", () => {
  it("valorise les heures structurelles d'un contrat à 39 h et applique leurs exonérations", () => {
    const result = computePayslip(base({ pay: { monthlyBaseSalary: 2500, contractMonthlyHours: 169, structuralOvertimeMonthlyHours: 17.33, schedule: [7.8, 7.8, 7.8, 7.8, 7.8, 0, 0] } }));
    expect(amountOf(result, "BASE")).toBe(2187.56);
    expect(amountOf(result, "HS_STRUCT")).toBe(312.44);
    expect(result.totals.grossTotal).toBe(2500);
    expect(amountOf(result, "REDUCTION_HS_SALARIALE")).toBe(-35.34); // 312,44 × 11,31 %
    expect(employerOf(result, "DEDUCTION_HS_PATRONALE")).toBe(-26); // 17,33 h × 1,50 €
    expect(lineOf(result, "RGDU")?.detail?.cumulativeSmic).toBe(2031.38); // 169 h × 12,02 €
  });

  it("n'exonère d'impôt que le reliquat du plafond annuel de 7 500 € nets", () => {
    const ytd = { ...emptyYearToDate(2026), overtimeTaxExemptGross: 8000, grossSubject: 20000, ceiling: 20025, baseT1: 20000, baseFourCeilings: 20000, csgGross: 20000, csgWithinFourCeilings: 20000, rgduSmic: 9115.37, rgduRemuneration: 20000, rgduAmount: 0 };
    const result = computePayslip(base({ period: { year: 2026, month: 6 }, overtime: { hoursFirstBand: 10 }, yearToDate: ytd }));
    expect(amountOf(result, "HS_25")).toBe(206.04);
    expect(lineOf(result, "CSG_NON_IMPOSABLE")?.base).toBe(36.3); // (8 036,95 − 8 000) × 98,25 %
    expect(result.warnings.some((warning) => warning.includes("7 500"))).toBe(true);
  });

  it("refuse des heures complémentaires pour un temps plein et des heures sup pour un temps partiel", () => {
    expect(() => computePayslip(base({ complementaryHours: { hoursWithinTenth: 2 } }))).toThrow(/temps partiel/);
    expect(() => computePayslip(base({ pay: { monthlyBaseSalary: 1500, contractMonthlyHours: 104, schedule: [4.8, 4.8, 4.8, 4.8, 4.8, 0, 0] }, overtime: { hoursFirstBand: 2 } }))).toThrow(/heures complémentaires/);
  });
});

describe("moteur de bulletin — prélèvement à la source", () => {
  it("applique la grille 2025 jusqu'au 30 avril 2026 puis la grille 2026", () => {
    const april = valueAt(PAS_DEFAULT_GRIDS, new Date(Date.UTC(2026, 3, 30)), "grille").value.METROPOLE;
    const may = valueAt(PAS_DEFAULT_GRIDS, new Date(Date.UTC(2026, 4, 1)), "grille").value.METROPOLE;
    expect(pasBracketRate(april, 1630)).toBe(0.005);
    expect(pasBracketRate(may, 1630)).toBe(0);
    expect(pasBracketRate(may, 2000)).toBe(0.029);
    expect(pasBracketRate(may, 60000)).toBe(0.43);
  });

  it("applique la grille par défaut au net imposable et le signale", () => {
    const result = computePayslip(base({ period: { year: 2026, month: 5 }, withholding: { mode: "DEFAULT_GRID" } }));
    const may = valueAt(PAS_DEFAULT_GRIDS, new Date(Date.UTC(2026, 4, 31)), "grille").value.METROPOLE;
    expect(result.withholding.rate).toBe(pasBracketRate(may, result.totals.netTaxable));
    expect(result.totals.withholdingTax).toBeCloseTo(result.totals.netTaxable * result.withholding.rate, 2);
    expect(result.totals.netPaid).toBeCloseTo(result.totals.netBeforeTax - result.totals.withholdingTax, 2);
    expect(result.warnings.some((warning) => warning.includes("grille de taux par défaut"))).toBe(true);
  });

  it("déduit l'abattement des contrats courts avant d'appliquer la grille", () => {
    const march = computePayslip(base({ employee: { id: "e1", displayName: "Léa Martin", contract: "CDD", executive: false, hireDate: "2026-03-01", contractEndDate: "2026-04-15", plannedContractDays: 46 }, withholding: { mode: "DEFAULT_GRID" } }));
    expect(march.withholding.shortContractAllowance).toBe(748);
    expect(march.withholding.base).toBeCloseTo(march.totals.netTaxable - 748, 2);
    const june = computePayslip(base({ period: { year: 2026, month: 6 }, employee: { id: "e1", displayName: "Léa Martin", contract: "CDD", executive: false, hireDate: "2026-06-01", contractEndDate: "2026-07-15", plannedContractDays: 45 }, withholding: { mode: "DEFAULT_GRID" } }));
    expect(june.withholding.shortContractAllowance).toBe(766);
  });

  it("applique le taux personnalisé transmis par la DGFiP", () => {
    const result = computePayslip(base({ withholding: { mode: "PERSONALIZED", rate: 0.052, rateIdentifier: "123" } }));
    expect(result.totals.withholdingTax).toBe(Math.round(result.totals.netTaxable * 0.052 * 100) / 100);
    expect(result.withholding.rateIdentifier).toBe("123");
  });
});

describe("moteur de bulletin — éléments hors brut et contrôles", () => {
  it("intègre titres-restaurant, transport, frais et avantages en nature sans fausser le brut", () => {
    const result = computePayslip(base({
      mealVouchers: { count: 20, faceValue: 13, employerShare: 0.6 },
      publicTransport: { monthlySubscription: 44.5, employerShare: 0.5 },
      expenses: [{ code: "EXPENSE_REAL", label: "Frais de déplacement", amount: 38.4 }],
      benefitsInKind: [{ code: "BENEFIT_MEAL", label: "Avantage en nature repas", amount: 22 }],
    }));
    // 13 × 60 % = 7,80 € : 0,48 € au-delà de l'exonération de 7,32 € par titre.
    expect(amountOf(result, "MEAL_VOUCHER_EXCESS")).toBe(9.6);
    expect(amountOf(result, "MEAL_VOUCHER_EMPLOYEE")).toBe(-104); // 20 × 5,20 €
    expect(amountOf(result, "PUBLIC_TRANSPORT")).toBe(22.25);
    expect(result.totals.grossTotal).toBe(2531.6); // 2 500 + 22 + 9,60
    const expected = result.totals.grossTotal - result.totals.employeeContributions - 22 - 9.6 - 104 + 22.25 + 38.4;
    expect(result.totals.netBeforeTax).toBeCloseTo(expected, 2);
  });

  it("exonère l'apprenti d'impôt jusqu'au Smic", () => {
    const result = computePayslip(base({ employee: { id: "a1", displayName: "Inès Roux", contract: "APPRENTISSAGE", executive: false, hireDate: "2025-09-01" }, pay: { monthlyBaseSalary: 1100, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE } }));
    expect(result.totals.netTaxable).toBe(0);
    expect(lineOf(result, "FORMATION")).toBeUndefined();
  });

  it("bloque les contextes non pris en charge plutôt que d'approximer", () => {
    expect(() => computePayslip(base({ period: { year: 2025, month: 12 } }))).toThrow(/à compter du/);
    expect(() => computePayslip(base({ organization: { ...base().organization, territory: "ANTILLES_REUNION" } }))).toThrow(/outre-mer/);
    expect(() => computePayslip(base({ organization: { ...base().organization, headcount: 0 } }))).toThrow(/effectif/);
    expect(() => computePayslip(base({ mealVouchers: { count: 10, faceValue: 10, employerShare: 0.7 } }))).toThrow(/50 % et 60 %/);
    expect(() => computePayslip(base({ publicTransport: { monthlySubscription: 50, employerShare: 0.4 } }))).toThrow(/50 %/);
  });

  it("applique le régime local d'Alsace-Moselle : cotisation de 1,30 %, taxe d'apprentissage réduite et jours fériés locaux", () => {
    const result = computePayslip(base({ period: { year: 2026, month: 4 }, organization: { ...base().organization, alsaceMoselle: true }, absences: [{ id: "u1", kind: "UNPAID_LEAVE", start: "2026-04-03", end: "2026-04-03" }] }));
    // Le Vendredi saint (3 avril 2026) est férié en Alsace-Moselle : aucune retenue ce jour-là.
    expect(lineOf(result, "ABS_UNPAID_LEAVE")).toBeUndefined();
    const monthly = computePayslip(base({ organization: { ...base().organization, alsaceMoselle: true } }));
    expect(amountOf(monthly, "MALADIE_ALSACE_MOSELLE")).toBe(32.5);
    expect(lineOf(monthly, "TAXE_APPRENTISSAGE")?.employerRate).toBe(0.0044);
    expect(lineOf(monthly, "TAXE_APPRENTISSAGE_SOLDE")).toBeUndefined();
  });

  it("réconcilie le net payé avec le détail des lignes", () => {
    const result = computePayslip(base({ overtime: { hoursFirstBand: 5 }, bonuses: [{ code: "ACTIVITY_BONUS", label: "Prime d'activité", amount: 150 }], withholding: { mode: "PERSONALIZED", rate: 0.041 } }));
    const gross = result.lines.filter((line) => line.section === "GROSS").reduce((total, line) => total + (line.amount ?? 0), 0);
    const employee = result.lines.filter((line) => line.section !== "GROSS" && line.section !== "NET_ITEMS").reduce((total, line) => total + (line.amount ?? 0), 0);
    const netItems = result.lines.filter((line) => line.section === "NET_ITEMS").reduce((total, line) => total + (line.amount ?? 0), 0);
    expect(Math.abs(gross - result.totals.grossTotal)).toBeLessThan(0.005);
    expect(Math.abs(employee - result.totals.employeeContributions)).toBeLessThan(0.005);
    expect(Math.abs(gross - employee + netItems - result.totals.withholdingTax - result.totals.netPaid)).toBeLessThan(0.011);
  });
});

describe("moteur de bulletin — accident du travail, maternité et arrêts longs", () => {
  it("paie le jour de l'accident, indemnise sans carence dès le lendemain et n'impose que 50 % des IJSS", () => {
    const result = computePayslip(base({ absences: [{ id: "at1", kind: "WORK_ACCIDENT", start: "2026-03-09", end: "2026-03-20", ijssGrossAmount: 660 }] }));
    expect(amountOf(result, "ABS_WORK_ACCIDENT")).toBe(-1022.73); // 63 h du 10 au 20 mars
    expect(amountOf(result, "AT_MAINTENANCE")).toBe(260.45); // 90 % × 1 022,73 − 660
    expect(amountOf(result, "IJSS_SUBROGATION")).toBe(615.78);
    expect(lineOf(result, "IJSS_SUBROGATION")?.detail?.ijssTaxable).toBe(317.46); // 660 × 96,2 % × 50 %
    expect(result.ceiling.prorated).toBe(4005);
    expect(result.sickPayUsed).toEqual({ fullRateDaysUsed: 11, reducedRateDaysUsed: 0 });
  });

  it("retient un congé maternité, reverse les IJSS subrogées et réduit le plafond", () => {
    const result = computePayslip(base({ absences: [{ id: "mat1", kind: "MATERNITY", start: "2026-03-02", end: "2026-03-31", ijssGrossAmount: 2700 }] }));
    expect(amountOf(result, "ABS_MATERNITY")).toBe(-2500);
    expect(result.totals.grossSubject).toBe(0);
    expect(amountOf(result, "IJSS_SUBROGATION")).toBe(2519.1);
    expect(result.ceiling.prorated).toBe(129.19); // 1 jour sur 31
    expect(result.warnings.some((warning) => warning.includes("convention collective"))).toBe(true);
    expect(result.totals.netPaid).toBe(2486.19); // IJSS nettes − 30 € de mutuelle − CSG/CRDS sur la part patronale santé (2,91)
  });

  it("poursuit un arrêt long au taux réduit et limite les IJSS imposables aux 60 premiers jours", () => {
    const result = computePayslip(base({
      absences: [{ id: "m2", kind: "SICK_LEAVE", start: "2026-03-01", end: "2026-03-31", continuation: true, initialStart: "2026-01-20", ijssGrossAmount: 1240 }],
      sickPayHistory: { fullRateDaysUsed: 30, reducedRateDaysUsed: 3 },
    }));
    expect(amountOf(result, "SICK_MAINTENANCE")).toBe(435.15); // 2/3 × 140 h − 27 j d'IJSS
    expect(result.sickPayUsed).toEqual({ fullRateDaysUsed: 0, reducedRateDaysUsed: 27 });
    expect(lineOf(result, "IJSS_SUBROGATION")?.detail?.ijssTaxable).toBe(769.6); // 1er au 20 mars : jours 41 à 60 de l'arrêt
    expect(result.ceiling.prorated).toBe(3488.23); // 27 jours couverts
  });
});

describe("moteur de bulletin — solde de tout compte", () => {
  const leaver = { id: "e1", displayName: "Léa Martin", contract: "CDI" as const, executive: false, hireDate: "2016-03-01", contractEndDate: "2026-03-31" };
  const balances = { previousAcquired: 30, previousTaken: 10, currentAcquired: 22.5, currentTaken: 0, referenceGross: 30000, referenceAcquiredDays: 30, currentReferenceGross: 22500 };
  const noSeverance = () => computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "LICENCIEMENT" } }));
  const netPaidCheck = (result: PayslipResult) => {
    const gross = result.lines.filter((line) => line.section === "GROSS").reduce((total, line) => total + (line.amount ?? 0), 0);
    const employee = result.lines.filter((line) => line.section !== "GROSS" && line.section !== "NET_ITEMS").reduce((total, line) => total + (line.amount ?? 0), 0);
    const netItems = result.lines.filter((line) => line.section === "NET_ITEMS").reduce((total, line) => total + (line.amount ?? 0), 0);
    expect(Math.abs(gross - result.totals.grossTotal)).toBeLessThan(0.005);
    expect(Math.abs(gross - employee + netItems - result.totals.withholdingTax - result.totals.netPaid)).toBeLessThan(0.011);
  };

  it("solde les congés par période d'acquisition au plus favorable du maintien et du dixième", () => {
    const result = noSeverance();
    const line = lineOf(result, "PAID_LEAVE_COMPENSATION");
    // N-1 : 20 j, dixième 30 000 / 10 × 20 / 30 = 2 000 (maintien 1 923,08). N : 25 j, dixième (22 500 + 2 500) / 10 = 2 500 (maintien 2 403,85).
    expect(line?.amount).toBe(4500);
    expect(line?.quantity).toBe(45);
    expect(line?.detail).toMatchObject({ previousMethod: "TENTH", previousAmount: 2000, currentMethod: "TENTH", currentAmount: 2500 });
    expect(result.paidLeave?.compensatedDays).toBe(45);
    expect(result.paidLeave?.balancesAfter).toMatchObject({ previousTaken: 30, currentTaken: 25, currentAcquired: 25 });
    expect(result.totals.grossTotal).toBe(7000);
    expect(result.totals.grossSubject).toBe(7000);
  });

  it("retient le maintien quand le brut de référence n'est pas connu et le signale", () => {
    const result = computePayslip(base({ employee: leaver, paidLeave: { ...balances, referenceGross: null, currentReferenceGross: null }, termination: { reason: "DEMISSION" } }));
    expect(amountOf(result, "PAID_LEAVE_COMPENSATION")).toBe(4326.92); // 2 500 / 26 × 45
    expect(result.warnings.some((warning) => warning.includes("maintien de salaire"))).toBe(true);
  });

  it("exonère une indemnité de licenciement dans la limite de 2 PASS et soumet à CSG l'excédent sur le minimum légal", () => {
    const reference = noSeverance();
    const result = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "LICENCIEMENT", severance: { amount: 20000, legalOrConventionalMinimum: 6250, previousYearGross: 30000 } } }));
    expect(lineOf(result, "SEVERANCE")?.detail).toMatchObject({ exemptFromContributions: 20000, subjectToContributions: 0, taxExempt: 20000, csgExempt: 6250 });
    expect(result.totals.grossTotal).toBe(27000);
    expect(result.totals.grossSubject).toBe(7000);
    const csg = lineOf(result, "CSG_CRDS_RUPTURE_EXONEREE_IR");
    expect(csg?.base).toBe(13750);
    expect(csg?.amount).toBe(1333.75); // 9,7 % sans abattement, non déductible
    expect(lineOf(result, "CONTRIBUTION_RUPTURE")).toBeUndefined();
    expect(result.totals.netTaxable).toBe(reference.totals.netTaxable);
    expect(round(result.totals.netPaid - reference.totals.netPaid)).toBe(18666.25);
    expect(round(result.totals.netSocial - reference.totals.netSocial)).toBe(12416.25); // 13 750 − 1 333,75
    netPaidCheck(result);
  });

  it("applique la contribution patronale de 40 % et le plafond fiscal de 50 % à une rupture conventionnelle", () => {
    const result = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "RUPTURE_CONVENTIONNELLE", severance: { amount: 20000, legalOrConventionalMinimum: 6250 } } }));
    // Sans la rémunération N-1, la fraction exonérée d'impôt est 50 % de l'indemnité : 10 000.
    expect(lineOf(result, "SEVERANCE")?.detail).toMatchObject({ exemptFromContributions: 10000, subjectToContributions: 10000, taxExempt: 10000, csgExempt: 6250 });
    expect(result.totals.grossSubject).toBe(17000);
    expect(employerOf(result, "CONTRIBUTION_RUPTURE")).toBe(4000);
    expect(amountOf(result, "CSG_RUPTURE_DEDUCTIBLE")).toBe(680);
    expect(amountOf(result, "CSG_CRDS_RUPTURE_NON_DEDUCTIBLE")).toBe(290);
    expect(amountOf(result, "CSG_CRDS_RUPTURE_EXONEREE_IR")).toBe(363.75);
    // La CSG « salaires » garde son assiette abattue sur le seul brut hors indemnité.
    expect(lineOf(result, "CSG_DEDUCTIBLE")?.base).toBe(lineOf(noSeverance(), "CSG_DEDUCTIBLE")?.base);
    expect(result.warnings.some((warning) => warning.includes("année précédente"))).toBe(true);
    netPaidCheck(result);
  });

  it("soumet entièrement l'indemnité d'une rupture conventionnelle ouvrant droit à la retraite à taux plein", () => {
    const result = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "RUPTURE_CONVENTIONNELLE", severance: { amount: 20000, legalOrConventionalMinimum: 6250, previousYearGross: 30000, eligibleForFullPension: true } } }));
    expect(result.totals.grossSubject).toBe(27000);
    expect(lineOf(result, "CONTRIBUTION_RUPTURE")).toBeUndefined();
    expect(lineOf(result, "CSG_RUPTURE_DEDUCTIBLE")?.base).toBe(20000);
  });

  it("répartit une indemnité élevée entre fractions exonérée, soumise et imposable", () => {
    const result = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "LICENCIEMENT", paidLeaveCompensation: { amount: 0 }, severance: { amount: 150000, legalOrConventionalMinimum: 20000, previousYearGross: 60000 } } }));
    // Exonération fiscale : 2 × 60 000 = 120 000 (sous 6 PASS). Exonération sociale limitée à 2 PASS = 96 120.
    expect(lineOf(result, "SEVERANCE")?.detail).toMatchObject({ taxExempt: 120000, exemptFromContributions: 96120, subjectToContributions: 53880, csgExempt: 20000 });
    expect(result.totals.grossSubject).toBe(56380);
    expect(lineOf(result, "CSG_RUPTURE_DEDUCTIBLE")?.base).toBe(30000);
    expect(lineOf(result, "CSG_CRDS_RUPTURE_EXONEREE_IR")?.base).toBe(100000);
    const nonDeductible = result.lines.filter((line) => ["CSG_CRDS_NON_DEDUCTIBLE", "CSG_CRDS_RUPTURE_NON_DEDUCTIBLE", "CSG_CRDS_RUPTURE_EXONEREE_IR"].includes(line.code)).reduce((total, line) => total + (line.amount ?? 0), 0);
    const health = employerOf(result, "SANTE");
    expect(result.totals.netTaxable).toBeCloseTo(result.totals.grossSubject - result.totals.employeeContributions + nonDeductible + health - 23880, 1);
    netPaidCheck(result);
  });

  it("soumet dès le premier euro une indemnité supérieure à 10 PASS et plafonne la mise à la retraite à 5 PASS", () => {
    const huge = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "LICENCIEMENT", paidLeaveCompensation: { amount: 0 }, severance: { amount: 500000, legalOrConventionalMinimum: 20000 } } }));
    expect(lineOf(huge, "SEVERANCE")?.detail).toMatchObject({ exemptFromContributions: 0, csgExempt: 0, taxExempt: 250000 });
    expect(huge.warnings.some((warning) => warning.includes("10 fois"))).toBe(true);
    const retirement = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "MISE_A_LA_RETRAITE", paidLeaveCompensation: { amount: 0 }, severance: { amount: 300000, legalOrConventionalMinimum: 50000, previousYearGross: 200000 } } }));
    expect(lineOf(retirement, "SEVERANCE")?.detail).toMatchObject({ taxExempt: 240300, exemptFromContributions: 96120 });
    expect(employerOf(retirement, "CONTRIBUTION_RUPTURE")).toBe(38448);
    const departure = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "DEPART_RETRAITE", paidLeaveCompensation: { amount: 0 }, severance: { amount: 5000, legalOrConventionalMinimum: 5000 } } }));
    expect(lineOf(departure, "SEVERANCE")?.detail).toMatchObject({ exemptFromContributions: 0, taxExempt: 0 });
    expect(departure.totals.grossSubject).toBe(7500);
  });

  it("calcule l'indemnité de fin de CDD avant l'indemnité compensatrice qui l'inclut dans le dixième", () => {
    const result = computePayslip(base({
      employee: { id: "c1", displayName: "Hugo Petit", contract: "CDD", executive: false, hireDate: "2026-01-01", contractEndDate: "2026-03-31", plannedContractDays: 90 },
      pay: { monthlyBaseSalary: 2000, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
      paidLeave: { previousAcquired: 0, previousTaken: 0, currentAcquired: 5, currentTaken: 0, currentReferenceGross: 4000 },
      termination: { reason: "FIN_CDD", cddEndAllowance: { contractTotalGross: 4000 } },
    }));
    expect(amountOf(result, "CDD_END_ALLOWANCE")).toBe(600); // 10 % × 6 000
    expect(amountOf(result, "PAID_LEAVE_COMPENSATION")).toBe(660); // (6 000 + 600) / 10
    expect(result.totals.grossTotal).toBe(3260);
    expect(lineOf(result, "CPF_CDD")?.base).toBe(3260);
    netPaidCheck(result);
  });

  it("signale une fin de CDD sans indemnité de précarité et ajoute le préavis au brut", () => {
    const cdd = computePayslip(base({
      employee: { id: "c1", displayName: "Hugo Petit", contract: "CDD", executive: false, hireDate: "2026-01-01", contractEndDate: "2026-03-31" },
      paidLeave: { previousAcquired: 0, previousTaken: 0, currentAcquired: 5, currentTaken: 0 },
      termination: { reason: "FIN_CDD" },
    }));
    expect(cdd.warnings.some((warning) => warning.includes("indemnité de fin de contrat"))).toBe(true);
    const notice = computePayslip(base({ employee: leaver, paidLeave: balances, termination: { reason: "LICENCIEMENT", noticeCompensation: 5000 } }));
    expect(amountOf(notice, "NOTICE_COMPENSATION")).toBe(5000);
    // Le préavis entre dans le dixième de la période en cours : (22 500 + 2 500 + 5 000) / 10 = 3 000.
    expect(lineOf(notice, "PAID_LEAVE_COMPENSATION")?.detail).toMatchObject({ currentAmount: 3000 });
  });

  it("bloque un solde de tout compte sans date de sortie dans le mois ou sans compteurs de congés", () => {
    expect(() => computePayslip(base({ paidLeave: balances, termination: { reason: "DEMISSION" } }))).toThrow(/date de fin de contrat/);
    expect(() => computePayslip(base({ employee: leaver, termination: { reason: "DEMISSION" } }))).toThrow(/compteurs de congés payés/);
    expect(() => computePayslip(base({ employee: leaver, termination: { reason: "DEMISSION", paidLeaveCompensation: { amount: 1200 } } }))).not.toThrow();
  });
});

function round(value: number) {
  return Math.round(value * 100) / 100;
}

describe("borne des paramètres légaux", () => {
  it("bloque janvier 2027 tant que les paramètres 2027 ne sont pas saisis", async () => {
    const { ENGINE_LAST_SUPPORTED_DAY, PAS_DEFAULT_GRIDS, valueAt, MissingParameterError } = await import("./params");
    expect(ENGINE_LAST_SUPPORTED_DAY).toBe("2026-12-31");
    // La grille PAS 2026 couvre les salaires versés jusqu'au 30 avril 2027, pas au-delà.
    expect(() => valueAt(PAS_DEFAULT_GRIDS, new Date("2027-01-05T12:00:00Z"), "grille PAS")).not.toThrow();
    expect(() => valueAt(PAS_DEFAULT_GRIDS, new Date("2027-05-02T12:00:00Z"), "grille PAS")).toThrow(MissingParameterError);
  });
});
