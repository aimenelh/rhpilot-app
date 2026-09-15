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
      declaredContactType: "04",
      enterpriseApenCode: "6201Z",
    },
    establishment: { nafCode: "6201Z", collectiveAgreementCode: "1486" },
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
        sexCode: null,
        birthDate: new Date("1986-08-10T00:00:00.000Z"),
        birthPlace: "Montpellier",
        birthDepartment: "34",
        birthCountryCode: "FR",
        euClassificationCode: "01",
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
          baseSchemeSupplementCode: "99",
          collectiveAgreementCode: "1486",
          sicknessRegimeCode: "200",
          workLocationId: "12345678900017",
          oldAgeRegimeCode: "200",
          foreignWorkerCode: "99",
          employmentStatusCode: "99",
          multipleJobsCode: "01",
          multipleEmployersCode: "01",
          workAccidentRegimeCode: "200",
          workAccidentRiskCode: "602MD",
          workAccidentRate: 1.5,
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
  it("builds the mandatory identity, contract, PAS, activity, MNS and gross-base perimeter", () => {
    const content = buildDsnP26V01Monthly(input());
    expect(content).toContain("S10.G00.00.005,'01'\r\n");
    expect(content).toContain("S10.G00.00.006,'P26V01'\r\n");
    expect(content).toContain("S20.G00.05.003,'11'\r\n");
    expect(content).toContain("S20.G00.07.004,'04'\r\n");
    expect(content).toContain("S21.G00.06.003,'6201Z'\r\n");
    expect(content).toContain("S21.G00.11.022,'1486'\r\n");
    expect(content).toContain("S21.G00.30.013,'01'\r\n");
    expect(content).toContain("S21.G00.30.014,'34'\r\n");
    expect(content).toContain("S21.G00.30.015,'FR'\r\n");
    expect(content).not.toContain("S21.G00.30.005,");
    expect(content).toContain("S21.G00.40.016,'99'\r\n");
    expect(content).toContain("S21.G00.40.019,'12345678900017'\r\n");
    expect(content).toContain("S21.G00.40.024,'99'\r\n");
    expect(content).toContain("S21.G00.40.026,'99'\r\n");
    expect(content).toContain("S21.G00.40.036,'01'\r\n");
    expect(content).toContain("S21.G00.40.037,'01'\r\n");
    expect(content).toContain("S21.G00.40.039,'200'\r\n");
    expect(content).toContain("S21.G00.40.040,'602MD'\r\n");
    expect(content).toContain("S21.G00.40.043,'1.50'\r\n");
    expect(content).toContain("S21.G00.50.007,'01'\r\n");
    expect(content).toContain("S21.G00.50.008,'123456789'\r\n");
    expect(content).toContain("S21.G00.50.013,'2050.00'\r\n");
    expect(content).toContain("S21.G00.51.011,'001'\r\n");
    expect(content).toContain("S21.G00.51.011,'002'\r\n");
    expect(content).toContain("S21.G00.51.011,'003'\r\n");
    expect(content).toContain("S21.G00.51.011,'010'\r\n");
    expect(content).toContain("S21.G00.53.001,'01'\r\n");
    expect(content).toContain("S21.G00.53.002,'151.67'\r\n");
    expect(content).toContain("S21.G00.53.003,'10'\r\n");
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

  it("accepts apostrophes inside Latin-1 identity data", () => {
    const data = input();
    data.employees[0].lastName = "O'CONNOR";
    const content = buildDsnP26V01Monthly(data);
    expect(content).toContain("S21.G00.30.002,'O'CONNOR'\r\n");
  });

  it("rejects characters outside ISO-8859-1 instead of silently corrupting the physical file", () => {
    const data = input();
    data.employees[0].lastName = "DUPONT🙂";
    expect(() => buildDsnP26V01Monthly(data)).toThrow(/ISO-8859-1/i);
  });

  it("rejects physical lines over 256 characters", () => {
    const data = input();
    data.employees[0].addressLine = "A".repeat(250);
    expect(() => buildDsnP26V01Monthly(data)).toThrow(/256 caractères/i);
  });

  it("rejects a non 14-digit SIRET", () => {
    const invalid = input();
    invalid.emitter.siret = "123";
    expect(() => buildDsnP26V01Monthly(invalid)).toThrow(/SIRET/i);
  });

  it("requires an AT/MP rate when the risk code is known", () => {
    const invalid = input();
    invalid.employees[0].contract.workAccidentRate = null;
    expect(() => buildDsnP26V01Monthly(invalid)).toThrow(/taux AT\/MP/i);
  });
});
