"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { parseEmployeeCsv } from "@/lib/employeeCsv";
import { employeeIdentityKey } from "@/lib/employeeIdentity";
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
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    return { error: "Seuls les propriétaires et administrateurs peuvent importer des salariés." };
  }

  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText.trim()) {
    return { error: "Collez le contenu du fichier CSV avant d'importer." };
  }

  const { rows, errors } = parseEmployeeCsv(csvText);

  if (rows.length === 0) {
    return { error: errors[0]?.message ?? "Aucune ligne valide trouvée dans ce contenu." };
  }

  const seenInFile = new Set<string>();
  const duplicateRowsInFile = rows.filter((row) => {
    const key = employeeIdentityKey(row);
    if (seenInFile.has(key)) return true;
    seenInFile.add(key);
    return false;
  });

  if (duplicateRowsInFile.length > 0) {
    return {
      error: `Le fichier contient ${duplicateRowsInFile.length} doublon${duplicateRowsInFile.length > 1 ? "s" : ""} (même prénom, nom et date d'embauche). Aucun salarié n'a été ajouté.`,
    };
  }

  const existingEmployees = await prisma.employee.findMany({
    where: { organizationId: membership.organizationId },
    select: { firstName: true, lastName: true, hireDate: true },
  });
  const existingKeys = new Set(existingEmployees.map(employeeIdentityKey));
  const alreadyExisting = rows.filter((row) => existingKeys.has(employeeIdentityKey(row)));

  if (alreadyExisting.length > 0) {
    const examples = alreadyExisting
      .slice(0, 3)
      .map((row) => `${row.firstName} ${row.lastName}`)
      .join(", ");
    return {
      error: `${alreadyExisting.length} salarié${alreadyExisting.length > 1 ? "s semblent" : " semble"} déjà présent${alreadyExisting.length > 1 ? "s" : ""} dans RH Pilot (${examples}${alreadyExisting.length > 3 ? ", …" : ""}). Aucun salarié n'a été ajouté pour éviter les doublons.`,
    };
  }

  // Même limite que pour une création individuelle — un import ne
  // doit pas être un moyen de la contourner en ajoutant plusieurs
  // salariés d'un coup (voir aussi createEmployee/reactivateEmployee).
  const limitError = await checkFreeTierLimit(membership.organizationId, rows.length);
  if (limitError) return { error: limitError };

  // Import atomique : soit toutes les lignes validées sont créées avec
  // leur trace d'audit, soit aucune ne l'est. Une panne au milieu d'un
  // fichier ne doit jamais laisser une demi-importation silencieuse.
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.employee.create({
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

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: "employees.imported",
          entityType: "Organization",
          entityId: membership.organizationId,
          metadata: { count: rows.length, errorCount: errors.length },
        },
      });
    });
  } catch (error) {
    console.error("Import CSV salariés échoué :", error);
    return {
      error:
        "L'import n'a pas pu être finalisé. Aucun des salariés validés n'a été ajouté ; corrigez le fichier puis réessayez.",
    };
  }

  const parts = [`${rows.length} salarié${rows.length > 1 ? "s" : ""} importé${rows.length > 1 ? "s" : ""}`];
  if (errors.length > 0) {
    parts.push(`${errors.length} ligne${errors.length > 1 ? "s" : ""} ignorée${errors.length > 1 ? "s" : ""}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(`/dashboard/employees?flash=${encodeURIComponent(parts.join(", "))}`);
}
