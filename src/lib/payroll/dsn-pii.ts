import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey(): Buffer {
  const raw = process.env.DSN_PII_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "DSN bloquée : DSN_PII_ENCRYPTION_KEY n'est pas configurée. Les identifiants sensibles ne seront jamais stockés en clair.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("DSN bloquée : DSN_PII_ENCRYPTION_KEY doit contenir exactement 32 octets encodés en base64.");
  }
  return key;
}

export function normalizeNir(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function assertNirFormat(value: string): string {
  const normalized = normalizeNir(value);
  if (!/^[12][0-9]{12}$/.test(normalized)) {
    throw new Error("Le NIR doit contenir 13 chiffres et commencer par 1 ou 2. La clé de contrôle n'est pas stockée dans la DSN RH Pilot.");
  }
  return normalized;
}

export function encryptDsnSensitiveValue(value: string): string {
  const plaintext = value.trim();
  if (!plaintext) throw new Error("La donnée DSN sensible à chiffrer est vide.");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptDsnSensitiveValue(payload: string): string {
  const [version, ivRaw, tagRaw, encryptedRaw, ...extra] = payload.split(".");
  if (version !== VERSION || !ivRaw || !tagRaw || !encryptedRaw || extra.length > 0) {
    throw new Error("DSN bloquée : format de donnée sensible chiffrée invalide.");
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("DSN bloquée : impossible de déchiffrer l'identifiant sensible avec la clé configurée.");
  }
}
