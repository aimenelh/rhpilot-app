import { describe, expect, it } from "vitest";
import { employeeIdentityKey } from "@/lib/employeeIdentity";

describe("employeeIdentityKey", () => {
  it("normalise casse, espaces et accents", () => {
    const a = employeeIdentityKey({
      firstName: " Élodie ",
      lastName: "DUPONT",
      hireDate: new Date("2026-09-01T00:00:00.000Z"),
    });
    const b = employeeIdentityKey({
      firstName: "elodie",
      lastName: " dupont ",
      hireDate: new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(a).toBe(b);
  });

  it("distingue deux dates d'embauche différentes", () => {
    const a = employeeIdentityKey({
      firstName: "Paul",
      lastName: "Martin",
      hireDate: new Date("2026-09-01"),
    });
    const b = employeeIdentityKey({
      firstName: "Paul",
      lastName: "Martin",
      hireDate: new Date("2026-09-02"),
    });
    expect(a).not.toBe(b);
  });
});
