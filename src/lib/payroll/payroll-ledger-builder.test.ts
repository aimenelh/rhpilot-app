import { describe, expect, it } from "vitest";
import { buildPayrollLedger } from "./payroll-ledger-builder";
import type { SocialPayrollResult } from "./social-engine";
import type { MinimumSalaryControlSnapshot } from "./minimum-salary-control";

const socialResult: SocialPayrollResult = {
  modelVersion: "11.1.0",
  grossAmount: 2250,
  legalCategory: "SAS",
  employeeContributions: 480,
  employerContributions: 820,
  netBeforeTax: 1770,
  netSocialAmount: 1785,
  employerCost: 3070,
  contributionDetails: [
    {
      code: "vieillesse_plafonnee_salarie",
      label: "Assurance vieillesse plafonnée",
      sourceRule: "salarié . cotisations . vieillesse . plafonnée . salarié",
      side: "EMPLOYEE",
      amount: 180,
    },
    {
      code: "atmp",
      label: "Accidents du travail et maladies professionnelles",
      sourceRule: "salarié . cotisations . ATMP",
      side: "EMPLOYER",
      amount: 70,
    },
  ],
};

const commonInput = {
  baseSalaryAmount: 2000,
  ruleVersionId: "rule-1",
  sourceName: "Urssaf / Mon-entreprise",
  sourceUrl: "https://mon-entreprise.urssaf.fr/documentation/salari%C3%A9/cotisations",
  socialResult,
  withholdingTax: 0,
  withholdingTaxRateProvided: false,
};

describe("buildPayrollLedger", () => {
  it("reconstruit le brut avec salaire de base, variable et absence sans inventer d'effets fiscaux", () => {
    const entries = buildPayrollLedger({
      ...commonInput,
      variables: [
        {
          code: "PRIME_TEST",
          label: "Prime test",
          amount: 200,
          grossDelta: 200,
          kind: "ADD_TO_GROSS",
          ruleVersionId: "rule-1",
        },
      ],
      absences: [
        {
          absenceId: "absence-1",
          absenceType: "SICK_LEAVE",
          label: "Maladie",
          grossDelta: 50,
          kind: "DEDUCT_FROM_GROSS",
          ruleVersionId: "absence-rule-1",
        },
      ],
    });

    expect(entries.find((entry) => entry.code === "BASE_SALARY")?.grossDelta).toBe(2000);
    expect(entries.find((entry) => entry.code === "PRIME_TEST")?.grossDelta).toBe(200);
    expect(entries.find((entry) => entry.code === "absence-1")?.grossDelta).toBe(50);
    expect(entries.find((entry) => entry.code === "PRIME_TEST")?.taxableDelta).toBe(0);
    expect(entries.find((entry) => entry.code === "PRIME_TEST")?.socialDelta).toBe(0);
  });

  it("reprend les montants des cotisations directement depuis le moteur social", () => {
    const entries = buildPayrollLedger({ ...commonInput, variables: [], absences: [] });
    const employee = entries.find((entry) => entry.code === "vieillesse_plafonnee_salarie");
    const employer = entries.find((entry) => entry.code === "atmp");

    expect(employee?.socialDelta).toBe(-180);
    expect(employee?.netDelta).toBe(-180);
    expect(employer?.socialDelta).toBe(70);
    expect(employer?.cashImpact).toBe(70);
  });

  it("ne transforme pas un PAS absent en retenue fictive", () => {
    const entries = buildPayrollLedger({ ...commonInput, variables: [], absences: [] });
    const pas = entries.find((entry) => entry.code === "PAS");

    expect(pas?.kind).toBe("INFORMATIONAL");
    expect(pas?.netDelta).toBe(0);
    expect(pas?.amount).toBe(0);
  });

  it("conserve les montants autoritatifs du net avant impôt et du net social comme informations", () => {
    const entries = buildPayrollLedger({ ...commonInput, variables: [], absences: [] });
    const netBeforeTax = entries.find((entry) => entry.code === "NET_BEFORE_TAX_TOTAL");
    const netSocial = entries.find((entry) => entry.code === "NET_SOCIAL_TOTAL");

    expect(netBeforeTax?.amount).toBe(1770);
    expect(netBeforeTax?.netDelta).toBe(0);
    expect(netSocial?.amount).toBe(1785);
    expect(netSocial?.netDelta).toBe(0);
  });

  it("ajoute le contrôle du salaire minimum comme ligne informative traçable", () => {
    const minimumSalaryControl: MinimumSalaryControlSnapshot = {
      status: "APPLICABLE",
      source: "COLLECTIVE_AGREEMENT",
      appliedMonthlyMinimumCents: 213500,
      smicMonthlyMinimumCents: 186702,
      collectiveMonthlyMinimumCents: 213500,
      smicRuleCode: "FR.SMIC.MONTHLY_GROSS",
      smicRuleVersionId: "smic-2026-06",
      collectiveRuleVersionId: "syntec-2025",
      compliant: true,
      differenceCents: 6500,
      explanation: "Le minimum conventionnel applicable est supérieur ou égal au SMIC proratisé.",
    };

    const entries = buildPayrollLedger({
      ...commonInput,
      variables: [],
      absences: [],
      minimumSalaryControl,
    });
    const control = entries.find((entry) => entry.code === "MINIMUM_SALARY_CONTROL");

    expect(control?.kind).toBe("INFORMATIONAL");
    expect(control?.side).toBe("NEUTRAL");
    expect(control?.amount).toBe(2135);
    expect(control?.grossDelta).toBe(0);
    expect(control?.netDelta).toBe(0);
    expect(control?.ruleVersionId).toBe("syntec-2025");
    expect(control?.metadata).toMatchObject({
      authoritativeControl: true,
      source: "COLLECTIVE_AGREEMENT",
      compliant: true,
      differenceCents: 6500,
    });
  });
});
