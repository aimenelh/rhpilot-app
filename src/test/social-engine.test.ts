import { describe, expect, it } from "vitest";
import { calculateSocialPayroll } from "@/lib/payroll/social-engine";

const validContext = {
  grossAmount: 2000,
  legalCategory: "SAS",
  calculationDate: new Date("2026-09-01T12:00:00Z"),
  companyCreationDate: new Date("2020-01-01T12:00:00Z"),
  contractType: "CDI",
  hireDate: new Date("2024-06-01T12:00:00Z"),
  executiveStatus: false,
  healthPlanMonthlyAmount: 40,
  healthPlanEmployerRate: 50,
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

  it("bloque si le contexte de complémentaire santé est absent", () => {
    expect(() =>
      calculateSocialPayroll({
        ...validContext,
        healthPlanMonthlyAmount: undefined as unknown as number,
      }),
    ).toThrow("le montant mensuel de la complémentaire santé est absent ou invalide");
  });

  it("bloque si la part employeur de la complémentaire santé est invalide", () => {
    expect(() =>
      calculateSocialPayroll({
        ...validContext,
        healthPlanEmployerRate: 49,
      }),
    ).toThrow("la part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %");
  });

  it("calcule sans blocage quand le contexte salarié est complet", () => {
    const result = calculateSocialPayroll(validContext);
    expect(result.grossAmount).toBe(2000);
    expect(result.netBeforeTax).toBeGreaterThan(0);
    expect(result.contributionDetails.length).toBeGreaterThan(0);
  });

  it("normalise les taux Publicodes en fractions pour le bulletin", () => {
    const result = calculateSocialPayroll(validContext);
    const vieillesse = result.contributionDetails.find((detail) => detail.code === "vieillesse_deplafonnee_salarie");
    expect(vieillesse).toBeDefined();
    expect(vieillesse?.rate).toBeCloseTo(0.004, 6);
  });
});

// Salarié non cadre à 2 500 € brut en octobre 2026. Les montants attendus sont
// recalculés ici à partir des textes, indépendamment du modèle social.
const october2026 = { ...validContext, grossAmount: 2500, calculationDate: new Date("2026-10-31T12:00:00Z"), healthPlanMonthlyAmount: 60 };
const employerTotal = (details: ReturnType<typeof calculateSocialPayroll>["contributionDetails"]) =>
  details.filter((detail) => detail.side === "EMPLOYER").reduce((total, detail) => total + detail.amount, 0);
// Même tolérance que le contrôle du moteur : chaque ligne est arrondie au centime.
const expectReconciled = (details: ReturnType<typeof calculateSocialPayroll>["contributionDetails"], total: number) =>
  expect(Math.abs(employerTotal(details) - total)).toBeLessThanOrEqual(0.02);

/**
 * Coefficient RGDU 2026 (art. D241-7 CSS, décret n° 2025-887) :
 * C = Tmin + Tdelta × [½ × (3 × Smic / rémunération − 1)]^1,75, arrondi à 4 décimales.
 * Tmin = 0,0200 ; Tdelta = 0,3781 pour une entreprise au FNAL à 0,10 % (moins de 50 salariés).
 * Smic : 1 823,03 € par mois pour toute l'année 2026 (décret n° 2026-509 du 12 juin 2026),
 * même après la revalorisation du 1er juin à 12,31 €/h.
 */
function expectedRgdu2026(monthlyGross: number): { coefficient: number; amount: number } {
  const smic = 12.02 * (35 * 52) / 12;
  const coefficient = Math.round((0.02 + 0.3781 * (0.5 * ((3 * smic) / monthlyGross - 1)) ** 1.75) * 10000) / 10000;
  return { coefficient, amount: Math.round(monthlyGross * coefficient * 100) / 100 };
}

describe("calculateSocialPayroll — cotisations patronales d'un salarié", () => {
  it("calcule le salarié d'une SAS comme un salarié, jamais comme le président", () => {
    const result = calculateSocialPayroll({ ...october2026, legalCategory: "SAS" });
    const codes = result.contributionDetails.map((detail) => detail.code);
    expect(codes).toContain("assurance_chomage");
    expect(codes).toContain("rgdu");
    expect(result.employerContributions).toBeLessThan(700);
  });

  it("ne bloque plus le bulletin d'une SARL sous 3 Smic et donne les mêmes cotisations qu'en SAS", () => {
    const sarl = calculateSocialPayroll({ ...october2026, legalCategory: "SARL" });
    const sas = calculateSocialPayroll({ ...october2026, legalCategory: "SAS" });
    expect(sarl.employerContributions).toBeCloseTo(sas.employerContributions, 2);
    expect(sarl.employeeContributions).toBeCloseTo(sas.employeeContributions, 2);
    expect(sarl.netBeforeTax).toBeCloseTo(sas.netBeforeTax, 2);
  });

  it("affiche la RGDU comme une ligne négative qui réconcilie le total patronal", () => {
    const result = calculateSocialPayroll({ ...october2026, legalCategory: "SAS" });
    const rgdu = result.contributionDetails.find((detail) => detail.code === "rgdu");
    expect(rgdu?.side).toBe("EMPLOYER");
    expect(rgdu?.amount).toBeLessThan(0);
    expect(rgdu?.baseAmount).toBe(2500);
    expectReconciled(result.contributionDetails, result.employerContributions);
  });

  it("calcule la RGDU 2026 avec le Smic gelé au 1er janvier, y compris après le 1er juin", () => {
    const expected = expectedRgdu2026(2500);
    const rgdu = calculateSocialPayroll({ ...october2026, legalCategory: "SAS" }).contributionDetails.find((detail) => detail.code === "rgdu");
    expect(expected.coefficient).toBe(0.1719);
    expect(rgdu?.rate).toBe(expected.coefficient);
    expect(rgdu?.amount).toBeCloseTo(-expected.amount, 2);
  });

  it("n'applique aucune RGDU à partir de 3 Smic", () => {
    const result = calculateSocialPayroll({ ...october2026, legalCategory: "SAS", grossAmount: 6000 });
    expect(result.contributionDetails.some((detail) => detail.code === "rgdu")).toBe(false);
    expectReconciled(result.contributionDetails, result.employerContributions);
  });
});

describe("calculateSocialPayroll — lisibilité du bulletin", () => {
  it("chaque ligne avec assiette et taux se recalcule : assiette × taux = montant", () => {
    // Cadre au-dessus du plafond de la Sécurité sociale : les assiettes plafonnées et déplafonnées diffèrent.
    for (const context of [october2026, { ...october2026, grossAmount: 4200, executiveStatus: true }]) {
      const result = calculateSocialPayroll(context);
      for (const detail of result.contributionDetails) {
        if (detail.baseAmount === null || detail.rate === null) continue;
        expect(Math.abs(Math.abs(detail.amount) - detail.baseAmount * detail.rate), `${detail.label} (${context.grossAmount} €)`).toBeLessThanOrEqual(0.01);
      }
    }
  });
});

describe("calculateSocialPayroll — totaux et nets du bulletin", () => {
  const sumOf = (result: ReturnType<typeof calculateSocialPayroll>, side: "EMPLOYEE" | "EMPLOYER") =>
    Math.round(result.contributionDetails.filter((detail) => detail.side === side).reduce((total, detail) => total + detail.amount, 0) * 100) / 100;

  it("donne des totaux égaux à la somme des lignes arrondies, au centime près", () => {
    for (const grossAmount of [1900, 2500, 4200]) {
      const result = calculateSocialPayroll({ ...october2026, grossAmount, executiveStatus: grossAmount > 4000 });
      expect(result.employeeContributions).toBe(sumOf(result, "EMPLOYEE"));
      expect(result.employerContributions).toBe(sumOf(result, "EMPLOYER"));
      expect(result.netBeforeTax).toBeCloseTo(grossAmount - result.employeeContributions, 2);
      expect(result.employerCost).toBeCloseTo(grossAmount + result.employerContributions, 2);
    }
  });

  it("n'ajoute pas la prévoyance patronale cadre au net imposable (seule la part santé l'est)", () => {
    const result = calculateSocialPayroll({ ...october2026, grossAmount: 4200, executiveStatus: true, situation: { "établissement . taux ATMP": "2.08%" } });
    const line = (code: string) => result.contributionDetails.find((detail) => detail.code === code)?.amount ?? 0;
    expect(line("invalidite_deces_employeur")).toBeGreaterThan(0);
    expect(result.netTaxableAmount).toBeCloseTo(result.netBeforeTax + line("csg_non_deductible") + line("sante_employeur"), 2);
    // Vérifié à la main : 3 281,40 + 122,28 + 30,00.
    expect(result.netTaxableAmount).toBe(3433.68);
  });
});
