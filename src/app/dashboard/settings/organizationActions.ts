"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

const LEGAL_CATEGORIES = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"] as const;

function setOrganizationSavedCookie() {
  cookies().set("rhpilot-organization-saved", "1", { path: "/dashboard/configuration/organisation", maxAge: 10, httpOnly: true, sameSite: "lax" });
}

export async function updateOrganizationSettings(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  const rawFunctionalRole = String(formData.get("functionalRole") ?? "");
  const functionalRole = rawFunctionalRole === "RH" || rawFunctionalRole === "DIRIGEANT" ? rawFunctionalRole : null;
  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";

  if (canEditOrganization) {
    const legalCategoryRaw = String(formData.get("legalCategory") ?? "").trim();
    const legalCategory = legalCategoryRaw === "" ? null : legalCategoryRaw;
    if (legalCategory !== null && !LEGAL_CATEGORIES.includes(legalCategory as (typeof LEGAL_CATEGORIES)[number])) throw new Error("Forme juridique invalide.");

    const companyCreationDateRaw = String(formData.get("companyCreationDate") ?? "").trim();
    const companyCreationDate = companyCreationDateRaw === "" ? null : new Date(`${companyCreationDateRaw}T00:00:00.000Z`);
    if (companyCreationDate !== null && Number.isNaN(companyCreationDate.getTime())) throw new Error("La date de création de l'entreprise est invalide.");
    if (companyCreationDate !== null && companyCreationDate > new Date()) throw new Error("La date de création de l'entreprise ne peut pas être dans le futur.");

    const payrollCity = String(formData.get("payrollCity") ?? "").trim();
    const atmpRateRaw = String(formData.get("atmpRate") ?? "").trim().replace(",", ".");
    const atmpRate = atmpRateRaw === "" ? null : Number(atmpRateRaw);
    if (atmpRate !== null && (!Number.isFinite(atmpRate) || atmpRate < 0 || atmpRate > 100)) throw new Error("Le taux AT/MP doit être compris entre 0 et 100 %.");

    const healthPlanMonthlyAmountRaw = String(formData.get("healthPlanMonthlyAmount") ?? "").trim().replace(",", ".");
    const healthPlanEmployerRateRaw = String(formData.get("healthPlanEmployerRate") ?? "").trim().replace(",", ".");
    const healthPlanMonthlyAmount = healthPlanMonthlyAmountRaw === "" ? null : Number(healthPlanMonthlyAmountRaw);
    const healthPlanEmployerRate = healthPlanEmployerRateRaw === "" ? null : Number(healthPlanEmployerRateRaw);
    if (healthPlanMonthlyAmount !== null && (!Number.isFinite(healthPlanMonthlyAmount) || healthPlanMonthlyAmount <= 0 || healthPlanMonthlyAmount > 10000)) throw new Error("Le montant mensuel de la complémentaire santé doit être supérieur à 0 €.");
    if (healthPlanEmployerRate !== null && (!Number.isFinite(healthPlanEmployerRate) || healthPlanEmployerRate < 50 || healthPlanEmployerRate > 100)) throw new Error("La part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.");

    const payrollDepartment = String(formData.get("payrollDepartment") ?? "").trim();
    const conventionCollective = String(formData.get("conventionCollective") ?? "").trim();

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: membership.id }, data: { functionalRole } });
      await tx.organization.update({ where: { id: membership.organizationId }, data: { conventionCollective: conventionCollective || null, payrollCity: payrollCity || null } });
      await tx.$executeRaw`UPDATE "organizations" SET "legalCategory" = ${legalCategory}, "companyCreationDate" = ${companyCreationDate}, "atmpRate" = ${atmpRate}, "payrollDepartment" = ${payrollDepartment || null}, "healthPlanMonthlyAmount" = ${healthPlanMonthlyAmount}, "healthPlanEmployerRate" = ${healthPlanEmployerRate} WHERE "id" = ${membership.organizationId}`;
    });
  } else {
    await prisma.membership.update({ where: { id: membership.id }, data: { functionalRole } });
  }

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/organisation");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/payroll");
  setOrganizationSavedCookie();
  redirect("/dashboard/configuration/organisation");
}

export async function updateConventionCollective(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const raw = String(formData.get("conventionCollective") ?? "").trim();
  await prisma.organization.update({ where: { id: membership.organizationId }, data: { conventionCollective: raw || null } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation"); revalidatePath("/dashboard/employees"); revalidatePath("/dashboard/events");
  setOrganizationSavedCookie();
  redirect("/dashboard/configuration/organisation");
}

export async function updateFunctionalRole(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  const raw = String(formData.get("functionalRole") ?? "");
  const value = raw === "RH" || raw === "DIRIGEANT" ? raw : null;
  await prisma.membership.update({ where: { id: membership.id }, data: { functionalRole: value } });
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation");
  setOrganizationSavedCookie();
  redirect("/dashboard/configuration/organisation");
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
  setOrganizationSavedCookie();
  redirect("/dashboard/configuration/organisation");
}

export async function updateAtmpRate(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const raw = String(formData.get("atmpRate") ?? "").trim().replace(",", ".");
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) throw new Error("Le taux AT/MP doit être compris entre 0 et 100 %.");
  await prisma.$executeRaw`UPDATE "organizations" SET "atmpRate" = ${value} WHERE "id" = ${membership.organizationId}`;
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation"); revalidatePath("/dashboard/payroll");
  setOrganizationSavedCookie();
  redirect("/dashboard/configuration/organisation");
}

export async function updateHealthPlan(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const monthlyAmountRaw = String(formData.get("healthPlanMonthlyAmount") ?? "").trim().replace(",", ".");
  const employerRateRaw = String(formData.get("healthPlanEmployerRate") ?? "").trim().replace(",", ".");
  const monthlyAmount = monthlyAmountRaw === "" ? null : Number(monthlyAmountRaw);
  const employerRate = employerRateRaw === "" ? null : Number(employerRateRaw);
  if (monthlyAmount !== null && (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0 || monthlyAmount > 10000)) throw new Error("Le montant mensuel de la complémentaire santé doit être supérieur à 0 €.");
  if (employerRate !== null && (!Number.isFinite(employerRate) || employerRate < 50 || employerRate > 100)) throw new Error("La part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.");
  await prisma.$executeRaw`UPDATE "organizations" SET "healthPlanMonthlyAmount" = ${monthlyAmount}, "healthPlanEmployerRate" = ${employerRate} WHERE "id" = ${membership.organizationId}`;
  revalidatePath("/dashboard/configuration"); revalidatePath("/dashboard/configuration/organisation"); revalidatePath("/dashboard/payroll");
  setOrganizationSavedCookie();
  redirect("/dashboard/configuration/organisation");
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
