import { describe, expect, it } from "vitest";
import { assertDsnWorkAccidentRiskCode } from "./dsn-nomenclature";
import { buildDsnP26V01Monthly } from "./dsn-p26v01";
import { mappedDsnFixture } from "../../../scripts/payroll/dsn-fixture";

describe("nomenclature officielle AT/MP P26V01", () => {
  it("refuse le faux code précédemment proposé dans le formulaire", () => {
    expect(() => assertDsnWorkAccidentRiskCode("602MD")).toThrow(/nomenclature officielle/);
    expect(() => assertDsnWorkAccidentRiskCode("723ZA", new Date("2026-08-31"))).not.toThrow();
  });
  it("refuse un code expiré avant le mois déclaré", () => {
    expect(() => assertDsnWorkAccidentRiskCode("741GDB", new Date("2026-08-31"))).toThrow(/pas valable/);
  });
  it("refuse un SIRET de bonne longueur dont la clé de contrôle est incorrecte", () => {
    const data = mappedDsnFixture();
    data.emitter.siret = "12345678900017";
    expect(() => buildDsnP26V01Monthly(data)).toThrow(/SIRET/);
  });
});
