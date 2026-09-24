import type { Prisma } from "@prisma/client";

/**
 * Périmètre unique des salariés qui comptent pour les limites et la
 * facturation : actifs, réels, jamais les fiches de démonstration.
 */
export function billableEmployeeWhere(
  organizationId: string
): Prisma.EmployeeWhereInput {
  return {
    organizationId,
    deletedAt: null,
    isDemoData: false,
  };
}
