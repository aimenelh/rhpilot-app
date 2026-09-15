import { describe, expect, it } from "vitest";
import {
  calculateBaseHourlyRate,
  calculateComplementaryHoursPay,
  calculateOvertimePay,
} from "./working-time-pay";

describe("working-time-pay", () => {
  it("calcule le taux horaire de base", () => {
    expect(calculateBaseHourlyRate(2000, 151.67)).toBe(13.19);
  });

  it("applique 25 % aux huit premières heures sup puis 50 %", () => {
    const result = calculateOvertimePay({
      baseSalaryAmount: 2000,
      monthlyHours: 151.67,
      weeks: [{ weekLabel: "S1", overtimeHours: 10 }],
    });
    expect(result.totalHours).toBe(10);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].premiumRate).toBe(0.25);
    expect(result.lines[1].premiumRate).toBe(0.5);
    expect(result.totalAmount).toBe(171.47);
  });

  it("accepte une règle conventionnelle mais refuse un taux inférieur à 10 %", () => {
    expect(() => calculateOvertimePay({
      baseSalaryAmount: 2200,
      monthlyHours: 151.67,
      weeks: [{
        weekLabel: "S1",
        overtimeHours: 2,
        rates: {
          firstBandHours: 8,
          firstBandPremiumRate: 0.05,
          secondBandPremiumRate: 0.25,
          sourceReference: "Accord test",
        },
      }],
    })).toThrow("10 %");
  });

  it("calcule les heures complémentaires à 10 puis 25 % lorsqu'un accord autorise le tiers", () => {
    const result = calculateComplementaryHoursPay({
      baseSalaryAmount: 1200,
      monthlyHours: 100,
      contractualMonthlyHours: 100,
      complementaryHours: 20,
      agreementAllowsOneThird: true,
    });
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({ hours: 10, premiumRate: 0.1 });
    expect(result.lines[1]).toMatchObject({ hours: 10, premiumRate: 0.25 });
    expect(result.totalAmount).toBe(282);
  });

  it("bloque les heures complémentaires au-delà de la limite applicable", () => {
    expect(() => calculateComplementaryHoursPay({
      baseSalaryAmount: 1200,
      monthlyHours: 100,
      contractualMonthlyHours: 100,
      complementaryHours: 11,
    })).toThrow("dépasse la limite");
  });
});
