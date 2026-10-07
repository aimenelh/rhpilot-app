import { describe, expect, it } from "vitest";
import { computedDsnFixture, computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import { FULL_TIME_SCHEDULE } from "./bulletin/calendar";
import type { PayslipInput } from "./bulletin/types";
import { mapLockedContributions } from "./dsn-locked-contributions";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";
import { dsnFixedTermReason } from "./dsn-fixed-term";

const ids = { employeeNir: "1860875123456", urssafSiret: "75366412700077", retirementOps: "44832375800038" };
const apprentice = (hireDate: string, gross: number): Partial<PayslipInput> => ({
  employee: { id: "employee-test", displayName: "Lina Apprentie", contract: "APPRENTISSAGE", executive: false, hireDate, contractEndDate: "2027-08-31" },
  pay: { monthlyBaseSalary: gross, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
});

describe("apprentis en DSN (CTP 726, 423 et exonération Agirc-Arrco)", () => {
  it("bloque sans dispositif 64/65 et sans détail d'exonération figé", () => {
    const snapshot = computedSnapshot(apprentice("2025-09-01", 1100));
    expect(() => mapLockedContributions({ snapshot, ...ids })).toThrow(/dispositif 64/);
    const legacy = computedSnapshot(apprentice("2025-09-01", 1100));
    delete (legacy.bulletin as { apprenticeExemption?: unknown }).apprenticeExemption;
    expect(() => mapLockedContributions({ snapshot: legacy, ...ids, apprenticePublicPolicyCode: "64" })).toThrow(/recalculez/);
  });

  it("ventile la rémunération entre la part exonérée (726) et le surplus (100), sans perdre un centime", () => {
    const snapshot = computedSnapshot(apprentice("2025-09-01", 1100));
    const exemptBase = snapshot.bulletin.apprenticeExemption!.exemptBase;
    expect(exemptBase).toBeGreaterThan(800);
    expect(exemptBase).toBeLessThan(1100);
    const mapped = mapLockedContributions({ snapshot, ...ids, apprenticePublicPolicyCode: "64" });
    const below = mapped.aggregates.find((item) => item.code === "726" && item.baseQualifier === "920")!;
    const above = mapped.aggregates.find((item) => item.code === "100" && item.baseQualifier === "920")!;
    expect(below.baseAmount).toBe(exemptBase);
    expect(above.baseAmount).toBe(Math.round((1100 - exemptBase) * 100) / 100);
    expect(mapped.aggregates.some((item) => item.code === "423")).toBe(true);
    expect(mapped.aggregates.some((item) => item.code === "772")).toBe(false);
    expect(mapped.individual.filter((item) => item.code === "001").map((item) => [item.baseCode, item.baseAmount, item.contributionAmount])).toEqual([["03", exemptBase, undefined], ["02", exemptBase, undefined]]);
    const totals = snapshot.bulletin.totals;
    const declared = mapped.liabilities.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    expect(declared).toBe(Math.round(totals.employeeContributions * 100) + Math.round(totals.employerContributions * 100));
  });

  it("déclare la cotisation Agirc-Arrco entière et l'exonération salariale en négatif", () => {
    const snapshot = computedSnapshot(apprentice("2025-09-01", 1100));
    const mapped = mapLockedContributions({ snapshot, ...ids, apprenticePublicPolicyCode: "64" });
    const exemption = mapped.individual.find((item) => item.code === "109")!;
    expect(exemption.contributionAmount).toBeLessThan(0);
    const retirement = mapped.liabilities.find((item) => item.opsIdentifier === ids.retirementOps)!.amount;
    const declaredRetirement = mapped.individual.filter((item) => ["131", "109", "106"].includes(item.code)).reduce((sum, item) => sum + Math.round((item.contributionAmount ?? 0) * 100), 0);
    expect(declaredRetirement).toBe(Math.round(retirement * 100));
  });

  it("garde tout sous le CTP 726 pour un contrat antérieur à mars 2025 sous 79 % du Smic", () => {
    const snapshot = computedSnapshot(apprentice("2024-09-01", 1300));
    const mapped = mapLockedContributions({ snapshot, ...ids, apprenticePublicPolicyCode: "65" });
    expect(mapped.aggregates.some((item) => item.code === "100")).toBe(false);
    expect(mapped.aggregates.find((item) => item.code === "726" && item.baseQualifier === "920")!.baseAmount).toBe(1300);
    expect(mapped.individual.some((item) => item.code === "002")).toBe(true);
  });

  it("produit un fichier avec les dispositifs et la nature d'un apprenti en CDD", () => {
    const content = buildDsnP26V01Complete(computedDsnFixture(1100, 151.67, false, undefined, false, apprentice("2025-09-01", 1100)));
    expect(content).toContain("S21.G00.40.007,'02'");
    expect(content).toContain("S21.G00.40.008,'64'");
    expect(content).toContain("S21.G00.23.001,'726'");
    expect(content).toContain("S21.G00.23.001,'423'");
    expect(content).toContain("S21.G00.81.001,'109'");
    expect(content).toContain("S21.G00.30.025,'03'");
  });

  it("exige le niveau de diplôme préparé de l'apprenti", () => {
    const data = computedDsnFixture(1100, 151.67, false, undefined, false, apprentice("2025-09-01", 1100));
    data.employees[0].preparedDiplomaLevel = null;
    expect(() => buildDsnP26V01Complete(data)).toThrow(/diplôme préparé/);
  });

  it("ne déclare aucun motif de recours pour un contrat d'alternance", () => {
    expect(dsnFixedTermReason("02", "64", null)).toBeNull();
    // Le motif 11, facultatif, n'apporte rien au dispositif 64/65 et n'est pas conservé.
    expect(dsnFixedTermReason("02", "65", "11")).toBeNull();
    expect(() => dsnFixedTermReason("02", "64", "02")).toThrow(/alternance/);
    expect(dsnFixedTermReason("02", "61", null)).toBeNull();
    expect(dsnFixedTermReason("01", "61", null)).toBeNull();
    expect(() => dsnFixedTermReason("02", "61", "11")).toThrow(/alternance/);
  });
});
