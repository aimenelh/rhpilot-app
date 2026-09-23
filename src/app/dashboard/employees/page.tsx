import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveRestore, Plus, Upload } from "lucide-react";
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
import { FlashToast } from "@/components/ui/FlashToast";

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
  const canManageBulkData = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";

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
    include: { managerMembership: { include: { user: true } } },
    orderBy: status === "archived" ? { deletedAt: "desc" } : { lastName: "asc" },
  });

  return (
    <div className="max-w-6xl">
      <FlashToast />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink">Salariés</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {employees.length === 0
              ? query
                ? "Aucun salarié ne correspond à cette recherche."
                : status === "archived"
                  ? "Aucun salarié archivé."
                  : "Aucun salarié enregistré pour l'instant."
              : `${employees.length} salarié${employees.length > 1 ? "s" : ""} ${
                  status === "archived"
                    ? `archivé${employees.length > 1 ? "s" : ""}`
                    : `actif${employees.length > 1 ? "s" : ""}`
                }.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {canManageBulkData && status === "active" && employees.length > 0 && !query && (
            <ArchiveAllButton action={archiveAllEmployees} count={employees.length} />
          )}
          {canManageBulkData && (
            <Link href="/dashboard/employees/import">
              <Button variant="secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Upload size={14} /> Importer
                </span>
              </Button>
            </Link>
          )}
          <Link href="/dashboard/employees/new">
            <Button data-tour="add-employee">
              <span className="inline-flex items-center gap-1.5">
                <Plus size={15} /> Ajouter un salarié
              </span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-surface-border bg-white p-2 sm:flex-row sm:items-center">
        <div className="flex w-fit gap-1 rounded-lg bg-surface-subtle p-1 text-xs font-medium">
          <Link
            href={`/dashboard/employees?status=active${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            aria-current={status === "active" ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${status === "active" ? "bg-white text-ink shadow-sm" : "text-ink-faint"}`}
          >
            Actifs
          </Link>
          <Link
            href={`/dashboard/employees?status=archived${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            aria-current={status === "archived" ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${status === "archived" ? "bg-white text-ink shadow-sm" : "text-ink-faint"}`}
          >
            Archivés
          </Link>
        </div>

        <form method="get" className="min-w-0 flex-1 sm:max-w-sm">
          <input type="hidden" name="status" value={status} />
          <Input
            type="search"
            name="q"
            aria-label="Rechercher un salarié"
            defaultValue={query}
            placeholder="Rechercher un nom..."
          />
        </form>
      </div>

      <div className="mt-6">
        {employees.length === 0 ? (
          query ? (
            <Card className="text-center">
              <p className="text-sm font-medium text-ink">Aucun résultat</p>
              <p className="mt-1 text-sm text-ink-soft">Essayez un autre nom ou effacez la recherche.</p>
            </Card>
          ) : status === "archived" ? (
            <EmptyState
              title="Aucun salarié archivé"
              description="Les salariés archivés depuis leur fiche apparaîtront ici, rien n'est supprimé définitivement."
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Mascot pose="hire" className="h-32 w-auto" />
              <EmptyState
                title="Aucun salarié pour l'instant"
                description="Les salariés que vous ajoutez apparaîtront ici. Chaque fiche pourra ensuite déclencher des parcours RH et leurs échéances."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link href="/dashboard/employees/new">
                      <Button data-tour="add-employee">Ajouter mon premier salarié</Button>
                    </Link>
                    {canManageBulkData && (
                      <>
                        <Link href="/dashboard/employees/import">
                          <Button variant="secondary">Importer depuis un fichier CSV</Button>
                        </Link>
                        <form action={generateDemoOrganization}>
                          <DemoOrgSubmitButton />
                        </form>
                      </>
                    )}
                  </div>
                }
              />
            </div>
          )
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto" tabIndex={0} aria-label="Liste des salariés, défilement horizontal possible">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-surface-border bg-surface-subtle text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Nom</th>
                    <th className="px-5 py-3.5 font-medium">Poste</th>
                    <th className="px-5 py-3.5 font-medium">
                      {status === "archived" ? "Archivé le" : "Date d'embauche"}
                    </th>
                    <th className="px-5 py-3.5 font-medium">Manager direct</th>
                    {status === "archived" && <th className="px-5 py-3.5 font-medium" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-5 py-4">
                        {status === "archived" ? (
                          <span className="font-medium text-ink-soft">
                            {employee.firstName} {employee.lastName}
                          </span>
                        ) : (
                          <Link
                            href={`/dashboard/employees/${employee.id}`}
                            className="font-medium text-ink hover:text-brand-primary"
                          >
                            {employee.firstName} {employee.lastName}
                          </Link>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">{employee.position || "—"}</td>
                      <td className="px-5 py-4 text-ink-soft">
                        {formatDate(status === "archived" ? employee.deletedAt! : employee.hireDate)}
                      </td>
                      <td className="px-5 py-4">
                        {employee.managerMembership ? (
                          <div className="leading-tight">
                            <p className="text-ink">{getUserDisplayName(employee.managerMembership.user)}</p>
                            <p className="text-xs text-ink-faint">{employee.managerMembership.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-ink-faint">Non défini</span>
                        )}
                      </td>
                      {status === "archived" && (
                        <td className="px-5 py-4 text-right">
                          <form action={reactivateEmployee.bind(null, employee.id)}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline"
                            >
                              <ArchiveRestore size={13} /> Réactiver
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
