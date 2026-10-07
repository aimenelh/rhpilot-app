"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getPayrollMembership } from "@/lib/payrollAccess";
import { resetDemoPayroll } from "@/lib/payroll/demo-payroll";
import { userFacingError } from "@/lib/userFacingError";

export type DemoPayrollResetState = { error?: string } | undefined;

/**
 * Repart d'une paie de démonstration propre : efface les mois, bulletins et DSN d'essai
 * de l'organisation fictive, recrée les reprises et les données DSN, puis ouvre le mois en cours.
 */
export async function resetDemoPayrollAction(_previous: DemoPayrollResetState, formData: FormData): Promise<DemoPayrollResetState> {
  const membership = await getPayrollMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent remettre à zéro la paie de démonstration." };
  if (String(formData.get("confirmation") ?? "") !== "REMETTRE-A-ZERO") return { error: "Confirmez la remise à zéro de la paie de démonstration." };
  let periodId: string;
  try {
    ({ periodId } = await resetDemoPayroll({ organizationId: membership.organizationId, actorUserId: user.id }));
  } catch (error) {
    return { error: userFacingError(error, "La paie de démonstration n'a pas pu être remise à zéro. Réessayez dans un instant.") };
  }
  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard/payroll/dsn");
  redirect(`/dashboard/payroll/${periodId}`);
}
