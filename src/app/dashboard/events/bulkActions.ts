"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { triggerEmployeeEvent } from "@/lib/eventEngine";

type LineResult = { line: number; input: string; message: string };

export type BulkTriggerState =
  | {
      successCount: number;
      failures: LineResult[];
      error?: never;
    }
  | { error: string; successCount?: never; failures?: never }
  | undefined;

/**
 * Déclenche un même type d'événement pour plusieurs salariés déjà
 * existants en une fois — le vrai manque remonté par un retour
 * terrain : notre produit ne savait générer un parcours qu'un
 * salarié à la fois.
 *
 * Identification volontairement prudente : les salariés n'ont pas
 * d'email en base, seulement prénom + nom. Si plusieurs salariés
 * partagent exactement le même nom, la ligne est explicitement
 * signalée comme ambiguë et ignorée — jamais un choix au hasard entre
 * deux personnes.
 */
export async function bulkTriggerEvents(
  _prevState: BulkTriggerState,
  formData: FormData
): Promise<BulkTriggerState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };

  const eventTemplateKey = String(formData.get("eventTemplateKey") ?? "").trim();
  const rawText = String(formData.get("bulkText") ?? "");

  if (!eventTemplateKey) return { error: "Veuillez choisir un type d'événement." };
  if (!rawText.trim()) return { error: "Collez au moins une ligne avant de lancer la génération." };

  const eventTemplate = await prisma.eventTemplate.findUnique({ where: { key: eventTemplateKey } });
  if (!eventTemplate) return { error: "Type d'événement introuvable." };

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length > 500) {
    return { error: "Maximum 500 lignes par génération — divisez en plusieurs envois si besoin." };
  }

  const failures: LineResult[] = [];
  let successCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const raw = lines[i];
    const parts = raw.split(/[;,\t]/).map((p) => p.trim());

    if (parts.length < 3) {
      failures.push({
        line: lineNumber,
        input: raw,
        message: "Format incorrect — attendu : Prénom;Nom;AAAA-MM-JJ",
      });
      continue;
    }

    const [firstName, lastName, dateRaw] = parts;
    const triggerDate = new Date(dateRaw);

    if (!firstName || !lastName) {
      failures.push({ line: lineNumber, input: raw, message: "Prénom ou nom manquant." });
      continue;
    }
    if (Number.isNaN(triggerDate.getTime())) {
      failures.push({ line: lineNumber, input: raw, message: `Date invalide : "${dateRaw}".` });
      continue;
    }

    const matches = await prisma.employee.findMany({
      where: {
        organizationId: membership.organizationId,
        deletedAt: null,
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
      },
    });

    if (matches.length === 0) {
      failures.push({
        line: lineNumber,
        input: raw,
        message: `Aucun salarié "${firstName} ${lastName}" trouvé dans votre organisation.`,
      });
      continue;
    }
    if (matches.length > 1) {
      failures.push({
        line: lineNumber,
        input: raw,
        message: `${matches.length} salariés portent ce nom : ambigu, ignoré. Utilisez la fiche individuelle pour cette personne.`,
      });
      continue;
    }

    try {
      await triggerEmployeeEvent({
        organizationId: membership.organizationId,
        employeeId: matches[0].id,
        eventTemplateKey,
        triggerDate,
        actorUserId: user.id,
      });
      successCount++;
    } catch (err) {
      failures.push({
        line: lineNumber,
        input: raw,
        message: err instanceof Error ? err.message : "Erreur inconnue lors de la génération.",
      });
    }
  }

  if (successCount > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "events.bulk_triggered",
        entityType: "EventTemplate",
        entityId: eventTemplate.id,
        metadata: { count: successCount, failureCount: failures.length },
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");

  return { successCount, failures };
}
