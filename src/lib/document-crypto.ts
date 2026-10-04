import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement au repos des documents stockés en base (justificatifs d'absence,
 * bulletins et coffre-fort salarié, pièces jointes des tâches).
 *
 * AES-256-GCM, clé DOCUMENT_ENCRYPTION_KEY (32 octets en base64). La charge
 * chiffrée est préfixée « enc1. » ; une charge sans préfixe est un document
 * enregistré avant le chiffrement, toujours lisible.
 *
 * Sécurité : en production, l'absence de clé bloque toute nouvelle écriture.
 * Les environnements de développement/test conservent la compatibilité avec
 * l'ancien stockage en clair afin de pouvoir relire et tester les données legacy.
 */

const ENCRYPTED_PREFIX = "enc1.";

function encryptionKey(options: { requiredForWrite?: boolean } = {}): Buffer | null {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (options.requiredForWrite && process.env.NODE_ENV === "production") {
      throw new Error(
        "Stockage documentaire bloqué : DOCUMENT_ENCRYPTION_KEY n'est pas configurée en production.",
      );
    }
    return null;
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY doit contenir exactement 32 octets encodés en base64.",
    );
  }
  return key;
}

/** Charge à placer dans la clé de stockage : base64 legacy, ou « enc1. » + base64(iv | tag | chiffré). */
export function sealDocumentPayload(bytes: Buffer): string {
  const key = encryptionKey({ requiredForWrite: true });
  if (!key) return bytes.toString("base64");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return ENCRYPTED_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function isSealedPayload(payload: string): boolean {
  return payload.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Relit une charge chiffrée ou legacy en clair.
 * On ne casse pas les anciens documents lors du durcissement : seule une
 * nouvelle écriture en production exige impérativement la clé.
 */
export function openDocumentPayload(payload: string): Buffer {
  if (!isSealedPayload(payload)) return Buffer.from(payload, "base64");

  const key = encryptionKey();
  if (!key) {
    throw new Error(
      "Document chiffré illisible : DOCUMENT_ENCRYPTION_KEY n'est pas configurée.",
    );
  }

  const raw = Buffer.from(payload.slice(ENCRYPTED_PREFIX.length), "base64");
  if (raw.length < 29) throw new Error("Document chiffré invalide.");

  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
}
