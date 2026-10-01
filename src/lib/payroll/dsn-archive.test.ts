import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dsnPhysicalBytes, openDsnArchive, sealDsnArchive } from "./dsn-archive";

const identity = { id: "dsn-1", organizationId: "company-a", payrollPeriodId: "period-1" };
const file = "S10.G00.01.002,'Société test'\r\nS90.G00.90.002,'1'\r\n";
let priorKey: string | undefined;
beforeEach(() => { priorKey = process.env.DSN_PII_ENCRYPTION_KEY; process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); });
afterEach(() => { if (priorKey === undefined) delete process.env.DSN_PII_ENCRYPTION_KEY; else process.env.DSN_PII_ENCRYPTION_KEY = priorKey; });
describe("archive physique DSN chiffrée", () => {
  it("préserve les octets Latin-1, accents et CRLF, avec un hash stable", () => {
    const one = sealDsnArchive(identity, file);
    const two = sealDsnArchive(identity, file);
    expect(one.sha256).toBe(two.sha256);
    expect(one.contentCiphertext).not.toBe(two.contentCiphertext);
    expect(one.contentCiphertext).not.toContain("Société");
    expect(openDsnArchive(one)).toEqual(Buffer.from(file, "latin1"));
    expect(openDsnArchive(one).toString("latin1")).toBe(file);
  });
  it("refuse la substitution entre entreprises et les métadonnées altérées", () => {
    const archive = sealDsnArchive(identity, file);
    expect(() => openDsnArchive({ ...archive, organizationId: "company-b" })).toThrow(/identité/);
    expect(() => openDsnArchive({ ...archive, payrollPeriodId: "other-period" })).toThrow(/identité/);
    expect(() => openDsnArchive({ ...archive, sizeBytes: archive.sizeBytes + 1 })).toThrow(/intégrité/);
    expect(() => openDsnArchive({ ...archive, sha256: "0".repeat(64) })).toThrow(/identité/);
  });
  it("refuse les caractères non représentables et une clé absente", () => {
    expect(() => dsnPhysicalBytes("DSN 😀")).toThrow(/ISO-8859-1/);
    delete process.env.DSN_PII_ENCRYPTION_KEY;
    expect(() => sealDsnArchive(identity, file)).toThrow(/DSN_PII_ENCRYPTION_KEY/);
  });
});
