import { describe, expect, it } from "vitest";
import { annualAverageHeadcount, countThresholdHeadcount, resolveThresholdHeadcount, thresholdCrossingWarning } from "./headcount";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const employee = (contractType: string | null, hire: string, end: string | null = null, monthlyHours: number | null = 151.67) => ({ contractType, hireDate: day(hire), contractEndDate: end ? day(end) : null, monthlyHours });

describe("countThresholdHeadcount", () => {
  const lastDay = day("2026-12-31");

  it("exclut apprentis et contrats de professionnalisation", () => {
    expect(countThresholdHeadcount([employee("CDI", "2020-01-01"), employee("APPRENTISSAGE", "2026-09-01"), employee("PROFESSIONNALISATION", "2026-09-01")], lastDay)).toBe(1);
  });

  it("compte les temps partiels au prorata de leur horaire", () => {
    expect(countThresholdHeadcount([employee("CDI", "2020-01-01", null, 75.84), employee("CDD", "2026-01-01", "2027-06-30")], lastDay)).toBe(1.5);
  });

  it("ne compte que les salariés sous contrat le dernier jour du mois", () => {
    expect(countThresholdHeadcount([employee("CDD", "2026-06-01", "2026-12-15"), employee("CDI", "2027-01-04"), employee("CDI", "2026-12-31")], lastDay)).toBe(1);
  });

  it("donne 12 pour les 15 salariés de l'entreprise de démonstration, dont 3 alternants", () => {
    const demo = [
      ...Array.from({ length: 12 }, () => employee("CDI", "2025-01-01")),
      employee("APPRENTISSAGE", "2026-12-10"),
      employee("PROFESSIONNALISATION", "2026-10-01"),
      employee("APPRENTISSAGE", "2026-12-26"),
    ];
    expect(countThresholdHeadcount(demo, lastDay)).toBe(12);
  });
});

describe("thresholdCrossingWarning", () => {
  it("prévient au premier calcul d'une entreprise d'au moins 11 salariés", () => {
    expect(thresholdCrossingWarning(null, 12)).toContain("au moins 11");
    expect(thresholdCrossingWarning(null, 8)).toBeNull();
  });

  it("prévient seulement le mois où le seuil est franchi", () => {
    expect(thresholdCrossingWarning(10, 11)).toContain("passe de 10 à 11");
    expect(thresholdCrossingWarning(11, 12)).toBeNull();
    expect(thresholdCrossingWarning(12, 10)).toBeNull();
  });

  it("retient le seuil le plus élevé franchi", () => {
    expect(thresholdCrossingWarning(48, 52)).toContain("seuil de 50");
    expect(thresholdCrossingWarning(null, 60)).toContain("au moins 50");
  });
});

describe("effectif des seuils (moyenne N-1 et loi Pacte)", () => {
  it("retient la moyenne de l'année précédente, pas le dernier jour du mois", () => {
    // 10 salariés toute l'année 2025, un 11e embauché le 1er juin 2026.
    const staff = [...Array.from({ length: 10 }, () => employee("CDI", "2024-01-01")), employee("CDI", "2026-06-01")];
    const result = resolveThresholdHeadcount(staff, 2026, day("2026-06-30"));
    expect(result).toMatchObject({ headcount: 10, basis: "PREVIOUS_YEAR_AVERAGE" });
  });

  it("diffère un seuil qui n'est pas atteint depuis cinq ans", () => {
    // 8 salariés de 2020 à 2024, 12 à partir de 2025.
    const staff = [...Array.from({ length: 8 }, () => employee("CDI", "2020-01-01")), ...Array.from({ length: 4 }, () => employee("CDI", "2025-01-01"))];
    const result = resolveThresholdHeadcount(staff, 2026, day("2026-03-31"));
    expect(result.headcount).toBe(10);
    expect(result.warnings[0]).toContain("loi Pacte");
  });

  it("applique le seuil atteint depuis cinq années consécutives", () => {
    const staff = Array.from({ length: 12 }, () => employee("CDI", "2019-01-01"));
    expect(resolveThresholdHeadcount(staff, 2026, day("2026-03-31"))).toMatchObject({ headcount: 12, warnings: [] });
  });

  it("estime sur le mois en cours sans historique et le signale au-delà de 10", () => {
    const staff = Array.from({ length: 12 }, () => employee("CDI", "2026-02-01"));
    const result = resolveThresholdHeadcount(staff, 2026, day("2026-03-31"));
    expect(result).toMatchObject({ headcount: 12, basis: "CURRENT_MONTH" });
    expect(result.warnings).toHaveLength(1);
    expect(annualAverageHeadcount(staff, 2025)).toBe(0);
  });
});
