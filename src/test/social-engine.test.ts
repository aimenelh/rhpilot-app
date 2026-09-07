import { describe, expect, it } from "vitest";
import { calculateSocialPayroll } from "@/lib/payroll/social-engine";

describe("calculateSocialPayroll — contexte juridique", () => {
  it("bloque si la forme juridique est absente", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "",
        calculationDate: new Date("2026-09-01T12:00:00Z"),
      }),
    ).toThrow("la forme juridique de l'organisation est absente ou invalide");
  });

  it("bloque si la forme juridique est inconnue", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SIRET",
        calculationDate: new Date("2026-09-01T12:00:00Z"),
      }),
    ).toThrow("la forme juridique de l'organisation est absente ou invalide");
  });

  it("bloque si la date de calcul est absente", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SAS",
        calculationDate: undefined as unknown as Date,
      }),
    ).toThrow("la date de calcul est absente ou invalide");
  });

  it("accepte une forme juridique connue avec une date de calcul explicite avant d'évaluer le modèle social", () => {
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SAS",
        calculationDate: new Date("2026-09-01T12:00:00Z"),
      }),
    ).toThrow();
    expect(() =>
      calculateSocialPayroll({
        grossAmount: 2000,
        legalCategory: "SAS",
        calculationDate: new Date("2026-09-01T12:00:00Z"),
      }),
    ).not.toThrowError("la forme juridique de l'organisation est absente ou invalide");
  });
});
