const PRO_ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);
const TERMINAL_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);

export const FREE_TIER_LIMIT = 3;
export const PRO_BASE_MONTHLY_EUR = 15;
export const PRO_PER_EMPLOYEE_MONTHLY_EUR = 3;

export function employeeQuantityForBilling(activeEmployeeCount: number): number {
  if (!Number.isInteger(activeEmployeeCount) || activeEmployeeCount < 0) {
    throw new Error("Le nombre de salariés actifs doit être un entier positif ou nul.");
  }

  // Le plan Stripe actuel possède toujours la ligne "par salarié".
  // On conserve la règle déjà utilisée au checkout : quantité minimale 1.
  return Math.max(activeEmployeeCount, 1);
}

export function hasProAccess(subscriptionStatus: string | null | undefined): boolean {
  return PRO_ACCESS_STATUSES.has(subscriptionStatus ?? "");
}

export function hasOpenStripeSubscription(
  stripeSubscriptionId: string | null | undefined,
  subscriptionStatus: string | null | undefined
): boolean {
  if (!stripeSubscriptionId) return false;
  return !TERMINAL_SUBSCRIPTION_STATUSES.has(subscriptionStatus ?? "");
}

export function estimatedProMonthlyPrice(activeEmployeeCount: number): number {
  return (
    PRO_BASE_MONTHLY_EUR +
    employeeQuantityForBilling(activeEmployeeCount) * PRO_PER_EMPLOYEE_MONTHLY_EUR
  );
}

export function shouldCancelSubscriptionForLastMembership(
  otherActiveMembersCount: number,
  stripeSubscriptionId: string | null | undefined,
  subscriptionStatus: string | null | undefined
): boolean {
  if (!Number.isInteger(otherActiveMembersCount) || otherActiveMembersCount < 0) {
    throw new Error("Le nombre de membres actifs doit être un entier positif ou nul.");
  }
  return (
    otherActiveMembersCount === 0 &&
    hasOpenStripeSubscription(stripeSubscriptionId, subscriptionStatus)
  );
}
