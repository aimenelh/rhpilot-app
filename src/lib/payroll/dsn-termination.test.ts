import { describe, expect, it } from "vitest";
import { computedDsnFixture, computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import type { PayslipInput, TerminationInput } from "./bulletin/types";
import { mapLockedContributions } from "./dsn-locked-contributions";
import { readLockedRemunerationDeclaration } from "./dsn-locked-remuneration";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";
import { assertDsnStableContract } from "./dsn-contract-scope";
import { terminationDsnIssue, type TerminationDsnData } from "./dsn-termination";

const ids = { employeeNir: "1860875123456", urssafSiret: "75366412700077", retirementOps: "44832375800038" };
const base: TerminationDsnData = {
  endReasonCode: "059", notificationDate: "2025-12-20", conventionSignatureDate: null, dismissalProcedureDate: null, lastWorkedPaidDate: null,
  noticeTypeCode: "01", noticeStartDate: "2025-12-21", noticeEndDate: "2026-01-20", transactionPending: false, legalSeveranceAmount: null,
};
const leaving = (contract: "CDI" | "CDD", end: string, termination: TerminationInput, hireDate = "2024-01-01"): Partial<PayslipInput> => ({
  employee: { id: "employee-test", displayName: "Maxime Dupont", contract, executive: false, hireDate, contractEndDate: end, ...(contract === "CDD" ? { plannedContractDays: 92 } : {}) },
  termination,
});
const resignation = leaving("CDI", "2026-01-20", { reason: "DEMISSION", paidLeaveCompensation: { amount: 800 }, dsn: base });
const dismissal = leaving("CDI", "2026-01-31", {
  reason: "LICENCIEMENT", noticeCompensation: 2500, paidLeaveCompensation: { amount: 600 },
  severance: { amount: 3000, legalOrConventionalMinimum: 2500, previousYearGross: 30000 },
  dsn: { ...base, endReasonCode: "020", notificationDate: "2026-01-05", dismissalProcedureDate: "2025-12-15", lastWorkedPaidDate: "2026-01-05", noticeTypeCode: "02", noticeStartDate: "2026-01-06", noticeEndDate: "2026-01-31", legalSeveranceAmount: 2000 },
});
const conventional = leaving("CDI", "2026-01-31", {
  reason: "RUPTURE_CONVENTIONNELLE", paidLeaveCompensation: { amount: 500 },
  severance: { amount: 4000, legalOrConventionalMinimum: 3000, previousYearGross: 30000 },
  dsn: { ...base, endReasonCode: "043", notificationDate: null, conventionSignatureDate: "2025-12-10", noticeTypeCode: "90", noticeStartDate: null, noticeEndDate: null },
});
const endOfCdd = leaving("CDD", "2026-01-31", {
  reason: "FIN_CDD", paidLeaveCompensation: { amount: 400 }, cddEndAllowance: { amount: 600 },
  dsn: { ...base, endReasonCode: "031", notificationDate: null, noticeTypeCode: "90", noticeStartDate: null, noticeEndDate: null },
}, "2025-11-01");

describe("fin de contrat : contrôles de la fiche de sortie", () => {
  const context = { reason: "LICENCIEMENT" as const, contractStart: "2024-01-01", contractEnd: "2026-01-31", noticeCompensation: 2500, severanceAmount: 3000 };
  it("accepte un licenciement complet", () => {
    expect(terminationDsnIssue((dismissal.termination as TerminationInput).dsn!, context)).toBeNull();
  });
  it("exige les dates de procédure, la cohérence du préavis et la part légale", () => {
    const data = (dismissal.termination as TerminationInput).dsn!;
    expect(terminationDsnIssue({ ...data, dismissalProcedureDate: null }, context)).toMatch(/procédure/);
    expect(terminationDsnIssue({ ...data, noticeTypeCode: "01" }, context)).toMatch(/non effectué, payé/);
    expect(terminationDsnIssue({ ...data, noticeStartDate: "2026-01-03" }, context)).toMatch(/notification/);
    expect(terminationDsnIssue({ ...data, legalSeveranceAmount: null }, context)).toMatch(/part légale/);
    expect(terminationDsnIssue({ ...data, endReasonCode: "087" }, context)).toMatch(/indemnité de rupture/);
    expect(terminationDsnIssue({ ...data, endReasonCode: "059" }, context)).toMatch(/ne correspond pas/);
  });
  it("refuse un préavis pour une rupture conventionnelle ou une fin d'essai", () => {
    const rc = (conventional.termination as TerminationInput).dsn!;
    expect(terminationDsnIssue({ ...rc, noticeTypeCode: "01", noticeStartDate: "2026-01-01", noticeEndDate: "2026-01-31" }, { ...context, reason: "RUPTURE_CONVENTIONNELLE", noticeCompensation: null, severanceAmount: 4000 })).toMatch(/pas de préavis/);
    expect(terminationDsnIssue({ ...base, endReasonCode: "034", noticeTypeCode: "01" }, { ...context, reason: "FIN_PERIODE_ESSAI", noticeCompensation: null, severanceAmount: null })).toMatch(/prévenance/);
  });
});

describe("fin de contrat en DSN mensuelle", () => {
  it("laisse passer une sortie qualifiée dans le mois et bloque une sortie non qualifiée", () => {
    const employee = { contract: "CDI" as const, hireDate: "2024-01-01", contractEndDate: "2026-01-20", executive: false };
    expect(() => assertDsnStableContract(employee, { year: 2026, month: 1 }, undefined, true)).not.toThrow();
    expect(() => assertDsnStableContract(employee, { year: 2026, month: 1 })).toThrow(/fins de contrat/);
  });

  it("déclare une démission avec préavis effectué et l'indemnité compensatrice de congés", () => {
    const content = buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, resignation));
    expect(content).toContain("S21.G00.62.001,'20012026'\r\nS21.G00.62.002,'059'\r\n");
    // Préavis et dates de rupture relèvent du signalement FCTU, interdits en mensuelle.
    expect(content).not.toMatch(/S21\.G00\.63\.|S21\.G00\.62\.00[3-8]/);
    expect(content).toContain("S21.G00.52.001,'020'\r\nS21.G00.52.002,'800.00'");
  });

  it("exclut les indemnités de rupture des droits chômage et du salaire rétabli", () => {
    const snapshot = computedSnapshot(dismissal);
    const declaration = readLockedRemunerationDeclaration(snapshot);
    const severanceSubject = Number(snapshot.bulletin.lines.find((line) => line.code === "SEVERANCE")!.detail!.subjectToContributions);
    expect(declaration.unemploymentRemuneration).toBe(Math.round((snapshot.bulletin.totals.grossSubject - 2500 - 600 - severanceSubject) * 100) / 100);
    expect(declaration.contractEnd!.indemnities).toEqual([{ type: "020", amount: 600 }, { type: "023", amount: 2500 }, { type: "007", amount: 2000 }, { type: "021", amount: 1000 }]);
  });

  it("déclare la rupture conventionnelle, sa contribution patronale (CTP 719) et la CSG sans abattement", () => {
    const snapshot = computedSnapshot(conventional);
    const mapped = mapLockedContributions({ snapshot, ...ids });
    expect(mapped.aggregates.some((item) => item.code === "719" && item.baseQualifier === "920")).toBe(true);
    expect(mapped.individual.find((item) => item.code === "093")!.contributionAmount).toBeGreaterThan(0);
    const content = buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, conventional));
    expect(content).toContain("S21.G00.62.002,'043'");
    expect(content).toContain("S21.G00.52.001,'001'\r\nS21.G00.52.002,'4000.00'");
  });

  it("déclare la fin d'un CDD avec l'indemnité de fin de contrat", () => {
    const data = computedDsnFixture(2500, 151.67, false, undefined, false, endOfCdd);
    data.employees[0].contract.fixedTermReasonCode = "02";
    const content = buildDsnP26V01Complete(data);
    expect(content).toContain("S21.G00.62.002,'031'");
    expect(content).toContain("S21.G00.52.001,'011'\r\nS21.G00.52.002,'600.00'");
  });

  it("bloque une sortie calculée avant la partie déclarative", () => {
    const legacy = computedSnapshot(leaving("CDI", "2026-01-20", { reason: "DEMISSION", paidLeaveCompensation: { amount: 800 } }));
    expect(() => mapLockedContributions({ snapshot: legacy, ...ids })).toThrow(/partie déclarative/);
  });
});
