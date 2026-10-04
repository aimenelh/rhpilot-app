import { createHash } from "node:crypto";
import { openDocumentPayload, sealDocumentPayload } from "@/lib/document-crypto";

const PREFIX = "inline-db-absence-v1:";
const MAX_BYTES = 4 * 1024 * 1024;

export const ALLOWED_JUSTIFICATION_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

type AllowedJustificationType = (typeof ALLOWED_JUSTIFICATION_TYPES)[number];

export type StoredJustification = {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: AllowedJustificationType;
};

function hasExpectedSignature(bytes: Buffer, mimeType: AllowedJustificationType): boolean {
  switch (mimeType) {
    case "application/pdf":
      return bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-";
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
  }
}

export function storeAbsenceJustification(
  bytes: Buffer,
  mimeType: string,
): StoredJustification {
  if (!ALLOWED_JUSTIFICATION_TYPES.includes(mimeType as AllowedJustificationType)) {
    throw new Error("Format de fichier non autorisé. Utilisez un PDF, JPG ou PNG.");
  }
  if (bytes.length === 0) throw new Error("Le fichier est vide.");
  if (bytes.length > MAX_BYTES) throw new Error("Le fichier dépasse 4 Mo.");

  const safeMimeType = mimeType as AllowedJustificationType;
  if (!hasExpectedSignature(bytes, safeMimeType)) {
    throw new Error("Le contenu du fichier ne correspond pas au format annoncé.");
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    storageKey: `${PREFIX}${sha256}:${sealDocumentPayload(bytes)}`,
    sha256,
    sizeBytes: bytes.length,
    mimeType: safeMimeType,
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

  const bytes = openDocumentPayload(payload);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) throw new Error("Intégrité du document invalide.");
  if (bytes.length > MAX_BYTES) throw new Error("Document trop volumineux.");
  return bytes;
}
