import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { employeeArchiveResponse } from "@/lib/employee-space/archive-server";

export const dynamic = "force-dynamic";

/** Tous les documents d'un salarié en ZIP, côté RH (par exemple à lui remettre avant de retirer son accès). */
export async function GET(request: Request, { params }: { params: { employeeId: string } }) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return new NextResponse("Non autorisé", { status: 401 });
  if (!isOrganizationAdmin(membership)) return new NextResponse("Accès réservé aux administrateurs", { status: 403 });
  const employee = await prisma.employee.findFirst({ where: { id: params.employeeId, organizationId: membership.organizationId }, select: { id: true, firstName: true, lastName: true } });
  if (!employee) return new NextResponse("Salarié introuvable", { status: 404 });
  const part = Number(new URL(request.url).searchParams.get("partie") ?? "1");
  if (!Number.isInteger(part) || part < 1 || part > 1000) return new NextResponse("Partie invalide", { status: 400 });
  await prisma.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "employee_space.archive.downloaded", entityType: "Employee", entityId: employee.id, metadata: { part } } });
  return employeeArchiveResponse({ organizationId: membership.organizationId, employeeId: employee.id, employeeName: `${employee.firstName} ${employee.lastName}`, part, actorKind: "EMPLOYER", actorUserId: user.id, request });
}
