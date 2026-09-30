import { createHash } from "node:crypto";
import { decryptDsnSensitiveValue, encryptDsnSensitiveValue } from "./dsn-pii";

export type DsnArchiveIdentity = { id: string; organizationId: string; payrollPeriodId: string };
export type SealedDsnArchive = DsnArchiveIdentity & { contentCiphertext: string; sha256: string; sizeBytes: number };

export function dsnPhysicalBytes(content: string): Buffer {
  if (!content || content.length > 8 * 1024 * 1024) throw new Error("DSN bloquée : taille du fichier à archiver invalide.");
  for (const character of content) if (character.charCodeAt(0) > 255) throw new Error("DSN bloquée : le fichier ne peut pas être encodé en ISO-8859-1.");
  return Buffer.from(content, "latin1");
}
export function sealDsnArchive(identity: DsnArchiveIdentity, content: string): SealedDsnArchive {
  const body = dsnPhysicalBytes(content);
  const sha256 = createHash("sha256").update(body).digest("hex");
  const contentCiphertext = encryptDsnSensitiveValue(JSON.stringify({ ...identity, sha256, body: body.toString("base64") }));
  return { ...identity, contentCiphertext, sha256, sizeBytes: body.length };
}
export function openDsnArchive(archive: SealedDsnArchive): Buffer {
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(decryptDsnSensitiveValue(archive.contentCiphertext)); } catch { throw new Error("DSN bloquée : archive chiffrée illisible."); }
  if (!payload || payload.id !== archive.id || payload.organizationId !== archive.organizationId || payload.payrollPeriodId !== archive.payrollPeriodId || payload.sha256 !== archive.sha256 || typeof payload.body !== "string") throw new Error("DSN bloquée : l'identité de l'archive ne correspond pas à son contenu chiffré.");
  const body = Buffer.from(payload.body, "base64");
  if (body.length !== archive.sizeBytes || createHash("sha256").update(body).digest("hex") !== archive.sha256) throw new Error("DSN bloquée : l'intégrité du fichier archivé est invalide.");
  return body;
}
