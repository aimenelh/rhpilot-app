import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

const RESULTS_LIMIT = 6;

export async function GET(request: Request) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ employees: [], tasks: [] });
  }

  // Toujours bornée à organizationId : jamais un résultat d'une autre
  // organisation, quelle que soit la requête tapée.
  const [employees, tasks] = await Promise.all([
    prisma.employee.findMany({
      where: {
        organizationId: membership.organizationId,
        deletedAt: null,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, position: true },
      take: RESULTS_LIMIT,
      orderBy: { lastName: "asc" },
    }),
    prisma.task.findMany({
      where: {
        organizationId: membership.organizationId,
        label: { contains: query, mode: "insensitive" },
        employeeEvent: { employee: { deletedAt: null } },
      },
      select: {
        id: true,
        label: true,
        employeeEventId: true,
        employeeEvent: { select: { employee: { select: { firstName: true, lastName: true } } } },
      },
      take: RESULTS_LIMIT,
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}`,
      meta: e.position ?? "Salarié",
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      label: t.label,
      meta: `${t.employeeEvent.employee.firstName} ${t.employeeEvent.employee.lastName}`,
      employeeEventId: t.employeeEventId,
    })),
  });
}
