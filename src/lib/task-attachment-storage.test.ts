import { describe, expect, it } from "vitest";
import {
  MAX_TASK_ATTACHMENT_BYTES,
  readTaskAttachment,
  storeTaskAttachment,
} from "./task-attachment-storage";

describe("task attachment storage", () => {
  it("stocke puis relit un PDF en vérifiant son intégrité", () => {
    const bytes = Buffer.from("%PDF-1.4\nRH Pilot");
    const stored = storeTaskAttachment(bytes, "application/pdf");

    expect(stored.sizeBytes).toBe(bytes.length);
    expect(readTaskAttachment(stored.storageKey).equals(bytes)).toBe(true);
  });

  it("refuse les formats non autorisés", () => {
    expect(() => storeTaskAttachment(Buffer.from("test"), "application/msword"))
      .toThrow(/format de fichier non autorisé/i);
  });

  it("refuse un contenu qui ne correspond pas au MIME annoncé", () => {
    expect(() => storeTaskAttachment(Buffer.from("<script>alert(1)</script>"), "image/png"))
      .toThrow(/format annoncé/i);
    expect(() => storeTaskAttachment(Buffer.from("pas un pdf"), "application/pdf"))
      .toThrow(/format annoncé/i);
  });

  it("accepte les signatures JPEG et PNG attendues", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    expect(storeTaskAttachment(jpeg, "image/jpeg").mimeType).toBe("image/jpeg");
    expect(storeTaskAttachment(png, "image/png").mimeType).toBe("image/png");
  });

  it("refuse les fichiers de plus de 4 Mo", () => {
    const bytes = Buffer.alloc(MAX_TASK_ATTACHMENT_BYTES + 1);
    expect(() => storeTaskAttachment(bytes, "application/pdf")).toThrow(/4 Mo/i);
  });

  it("refuse une clé dont le contenu a été altéré", () => {
    const stored = storeTaskAttachment(Buffer.from("%PDF-1.4\npreuve"), "application/pdf");
    const tampered = stored.storageKey.slice(0, -4) + "AAAA";
    expect(() => readTaskAttachment(tampered)).toThrow(/intégrité/i);
  });
});
