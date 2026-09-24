import { describe, expect, it } from "vitest";
import { chooseOwnershipSuccessor } from "@/lib/ownership";

describe("chooseOwnershipSuccessor", () => {
  const date = (value: string) => new Date(value);

  it("préfère un propriétaire actif déjà présent", () => {
    const successor = chooseOwnershipSuccessor([
      { id: "admin", accessRole: "ADMIN" as const, createdAt: date("2026-01-01") },
      { id: "owner", accessRole: "OWNER" as const, createdAt: date("2026-09-01") },
    ]);
    expect(successor?.id).toBe("owner");
  });

  it("préfère un administrateur à un membre", () => {
    const successor = chooseOwnershipSuccessor([
      { id: "member", accessRole: "MEMBER" as const, createdAt: date("2025-01-01") },
      { id: "admin", accessRole: "ADMIN" as const, createdAt: date("2026-01-01") },
    ]);
    expect(successor?.id).toBe("admin");
  });

  it("prend le membre le plus ancien à rôle égal", () => {
    const successor = chooseOwnershipSuccessor([
      { id: "newer", accessRole: "MEMBER" as const, createdAt: date("2026-06-01") },
      { id: "older", accessRole: "MEMBER" as const, createdAt: date("2026-01-01") },
    ]);
    expect(successor?.id).toBe("older");
  });

  it("retourne null lorsqu'il n'y a personne à qui transférer", () => {
    expect(chooseOwnershipSuccessor([])).toBeNull();
  });
});
