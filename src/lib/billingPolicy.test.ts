import { describe, expect, it } from "vitest";
import {
  employeeQuantityForBilling,
  estimatedProMonthlyPrice,
  FREE_TIER_LIMIT,
  hasOpenStripeSubscription,
  hasProAccess,
} from "@/lib/billingPolicy";

describe("employeeQuantityForBilling", () => {
  it("conserve au moins une unité facturable", () => {
    expect(employeeQuantityForBilling(0)).toBe(1);
  });

  it("reflète le nombre réel de salariés actifs", () => {
    expect(employeeQuantityForBilling(1)).toBe(1);
    expect(employeeQuantityForBilling(12)).toBe(12);
  });

  it("refuse les valeurs incohérentes", () => {
    expect(() => employeeQuantityForBilling(-1)).toThrow();
    expect(() => employeeQuantityForBilling(1.5)).toThrow();
  });
});

describe("politique d'abonnement", () => {
  it("centralise la limite gratuite", () => {
    expect(FREE_TIER_LIMIT).toBe(3);
  });

  it("accorde l'accès Pro aux statuts encore servis", () => {
    expect(hasProAccess("active")).toBe(true);
    expect(hasProAccess("trialing")).toBe(true);
    expect(hasProAccess("past_due")).toBe(true);
    expect(hasProAccess("canceled")).toBe(false);
    expect(hasProAccess("unpaid")).toBe(false);
  });

  it("considère une souscription Stripe non terminale comme encore ouverte", () => {
    expect(hasOpenStripeSubscription("sub_1", "active")).toBe(true);
    expect(hasOpenStripeSubscription("sub_1", "past_due")).toBe(true);
    expect(hasOpenStripeSubscription("sub_1", "unpaid")).toBe(true);
    expect(hasOpenStripeSubscription("sub_1", null)).toBe(true);
    expect(hasOpenStripeSubscription("sub_1", "canceled")).toBe(false);
    expect(hasOpenStripeSubscription("sub_1", "incomplete_expired")).toBe(false);
    expect(hasOpenStripeSubscription(null, "active")).toBe(false);
  });

  it("aligne l'estimation mensuelle sur la quantité minimale Stripe", () => {
    expect(estimatedProMonthlyPrice(0)).toBe(18);
    expect(estimatedProMonthlyPrice(1)).toBe(18);
    expect(estimatedProMonthlyPrice(5)).toBe(30);
  });
});
