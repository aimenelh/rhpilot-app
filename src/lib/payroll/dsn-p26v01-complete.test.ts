import { describe, expect, it } from "vitest";
import { mappedDsnFixture as input } from "../../../scripts/payroll/dsn-fixture";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";


describe("DSN P26V01 complete mapped perimeter", () => {
  it("adds OPS payment, bordereau, aggregate and individual contribution blocks", () => {
    const content = buildDsnP26V01Complete(input());
    expect(content).toContain("S21.G00.20.001,'75366412700077'");
    expect(content).toContain("S21.G00.22.005,'1000.00'");
    expect(content).toContain("S21.G00.23.001,'100'");
    expect(content).toContain("S21.G00.81.001,'018'");
    expect(content).toContain("S21.G00.81.004,'-250.00'");
    expect(content).toContain("S21.G00.81.007,'10.000'");
  });

  it("recalculates S90 after inserting contribution blocks", () => {
    const rows = buildDsnP26V01Complete(input()).trim().split("\r\n");
    expect(rows.find((row) => row.startsWith("S90.G00.90.001,"))).toBe(`S90.G00.90.001,'${rows.length}'`);
  });

  it("blocks unversioned mappings", () => {
    const data = input();
    data.contributionBordereau.individualContributions[0].mappingVersion = "";
    expect(() => buildDsnP26V01Complete(data)).toThrow(/versionné/);
  });

  it("blocks missing individual contribution mappings", () => {
    const data = input();
    data.contributionBordereau.individualContributions = [];
    expect(() => buildDsnP26V01Complete(data)).toThrow(/cotisation individuelle/);
  });

  it("bloque un bordereau ou un paiement divergent du journal de cotisations", () => {
    const data = input();
    data.contributionBordereau.totalAmount += 0.01;
    expect(() => buildDsnP26V01Complete(data)).toThrow(/journal de paie/);
    const payment = input();
    payment.payments[0].amount -= 1;
    expect(() => buildDsnP26V01Complete(payment)).toThrow(/paiement Urssaf/);
  });

  it("respecte les champs autorisés par DIDA et les deux décimales du taux agrégé", () => {
    const data = input();
    expect(buildDsnP26V01Complete(data)).toContain("S21.G00.23.003,'1.50'");
    data.contributionBordereau.aggregatedContributions[0].contributionAmount = 1000;
    expect(() => buildDsnP26V01Complete(data)).toThrow(/montant de cotisation interdit/);
    delete data.contributionBordereau.aggregatedContributions[0].contributionAmount;
    delete data.contributionBordereau.aggregatedContributions[0].ratePercent;
    expect(() => buildDsnP26V01Complete(data)).toThrow(/taux obligatoire/);
  });

  it("bloque les doublons CTP et un code individuel sans CTP correspondant", () => {
    const data = input();
    data.contributionBordereau.aggregatedContributions.push({ ...data.contributionBordereau.aggregatedContributions[0], payableAmount: 0 });
    expect(() => buildDsnP26V01Complete(data)).toThrow(/deux fois/);
    const unmapped = input();
    unmapped.contributionBordereau.individualContributions[0].code = "999";
    expect(() => buildDsnP26V01Complete(unmapped)).toThrow(/correspondance/);
  });
});


describe("rattachement des cotisations aux bases déclaratives", () => {
  it("place les cotisations avant l'ancienneté et sous leur base parente", () => {
    const content = buildDsnP26V01Complete(input());
    expect(content.indexOf("S21.G00.78.001,'03'")).toBeLessThan(content.indexOf("S21.G00.81.001"));
    expect(content.indexOf("S21.G00.81.001")).toBeLessThan(content.indexOf("S21.G00.86.001"));
  });
  it("refuse une cotisation sans base parente et une réduction sans SMIC", () => {
    const data = input();
    data.contributionBordereau.individualContributions[0].baseCode = "04";
    expect(() => buildDsnP26V01Complete(data)).toThrow(/parente/);
    data.contributionBordereau.individualContributions[0].baseCode = "03";
    data.assessedBases[1].components = [];
    expect(() => buildDsnP26V01Complete(data)).toThrow(/SMIC/);
  });
});
