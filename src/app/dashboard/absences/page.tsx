import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AbsencesWorkspace, { type AbsenceWorkspaceItem } from "./AbsencesWorkspace";

export const dynamic = "force-dynamic";

function isAdmin(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export default async function AbsencesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const [employees, absences] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, position: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.absence.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        employee: { select: { firstName: true, lastName: true, position: true } },
        justifications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  const normalized: AbsenceWorkspaceItem[] = absences.map((absence) => {
    const justification = absence.justifications[0] ?? null;
    return {
      id: absence.id,
      employeeId: absence.employeeId,
      employeeName: `${absence.employee.firstName} ${absence.employee.lastName}`.trim(),
      employeePosition: absence.employee.position,
      type: absence.type,
      startDate: absence.startDate.toISOString(),
      endDate: absence.endDate.toISOString(),
      status: absence.status,
      justificationRequired: absence.justificationRequired,
      notes: absence.notes,
      rejectedReason: absence.rejectedReason,
      payrollImpactStatus: absence.payrollImpactStatus,
      justification: justification
        ? {
            id: justification.id,
            status: justification.status,
            fileName: justification.fileName,
            mimeType: justification.mimeType,
            sizeBytes: justification.sizeBytes,
            storageKey: justification.storageKey,
            rejectionReason: justification.rejectionReason,
          }
        : null,
    };
  });

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCHours(23, 59, 59, 999);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const initialStats = {
    today: absences.filter((absence) => absence.status !== "REJECTED" && absence.startDate <= todayEnd && absence.endDate >= todayStart).length,
    pending: absences.filter((absence) => !["VALIDATED", "REJECTED"].includes(absence.status)).length,
    justificationAttention: absences.filter((absence) => {
      if (!absence.justificationRequired) return false;
      const latest = absence.justifications[0];
      return !latest || latest.status !== "VALIDATED";
    }).length,
    validatedThisMonth: absences.filter((absence) => absence.status === "VALIDATED" && absence.startDate <= monthEnd && absence.endDate >= monthStart).length,
  };

  return (
    <div className="max-w-none">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Gestion RH</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Absences</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">
            Planifiez les absences de l'équipe, traitez les demandes et suivez les justificatifs depuis un espace unique.
          </p>
        </div>
        <p className="text-xs text-ink-faint">{employees.length} salarié{employees.length > 1 ? "s" : ""} actif{employees.length > 1 ? "s" : ""} · {absences.length} absence{absences.length > 1 ? "s" : ""} enregistrée{absences.length > 1 ? "s" : ""}</p>
      </div>

      <AbsencesWorkspace
        employees={employees}
        absences={normalized}
        isAdmin={isAdmin(membership.accessRole)}
        initialStats={initialStats}
      />
    </div>
  );
}
