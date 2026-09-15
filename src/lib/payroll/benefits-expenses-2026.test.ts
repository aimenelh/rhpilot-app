import { describe, expect, it } from "vitest";
import {
  calculateActualExpenseReimbursement,
  calculateHousingBenefit2026,
  calculateMealBenefit2026,
  calculateMealVouchers2026,
  calculateNticBenefit,
  calculatePublicTransportReimbursement2026,
  calculateVehicleBenefit2026,
} from "./benefits-expenses-2026";

describe("benefits-expenses-2026", () => {
  it("valorise l'avantage nourriture 2026 et le retire du net", () => {
    const result = calculateMealBenefit2026({ meals: 20 });
    expect(result.amount).toBe(110);
    expect(result.grossDelta).toBe(110);
    expect(result.netAdjustment).toBe(-110);
  });

  it("néglige l'avantage nourriture lorsque la participation atteint 50 % du forfait", () => {
    expect(calculateMealBenefit2026({ meals: 20, employeeContributionPerMeal: 2.75 }).amount).toBe(0);
  });

  it("applique le barème logement 2026", () => {
    const result = calculateHousingBenefit2026({ monthlyGrossReference: 2500, principalRooms: 3 });
    expect(result.amount).toBe(239.1);
    expect(result.netAdjustment).toBe(-239.1);
  });

  it("évalue les NTIC à 10 % par an", () => {
    const result = calculateNticBenefit({ equipmentPurchaseCost: 850, monthlySubscriptionCost: 30 });
    expect(result.amount).toBe(10.08);
  });

  it("évalue un véhicule acheté attribué après le 1er février 2025", () => {
    const result = calculateVehicleBenefit2026({
      assignmentDate: new Date(Date.UTC(2026, 0, 1)),
      ownership: "PURCHASED",
      purchaseCost: 30000,
      vehicleOlderThanFiveYears: false,
    });
    expect(result.amount).toBe(375);
  });

  it("applique l'abattement électrique post-réforme dans sa limite annuelle", () => {
    const result = calculateVehicleBenefit2026({
      assignmentDate: new Date(Date.UTC(2026, 0, 1)),
      ownership: "PURCHASED",
      purchaseCost: 30000,
      vehicleOlderThanFiveYears: false,
      electricEligible: true,
    });
    expect(result.amount).toBe(112.5);
  });

  it("calcule la part salariale et le plafond d'exonération titres-restaurant", () => {
    const result = calculateMealVouchers2026({ count: 20, faceValue: 12.2, employerContributionPerVoucher: 7.32 });
    expect(result.exemptionConditionsMet).toBe(true);
    expect(result.employerExemptAmount).toBe(146.4);
    expect(result.employerSubjectToContributions).toBe(0);
    expect(result.employeeDeduction.amount).toBe(97.6);
    expect(result.employeeDeduction.netAdjustment).toBe(-97.6);
  });

  it("soumet la part patronale des titres restaurant lorsque le taux sort de 50-60 %", () => {
    const result = calculateMealVouchers2026({ count: 10, faceValue: 10, employerContributionPerVoucher: 8 });
    expect(result.exemptionConditionsMet).toBe(false);
    expect(result.employerSubjectToContributions).toBe(80);
  });

  it("rembourse les frais réels hors brut seulement s'ils sont justifiés", () => {
    expect(calculateActualExpenseReimbursement({ amount: 142.35, justified: true }).netAdjustment).toBe(142.35);
    expect(() => calculateActualExpenseReimbursement({ amount: 142.35, justified: false })).toThrow("justifiée");
  });

  it("calcule le remboursement transport et isole la fraction au-delà de 75 %", () => {
    const result = calculatePublicTransportReimbursement2026({ subscriptionCost: 100, employerRate: 1 });
    expect(result.amount).toBe(100);
    expect(result.exemptAmount).toBe(75);
    expect(result.subjectToContributions).toBe(25);
  });
});
