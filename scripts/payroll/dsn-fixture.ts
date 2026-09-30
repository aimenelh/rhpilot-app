import type { DsnP26CompleteInput } from "../../src/lib/payroll/dsn-p26v01-complete";

/** Données synthétiques : validation de structure uniquement, pas une paie de référence. */
export function mappedDsnFixture(): DsnP26CompleteInput {
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
        workLocationId: "12345678200010", oldAgeRegimeCode: "200", foreignWorkerCode: "99", employmentStatusCode: "99",
        multipleJobsCode: "01", multipleEmployersCode: "01", workAccidentRegimeCode: "200", workAccidentRiskCode: "723ZA", workAccidentRate: 1.5,
      },
      payroll: {
        baseSalary: 2500, grossAmount: 2500, cappedContributionBase: 2500, netBeforeTax: 1980, netTaxableAmount: 2050, netSocialAmount: 1960, withholdingTax: 153.75,
        pas: { rateType: "01", ratePercent: 7.5, rateIdentifier: "123456789", amountSubjectToPas: 2050, withholdingAmount: 153.75 },
      },
    }],
    assessedBases: [{ employeeNir: "1860875123456", code: "02", amount: 2500 }, { employeeNir: "1860875123456", code: "03", amount: 2500, components: [{ code: "01", amount: 1823.03 }] }],
    contributionBordereau: {
      opsIdentifier: "75366412700077",
      totalAmount: 1000,
      aggregatedContributions: [{
        code: "100", baseQualifier: "920", baseAmount: 2500, ratePercent: 1.5,
        payableAmount: 1250,
        sourcePayrollCodes: ["URSSAF_TOTAL"], mappingVersion: "FIXTURE-STRUCTURE-P26V01",
      }, {
        code: "668", baseQualifier: "921", contributionAmount: 250,
        payableAmount: -250,
        sourcePayrollCodes: ["RGDU"], mappingVersion: "FIXTURE-STRUCTURE-P26V01",
      }],
      individualContributions: [{
        employeeNir: "1860875123456", code: "018", baseCode: "03", opsIdentifier: "75366412700077", baseAmount: 2500,
        contributionAmount: -250, ratePercent: 10, sourcePayrollCode: "RGDU", mappingVersion: "FIXTURE-STRUCTURE-P26V01",
      }],
    },
    payments: [{
      opsIdentifier: "75366412700077", amount: 1000, paymentModeCode: "02", paymentDate: new Date("2026-09-05T00:00:00.000Z"), payerSiret: "12345678200010",
    }],
  };
}
