import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

// Export de l'ensemble des données de l'organisation (droit à la portabilité,
// RGPD art. 20) : salariés, parcours, absences, équipe, configuration, paie,
// documents, espace salarié et DSN. Sont exclus uniquement les secrets
// (jetons d'invitation, empreintes) et le contenu des fichiers, remplacés par
// leurs métadonnées ; le NIR reste chiffré et n'est pas exporté.

// Tables propres à l'organisation (colonne "organizationId"), exportées telles qu'en base.
const ORGANIZATION_TABLES = [
  "payroll_profiles", "payroll_periods", "payroll_variables", "payroll_calculations", "payroll_contributions", "payslips",
  "payroll_terminations", "payroll_entry_reviews", "payroll_ledger_entries",
  "employee_documents", "employee_document_events", "employee_accounts",
  "employee_alternance_profiles", "employee_withholding_tax_profiles", "employee_paid_leave_openings", "employee_payroll_openings",
  "dsn_organization_settings", "dsn_employee_profiles",
] as const;
// Colonnes jamais exportées : contenu des fichiers (volumineux, téléchargeable depuis l'app) et secrets.
const EXCLUDED_COLUMNS = new Set(["storageKey", "nirCiphertext", "inviteTokenHash", "token", "tokenHash", "passwordHash"]);

async function exportTable(table: (typeof ORGANIZATION_TABLES)[number], organizationId: string): Promise<unknown[]> {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ${table} ORDER BY ordinal_position
  `;
  const names = columns.map((column) => column.column_name);
  if (!names.includes("organizationId")) return [];
  const selected = names.filter((name) => !EXCLUDED_COLUMNS.has(name)).map((name) => `"${name.replace(/"/g, "")}"`).join(", ");
  // Nom de table issu de la liste ci-dessus et colonnes lues dans le catalogue : seule la valeur est paramétrée.
  return prisma.$queryRawUnsafe(`SELECT ${selected} FROM "${table}" WHERE "organizationId" = $1`, organizationId);
}
export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    return NextResponse.json(
      { error: "Seuls les propriétaires et administrateurs peuvent exporter l'organisation." },
      { status: 403 }
    );
  }

  const organizationId = membership.organizationId;

  // Séquentiel volontairement : l'export est ponctuel et potentiellement
  // volumineux. Éviter une rafale de requêtes protège le petit pool de
  // connexions PostgreSQL observé en production.
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      siret: true,
      conventionCollective: true,
      collectiveAgreementId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const employees = await prisma.employee.findMany({
    where: { organizationId },
    include: {
      managerMembership: {
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const employeeEvents = await prisma.employeeEvent.findMany({
    where: { organizationId },
    include: {
      eventTemplate: { select: { key: true, label: true } },
      employee: { select: { id: true, firstName: true, lastName: true } },
      tasks: {
        include: {
          assignedMembership: {
            include: { user: { select: { email: true, firstName: true, lastName: true } } },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              uploadedByMembershipId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const absences = await prisma.absence.findMany({
    where: { organizationId },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      validatedBy: { select: { email: true, firstName: true, lastName: true } },
      justifications: {
        select: {
          id: true,
          status: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          uploadedByUserId: true,
          reviewedByUserId: true,
          reviewedAt: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const reminderRules = await prisma.reminderRule.findMany({
    where: { organizationId },
    orderBy: { daysBeforeDue: "desc" },
  });

  const taskTemplateOverrides = await prisma.taskTemplateOverride.findMany({
    where: { organizationId },
    include: { taskTemplate: { select: { key: true, label: true } } },
    orderBy: { createdAt: "asc" },
  });

  const invitations = await prisma.invitation.findMany({
    where: { organizationId },
    select: {
      id: true,
      email: true,
      accessRole: true,
      createdByUserId: true,
      createdAt: true,
      expiresAt: true,
      acceptedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const anomalyDismissals = await prisma.anomalyDismissal.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  const notifications = await prisma.notification.findMany({
    where: { organizationId },
    orderBy: { sentAt: "asc" },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  const [organizationSettings] = await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "organizations" WHERE "id" = ${organizationId}`;
  const payrollAndDocuments: Record<string, unknown[]> = {};
  for (const table of ORGANIZATION_TABLES) payrollAndDocuments[table] = await exportTable(table, organizationId);

  const exportPayload = {
    scope: "ORGANIZATION_FULL",
    exportedAt: new Date().toISOString(),
    organization,
    memberships,
    employees,
    employeeEvents,
    absences,
    reminderRules,
    taskTemplateOverrides,
    invitations,
    anomalyDismissals,
    notifications,
    auditLogs,
    organizationSettings: organizationSettings ?? null,
    ...payrollAndDocuments,
  };

  // BigInt et Decimal issus des requêtes brutes : sérialisés en texte.
  const json = JSON.stringify(exportPayload, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rhpilot-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
