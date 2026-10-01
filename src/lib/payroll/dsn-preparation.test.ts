import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { dsnScopeIssues } from "./dsn-preparation";

describe("périmètre de la DSN préparatoire", () => {
  it("accepte un mois simple", () => {
    expect(dsnScopeIssues({ variables: [], validatedAbsences: [], bulletin: { lines: [{ code: "BASE_SALARY" }] } })).toEqual([]);
  });

  it("ne bloque plus toutes les variables puisque les HS/HC sont désormais raccordées", () => {
    const issues = dsnScopeIssues({ variables: [{}], validatedAbsences: [], bulletin: { lines: [{ code: "BASE_SALARY" }] } });
    expect(issues).toEqual([]);
  });

  it("accepte désormais une absence sans solde seule", () => {
    const issues = dsnScopeIssues({ validatedAbsences: [{ type: "UNPAID_LEAVE" }], bulletin: { lines: [{ code: "ABS_UNPAID_LEAVE" }] } });
    expect(issues).toEqual([]);
  });

  it.each(["RTT", "FAMILY_EVENT"] as const)("accepte l'absence rémunérée %s", (type) => {
    expect(dsnScopeIssues({ validatedAbsences: [{ type }], bulletin: { lines: [] } })).toEqual([]);
  });

  it("liste encore les événements de contrat et les autres absences non déclarables", () => {
    const issues = dsnScopeIssues({ variables: [{}], validatedAbsences: [{ type: "SICK_LEAVE" }], bulletin: { lines: [{ code: "ENTRY_EXIT" }] } });
    expect(issues).toHaveLength(2);
    expect(issues.join(" ")).toMatch(/entrée|sortie/);
    expect(issues.join(" ")).toMatch(/absences/);
  });
});
