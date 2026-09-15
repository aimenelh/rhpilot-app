import { describe, expect, it } from "vitest";
import { generatePayslipPdf, type PayslipPdfInput } from "./payslip-pdf";
import { countPdfPages, mergePayslipPdfs } from "./payslip-pdf-merge";

const input: PayslipPdfInput = {
  employer: { name: "RH Pilot Demo", address: "1 rue de la Paie, 30000 Nimes", siret: "12345678900012", nafCode: "6201Z", urssafReference: "" },
  employee: { name: "Alice Martin", address: "2 rue des RH, 30000 Nimes", position: "Gestionnaire RH", classification: "Employe" },
  period: { year: 2026, month: 9, paymentDate: "2026-09-30", hours: 151.67 },
  salary: { baseGross: 2000, variables: [], gross: 2000, employeeContributions: 100, employerContributions: 200, netBeforeTax: 1900, netTaxable: 1900, withholdingTaxRate: 0.05, withholdingTax: 95, netPaid: 1805, netSocial: 1900, totalEmployerCost: 2200 },
  contributions: [
    { label: "Assurance vieillesse", side: "EMPLOYEE", amount: 100, baseAmount: 2000, rate: 0.05 },
    { label: "Assurance vieillesse", side: "EMPLOYER", amount: 200, baseAmount: 2000, rate: 0.1 },
  ],
  collectiveAgreement: "Code du travail",
  source: "Publicodes",
};

describe("payslip PDF merge", () => {
  it("retourne le PDF individuel byte-for-byte quand il n'y a qu'un salarié", async () => {
    const pdf = await generatePayslipPdf(input);
    const merged = mergePayslipPdfs([pdf]);
    expect(merged.equals(pdf)).toBe(true);
    expect(countPdfPages(merged)).toBe(1);
  });

  it("assemble deux bulletins d'une page en exactement deux pages", async () => {
    const first = await generatePayslipPdf(input);
    const second = await generatePayslipPdf({ ...input, employee: { ...input.employee, name: "Bob Martin" } });
    const merged = mergePayslipPdfs([first, second]);
    expect(countPdfPages(first)).toBe(1);
    expect(countPdfPages(second)).toBe(1);
    expect(countPdfPages(merged)).toBe(2);
  });
});
