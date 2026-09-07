import { describe, expect, it } from "vitest";
import { calculateSocialPayroll } from "@/lib/payroll/social-engine";

describe("calculateSocialPayroll — contexte juridique", () => {
  it("bloque si la forme juridique est absente", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "",
      }),
    ).toThrow("la forme juridique de l'organisation est absente ou invalide");
  });

  it("bloque si la forme juridique est inconnue", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SIRET",
      }),
    ).toThrow("la forme juridique de l'organisation est absente ou invalide");
  });

  it("accepte une forme juridique connue avant d'évaluer le modèle social", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SAS",
      }),
    ).toThrow();
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SAS",
      }),
    ).not.toThrowError("la forme juridique de l'organisation est absente ou invalide");
  });
});
