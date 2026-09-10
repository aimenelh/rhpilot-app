import { describe, expect, it } from "vitest";
import { buildMinimumSalaryControlSnapshot } from "./minimum-salary-control";
import type { SmicMinimumResult } from "./minimum-wage";

const smic: SmicMinimumResult = { hourlyGrossCents: 1231, monthlyGrossCentsAt35Hours: 186702, monthlyHoursAt35Hours: 151.67, ruleCode: "SMIC_GROSS", ruleVersionId: "smic-2026-06" };
const collective = { status: "APPLICABLE" as const, classificationCode: "IC_1.1", monthlyMinimumCents: 213500, differenceCents: 6500, compliant: true };

describe("snapshot du contrôle du salaire minimum", () => {
  it("trace le minimum conventionnel retenu", () => expect(buildMinimumSalaryControlSnapshot({ smic, collectiveMinimum: collective, monthlyHours: 151.67, collectiveRuleVersionId: "ccn-2025-v1", monthlyGrossCents: 220000 })).toEqual({ status: "APPLICABLE", source: "COLLECTIVE_AGREEMENT", appliedMonthlyMinimumCents: 213500, smicMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: 213500, compliant: true, differenceCents: 6500, smicRuleCode: "SMIC_GROSS", smicRuleVersionId: "smic-2026-06", collectiveRuleVersionId: "ccn-2025-v1", explanation: "Le minimum conventionnel applicable est supérieur ou égal au SMIC proratisé." }));

  it("trace le SMIC lorsque celui-ci est le minimum le plus favorable", () => expect(buildMinimumSalaryControlSnapshot({ smic, collectiveMinimum: { ...collective, monthlyMinimumCents: 180000 }, monthlyHours: 160, collectiveRuleVersionId: "ccn-2025-v1", monthlyGrossCents: 200000 })).toMatchObject({ status: "APPLICABLE", source: "SMIC", appliedMonthlyMinimumCents: 196960, collectiveMonthlyMinimumCents: 180000, collectiveRuleVersionId: undefined, compliant: true }));

  it("utilise le SMIC lorsqu'aucune convention collective n'est applicable", () => expect(buildMinimumSalaryControlSnapshot({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "NO_COLLECTIVE_AGREEMENT", message: "Aucune convention collective applicable n'est configurée pour ce salarié." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toMatchObject({ status: "APPLICABLE", source: "SMIC", appliedMonthlyMinimumCents: 186702, collectiveMonthlyMinimumCents: null, compliant: true }));

  it("préserve une résolution impossible de la convention", () => expect(buildMinimumSalaryControlSnapshot({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "CLASSIFICATION_MISMATCH", message: "Classification absente." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toEqual({ status: "UNRESOLVED", explanation: "Le minimum conventionnel n'est pas déterminable : Classification absente.", code: "COLLECTIVE_MINIMUM_UNRESOLVED" }));

  it("préserve l'absence de version conventionnelle validée", () => expect(buildMinimumSalaryControlSnapshot({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "NO_VALIDATED_VERSION", message: "Aucune version validée." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toEqual({ status: "UNRESOLVED", explanation: "Le minimum conventionnel n'est pas déterminable : Aucune version validée.", code: "COLLECTIVE_MINIMUM_UNRESOLVED" }));

  it("préserve l'absence de règle conventionnelle validée", () => expect(buildMinimumSalaryControlSnapshot({ smic, collectiveMinimum: { status: "UNRESOLVED", code: "NO_VALIDATED_RULE", message: "Aucune règle validée." }, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toEqual({ status: "UNRESOLVED", explanation: "Le minimum conventionnel n'est pas déterminable : Aucune règle validée.", code: "COLLECTIVE_MINIMUM_UNRESOLVED" }));

  it("ne fabrique pas de contrôle sans version SMIC validée", () => expect(buildMinimumSalaryControlSnapshot({ smic: null, monthlyHours: 151.67, monthlyGrossCents: 190000 })).toEqual({ status: "UNRESOLVED", explanation: "Aucune version validée du SMIC n'est disponible pour la période de paie.", code: "NO_VALIDATED_SMIC_RULE" }));
});
