import { describe, expect, it } from "vitest";
import { buildDsnP26V01Monthly } from "./dsn-p26v01";

function input() {
  return {
    testMode: true,
    declarationOrder: 1,
    fileDate: new Date("2026-09-15T12:00:00.000Z"),
    emitter: {
      siret: "12345678200010",
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
          workLocationId: "12345678200010",
          oldAgeRegimeCode: "200",
          foreignWorkerCode: "99",
          employmentStatusCode: "99",
          multipleJobsCode: "01",
          multipleEmployersCode: "01",
          workAccidentRegimeCode: "200",
          workAccidentRiskCode: "723ZA",
          workAccidentRate: 1.5,
          suspensions: [] as Array<{ reasonCode: "501"; startDate: Date; endDate: Date }>,
        },
        payroll: {
          baseSalary: 2500,
          grossAmount: 2500, cappedContributionBase: 2500,
          netBeforeTax: 1980,
          netTaxableAmount: 2050,
          netSocialAmount: 1960,
          withholdingTax: 153.75,
          paidHours: 151.67,
          unpaidAbsenceHours: 0,
          overtimeRemunerations: [] as Array<{ type: "017" | "018"; hours: number; amount: number }>,
          overtimeTaxExemptNetAmount: 0,
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
    expect(content).toContain("S21.G00.40.019,'12345678200010'\r\n");
    expect(content).toContain("S21.G00.40.024,'99'\r\n");
    expect(content).toContain("S21.G00.40.026,'99'\r\n");
    expect(content).toContain("S21.G00.40.036,'01'\r\n");
    expect(content).toContain("S21.G00.40.037,'01'\r\n");
    expect(content).toContain("S21.G00.40.039,'200'\r\n");
    expect(content).toContain("S21.G00.40.040,'723ZA'\r\n");
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

  it("déclare un arrêt maladie non subrogé dans le bloc S21.G00.60", () => {
    const data = input();
    data.employees[0].contract.workStoppages = [{
      reasonCode: "01",
      lastWorkedDate: new Date("2026-08-09T00:00:00.000Z"),
      expectedEndDate: new Date("2026-08-14T00:00:00.000Z"),
      subrogation: false,
      returnDate: new Date("2026-08-15T00:00:00.000Z"),
      returnReasonCode: "01",
    }];
    const content = buildDsnP26V01Monthly(data);
    expect(content).toContain("S21.G00.60.001,'01'\r\nS21.G00.60.002,'09082026'\r\nS21.G00.60.003,'14082026'\r\nS21.G00.60.004,'02'");
    expect(content).toContain("S21.G00.60.010,'15082026'\r\nS21.G00.60.011,'01'");
    expect(content).not.toContain("S21.G00.60.005,");
  });

  it("déclare une subrogation complète et les IJSS nettes en S21.G00.58 type 10", () => {
    const data = input();
    data.employees[0].contract.workStoppages = [{
      reasonCode: "01",
      lastWorkedDate: new Date("2026-08-09T00:00:00.000Z"),
      expectedEndDate: new Date("2026-08-20T00:00:00.000Z"),
      subrogation: true,
      subrogationStartDate: new Date("2026-08-10T00:00:00.000Z"),
      subrogationEndDate: new Date("2026-08-20T00:00:00.000Z"),
      subrogationIban: "FR7630006000011234567890189",
      subrogationBic: "AGRIFRPPXXX",
    }];
    data.employees[0].payroll.subrogatedIjssNetAmount = 368.12;
    const content = buildDsnP26V01Monthly(data);
    expect(content).toContain("S21.G00.60.004,'01'\r\nS21.G00.60.005,'10082026'\r\nS21.G00.60.006,'20082026'\r\nS21.G00.60.007,'FR7630006000011234567890189'\r\nS21.G00.60.008,'AGRIFRPPXXX'");
    expect(content).toContain("S21.G00.58.003,'10'\r\nS21.G00.58.004,'368.12'");
  });

  it("refuse une subrogation incomplète", () => {
    const data = input();
    data.employees[0].contract.workStoppages = [{
      reasonCode: "02",
      lastWorkedDate: new Date("2026-08-01T00:00:00.000Z"),
      expectedEndDate: new Date("2026-08-31T00:00:00.000Z"),
      subrogation: true,
    }];
    expect(() => buildDsnP26V01Monthly(data)).toThrow(/subrogation nécessite ses dates et le compte bancaire/i);
  });

  it("déclare le congé sans solde en suspension 501 et activité 02", () => {
    const data = input();
    data.employees[0].contract.suspensions = [{
      reasonCode: "501" as const,
      startDate: new Date("2026-08-10T00:00:00.000Z"),
      endDate: new Date("2026-08-14T00:00:00.000Z"),
    }];
    data.employees[0].payroll.paidHours = 116.67;
    data.employees[0].payroll.unpaidAbsenceHours = 35;
    const content = buildDsnP26V01Monthly(data);
    expect(content).toContain("S21.G00.65.001,'501'\r\nS21.G00.65.002,'10082026'\r\nS21.G00.65.003,'14082026'");
    expect(content).toContain("S21.G00.53.001,'01'\r\nS21.G00.53.002,'116.67'\r\nS21.G00.53.003,'10'\r\nS21.G00.53.001,'02'\r\nS21.G00.53.002,'35.00'\r\nS21.G00.53.003,'10'");
  });

  it("déclare les HS/HC 017/018 et le net fiscal exonéré P26V01", () => {
    const data = input();
    data.employees[0].payroll.overtimeRemunerations = [
      { type: "018", hours: 17.33, amount: 320 },
      { type: "017", hours: 5, amount: 125 },
    ];
    data.employees[0].payroll.overtimeTaxExemptNetAmount = 415.28;
    const content = buildDsnP26V01Monthly(data);
    expect(content).toContain("S21.G00.51.011,'018'\r\nS21.G00.51.012,'17.33'\r\nS21.G00.51.013,'320.00'");
    expect(content).toContain("S21.G00.51.011,'017'\r\nS21.G00.51.012,'5.00'\r\nS21.G00.51.013,'125.00'");
    expect(content).toContain("S21.G00.58.003,'01'\r\nS21.G00.58.004,'415.28'");
    const exemptIndex = content.indexOf("S21.G00.58.003,'01'");
    const datedNetSocialIndex = content.indexOf("S21.G00.58.003,'03'");
    expect(exemptIndex).toBeGreaterThan(-1);
    expect(exemptIndex).toBeLessThan(datedNetSocialIndex);
  });

  it("refuse des rémunérations d'heures non agrégées ou sans volume", () => {
    const duplicate = input();
    duplicate.employees[0].payroll.overtimeRemunerations = [
      { type: "017", hours: 2, amount: 50 },
      { type: "017", hours: 1, amount: 25 },
    ];
    expect(() => buildDsnP26V01Monthly(duplicate)).toThrow(/agrégées par type/);
    const invalid = input();
    invalid.employees[0].payroll.overtimeRemunerations = [{ type: "018", hours: 0, amount: 100 }];
    expect(() => buildDsnP26V01Monthly(invalid)).toThrow(/volume strictement positif/);
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
    (invalid.employees[0].contract as { workAccidentRate: number | null }).workAccidentRate = null;
    expect(() => buildDsnP26V01Monthly(invalid)).toThrow(/taux AT\/MP/i);
  });
});
