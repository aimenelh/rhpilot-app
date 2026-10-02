import { afterEach, describe, expect, it } from "vitest";
import { openDsnWorkEventArchive, sealDsnWorkEventArchive } from "./dsn-work-event-archive";

const previousKey = process.env.DSN_PII_ENCRYPTION_KEY;
afterEach(() => { if (previousKey === undefined) delete process.env.DSN_PII_ENCRYPTION_KEY; else process.env.DSN_PII_ENCRYPTION_KEY = previousKey; });
const identity = { id: "archive", organizationId: "company", employeeId: "employee", absenceId: "absence", nature: "04", declarationOrder: BigInt(123), version: 1, sourceDigest: "b".repeat(64) };
describe("archives chiffrées des signalements DSN", () => {
  it("conserve les octets Latin1 et CRLF du fichier sans stocker le contenu en clair", () => {
    process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");
    const content = "S21.G00.30.002,'François'\r\n";
    const archive = sealDsnWorkEventArchive(identity, content);
    expect(openDsnWorkEventArchive(archive)).toEqual(Buffer.from(content, "latin1"));
    expect(archive.contentCiphertext).not.toContain("François");
    expect(archive.sizeBytes).toBe(Buffer.byteLength(content, "latin1"));
  });
  it("refuse une substitution d'entreprise, salarié, arrêt, nature, numéro ou version", () => {
    process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");
    const archive = sealDsnWorkEventArchive(identity, "S10.G00.00.001,'Test'\r\n");
    for (const patch of [{ organizationId: "other" }, { employeeId: "other" }, { absenceId: "other" }, { nature: "05" }, { declarationOrder: BigInt(124) }, { version: 2 }, { sourceDigest: "c".repeat(64) }]) {
      expect(() => openDsnWorkEventArchive({ ...archive, ...patch })).toThrow(/contexte/);
    }
    expect(() => openDsnWorkEventArchive({ ...archive, sizeBytes: archive.sizeBytes + 1 })).toThrow(/intégrité/);
  });
  it("exige une clé valide et refuse un fichier non Latin1", () => {
    delete process.env.DSN_PII_ENCRYPTION_KEY;
    expect(() => sealDsnWorkEventArchive(identity, "Test\r\n")).toThrow(/configurée/);
    expect(() => sealDsnWorkEventArchive(identity, "Test 🦊\r\n")).toThrow(/ISO-8859-1/);
  });
});
