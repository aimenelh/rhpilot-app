import { createHash } from "node:crypto";
import { dsnPhysicalBytes } from "./dsn-archive";
import { decryptDsnSensitiveValue, encryptDsnSensitiveValue } from "./dsn-pii";

type Identity = { id: string; organizationId: string; employeeId: string; absenceId: string; nature: string; declarationOrder: bigint; version: number; sourceDigest: string };
type Archive = Identity & { contentCiphertext: string; sha256: string; sizeBytes: number };
const context = (archive: Identity) => ({ id: archive.id, organizationId: archive.organizationId, employeeId: archive.employeeId, absenceId: archive.absenceId,
  nature: archive.nature, declarationOrder: archive.declarationOrder.toString(), version: archive.version, sourceDigest: archive.sourceDigest });

export function sealDsnWorkEventArchive(identity: Identity, content: string): Archive {
  const bytes = dsnPhysicalBytes(content);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { ...identity, sha256, sizeBytes: bytes.length,
    contentCiphertext: encryptDsnSensitiveValue(JSON.stringify({ ...context(identity), sha256, body: bytes.toString("base64") })) };
}

export function openDsnWorkEventArchive(archive: Archive): Buffer {
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(decryptDsnSensitiveValue(archive.contentCiphertext)); } catch { throw new Error("DSN bloquée : signalement chiffré illisible."); }
  if (!payload || Object.entries(context(archive)).some(([key, value]) => payload[key] !== value) || payload.sha256 !== archive.sha256 || typeof payload.body !== "string") throw new Error("DSN bloquée : le contexte du signalement ne correspond pas à son archive chiffrée.");
  const bytes = Buffer.from(payload.body, "base64");
  if (bytes.length !== archive.sizeBytes || createHash("sha256").update(bytes).digest("hex") !== archive.sha256) throw new Error("DSN bloquée : l'intégrité du signalement est invalide.");
  return bytes;
}
