import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { externalPayslipPeriod, validateExternalPdf } from "./externalPayslip";
describe("external payslip validation", () => {
 it("requires a valid month, preserving historical imports", () => { expect(externalPayslipPeriod("2024-02")).toEqual({year:2024,month:2}); for (const value of ["2026-13","2026-00","2026-1","2026-01-01","1940-01","2101-01",null]) expect(externalPayslipPeriod(value)).toBeNull(); });
 it("accepts a readable PDF with a page", async () => { const pdf=await PDFDocument.create();pdf.addPage();expect(await validateExternalPdf(Buffer.from(await pdf.save()))).toBeNull(); });
 it("rejects fake PDFs, broken PDFs, empty PDFs and oversized documents", async () => { expect(await validateExternalPdf(Buffer.from("hello"))).not.toBeNull(); expect(await validateExternalPdf(Buffer.from("%PDF-1.4\nnot a document"))).not.toBeNull(); const pdf=await PDFDocument.create(); expect(await validateExternalPdf(Buffer.from(await pdf.save({addDefaultPage:false})))).not.toBeNull(); expect(await validateExternalPdf(Buffer.alloc(4*1024*1024+1))).not.toBeNull(); });
});
