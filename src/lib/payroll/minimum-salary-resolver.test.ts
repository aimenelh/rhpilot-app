import { describe, expect, it } from "vitest";
import { resolveMinimumSalary } from "./minimum-salary-resolver";
import type { SmicMinimumResult } from "./minimum-wage";

const smic: SmicMinimumResult = { hourlyGrossCents: 1231, monthlyGrossCentsAt35Hours: 186702, monthlyHoursAt35Hours: 151.67, ruleCode: "SMIC_GROSS", ruleVersionId: "smic-2026-06" };
const collective = { status: "APPLICABLE" as const, classificationCode: "IC_1.1", monthlyMinimumCents: 213500, differenceCents: 6500, compliant: true };

describe("résolveur du salaire minimum", () => {
  it("retient le minimum conventionnel lorsqu'il est supérieur au SMIC", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: collective, monthlyHours: 151.67, collectiveRuleVersionId: "ccn-2025-v1", monthlyGrossCents: 220000 })).toMatchObject({ status: "APPLICABLE", source: "COLLECTIVE_AGREEMENT", appliedMonthlyMinimumCents: 213500, smicMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: 213500, collectiveRuleVersionId: "ccn-2025-v1", compliant: true, differenceCents: 6500 }));
  it("retient le SMIC lorsqu'il est supérieur au minimum conventionnel", () => {
    const result = resolveMinimumSalary({ smic, collectiveMinimum: { ...collective, monthlyMinimumCents: 180000 }, monthlyHours: 160, collectiveRuleVersionId: "ccn-2025-v1", monthlyGrossCents: 200000 });
    expect(result).toMatchObject({ source: "SMIC", appliedMonthlyMinimumCents: 196960, collectiveMonthlyMinimumCents: 180000, compliant: true });
    // Quand le Smic l'emporte, aucune version conventionnelle n'est retenue.
    expect(result).not.toHaveProperty("collectiveRuleVersionId");
  });
  it("conserve le SMIC si aucune convention n'est applicable", () => expect(resolveMinimumSalary({ smic, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "APPLICABLE", source: "SMIC", appliedMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: null, compliant: true }));
  it("conserve le contrôle SMIC lorsque le résolveur signale explicitement l'absence de convention", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "NO_COLLECTIVE_AGREEMENT", message: "Aucune convention collective applicable n'est configurée pour ce salarié." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "APPLICABLE", source: "SMIC", appliedMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: null, compliant: true }));
  // 80 % de 35 h = 28 h par semaine, soit 28 × 52 / 12 = 121,333… h × 12,31 € = 1 493,61 €.
  it("proratise le SMIC avec 80 % de la durée mensuelle", () => expect(resolveMinimumSalary({ smic, monthlyHours: 151.67 * 0.8, monthlyGrossCents: 150000 })).toMatchObject({ appliedMonthlyMinimumCents: 149361, compliant: true }));
  it("applique le taux horaire à un contrat de 39 h (169 h × 12,31 € = 2 080,39 €)", () => expect(resolveMinimumSalary({ smic, monthlyHours: 169, monthlyGrossCents: 208039 })).toMatchObject({ appliedMonthlyMinimumCents: 208039, compliant: true, differenceCents: 0 }));
  it("garde exactement le Smic mensuel officiel pour 151,67 h", () => expect(resolveMinimumSalary({ smic, monthlyHours: 151.67, monthlyGrossCents: 186702 })).toMatchObject({ appliedMonthlyMinimumCents: 186702, compliant: true, differenceCents: 0 }));
  it("refuse un brut inférieur de 4 centimes au Smic horaire × heures", () => expect(resolveMinimumSalary({ smic, monthlyHours: 160, monthlyGrossCents: 196956 })).toMatchObject({ appliedMonthlyMinimumCents: 196960, compliant: false, differenceCents: -4 }));
  it("retourne non conforme lorsque le brut est sous le minimum applicable", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: collective, monthlyHours: 151.67, monthlyGrossCents: 210000 })).toMatchObject({ compliant: false, differenceCents: -3500 }));
  it("reste explicite si la convention est résolue mais inexploitable", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "CLASSIFICATION_MISMATCH", message: "Classification absente." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "UNRESOLVED", code: "COLLECTIVE_MINIMUM_UNRESOLVED" }));
  it("reste explicite si la convention n'a pas de version validée", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "NO_VALIDATED_VERSION", message: "Aucune version validée." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "UNRESOLVED", code: "COLLECTIVE_MINIMUM_UNRESOLVED" }));
  it("reste explicite si la règle conventionnelle n'est pas validée", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "NO_VALIDATED_RULE", message: "Aucune règle validée." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "UNRESOLVED", code: "COLLECTIVE_MINIMUM_UNRESOLVED" }));
  it("refuse une durée mensuelle invalide", () => expect(resolveMinimumSalary({ smic, monthlyHours: 0, monthlyGrossCents: 190000 })).toMatchObject({ status: "UNRESOLVED", code: "INVALID_MONTHLY_HOURS" }));
  it("refuse un SMIC invalide", () => expect(resolveMinimumSalary({ smic: { ...smic, hourlyGrossCents: 0 }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "UNRESOLVED", code: "INVALID_SMIC" }));
  it("considère conforme un brut exactement égal au minimum applicable", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: collective, monthlyHours: 151.67, monthlyGrossCents: 213500 })).toMatchObject({ status: "APPLICABLE", appliedMonthlyMinimumCents: 213500, compliant: true, differenceCents: 0 }));
  it("conserve les identifiants de version des deux référentiels", () => expect(resolveMinimumSalary({ smic, collectiveMinimum: collective, monthlyHours: 151.67, collectiveRuleVersionId: "ccn-2025-v1", monthlyGrossCents: 220000 })).toMatchObject({ smicRuleCode: "SMIC_GROSS", smicRuleVersionId: "smic-2026-06", collectiveRuleVersionId: "ccn-2025-v1" }));
  it("signale un brut mensuel négatif", () => expect(resolveMinimumSalary({ smic, monthlyHours: 151.67, monthlyGrossCents: -1 })).toMatchObject({ status: "UNRESOLVED", code: "INVALID_GROSS_SALARY" }));
  it("refuse une durée de référence SMIC invalide", () => expect(resolveMinimumSalary({ smic: { ...smic, monthlyHoursAt35Hours: 0 }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "UNRESOLVED", code: "INVALID_SMIC" }));
});
