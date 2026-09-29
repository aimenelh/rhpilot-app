import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { dsnScopeIssues } from "./dsn-preparation";

describe("périmètre de la DSN préparatoire", () => {
  it("accepte un mois simple", () => {
    expect(dsnScopeIssues({ variables: [], validatedAbsences: [], bulletin: { lines: [{ code: "BASE_SALARY" }] } })).toEqual([]);
  });

  it("liste tous les éléments non déclarables d'un salarié, pas seulement le premier", () => {
    const issues = dsnScopeIssues({ variables: [{}], validatedAbsences: [{}], bulletin: { lines: [{ code: "ENTRY_EXIT" }] } });
    expect(issues).toHaveLength(3);
    expect(issues.join(" ")).toMatch(/primes/);
    expect(issues.join(" ")).toMatch(/absences/);
  });
});
