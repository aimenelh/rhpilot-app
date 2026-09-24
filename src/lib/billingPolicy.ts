export function employeeQuantityForBilling(activeEmployeeCount: number): number {
  if (!Number.isInteger(activeEmployeeCount) || activeEmployeeCount < 0) {
    throw new Error("Le nombre de salariés actifs doit être un entier positif ou nul.");
  }

  // Le plan Stripe actuel possède toujours la ligne "par salarié".
  // On conserve la règle déjà utilisée au checkout : quantité minimale 1.
  return Math.max(activeEmployeeCount, 1);
}
