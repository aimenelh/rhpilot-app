import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildComplianceSnapshot } from "@/lib/compliance/obligations";
import ObligationsWorkspace from "./ObligationsWorkspace";

export const dynamic = "force-dynamic";

export default async function ObligationsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const employees = await prisma.employee.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, hireDate: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const snapshot = buildComplianceSnapshot({
    organizationId: membership.organizationId,
    employees,
  });

  return (
    <div className="max-w-none">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Conformité RH</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Obligations RH</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">
            Les obligations applicables à l'entreprise, leurs échéances et les informations nécessaires pour les suivre sans transformer une donnée manquante en certitude.
          </p>
        </div>
        <p className="text-xs text-ink-faint">
          {employees.length} salarié{employees.length > 1 ? "s" : ""} actif{employees.length > 1 ? "s" : ""} · {snapshot.rules.length} règles suivies
        </p>
      </div>

      <ObligationsWorkspace snapshot={snapshot} />
    </div>
  );
}
