import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import { mappedDsnFixture } from "../../../scripts/payroll/dsn-fixture";
import { encryptDsnSensitiveValue } from "./dsn-pii";

const mocks = vi.hoisted(() => ({ period: vi.fn(), calculations: vi.fn(), employees: vi.fn(), agreement: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  payrollPeriod: { findFirst: mocks.period }, payrollCalculation: { findMany: mocks.calculations },
  employee: { findMany: mocks.employees }, collectiveAgreement: { findUnique: mocks.agreement }, $queryRaw: mocks.query,
} }));
import { prepareDsnP26V01 } from "./dsn-preparation";

const request = { organizationId: "company-a", periodId: "period-a", fileDate: new Date("2026-01-31T12:00:00Z") };
let fixture: ReturnType<typeof mappedDsnFixture>;
let snapshot: ReturnType<typeof computedSnapshot>;
let calculation: Record<string, unknown>;
let profile: Record<string, unknown>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DSN_PII_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  fixture = mappedDsnFixture();
  snapshot = computedSnapshot();
  const totals = snapshot.bulletin.totals;
  calculation = { employeeId: snapshot.inputs.employee.id,
    grossAmount: totals.grossTotal, employeeContributions: totals.employeeContributions, employerContributions: totals.employerContributions,
    netBeforeTax: totals.netBeforeTax, withholdingTax: totals.withholdingTax, netPaid: totals.netPaid,
    netTaxableAmount: totals.netTaxable, netSocialAmount: totals.netSocial,
    calculationSnapshot: { ...snapshot, profile: { baseSalaryCents: 250000, monthlyHours: "151.67", collectiveAgreementId: "agreement-a" },
      withholdingTax: { rate: 0.075, amount: totals.withholdingTax, validFrom: "2026-01-01", validUntil: null, source: "DGFIP", sourceReference: "123456789" },
      variables: [], validatedAbsences: [] },
  };
  const employee = fixture.employees[0];
  profile = { ...employee, ...employee.contract, employeeId: snapshot.inputs.employee.id,
    nirCiphertext: encryptDsnSensitiveValue(employee.nir), complementaryAffiliations: [],
    conventionalStatusCode: "06", retirementStatusCode: "04", countryCode: null,
  };
  const emitter = fixture.emitter;
  mocks.period.mockResolvedValue({ id: "period-a", year: 2026, month: 1, status: "LOCKED", paymentDate: new Date("2026-01-31") });
  mocks.calculations.mockResolvedValue([calculation]);
  mocks.employees.mockResolvedValue([{ id: snapshot.inputs.employee.id, firstName: employee.firstName, lastName: employee.lastName,
    position: employee.position, hireDate: employee.contract.startDate, contractEndDate: null, contractType: "CDI" }]);
  mocks.agreement.mockResolvedValue({ idcc: "1486" });
  mocks.query.mockResolvedValueOnce([{ ...emitter, id: "company-a", payrollAddress: emitter.address,
    payrollPostalCode: emitter.postalCode, payrollCity: emitter.city, payrollNafCode: "6201Z", payrollDepartment: "34",
    mainCollectiveAgreementCode: "1486", defaultTestMode: true,
    atmpRate: 9.9, urssafSiret: "75366412700077", retirementSiret: "44832375800038",
    paymentIbanCiphertext: encryptDsnSensitiveValue("FR7630006000011234567890189"), paymentBic: "AGRIFRPPXXX", sepaMandatesConfirmed: true,
  }]).mockResolvedValueOnce([profile]);
});
afterEach(() => vi.unstubAllEnvs());

describe("préparateur applicatif et montants verrouillés", () => {
  it("raccorde les lectures au générateur complet et conserve le taux AT/MP du bulletin", async () => {
    const result = await prepareDsnP26V01(request);
    expect(result.employeeCount).toBe(1);
    expect(result.content).toContain("S21.G00.40.043,'1.20'");
    expect(result.content).toContain("S21.G00.50.002,'" + snapshot.bulletin.totals.netTaxable.toFixed(2) + "'");
    expect(result.content).toContain("S21.G00.23.001,'635'");
    expect(result.content).toContain("S21.G00.20.002,'DGFIP_PAS'");
    expect(mocks.period.mock.calls[0][0].where).toEqual({ id: "period-a", organizationId: "company-a" });
    expect(mocks.calculations.mock.calls[0][0].where).toEqual({ payrollPeriodId: "period-a", organizationId: "company-a" });
    expect(mocks.employees.mock.calls[0][0].where.organizationId).toBe("company-a");
    expect(mocks.query.mock.calls[1][1]).toBe("company-a");
  });
  it("refuse une période absente de l'entreprise avant toute lecture sensible", async () => {
    mocks.period.mockResolvedValue(null);
    await expect(prepareDsnP26V01(request)).rejects.toThrow(/période de paie introuvable/);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("refuse un total enregistré altéré", async () => {
    calculation.netPaid = Number(calculation.netPaid) + 1;
    await expect(prepareDsnP26V01(request)).rejects.toThrow(/totaux.*divergent/);
  });
  it("refuse un statut retraite différent du statut calculé", async () => {
    profile.retirementStatusCode = "01";
    await expect(prepareDsnP26V01(request)).rejects.toThrow(/statut retraite complémentaire/);
  });
});
