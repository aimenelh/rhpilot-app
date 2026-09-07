import { describe, expect, it } from "vitest";
import { calculateSocialPayroll } from "@/lib/payroll/social-engine";

const validContext = {
  grossAmount: 2000,
  legalCategory: "SAS",
  calculationDate: new Date("2026-09-01T12:00:00Z"),
  contractType: "CDI",
  hireDate: new Date("2024-06-01T12:00:00Z"),
  executiveStatus: false,
};

describe("calculateSocialPayroll — contexte juridique et contractuel", () => {
  it("bloque si la forme juridique est absente", () => {
    expect(() => calculateSocialPayroll({ ...validContext, legalCategory: "" })).toThrow(
      "la forme juridique de l'organisation est absente ou invalide",
    );
  });

  it("bloque si la forme juridique est inconnue", () => {
    expect(() => calculateSocialPayroll({ ...validContext, legalCategory: "SIRET" })).toThrow(
      "la forme juridique de l'organisation est absente ou invalide",
    );
  });

  it("bloque si la date de calcul est absente", () => {
    expect(() =>
      calculateSocialPayroll({
        ...validContext,
        calculationDate: undefined as unknown as Date,
      }),
    ).toThrow("la date de calcul est absente ou invalide");
  });

  it("bloque si le type de contrat est absent ou invalide", () => {
    expect(() => calculateSocialPayroll({ ...validContext, contractType: "" })).toThrow(
      "le type de contrat est absent ou invalide",
    );
  });

  it("bloque si la date d'embauche est absente", () => {
    expect(() =>
      calculateSocialPayroll({
        ...validContext,
        hireDate: undefined as unknown as Date,
      }),
    ).toThrow("la date d'embauche est absente ou invalide");
  });

  it("bloque si le statut cadre est absent ou invalide", () => {
    expect(() =>
      calculateSocialPayroll({
        ...validContext,
        executiveStatus: undefined as unknown as boolean,
      }),
    ).toThrow("le statut cadre est absent ou invalide");
  });

  it("atteint l'évaluation du modèle social avec le contexte salarié explicite", () => {
    let error: unknown;
    try {
      calculateSocialPayroll(validContext);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).not.toContain("la forme juridique de l'organisation est absente ou invalide");
    expect(message).not.toContain("la date de calcul est absente ou invalide");
    expect(message).not.toContain("le type de contrat est absent ou invalide");
    expect(message).not.toContain("la date d'embauche est absente ou invalide");
    expect(message).not.toContain("le statut cadre est absent ou invalide");
  });
});
