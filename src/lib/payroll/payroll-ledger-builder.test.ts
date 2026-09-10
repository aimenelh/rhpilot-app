import { describe, expect, it } from "vitest";
import { buildPayrollLedger } from "./payroll-ledger-builder";
import type { SocialPayrollResult } from "./social-engine";
import type { MinimumSalaryControlSnapshot } from "./minimum-salary-control";

const socialResult: SocialPayrollResult = {
  modelVersion: "11.1.0", grossAmount: 2250, legalCategory: "SAS", employeeContributions: 480, employerContributions: 820, netBeforeTax: 1770, netSocialAmount: 1785, employerCost: 3070,
  contributionDetails: [
    { code: "vieillesse_plafonnee_salarie", label: "Assurance vieillesse plafonnée", sourceRule: "salarié . cotisations . vieillesse . plafonnée . salarié", side: "EMPLOYEE", amount: 180 },
    { code: "atmp", label: "Accidents du travail et maladies professionnelles", sourceRule: "salarié . cotisations . ATMP", side: "EMPLOYER", amount: 70 },
  ],
};
const commonInput = { baseSalaryAmount: 2000, ruleVersionId: "rule-1", sourceName: "Urssaf / Mon-entreprise", sourceUrl: "https://mon-entreprise.urssaf.fr/documentation/salari%C3%A9/cotisations", socialResult, withholdingTax: 0, withholdingTaxRateProvided: false };

describe("buildPayrollLedger", () => {
  it("reconstruit le brut avec salaire de base, variable et absence sans inventer d'effets fiscaux", () => {
    const entries = buildPayrollLedger({ ...commonInput, variables: [{ code: "PRIME_TEST", label: "Prime test", amount: 200, grossDelta: 200, kind: "ADD_TO_GROSS", ruleVersionId: "rule-1" }], absences: [{ absenceId: "absence-1", absenceType: "SICK_LEAVE", label: "Maladie", grossDelta: 50, kind: "DEDUCT_FROM_GROSS", ruleVersionId: "absence-rule-1" }] });
    expect(entries.find((entry) => entry.code === "BASE_SALARY")?.grossDelta).toBe(2000);
    expect(entries.find((entry) => entry.code === "PRIME_TEST")?.grossDelta).toBe(200);
    expect(entries.find((entry) => entry.code === "absence-1")?.grossDelta).toBe(50);
  });

  it("reprend les montants des cotisations directement depuis le moteur social", () => {
    const entries = buildPayrollLedger({ ...commonInput, variables: [], absences: [] });
    expect(entries.find((entry) => entry.code === "vieillesse_plafonnee_salarie")?.socialDelta).toBe(-180);
    expect(entries.find((entry) => entry.code === "atmp")?.socialDelta).toBe(70);
  });

  it("ne transforme pas un PAS absent en retenue fictive", () => {
    const pas = buildPayrollLedger({ ...commonInput, variables: [], absences: [] }).find((entry) => entry.code === "PAS");
    expect(pas?.kind).toBe("INFORMATIONAL"); expect(pas?.netDelta).toBe(0); expect(pas?.amount).toBe(0);
  });

  it("conserve les montants autoritatifs du net avant impôt et du net social comme informations", () => {
    const entries = buildPayrollLedger({ ...commonInput, variables: [], absences: [] });
    expect(entries.find((entry) => entry.code === "NET_BEFORE_TAX_TOTAL")?.amount).toBe(1770);
    expect(entries.find((entry) => entry.code === "NET_SOCIAL_TOTAL")?.amount).toBe(1785);
  });

  it("ajoute le contrôle conventionnel comme ligne informative traçable", () => {
    const minimumSalaryControl: MinimumSalaryControlSnapshot = { status: "APPLICABLE", source: "COLLECTIVE_AGREEMENT", appliedMonthlyMinimumCents: 213500, smicMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: 213500, smicRuleCode: "FR.SMIC.MONTHLY_GROSS", smicRuleVersionId: "smic-2026-06", collectiveRuleVersionId: "syntec-2025", compliant: true, differenceCents: 6500, explanation: "Le minimum conventionnel applicable est supérieur ou égal au SMIC proratisé." };
    const control = buildPayrollLedger({ ...commonInput, variables: [], absences: [], minimumSalaryControl }).find((entry) => entry.code === "MINIMUM_SALARY_CONTROL");
    expect(control).toMatchObject({ kind: "INFORMATIONAL", side: "NEUTRAL", amount: 2135, grossDelta: 0, netDelta: 0, ruleVersionId: "syntec-2025" });
    expect(control?.metadata).toMatchObject({ authoritativeControl: true, source: "COLLECTIVE_AGREEMENT", compliant: true, differenceCents: 6500 });
  });

  it("trace correctement un contrôle fondé uniquement sur le SMIC", () => {
    const minimumSalaryControl: MinimumSalaryControlSnapshot = { status: "APPLICABLE", source: "SMIC", appliedMonthlyMinimumCents: 186702, smicMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: null, smicRuleCode: "FR.SMIC.MONTHLY_GROSS", smicRuleVersionId: "smic-2026-06", compliant: true, differenceCents: 13298, explanation: "Le contrôle repose sur le SMIC proratisé." };
    const control = buildPayrollLedger({ ...commonInput, variables: [], absences: [], minimumSalaryControl }).find((entry) => entry.code === "MINIMUM_SALARY_CONTROL");
    expect(control?.ruleVersionId).toBe("smic-2026-06");
    expect(control?.sourceName).toBe("SMIC");
  });

  it("n'ajoute aucune ligne lorsque le contrôle est non résolu", () => {
    const minimumSalaryControl: MinimumSalaryControlSnapshot = { status: "UNRESOLVED", explanation: "Classification absente.", code: "COLLECTIVE_MINIMUM_UNRESOLVED" };
    const entries = buildPayrollLedger({ ...commonInput, variables: [], absences: [], minimumSalaryControl });
    expect(entries.some((entry) => entry.code === "MINIMUM_SALARY_CONTROL")).toBe(false);
  });
});
