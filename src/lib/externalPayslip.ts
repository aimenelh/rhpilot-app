import { PDFDocument } from "pdf-lib";
export function externalPayslipPeriod(value: unknown): { year: number; month: number } | null {
 if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
 const [year, month] = value.split("-").map(Number);
 return year >= 1950 && year <= 2100 ? { year, month } : null;
}
export async function validateExternalPdf(pdf: Buffer): Promise<string | null> {
 if (!pdf.length || pdf.length > 4 * 1024 * 1024) return "Le PDF doit contenir entre 1 octet et 4 Mo.";
 if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return "Le fichier doit être un PDF.";
 try { const document = await PDFDocument.load(pdf); if (document.getPageCount() === 0) return "Le PDF ne contient aucune page."; }
 catch { return "Le PDF est illisible ou protégé par un mot de passe."; }
 return null;
}
