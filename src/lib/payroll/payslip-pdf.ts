import PDFDocument, { registerStdFonts } from "pdfkit";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";

// PDFKit 0.20.x uses generated standard-font modules. Register the fonts
// explicitly so the same font data is available to the server bundle.
registerStdFonts(Helvetica, HelveticaBold);

export type PayslipPdfContribution = {
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount?: number | null;
  rate?: number | null;
  sourceRule?: string;
};

export type PayslipPdfInput = {
  employer: { name: string; address: string; siret: string; nafCode: string; urssafReference: string };
  employee: { name: string; address: string; position: string; classification: string };
  period: { year: number; month: number; paymentDate: string; hours: number };
  salary: { baseGross: number; variables: Array<{ label: string; amount: number }>; gross: number; employeeContributions: number; employerContributions: number; netBeforeTax: number; netTaxable: number; withholdingTaxRate: number; withholdingTax: number; netPaid: number; netSocial: number; totalEmployerCost: number };
  contributions: PayslipPdfContribution[];
  collectiveAgreement: string;
  source: string;
};
