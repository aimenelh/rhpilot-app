import { describe, expect, it } from "vitest";
import { buildDsnP26V01Complete, type DsnP26CompleteInput } from "./dsn-p26v01-complete";

function input(): DsnP26CompleteInput {
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
    period: { year: 2026, month: 8, paymentDate: new Date("2026-08-31T00:00:00.000Z") },
    employees: [{
      nir: "1860875123456",
      lastName: "DUPONT",
      firstName: "Maxime",
      sexCode: null,
      birthDate: new Date("1986-08-10T00:00:00.000Z"),
      birthPlace: "Montpellier",
      birthDepartment: "34",
      birthCountryCode: "FR",
      euClassificationCode: "01",
      addressLine: "2 rue du Salarie",
      postalCode: "34000",
      city: "Montpellier",
      countryCode: null,
      position: "Gestionnaire RH",
      contract: {
        startDate: new Date("2024-01-01T00:00:00.000Z"), endDate: null, contractNumber: "CONTRAT001",
        contractNatureCode: "01", publicPolicyCode: "99", pcsEsecCode: "372E", conventionalStatusCode: "04",
        retirementStatusCode: "01", workUnitCode: "10", referenceWorkQuota: 151.67, contractWorkQuota: 151.67,
        workModalityCode: "10", baseSchemeSupplementCode: "99", collectiveAgreementCode: "1486", sicknessRegimeCode: "200",
        workLocationId: "12345678900017", oldAgeRegimeCode: "200", foreignWorkerCode: "99", employmentStatusCode: "99",
        multipleJobsCode: "01", multipleEmployersCode: "01", workAccidentRegimeCode: "200", workAccidentRiskCode: "602MD", workAccidentRate: 1.5,
      },
      payroll: {
        baseSalary: 2500, grossAmount: 2500, netBeforeTax: 1980, netTaxableAmount: 2050, netSocialAmount: 1960, withholdingTax: 153.75,
        pas: { rateType: "01", ratePercent: 7.5, rateIdentifier: "123456789", amountSubjectToPas: 2050, withholdingAmount: 153.75 },
      },
    }],
    contributionBordereau: {
      opsIdentifier: "12345678901234",
      totalAmount: 1000,
      aggregatedContributions: [{
        code: "100", baseQualifier: "920", baseAmount: 2500, contributionAmount: 1000,
        sourcePayrollCodes: ["URSSAF_TOTAL"], mappingVersion: "P26-URSSAF-v1",
      }],
      individualContributions: [{
        employeeNir: "1860875123456", code: "018", opsIdentifier: "12345678901234", baseAmount: 2500,
        contributionAmount: 250, ratePercent: 10, sourcePayrollCode: "VIEILLESSE", mappingVersion: "P26-URSSAF-v1",
      }],
    },
    payments: [{
      opsIdentifier: "12345678901234", amount: 1000, paymentModeCode: "05", paymentDate: new Date("2026-09-05T00:00:00.000Z"), payerSiret: "12345678900017",
    }],
  };
}

describe("DSN P26V01 complete mapped perimeter", () => {
  it("adds OPS payment, bordereau, aggregate and individual contribution blocks", () => {
    const content = buildDsnP26V01Complete(input());
    expect(content).toContain("S21.G00.20.001,'12345678901234'");
    expect(content).toContain("S21.G00.22.005,'1000.00'");
    expect(content).toContain("S21.G00.23.001,'100'");
    expect(content).toContain("S21.G00.81.001,'018'");
    expect(content).toContain("S21.G00.81.004,'250.00'");
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
});
