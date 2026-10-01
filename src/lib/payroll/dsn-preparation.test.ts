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

  it("accepte maladie, maternité et paternité dans le périmètre mensuel", () => {
    expect(dsnScopeIssues({ validatedAbsences: [{ type: "SICK_LEAVE" }, { type: "MATERNITY" }, { type: "PATERNITY" }] })).toEqual([]);
  });

  it("liste encore les événements de contrat et les absences non raccordées", () => {
    const issues = dsnScopeIssues({ variables: [{}], validatedAbsences: [{ type: "WORK_ACCIDENT" }], bulletin: { lines: [{ code: "ENTRY_EXIT" }] } });
    expect(issues).toHaveLength(2);
    expect(issues.join(" ")).toMatch(/entrée|sortie/);
    expect(issues.join(" ")).toMatch(/absences/i);
  });
});
