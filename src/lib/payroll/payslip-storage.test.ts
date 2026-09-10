import { describe, expect, it } from "vitest";
import { readPayslipDocument, storePayslipDocument } from "./payslip-storage";

describe("payslip storage", () => {
  it("round-trips a PDF and preserves its hash", () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\nendobj\n%%EOF\n", "latin1");
    const stored = storePayslipDocument(pdf);

    expect(stored.sizeBytes).toBe(pdf.length);
    expect(stored.sha256).toHaveLength(64);
    expect(readPayslipDocument(stored.storageKey)).toEqual(pdf);
  });

  it("rejects non-PDF documents", () => {
    expect(() => storePayslipDocument(Buffer.from("not a pdf"))).toThrow(/PDF valide/);
  });

  it("rejects a tampered payload", () => {
    const pdf = Buffer.from("%PDF-1.4\n%%EOF\n", "latin1");
    const stored = storePayslipDocument(pdf);
    const tampered = `${stored.storageKey.slice(0, -4)}AAAA`;
    expect(() => readPayslipDocument(tampered)).toThrow(/Intégrité|base64/);
  });
});
