import { describe, expect, it } from "vitest";
import { computedSnapshot } from "../../../scripts/payroll/dsn-computed-fixture";
import { readLockedWorkStoppageDeclaration } from "./dsn-locked-contributions";

describe("reprise normale après un arrêt terminé le mois précédent", () => {
  it("déclare la reprise du premier jour du mois sans ajouter une retenue ou des IJSS", () => {
    const organization = { headcount: 4, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE" as const, healthPlan: null, ijssSubrogation: false, paidLeaveMethod: "OUVRABLES" as const };
    const ordinary = computedSnapshot({ period: { year: 2026, month: 2 }, organization });
    const recovered = computedSnapshot({ period: { year: 2026, month: 2 }, organization,
      absences: [{ id: "previous-stop", kind: "SICK_LEAVE", start: "2026-01-20", end: "2026-01-31" }] },
      { "previous-stop": { returnDate: "2026-02-01", returnReasonCode: "01" } });
    expect(recovered.bulletin.totals).toEqual(ordinary.bulletin.totals);
    expect(recovered.bulletin.lines.some((line) => ["ABS_SICK_LEAVE", "IJSS_SUBROGATION", "SICK_PAY_FULL", "SICK_PAY_REDUCED"].includes(line.code))).toBe(false);
    expect(readLockedWorkStoppageDeclaration(recovered)).toEqual({ hours: 0, stoppages: [{ reasonCode: "01", lastDayWorked: "2026-01-19", expectedEnd: "2026-01-31", subrogationCode: "02", recoveryDate: "2026-02-01", recoveryReasonCode: "01" }] });
  });
});
