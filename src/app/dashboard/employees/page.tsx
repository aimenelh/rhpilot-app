import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveRestore } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Mascot } from "@/components/Mascot";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate } from "@/lib/format";
import { reactivateEmployee } from "./actions";
import { generateDemoOrganization, archiveAllEmployees } from "./demoActions";
import { DemoOrgSubmitButton } from "./DemoOrgSubmitButton";
import { ArchiveAllButton } from "@/components/employees/ArchiveAllButton";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const status = searchParams.status === "archived" ? "archived" : "active";
  const query = searchParams.q?.trim() ?? "";

  const employees = await prisma.employee.findMany({
    where: {
      organizationId: membership.organizationId,
      deletedAt: status === "archived" ? { not: null } : null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      managerMembership: { include: { user: true } },
    },
    orderBy: status === "archived" ? { deletedAt: "desc" } : { lastName: "asc" },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Salariés</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {employees.length === 0
              ? query
                ? "Aucun salarié ne correspond à cette recherche."
                : status === "archived"
                  ? "Aucun salarié archivé."
                  : "Aucun salarié enregistré pour l'instant."
              : `${employees.length} salarié${employees.length > 1 ? "s" : ""}${
                  status === "archived" ? " archivé" + (employees.length > 1 ? "s" : "") : ""
                }.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "active" && employees.length > 0 && !query && (
            <ArchiveAllButton action={archiveAllEmployees} count={employees.length} />
          )}
          <Link href="/dashboard/employees/new">
            <Button data-tour="add-employee">Ajouter un salarié</Button>
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-surface-subtle p-1 text-xs font-medium w-fit">
          <Link
            href={`/dashboard/employees?status=active${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={`rounded-md px-3 py-1.5 ${status === "active" ? "bg-white text-ink shadow-sm" : "text-ink-faint"}`}
          >
            Actifs
          </Link>
          <Link
            href={`/dashboard/employees?status=archived${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={`rounded-md px-3 py-1.5 ${status === "archived" ? "bg-white text-ink shadow-sm" : "text-ink-faint"}`}
          >
            Archivés
          </Link>
        </div>

        <form method="get" className="max-w-xs flex-1">
          <input type="hidden" name="status" value={status} />
          <Input type="search" name="q" defaultValue={query} placeholder="Rechercher un nom..." />
        </form>
      </div>

      <div className="mt-6">
        {employees.length === 0 ? (
          query ? null : status === "archived" ? (
            <EmptyState
              title="Aucun salarié archivé"
              description="Les salariés archivés depuis leur fiche apparaîtront ici, rien n'est jamais supprimé définitivement."
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Mascot pose="hire" className="h-32 w-auto" />
              <EmptyState
                title="Aucun salarié pour l'instant"
                description="Les salariés que vous ajoutez apparaîtront ici. Chaque fiche pourra ensuite déclencher automatiquement des plans d'action (embauche, fin de période d'essai...)."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link href="/dashboard/employees/new">
                      <Button data-tour="add-employee">Ajouter mon premier salarié</Button>
                    </Link>
                    <Link href="/dashboard/employees/import">
                      <Button variant="secondary">Importer depuis un fichier CSV</Button>
                    </Link>
                    <form action={generateDemoOrganization}>
                      <DemoOrgSubmitButton />
                    </form>
                  </div>
                }
              />
            </div>
          )
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border bg-surface-subtle text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-5 py-3 font-medium">Nom</th>
                  <th className="px-5 py-3 font-medium">Poste</th>
                  <th className="px-5 py-3 font-medium">
                    {status === "archived" ? "Archivé le" : "Date d'embauche"}
                  </th>
                  <th className="px-5 py-3 font-medium">Manager direct</th>
                  {status === "archived" && <th className="px-5 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-surface-subtle">
                    <td className="px-5 py-3">
                      {status === "archived" ? (
                        <span className="font-medium text-ink-soft">
                          {employee.firstName} {employee.lastName}
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/employees/${employee.id}`}
                          className="font-medium text-ink hover:text-brand-blue"
                        >
                          {employee.firstName} {employee.lastName}
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {employee.position || "—"}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {formatDate(status === "archived" ? employee.deletedAt! : employee.hireDate)}
                    </td>
                    <td className="px-5 py-3">
                      {employee.managerMembership ? (
                        <div className="leading-tight">
                          <p className="text-ink">
                            {getUserDisplayName(employee.managerMembership.user)}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {employee.managerMembership.user.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-ink-faint">Non défini</span>
                      )}
                    </td>
                    {status === "archived" && (
                      <td className="px-5 py-3 text-right">
                        <form action={reactivateEmployee.bind(null, employee.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline"
                          >
                            <ArchiveRestore size={13} />
                            Réactiver
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
