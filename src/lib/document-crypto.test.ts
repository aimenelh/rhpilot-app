import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { openDocumentPayload, sealDocumentPayload } from "./document-crypto";
import { readPayslipDocument, storePayslipDocument } from "./payroll/payslip-storage";
import { readAbsenceJustification, storeAbsenceJustification } from "./absence-justification-storage";

const pdf = Buffer.from("%PDF-1.7\nbulletin de test\n%%EOF");

describe("chiffrement des documents au repos", () => {
  afterEach(() => {
    delete process.env.DOCUMENT_ENCRYPTION_KEY;
    vi.unstubAllEnvs();
  });

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

  it("bloque toute nouvelle écriture non chiffrée en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.DOCUMENT_ENCRYPTION_KEY;

    expect(() => sealDocumentPayload(pdf)).toThrow(/bloqué.*DOCUMENT_ENCRYPTION_KEY/i);
    expect(() => storePayslipDocument(pdf)).toThrow(/bloqué.*DOCUMENT_ENCRYPTION_KEY/i);
  });

  it("relit toujours les documents legacy enregistrés en clair", () => {
    const legacyPayload = pdf.toString("base64");
    process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(openDocumentPayload(legacyPayload).equals(pdf)).toBe(true);
  });

  it("refuse un document chiffré altéré", () => {
    process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const sealed = sealDocumentPayload(pdf);
    const tampered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => openDocumentPayload(tampered)).toThrow();
  });
});
