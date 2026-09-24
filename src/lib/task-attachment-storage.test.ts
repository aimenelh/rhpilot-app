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

  it("refuse les fichiers de plus de 4 Mo", () => {
    const bytes = Buffer.alloc(MAX_TASK_ATTACHMENT_BYTES + 1);
    expect(() => storeTaskAttachment(bytes, "application/pdf")).toThrow(/4 Mo/i);
  });

  it("refuse une clé dont le contenu a été altéré", () => {
    const stored = storeTaskAttachment(Buffer.from("preuve"), "application/pdf");
    const tampered = stored.storageKey.slice(0, -4) + "AAAA";
    expect(() => readTaskAttachment(tampered)).toThrow(/intégrité/i);
  });
});
