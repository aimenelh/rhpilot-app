import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

// Export complet, au sens du droit à la portabilité RGPD : toutes les
// données rattachées à l'organisation, dans un format structuré et
// réutilisable. Volontairement exhaustif plutôt que partiel — un
// export RGPD incomplet n'a pas de valeur.
export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const organizationId = membership.organizationId;

  const [organization, memberships, employees, employeeEvents, notifications, auditLogs] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.membership.findMany({
        where: { organizationId },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.employee.findMany({
        where: { organizationId },
        include: { managerMembership: { include: { user: { select: { email: true } } } } },
      }),
      prisma.employeeEvent.findMany({
        where: { organizationId },
        include: {
          eventTemplate: { select: { key: true, label: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
          tasks: {
            include: { assignedMembership: { include: { user: { select: { email: true } } } } },
          },
        },
      }),
      prisma.notification.findMany({ where: { organizationId } }),
      prisma.auditLog.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } }),
    ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    organization,
    memberships,
    employees,
    employeeEvents,
    notifications,
    auditLogs,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rhpilot-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
