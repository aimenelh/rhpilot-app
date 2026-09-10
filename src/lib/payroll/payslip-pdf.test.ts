import { describe, expect, it } from "vitest";
import { generatePayslipPdf, PayslipPdfPrerequisiteError, type PayslipPdfInput } from "./payslip-pdf";

const baseInput: PayslipPdfInput = {
  employer: {
    name: "RH Pilot Demo",
    address: "1 rue de la Paie, 30000 Nîmes",
    siret: "12345678900012",
    nafCode: "6201Z",
    urssafReference: "",
  },
  employee: {
    name: "Alice Martin",
    address: "2 rue des RH, 30000 Nîmes",
    position: "Gestionnaire RH",
    classification: "Employé",
  },
  period: {
    year: 2026,
    month: 9,
    paymentDate: "2026-09-30",
    hours: 151.67,
  },
  salary: {
    baseGross: 2000,
    variables: [],
    gross: 2000,
    employeeContributions: 400,
    employerContributions: 800,
    netBeforeTax: 1600,
    netTaxable: 1650,
    withholdingTaxRate: 0.1,
    withholdingTax: 165,
    netPaid: 1435,
    netSocial: 1600,
    totalEmployerCost: 2800,
  },
  contributions: [
    { label: "Assurance vieillesse", side: "EMPLOYEE", amount: 100 },
    { label: "Assurance vieillesse", side: "EMPLOYER", amount: 200 },
  ],
  collectiveAgreement: "Code du travail",
  source: "Publicodes modèle social 11.1.0",
};

describe("payslip PDF", () => {
  it("génère un PDF quand les données minimales sont présentes", () => {
    const pdf = generatePayslipPdf(baseInput);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("n'exige pas de référence URSSAF séparée", () => {
    expect(() => generatePayslipPdf(baseInput)).not.toThrow();
  });

  it("bloque si le net imposable ou le taux PAS est absent", () => {
    expect(() => generatePayslipPdf({
      ...baseInput,
      salary: { ...baseInput.salary, netTaxable: Number.NaN },
    })).toThrow(PayslipPdfPrerequisiteError);

    expect(() => generatePayslipPdf({
      ...baseInput,
      salary: { ...baseInput.salary, withholdingTaxRate: Number.NaN },
    })).toThrow(PayslipPdfPrerequisiteError);
  });
});
