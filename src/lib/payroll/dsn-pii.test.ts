import { afterEach, describe, expect, it } from "vitest";
import { assertNirFormat, decryptDsnSensitiveValue, encryptDsnSensitiveValue } from "./dsn-pii";

const previousKey = process.env.DSN_PII_ENCRYPTION_KEY;

afterEach(() => {
  if (previousKey === undefined) delete process.env.DSN_PII_ENCRYPTION_KEY;
  else process.env.DSN_PII_ENCRYPTION_KEY = previousKey;
});

describe("DSN sensitive data encryption", () => {
  it("encrypts and decrypts a NIR without storing it in clear text", () => {
    process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const nir = "1860875123456";
    const encrypted = encryptDsnSensitiveValue(nir);
    expect(encrypted).not.toContain(nir);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptDsnSensitiveValue(encrypted)).toBe(nir);
  });

  it("rejects an invalid encryption key", () => {
    process.env.DSN_PII_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString("base64");
    expect(() => encryptDsnSensitiveValue("1860875123456")).toThrow(/32 octets/i);
  });

  it("normalizes spaces and validates the 13-digit NIR used by DSN", () => {
    expect(assertNirFormat("1 86 08 75 123 456")).toBe("1860875123456");
    expect(() => assertNirFormat("3860875123456")).toThrow(/NIR/i);
  });
});
