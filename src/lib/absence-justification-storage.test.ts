import { describe, expect, it } from "vitest";
import { readAbsenceJustification, storeAbsenceJustification } from "./absence-justification-storage";

describe("absence justification storage", () => {
  it("stocke un PDF valide et vérifie son intégrité", () => {
    const pdf = Buffer.from("%PDF-1.7\njustificatif");
    const stored = storeAbsenceJustification(pdf, "application/pdf");
    expect(readAbsenceJustification(stored.storageKey).equals(pdf)).toBe(true);
  });

  it("refuse un MIME autorisé dont le contenu réel est différent", () => {
    expect(() => storeAbsenceJustification(Buffer.from("contenu html"), "application/pdf"))
      .toThrow(/format annoncé/i);
    expect(() => storeAbsenceJustification(Buffer.from("<svg/>"), "image/png"))
      .toThrow(/format annoncé/i);
  });

  it("accepte les signatures JPEG et PNG attendues", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(storeAbsenceJustification(jpeg, "image/jpeg").mimeType).toBe("image/jpeg");
    expect(storeAbsenceJustification(png, "image/png").mimeType).toBe("image/png");
  });
});
