"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { parseEmployeeCsv } from "@/lib/employeeCsv";
import { checkFreeTierLimit } from "./actions";

export type ImportState = { error: string } | undefined;

export async function importEmployeesCsv(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    return { error: "Session expirée, veuillez recharger la page." };
  }

  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText.trim()) {
    return { error: "Collez le contenu du fichier CSV avant d'importer." };
  }

  const { rows, errors } = parseEmployeeCsv(csvText);

  if (rows.length === 0) {
    return { error: errors[0]?.message ?? "Aucune ligne valide trouvée dans ce contenu." };
  }

  // Même limite que pour une création individuelle — un import ne
  // doit pas être un moyen de la contourner en ajoutant plusieurs
  // salariés d'un coup (voir aussi createEmployee/reactivateEmployee).
  const limitError = await checkFreeTierLimit(membership.organizationId, rows.length);
  if (limitError) return { error: limitError };

  for (const row of rows) {
    await prisma.employee.create({
      data: {
        organizationId: membership.organizationId,
        firstName: row.firstName,
        lastName: row.lastName,
        civility: row.civility,
        position: row.position,
        hireDate: row.hireDate,
        contractType: row.contractType,
        probationDuration: row.probationDuration,
        probationDurationUnit: row.probationDurationUnit,
        nextMedicalVisitDate: row.nextMedicalVisitDate,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "employees.imported",
      entityType: "Organization",
      entityId: membership.organizationId,
      metadata: { count: rows.length, errorCount: errors.length },
    },
  });

  const parts = [`${rows.length} salarié${rows.length > 1 ? "s" : ""} importé${rows.length > 1 ? "s" : ""}`];
  if (errors.length > 0) {
    parts.push(`${errors.length} ligne${errors.length > 1 ? "s" : ""} ignorée${errors.length > 1 ? "s" : ""}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(`/dashboard/employees?flash=${encodeURIComponent(parts.join(", "))}`);
}
