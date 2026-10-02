import type { DsnWorkEventInput, DsnWorkEventNature } from "../../src/lib/payroll/dsn-work-event";
import { mappedDsnFixture } from "./dsn-fixture";

/** Identité et compte synthétiques, uniquement pour Dsn-Val et les tests. */
export function workEventFixture(reasonCode: "01" | "02" | "03" | "06" = "01", subrogation = false, nature: DsnWorkEventNature = "04"): DsnWorkEventInput {
  const base = mappedDsnFixture();
  const employee = base.employees[0];
  return {
    nature, testMode: true, declarationOrder: 123, businessId: "TESTEV000000123", fileDate: base.fileDate,
    emitter: base.emitter,
    employee: { nir: employee.nir, lastName: employee.lastName, firstName: employee.firstName, birthDate: employee.birthDate,
      contractStartDate: employee.contract.startDate, contractNumber: employee.contract.contractNumber, workLocationId: employee.contract.workLocationId },
    stoppage: { reasonCode, startDate: new Date("2026-08-10"), lastDayWorked: new Date(reasonCode === "06" ? "2026-08-10" : "2026-08-09"), expectedEndDate: new Date("2026-08-31"), subrogationCode: subrogation ? "01" : "02",
      ...(reasonCode === "06" ? { accidentDate: new Date("2026-08-10") } : {}),
      ...(subrogation ? { subrogationStartDate: new Date("2026-08-10"), subrogationEndDate: new Date("2026-09-30"), subrogationIban: "FR7630006000011234567890189", subrogationBic: "AGRIFRPP" } : {}),
      ...(nature === "05" ? { recoveryDate: new Date("2026-08-20"), recoveryReasonCode: "01" as const } : {}),
    },
  };
}
