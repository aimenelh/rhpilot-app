import { createHash } from "node:crypto";

const PREFIX = "inline-db-v1:";

export type StoredPayslipDocument = {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
};

/**
 * MVP de stockage persistant utilisant le champ storageKey existant.
 * La valeur stockée est une charge base64 versionnée ; l'abstraction permet
 * de migrer vers un object storage sans changer le métier du bulletin.
 */
export function storePayslipDocument(pdf: Buffer): StoredPayslipDocument {
  if (pdf.length === 0) throw new Error("Le document PDF est vide.");

  const sha256 = createHash("sha256").update(pdf).digest("hex");
  const payload = pdf.toString("base64");

  return {
    storageKey: `${PREFIX}${sha256}:${payload}`,
    sha256,
    sizeBytes: pdf.length,
  };
}

export function readPayslipDocument(storageKey: string): Buffer {
  if (!storageKey.startsWith(PREFIX)) throw new Error("Type de stockage de bulletin non supporté.");
  const value = storageKey.slice(PREFIX.length);
  const separator = value.indexOf(":");
  if (separator <= 0) throw new Error("Clé de stockage de bulletin invalide.");

  const expectedHash = value.slice(0, separator);
  const payload = value.slice(separator + 1);
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || !payload) {
    throw new Error("Clé de stockage de bulletin invalide.");
  }

  const pdf = Buffer.from(payload, "base64");
  const actualHash = createHash("sha256").update(pdf).digest("hex");
  if (actualHash !== expectedHash) throw new Error("Intégrité du bulletin PDF invalide.");
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error("Le document stocké n'est pas un PDF valide.");
  }
  return pdf;
}
