import { createHash } from "node:crypto";

const PREFIX = "inline-db-v1:";
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

export type StoredPayslipDocument = {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
};

/**
 * MVP de stockage persistant utilisant le champ storageKey existant.
 * La valeur stockée est une charge base64 versionnée ; l’abstraction permet
 * de migrer vers un object storage sans changer le métier du bulletin.
 */
export function storePayslipDocument(pdf: Buffer): StoredPayslipDocument {
  if (pdf.length === 0) throw new Error("Le document PDF est vide.");
  if (pdf.length > MAX_PDF_SIZE_BYTES) throw new Error("Le document PDF dépasse la taille maximale autorisée.");
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Le document à stocker n'est pas un PDF valide.");

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
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || !payload || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length % 4 !== 0) {
    throw new Error("Clé de stockage de bulletin invalide.");
  }

  const pdf = Buffer.from(payload, "base64");
  if (pdf.length === 0 || pdf.length > MAX_PDF_SIZE_BYTES) throw new Error("Taille du document stocké invalide.");
  const canonicalPayload = pdf.toString("base64");
  if (canonicalPayload !== payload) throw new Error("Charge base64 du bulletin invalide.");

  const actualHash = createHash("sha256").update(pdf).digest("hex");
  if (actualHash !== expectedHash) throw new Error("Intégrité du bulletin PDF invalide.");
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Le document stocké n'est pas un PDF valide.");
  return pdf;
}
