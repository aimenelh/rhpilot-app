import { describe, expect, it } from "vitest";
import { buildDsnP26V01Monthly } from "./dsn-p26v01";

function input() {
  return {
    testMode: true,
    declarationOrder: 1,
    fileDate: new Date("2026-09-15T12:00:00.000Z"),
    emitter: {
      siret: "12345678900017",
      name: "RH Pilot Test",
      address: "1 rue du Test",
      postalCode: "34000",
      city: "Montpellier",
      contactName: "Aimen Test",
      contactEmail: "dsn@example.test",
      contactPhone: "0400000000",
    },
    establishment: { nafCode: "6201Z" },
    period: {
      year: 2026,
      month: 8,
      paymentDate: new Date("2026-08-31T00:00:00.000Z"),
    },
    employees: [
      {
        nir: "1860875123456",
        lastName: "DUPONT",
        firstName: "Maxime",
        sexCode: "01" as const,
        birthDate: new Date("1986-08-10T00:00:00.000Z"),
        birthPlace: "Montpellier",
        birthDepartment: "34",
        addressLine: "2 rue du Salarié",
        postalCode: "34000",
        city: "Montpellier",
        countryCode: null,
        position: "Gestionnaire RH",
        contract: {
          startDate: new Date("2024-01-01T00:00:00.000Z"),
          endDate: null,
          contractNumber: "CONTRAT001",
          contractNatureCode: "01",
          publicPolicyCode: "99",
          pcsEsecCode: "372E",
          conventionalStatusCode: "04",
          retirementStatusCode: "01",
          workUnitCode: "10",
          referenceWorkQuota: 151.67,
          contractWorkQuota: 151.67,
          workModalityCode: "10",
          collectiveAgreementCode: "9999",
          sicknessRegimeCode: "200",
          oldAgeRegimeCode: "200",
        },
        payroll: {
          baseSalary: 2500,
          grossAmount: 2500,
          netBeforeTax: 1980,
          netTaxableAmount: 2050,
          netSocialAmount: 1960,
          withholdingTax: 153.75,
          pas: {
            rateType: "01" as const,
            ratePercent: 7.5,
            rateIdentifier: "123456789",
            amountSubjectToPas: 2050,
            withholdingAmount: 153.75,
          },
        },
      },
    ],
  };
}

describe("DSN P26V01 builder", () => {
  it("builds a monthly test declaration with PAS, remuneration, MNS and gross base", () => {
    const content = buildDsnP26V01Monthly(input());
    expect(content).toContain("S10.G00.00.005,'01'\r\n");
    expect(content).toContain("S10.G00.00.006,'P26V01'\r\n");
    expect(content).toContain("S20.G00.05.003,'11'\r\n");
    expect(content).toContain("S21.G00.50.007,'01'\r\n");
    expect(content).toContain("S21.G00.50.008,'123456789'\r\n");
    expect(content).toContain("S21.G00.50.013,'2050.00'\r\n");
    expect(content).toContain("S21.G00.51.011,'001'\r\n");
    expect(content).toContain("S21.G00.51.011,'002'\r\n");
    expect(content).toContain("S21.G00.51.011,'010'\r\n");
    expect(content).toContain("S21.G00.58.003,'03'\r\n");
    expect(content).toContain("S21.G00.78.001,'03'\r\n");
    expect(content.endsWith("\r\n")).toBe(true);
  });

  it("counts S90 totals including both total rubrics", () => {
    const content = buildDsnP26V01Monthly(input());
    const rows = content.trim().split("\r\n");
    const totalLine = rows.find((line) => line.startsWith("S90.G00.90.001,"));
    expect(totalLine).toBe(`S90.G00.90.001,'${rows.length}'`);
    expect(rows.at(-1)).toBe("S90.G00.90.002,'1'");
  });

  it("rejects a non 14-digit SIRET", () => {
    const invalid = input();
    invalid.emitter.siret = "123";
    expect(() => buildDsnP26V01Monthly(invalid)).toThrow(/SIRET/i);
  });
});
