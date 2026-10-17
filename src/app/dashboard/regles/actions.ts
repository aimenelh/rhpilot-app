"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { prisma } from "@/lib/prisma";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { parisDayKey } from "@/lib/hr-rules/engine";
import { hasBlockingFinding, reviewLeaveRule } from "@/lib/hr-rules/legal";
import { loadLegalContext } from "@/lib/hr-rules/server";
import { parseLeaveRuleSpec } from "@/lib/hr-rules/spec";
import { translateRuleText, type TranslationResult } from "@/lib/hr-rules/translate";

export type RuleActionResult = { error?: string; success?: string } | undefined;

async function adminContext() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." } as const;
  if (!isOrganizationAdmin(membership)) return { error: "Seuls les administrateurs peuvent gérer les règles maison." } as const;
  return { membership, user } as const;
}

function revalidateRuleViews() {
  revalidatePath("/dashboard/regles");
  revalidatePath("/dashboard/absences");
  revalidatePath("/espace/regles");
  revalidatePath("/espace/absences");
}

export async function translateRule(text: string): Promise<TranslationResult> {
  const context = await adminContext();
  if ("error" in context) return { ok: false, error: context.error ?? "Accès refusé." };
  return translateRuleText(String(text ?? ""));
}

export type ActivateRuleInput = {
  /** Présent quand on modifie une règle : la nouvelle version remplace la précédente. */
  lineageId?: string | null;
  title: string;
  sourceText: string;
  spec: unknown;
  mode: string;
  effectiveFrom: string;
};

export async function activateRule(input: ActivateRuleInput): Promise<RuleActionResult> {
  const context = await adminContext();
  if ("error" in context) return { error: context.error };
  const { membership, user } = context;
  const organizationId = membership.organizationId;

  const title = String(input.title ?? "").trim().slice(0, 80);
  if (!title) return { error: "Donnez un titre à la règle." };
  const parsed = parseLeaveRuleSpec(input.spec);
  if (!parsed.ok) return { error: parsed.errors[0] ?? "La règle est incomplète." };
  const mode = input.mode === "AUTO_APPROVE" ? "AUTO_APPROVE" : "PROPOSE";
  // Une nouvelle version remplace la précédente tout de suite : jamais de trou entre deux versions.
  const effectiveFrom = input.lineageId ? parseIsoDateOnly(parisDayKey(new Date())) : parseIsoDateOnly(String(input.effectiveFrom ?? ""));
  if (!effectiveFrom) return { error: "La date d'entrée en vigueur est invalide." };
  if (effectiveFrom.toISOString().slice(0, 10) < parisDayKey(new Date())) return { error: "Une règle ne peut pas entrer en vigueur dans le passé : les décisions déjà prises restent ce qu'elles sont." };

  // Le contrôle juridique est refait ici : l'aperçu du navigateur n'est jamais une garantie.
  const findings = reviewLeaveRule(parsed.spec, await loadLegalContext(organizationId));
  if (hasBlockingFinding(findings)) return { error: findings.find((finding) => finding.level === "BLOCKING")?.title ?? "La règle contredit le Code du travail." };

  const sourceText = String(input.sourceText ?? "").trim().slice(0, 1200) || null;
  try {
    await prisma.$transaction(async (tx) => {
      let lineageId: string = randomUUID();
      let version = 1;
      if (input.lineageId) {
        const previous = await tx.hr_rules.findFirst({ where: { organizationId, lineageId: input.lineageId }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true } });
        if (!previous) throw new Error("Règle introuvable.");
        lineageId = input.lineageId;
        version = previous.version + 1;
        await tx.hr_rules.updateMany({ where: { organizationId, lineageId, status: "ACTIVE" }, data: { status: "ARCHIVED", archivedAt: new Date(), archivedByUserId: user.id } });
      }
      const id = randomUUID();
      await tx.hr_rules.create({
        data: {
          id,
          organizationId,
          lineageId,
          version,
          title,
          sourceText,
          spec: parsed.spec as unknown as Prisma.InputJsonValue,
          legalReview: findings as unknown as Prisma.InputJsonValue,
          mode,
          status: "ACTIVE",
          effectiveFrom,
          createdByUserId: user.id,
        },
      });
      await tx.auditLog.create({
        data: { id: randomUUID(), organizationId, actorUserId: user.id, action: "house_rule.activated", entityType: "HouseRule", entityId: id, metadata: { lineageId, version, mode, title, effectiveFrom: effectiveFrom.toISOString().slice(0, 10) } },
      });
    });
  } catch (error) {
    return { error: error instanceof Error && error.message === "Règle introuvable." ? error.message : "La règle n'a pas pu être enregistrée. Réessayez." };
  }
  revalidateRuleViews();
  return { success: input.lineageId ? "Nouvelle version en vigueur. Les décisions passées restent rattachées à l'ancienne." : "Règle activée. Elle s'applique aux prochaines demandes et à celles en attente." };
}

export async function archiveRule(ruleId: string): Promise<RuleActionResult> {
  const context = await adminContext();
  if ("error" in context) return { error: context.error };
  const { membership, user } = context;
  const rule = await prisma.hr_rules.findFirst({ where: { id: ruleId, organizationId: membership.organizationId, status: "ACTIVE" }, select: { id: true, lineageId: true, version: true, title: true } });
  if (!rule) return { error: "Cette règle n'est plus en vigueur." };
  await prisma.$transaction([
    prisma.hr_rules.update({ where: { id: rule.id }, data: { status: "ARCHIVED", archivedAt: new Date(), archivedByUserId: user.id } }),
    prisma.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "house_rule.archived", entityType: "HouseRule", entityId: rule.id, metadata: { lineageId: rule.lineageId, version: rule.version, title: rule.title } } }),
  ]);
  revalidateRuleViews();
  return { success: "Règle désactivée. Les demandes à venir ne la suivent plus." };
}
