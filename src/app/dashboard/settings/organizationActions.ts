"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

const LEGAL_CATEGORIES = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"] as const;

export async function updateConventionCollective(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const raw = String(formData.get("conventionCollective") ?? "").trim();
  await prisma.organization.update({ where: { id: membership.organizationId }, data: { conventionCollective: raw || null } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation"); revalidatePath("/dashboard/employees"); revalidatePath("/dashboard/events");
  redirect("/dashboard/configuration/organisation?saved=1");
}

export async function updateFunctionalRole(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  const raw = String(formData.get("functionalRole") ?? "");
  const value = raw === "RH" || raw === "DIRIGEANT" ? raw : null;
  await prisma.membership.update({ where: { id: membership.id }, data: { functionalRole: value } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation");
  redirect("/dashboard/configuration/organisation?saved=1");
}

export async function updateLegalCategory(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const raw = String(formData.get("legalCategory") ?? "").trim();
  const value = raw === "" ? null : raw;
  if (value !== null && !LEGAL_CATEGORIES.includes(value as (typeof LEGAL_CATEGORIES)[number])) throw new Error("Forme juridique invalide.");
  await prisma.$executeRaw`UPDATE "organizations" SET "legalCategory" = ${value} WHERE "id" = ${membership.organizationId}`;
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation"); revalidatePath("/dashboard/payroll");
  redirect("/dashboard/configuration/organisation?saved=1");
}

export async function updateAtmpRate(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const raw = String(formData.get("atmpRate") ?? "").trim().replace(",", ".");
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) throw new Error("Le taux AT/MP doit être compris entre 0 et 100 %." );
  await prisma.$executeRaw`UPDATE "organizations" SET "atmpRate" = ${value} WHERE "id" = ${membership.organizationId}`;
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation"); revalidatePath("/dashboard/payroll");
  redirect("/dashboard/configuration/organisation?saved=1");
}

export async function revertTaskTemplateOverride(overrideId: string) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  await prisma.taskTemplateOverride.deleteMany({ where: { id: overrideId, organizationId: membership.organizationId } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/parcours");
}

export async function createReminderRule(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const daysBeforeDue = Number(formData.get("daysBeforeDue"));
  const notifyAssignee = formData.get("notifyAssignee") === "on";
  const notifyManager = formData.get("notifyManager") === "on";
  if (!Number.isInteger(daysBeforeDue) || daysBeforeDue < 0 || daysBeforeDue > 90) throw new Error("Le délai doit être un nombre de jours entre 0 et 90.");
  if (!notifyAssignee && !notifyManager) throw new Error("Choisissez au moins un destinataire.");
  const existing = await prisma.reminderRule.findFirst({ where: { organizationId: membership.organizationId, daysBeforeDue } });
  if (existing) throw new Error(`Une règle existe déjà pour ${daysBeforeDue} jour(s) avant l'échéance.`);
  await prisma.reminderRule.create({ data: { organizationId: membership.organizationId, daysBeforeDue, notifyAssignee, notifyManager } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/notifications");
}

export async function deleteReminderRule(ruleId: string) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  await prisma.reminderRule.deleteMany({ where: { id: ruleId, organizationId: membership.organizationId } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/notifications");
}
