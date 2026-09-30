"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { isParisDayAfter } from "@/lib/parisDate";
import { parsePayrollSettingsForm } from "@/lib/payroll/bulletin/settings-form";
import { COLLECTIVE_AGREEMENT_SOURCE, KNOWN_CONVENTIONS } from "@/lib/collective-agreement-referential";
import { lookupCommuneCode, normalizeNafCode } from "@/lib/company-registry";
import { refreshMobilityRateFromUrssaf, syncOrganizationFromRegistry } from "@/lib/organization-registry-sync";

const LEGAL_CATEGORIES = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"] as const;

function setOrganizationSavedCookie() {
  cookies().set("rhpilot-organization-saved", "1", { path: "/dashboard/configuration/organisation", maxAge: 10, httpOnly: true, sameSite: "lax" });
}

function normalizeConventionName(value: string) {
  return value.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function resolveCollectiveAgreement(formData: FormData) {
  const idccRaw = String(formData.get("collectiveAgreementIdcc") ?? "").trim();
  const nameRaw = String(formData.get("collectiveAgreementName") ?? "").trim();
  if (!idccRaw && !nameRaw) return null;
  if (nameRaw.length > 200) throw new Error("Le nom de la convention collective est trop long.");
  if (idccRaw && !/^\d{4}$/.test(idccRaw)) throw new Error("L'IDCC doit comporter exactement 4 chiffres.");

  const normalizedName = normalizeConventionName(nameRaw);
  const aliasIdcc = normalizedName === "syntec" ? "1486" : null;
  const requestedIdcc = idccRaw || aliasIdcc;

  if (requestedIdcc) {
    const existing = await prisma.collectiveAgreement.findUnique({ where: { idcc: requestedIdcc } });
    if (existing) return { id: existing.id, name: existing.name };
    const known = KNOWN_CONVENTIONS.find((agreement) => agreement.idcc === requestedIdcc);
    if (known) {
      const created = await prisma.collectiveAgreement.create({ data: { id: `ccn-${known.idcc}`, idcc: known.idcc, name: known.name, sourceName: COLLECTIVE_AGREEMENT_SOURCE.name, sourceUrl: COLLECTIVE_AGREEMENT_SOURCE.url, status: "ACTIVE" } });
      return { id: created.id, name: created.name };
    }
    if (!nameRaw) throw new Error("Cette convention n'est pas encore référencée dans RH Pilot. Renseignez son nom pour l'ajouter au référentiel.");
    const id = `ccn-${requestedIdcc}`;
    const created = await prisma.collectiveAgreement.create({ data: { id, idcc: requestedIdcc, name: nameRaw, sourceName: COLLECTIVE_AGREEMENT_SOURCE.name, sourceUrl: COLLECTIVE_AGREEMENT_SOURCE.url, status: "ACTIVE" } });
    return { id: created.id, name: created.name };
  }

  const existingByName = await prisma.collectiveAgreement.findFirst({ where: { name: { equals: nameRaw, mode: "insensitive" } } });
  if (existingByName) return { id: existingByName.id, name: existingByName.name };
  const known = KNOWN_CONVENTIONS.find((agreement) => normalizeConventionName(agreement.name) === normalizedName);
  if (known) {
    const existingKnown = await prisma.collectiveAgreement.findUnique({ where: { idcc: known.idcc } });
    if (existingKnown) return { id: existingKnown.id, name: existingKnown.name };
    const created = await prisma.collectiveAgreement.create({ data: { id: `ccn-${known.idcc}`, idcc: known.idcc, name: known.name, sourceName: COLLECTIVE_AGREEMENT_SOURCE.name, sourceUrl: COLLECTIVE_AGREEMENT_SOURCE.url, status: "ACTIVE" } });
    return { id: created.id, name: created.name };
  }
  throw new Error("Convention collective introuvable. Sélectionnez une convention dans la liste ou renseignez son IDCC.");
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
    const companyCreationDate =
      companyCreationDateRaw === "" ? null : parseIsoDateOnly(companyCreationDateRaw);
    if (companyCreationDateRaw !== "" && !companyCreationDate) {
      throw new Error("La date de création de l'entreprise est invalide.");
    }
    if (companyCreationDate !== null && isParisDayAfter(companyCreationDate)) throw new Error("La date de création de l'entreprise ne peut pas être dans le futur.");
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
    const payrollAddress = String(formData.get("payrollAddress") ?? "").trim();
    const payrollPostalCode = String(formData.get("payrollPostalCode") ?? "").trim();
    if (payrollPostalCode && !/^\d{5}$/.test(payrollPostalCode)) throw new Error("Le code postal doit comporter 5 chiffres.");
    const payrollNafRaw = String(formData.get("payrollNafCode") ?? "").trim();
    const payrollNafCode = payrollNafRaw === "" ? null : normalizeNafCode(payrollNafRaw);
    if (payrollNafRaw !== "" && !payrollNafCode) throw new Error("Le code APE doit avoir la forme 6202A.");
    const collectiveAgreement = await resolveCollectiveAgreement(formData);
    const payrollSettings = formData.has("paidLeaveMethod") ? parsePayrollSettingsForm((name) => formData.get(name)) : null;

    // Commune corrigée à la main : on retrouve son code Insee (clé du barème du versement mobilité).
    const [current] = await prisma.$queryRaw<Array<{ payrollCity: string | null; payrollPostalCode: string | null; payrollCommuneCode: string | null }>>`SELECT "payrollCity", "payrollPostalCode", "payrollCommuneCode" FROM "organizations" WHERE "id" = ${membership.organizationId} LIMIT 1`;
    const hasAddressFields = formData.has("payrollPostalCode");
    const nextPostalCode = hasAddressFields ? payrollPostalCode || null : current?.payrollPostalCode ?? null;
    const placeChanged = (payrollCity || null) !== (current?.payrollCity ?? null) || nextPostalCode !== (current?.payrollPostalCode ?? null);
    const payrollCommuneCode = placeChanged ? (payrollCity ? await lookupCommuneCode(nextPostalCode, payrollCity) : null) : current?.payrollCommuneCode ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: membership.id }, data: { functionalRole } });
      await tx.organization.update({
        where: { id: membership.organizationId },
        data: {
          conventionCollective: collectiveAgreement?.name ?? null,
          collectiveAgreementId: collectiveAgreement?.id ?? null,
          payrollCity: payrollCity || null,
          ...(hasAddressFields ? { payrollAddress: payrollAddress || null, payrollPostalCode: payrollPostalCode || null } : {}),
          ...(formData.has("payrollNafCode") ? { payrollNafCode } : {}),
        },
      });
      await tx.$executeRaw`UPDATE "organizations" SET "legalCategory" = ${legalCategory}, "companyCreationDate" = ${companyCreationDate}, "atmpRate" = ${atmpRate}, "payrollDepartment" = ${payrollDepartment || null}, "payrollCommuneCode" = ${payrollCommuneCode}, "healthPlanMonthlyAmount" = ${healthPlanMonthlyAmount}, "healthPlanEmployerRate" = ${healthPlanEmployerRate} WHERE "id" = ${membership.organizationId}`;
      if (placeChanged) {
        await tx.$executeRaw`UPDATE "organizations" SET "mobilityRate" = NULL, "mobilityRateSource" = NULL, "mobilityRateCheckedAt" = NULL, "mobilityRateDetail" = NULL WHERE "id" = ${membership.organizationId} AND ("mobilityRateSource" IS NULL OR "mobilityRateSource" <> 'MANUEL')`;
      }
      if (payrollSettings) {
        await tx.$executeRaw`UPDATE "organizations" SET "sickPayRule" = ${payrollSettings.sickPayRule === null ? null : JSON.stringify(payrollSettings.sickPayRule)}::jsonb, "workAccidentPayRule" = ${payrollSettings.workAccidentPayRule === null ? null : JSON.stringify(payrollSettings.workAccidentPayRule)}::jsonb, "payrollHeadcount" = ${payrollSettings.payrollHeadcount}, "paidLeaveMethod" = ${payrollSettings.paidLeaveMethod}, "ijssSubrogation" = ${payrollSettings.ijssSubrogation}, "workedSolidarityDay" = ${payrollSettings.workedSolidarityDay}, "mealVoucherFaceValue" = ${payrollSettings.mealVoucherFaceValue}, "mealVoucherEmployerShare" = ${payrollSettings.mealVoucherEmployerShare}, "transportEmployerShare" = ${payrollSettings.transportEmployerShare}, "prevoyanceRates" = ${payrollSettings.prevoyanceRates === null ? null : JSON.stringify(payrollSettings.prevoyanceRates)}::jsonb WHERE "id" = ${membership.organizationId}`;
        // Versement mobilité : un taux saisi s'impose ; un champ vide rend la main au barème Urssaf.
        if (payrollSettings.mobilityRate !== null) {
          await tx.$executeRaw`UPDATE "organizations" SET "mobilityRate" = ${payrollSettings.mobilityRate}, "mobilityRateSource" = 'MANUEL', "mobilityRateCheckedAt" = NULL, "mobilityRateDetail" = NULL WHERE "id" = ${membership.organizationId}`;
        } else {
          await tx.$executeRaw`UPDATE "organizations" SET "mobilityRate" = NULL, "mobilityRateSource" = NULL, "mobilityRateCheckedAt" = NULL, "mobilityRateDetail" = NULL WHERE "id" = ${membership.organizationId} AND "mobilityRateSource" = 'MANUEL'`;
        }
      }
    });

    // Taux automatique à afficher tout de suite (sans effet si un taux est saisi ou si l'Urssaf ne répond pas).
    const [mobility] = await prisma.$queryRaw<Array<{ mobilityRateSource: string | null; payrollCommuneCode: string | null }>>`SELECT "mobilityRateSource", "payrollCommuneCode" FROM "organizations" WHERE "id" = ${membership.organizationId} LIMIT 1`;
    if (mobility?.payrollCommuneCode && mobility.mobilityRateSource === null) {
      await refreshMobilityRateFromUrssaf(membership.organizationId, mobility.payrollCommuneCode, new Date().toISOString().slice(0, 10));
    }
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

export async function refreshOrganizationFromRegistry() {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  const outcome = await syncOrganizationFromRegistry(membership.organizationId, "OVERWRITE");
  const message = outcome.status === "SYNCED"
    ? [outcome.updatedFields.length > 0 ? "Informations mises à jour depuis le répertoire Sirene." : "Tout était déjà à jour avec le répertoire Sirene.", ...outcome.notes].join(" ")
    : outcome.message;
  cookies().set("rhpilot-registry-sync", encodeURIComponent(JSON.stringify({ ok: outcome.status === "SYNCED", message })), { path: "/dashboard/configuration/organisation", maxAge: 15, httpOnly: true, sameSite: "lax" });
  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/organisation");
  revalidatePath("/dashboard/payroll");
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
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent modifier les parcours.");
  }
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
