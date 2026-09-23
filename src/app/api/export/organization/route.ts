import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

// Export opérationnel RH hors paie. Il contient les données suivies dans
// les modules salariés, parcours, absences, notifications, équipe et
// configuration. Les données du chantier paie restent volontairement
// hors de cette route tant que ce module n'est pas finalisé.
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
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });

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

  const exportPayload = {
    scope: "RH_OPERATIONAL_EXCLUDING_PAYROLL",
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
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rhpilot-donnees-rh-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
