import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDsnP26WorkEvent, type DsnWorkEventInput, type DsnWorkEventNature } from "./dsn-work-event";
import { decryptDsnSensitiveValue } from "./dsn-pii";
import { sealDsnWorkEventArchive } from "./dsn-work-event-archive";
import { selectWorkEventEpisode } from "./dsn-work-event-source";

type CreateInput = { organizationId: string; absenceId: string; nature: DsnWorkEventNature; actorUserId: string; requestKey: string; fileDate?: Date };
const required = (value: string | null | undefined, label: string) => {
  if (!value?.trim()) throw new Error(`DSN bloquée : ${label} est absent.`);
  return value.trim();
};

/** Le verrou porte sur l'entreprise : l'ordre des événements ne repart jamais à 1 chaque mois. */
export async function archiveWorkEventInTransaction(tx: Prisma.TransactionClient, input: CreateInput) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([input.organizationId, "dsn-work-events"])}, 0))`;
  const prior = await tx.dsn_work_events.findFirst({ where: { organizationId: input.organizationId, requestKey: input.requestKey } });
  if (prior) {
    if (prior.absenceId !== input.absenceId || prior.nature !== input.nature) throw new Error("DSN bloquée : cette requête appartient à un autre arrêt ou signalement.");
    return prior;
  }
  // Les données RH et DSN restent stables pendant la constitution du fichier.
  await tx.$queryRaw`SELECT "id" FROM "organizations" WHERE "id" = ${input.organizationId} FOR SHARE`;
  await tx.$queryRaw`SELECT "organizationId" FROM "dsn_organization_settings" WHERE "organizationId" = ${input.organizationId} FOR SHARE`;
  const organization = await tx.organization.findFirst({ where: { id: input.organizationId, deletedAt: null }, include: { dsn_organization_settings: true } });
  if (!organization) throw new Error("DSN bloquée : entreprise introuvable.");
  const settings = organization.dsn_organization_settings;
  if (!settings) throw new Error("DSN bloquée : configurez le contact DSN de l'entreprise.");
  const absence = await tx.absence.findFirst({ where: { id: input.absenceId, organizationId: input.organizationId } });
  if (!absence || absence.status !== "VALIDATED") throw new Error("DSN bloquée : le signalement exige un arrêt validé.");
  await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "organizationId" = ${input.organizationId} AND "id" = ${absence.employeeId} FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "dsn_employee_profiles" WHERE "organizationId" = ${input.organizationId} AND "employeeId" = ${absence.employeeId} FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "absences" WHERE "organizationId" = ${input.organizationId} AND "employeeId" = ${absence.employeeId} AND "status" = 'VALIDATED' FOR SHARE`;
  const employee = await tx.employee.findFirst({ where: { id: absence.employeeId, organizationId: input.organizationId, deletedAt: null }, include: { dsn_employee_profiles: true } });
  if (!employee?.dsn_employee_profiles) throw new Error("DSN bloquée : salarié ou profil déclaratif DSN introuvable.");
  const profile = employee.dsn_employee_profiles;
  if (profile.sicknessRegimeCode !== "200" || profile.oldAgeRegimeCode !== "200" || profile.workAccidentRegimeCode !== "200") throw new Error("DSN bloquée : les signalements sont actuellement limités au régime général.");
  const rows = await tx.absence.findMany({ where: { organizationId: input.organizationId, employeeId: employee.id, status: "VALIDATED", type: { in: ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"] } }, orderBy: [{ startDate: "asc" }, { id: "asc" }] });
  const episode = selectWorkEventEpisode(rows, input.absenceId);
  if (employee.contractEndDate && episode.startDate > employee.contractEndDate) throw new Error("DSN bloquée : l'arrêt débute après la fin du contrat.");
  const lastWorked = episode.lastWorkedDate;
  if (!lastWorked) throw new Error("DSN bloquée : renseignez le dernier jour travaillé de l'arrêt initial.");
  const recoveryReason = episode.returnReasonCode;
  if (recoveryReason && !["01", "02", "03"].includes(recoveryReason)) throw new Error("DSN bloquée : le motif de reprise est invalide.");
  const subrogation = input.nature === "04" && organization.ijssSubrogation;
  if (input.nature === "04" && !subrogation && (episode.subrogationStartDate || episode.subrogationEndDate)) throw new Error("DSN bloquée : vérifiez la subrogation de l'entreprise et les dates de l'arrêt.");
  const latestOrder = await tx.dsn_work_events.aggregate({ where: { organizationId: input.organizationId }, _max: { declarationOrder: true } });
  const declarationOrder = (latestOrder._max.declarationOrder ?? BigInt(0)) + BigInt(1);
  const latestVersion = await tx.dsn_work_events.findFirst({ where: { organizationId: input.organizationId, absenceId: input.absenceId, nature: input.nature }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (latestVersion?.version ?? 0) + 1;
  const id = randomUUID();
  const businessId = id.replace(/-/g, "").slice(0, 15).toUpperCase();
  const event: DsnWorkEventInput = {
    nature: input.nature, testMode: true, declarationOrder: Number(declarationOrder), businessId, fileDate: input.fileDate ?? new Date(),
    emitter: { siret: required(organization.siret, "le SIRET"), name: organization.name,
      address: required(organization.payrollAddress, "l'adresse employeur"), postalCode: required(organization.payrollPostalCode, "le code postal employeur"), city: required(organization.payrollCity, "la ville employeur"),
      contactName: settings.contactName, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone, declaredContactType: required(settings.declaredContactType, "le type de contact DSN") },
    employee: { nir: decryptDsnSensitiveValue(profile.nirCiphertext), lastName: employee.lastName, firstName: employee.firstName, birthDate: profile.birthDate,
      contractStartDate: employee.hireDate, contractNumber: profile.contractNumber, workLocationId: profile.workLocationId ?? required(organization.siret, "le SIRET") },
    stoppage: { startDate: episode.startDate, reasonCode: ({ SICK_LEAVE: "01", MATERNITY: "02", PATERNITY: "03", WORK_ACCIDENT: "06" } as const)[episode.type as "SICK_LEAVE" | "MATERNITY" | "PATERNITY" | "WORK_ACCIDENT"],
      lastDayWorked: lastWorked, expectedEndDate: episode.endDate, subrogationCode: subrogation ? "01" : "02",
      ...(subrogation ? { subrogationStartDate: episode.subrogationStartDate ?? undefined, subrogationEndDate: episode.subrogationEndDate ?? undefined,
        subrogationIban: decryptDsnSensitiveValue(required(settings.subrogationIbanCiphertext, "le compte de réception IJSS")), subrogationBic: required(settings.subrogationBic, "le BIC de réception IJSS") } : {}),
      ...(episode.workAccidentDate ? { accidentDate: episode.workAccidentDate } : {}),
      ...(episode.returnDate ? { recoveryDate: episode.returnDate } : {}), ...(recoveryReason ? { recoveryReasonCode: recoveryReason as "01" | "02" | "03" } : {}),
    },
  };
  const content = buildDsnP26WorkEvent(event);
  const { declarationOrder: _order, businessId: _business, fileDate: _fileDate, ...source } = event;
  const sourceDigest = createHash("sha256").update(JSON.stringify({ source, sourceIds: episode.sourceIds })).digest("hex");
  const sealed = sealDsnWorkEventArchive({ id, organizationId: input.organizationId, employeeId: employee.id, absenceId: input.absenceId, nature: input.nature, declarationOrder, version, sourceDigest }, content);
  const warnings = ["Pré-contrôle uniquement : aucun signalement n'a été transmis aux organismes.", "Validez ce fichier avec Dsn-Val et contrôlez les retours métier avant toute utilisation déclarative."];
  if (input.nature === "04" && version > 1) warnings.push("Cette version de test ne constitue pas un annule-et-remplace d'un dépôt réel. Une correction d'un dépôt accepté exige son identifiant officiel.");
  if (episode.sourceIds.length > 1) warnings.push("Prescription et prolongations regroupées avec le DJT initial ; une prolongation seule ne nécessite pas systématiquement un nouveau signalement.");
  if (episode.type === "WORK_ACCIDENT") warnings.push("La déclaration d'accident du travail (DAT) reste une démarche distincte du signalement DSN.");
  const archive = await tx.dsn_work_events.create({ data: { ...sealed, businessId, requestKey: input.requestKey, normVersion: "P26V01", mode: "PRECONTROL", fileName: `dsn-P26V01-${input.nature === "04" ? "arret" : "reprise"}-${businessId}-v${version}-precontrole.txt`, warnings, createdByUserId: input.actorUserId } });
  await tx.auditLog.create({ data: { id: randomUUID(), organizationId: input.organizationId, actorUserId: input.actorUserId, action: "dsn.work_event.precontrol.archived", entityType: "DsnWorkEvent", entityId: id,
    metadata: { absenceId: input.absenceId, sourceAbsenceIds: episode.sourceIds, nature: input.nature, declarationOrder: declarationOrder.toString(), version, sha256: archive.sha256, sourceDigest } } });
  return archive;
}

export async function createDsnWorkEventArchive(input: CreateInput) {
  return prisma.$transaction((tx) => archiveWorkEventInTransaction(tx, input), { maxWait: 5000, timeout: 15000 });
}
