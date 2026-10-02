import { describe, expect, it } from "vitest";
import { dsnFixedTermReason } from "./dsn-fixed-term";
import { buildDsnP26V01Monthly } from "./dsn-p26v01";
import { mappedDsnFixture } from "../../../scripts/payroll/dsn-fixture";

describe("motif de recours au CDD", () => {
  it("exige un motif explicite et refuse les codes réservés à l'apprentissage ou aux marins", () => {
    expect(() => dsnFixedTermReason("02", "99", null)).toThrow(/obligatoire/);
    expect(() => dsnFixedTermReason("02", "99", "11")).toThrow(/valide/);
    expect(() => dsnFixedTermReason("02", "99", "14")).toThrow(/valide/);
    expect(dsnFixedTermReason("02", "99", "02")).toBe("02");
    expect(() => dsnFixedTermReason("01", "99", "01")).toThrow(/réservé/);
    expect(dsnFixedTermReason("01", "99", null)).toBeNull();
  });
  it("bloque un CDD incomplet puis émet le motif effectivement saisi", () => {
    const data = mappedDsnFixture();
    data.employees[0].contract.contractNatureCode = "02";
    data.employees[0].contract.endDate = new Date("2026-12-31");
    expect(() => buildDsnP26V01Monthly(data)).toThrow(/motif de recours/);
    data.employees[0].contract.fixedTermReasonCode = "01";
    expect(buildDsnP26V01Monthly(data)).toContain("S21.G00.40.021,'01'");
  });
});
