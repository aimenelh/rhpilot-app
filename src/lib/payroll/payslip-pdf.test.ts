import { describe, expect, it } from "vitest";
import { generatePayslipPdf, PayslipPdfPrerequisiteError, type PayslipPdfInput } from "./payslip-pdf";

const baseInput: PayslipPdfInput = {
  employer: { name: "RH Pilot Demo", address: "1 rue de la Paie, 30000 Nîmes", siret: "12345678900012", nafCode: "6201Z", urssafReference: "" },
  employee: { name: "Alice Martin", address: "2 rue des RH, 30000 Nîmes", position: "Gestionnaire RH", classification: "Employé" },
  period: { year: 2026, month: 9, paymentDate: "2026-09-30", hours: 151.67 },
  salary: { baseGross: 2000, variables: [], gross: 2000, employeeContributions: 400, employerContributions: 800, netBeforeTax: 1600, netTaxable: 1650, withholdingTaxRate: 0.1, withholdingTax: 165, netPaid: 1435, netSocial: 1600, totalEmployerCost: 2800 },
  contributions: [
    { label: "Assurance vieillesse", side: "EMPLOYEE", amount: 100, baseAmount: 2000, rate: 0.05 },
    { label: "Assurance vieillesse", side: "EMPLOYER", amount: 200, baseAmount: 2000, rate: 0.1 },
  ],
  collectiveAgreement: "Code du travail",
  source: "Publicodes modèle social 11.1.0",
};

describe("payslip PDF", () => {
  it("génère un PDF quand les données minimales sont présentes", async () => {
    const pdf = await generatePayslipPdf(baseInput);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("n'exige pas de référence URSSAF séparée", async () => {
    await expect(generatePayslipPdf(baseInput)).resolves.not.toThrow();
  });

  it("bloque si le net imposable ou le taux PAS est absent", () => {
    expect(() => generatePayslipPdf({ ...baseInput, salary: { ...baseInput.salary, netTaxable: Number.NaN } })).toThrow(PayslipPdfPrerequisiteError);
    expect(() => generatePayslipPdf({ ...baseInput, salary: { ...baseInput.salary, withholdingTaxRate: Number.NaN } })).toThrow(PayslipPdfPrerequisiteError);
  });

  it("passe sur plusieurs pages si beaucoup de variables et de cotisations sont présentes", async () => {
    const contributions = Array.from({ length: 28 }, (_, index) => ({
      label: `Cotisation ${index + 1}`,
      side: index % 2 === 0 ? "EMPLOYEE" as const : "EMPLOYER" as const,
      amount: 10 + index,
      baseAmount: 2000,
      rate: 0.05,
    }));
    const variables = Array.from({ length: 24 }, (_, index) => ({ label: `Variable ${index + 1}`, amount: 25 }));

    const pdf = await generatePayslipPdf({ ...baseInput, contributions, salary: { ...baseInput.salary, variables } });
    const pdfText = pdf.toString("latin1");
    expect((pdfText.match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBeGreaterThan(1);
  });
});
