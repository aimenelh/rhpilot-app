import { createHash } from "node:crypto";

const PREFIX = "inline-db-absence-v1:";
const MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_JUSTIFICATION_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type StoredJustification = {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: (typeof ALLOWED_JUSTIFICATION_TYPES)[number];
};

export function storeAbsenceJustification(
  bytes: Buffer,
  mimeType: string,
): StoredJustification {
  if (!ALLOWED_JUSTIFICATION_TYPES.includes(mimeType as (typeof ALLOWED_JUSTIFICATION_TYPES)[number])) {
    throw new Error("Format de fichier non autorisé. Utilisez un PDF, JPG ou PNG.");
  }
  if (bytes.length === 0) throw new Error("Le fichier est vide.");
  if (bytes.length > MAX_BYTES) throw new Error("Le fichier dépasse 10 Mo.");

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    storageKey: `${PREFIX}${sha256}:${bytes.toString("base64")}`,
    sha256,
    sizeBytes: bytes.length,
    mimeType: mimeType as (typeof ALLOWED_JUSTIFICATION_TYPES)[number],
  };
}

export function readAbsenceJustification(storageKey: string): Buffer {
  if (!storageKey.startsWith(PREFIX)) throw new Error("Type de stockage non supporté.");
  const value = storageKey.slice(PREFIX.length);
  const separator = value.indexOf(":");
  if (separator <= 0) throw new Error("Clé de stockage invalide.");

  const expectedHash = value.slice(0, separator);
  const payload = value.slice(separator + 1);
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || !payload) throw new Error("Clé de stockage invalide.");

  const bytes = Buffer.from(payload, "base64");
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) throw new Error("Intégrité du document invalide.");
  if (bytes.length > MAX_BYTES) throw new Error("Document trop volumineux.");
  return bytes;
}
