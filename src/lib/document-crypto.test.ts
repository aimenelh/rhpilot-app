import { afterEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { openDocumentPayload, sealDocumentPayload } from "./document-crypto";
import { readPayslipDocument, storePayslipDocument } from "./payroll/payslip-storage";
import { readAbsenceJustification, storeAbsenceJustification } from "./absence-justification-storage";

const pdf = Buffer.from("%PDF-1.7\nbulletin de test\n%%EOF");

describe("chiffrement des documents au repos", () => {
  afterEach(() => { delete process.env.DOCUMENT_ENCRYPTION_KEY; });

  it("chiffre quand la clé est configurée et relit à l'identique", () => {
    process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const sealed = sealDocumentPayload(pdf);
    expect(sealed.startsWith("enc1.")).toBe(true);
    expect(sealed).not.toContain(pdf.toString("base64"));
    expect(openDocumentPayload(sealed).equals(pdf)).toBe(true);

    const stored = storePayslipDocument(pdf);
    expect(readPayslipDocument(stored.storageKey).equals(pdf)).toBe(true);
    const justification = storeAbsenceJustification(pdf, "application/pdf");
    expect(readAbsenceJustification(justification.storageKey).equals(pdf)).toBe(true);
  });

  it("relit toujours les documents enregistrés en clair avant le chiffrement", () => {
    const legacy = storePayslipDocument(pdf);
    process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(readPayslipDocument(legacy.storageKey).equals(pdf)).toBe(true);
  });

  it("refuse un document chiffré altéré", () => {
    process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const sealed = sealDocumentPayload(pdf);
    const tampered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => openDocumentPayload(tampered)).toThrow();
  });
});
