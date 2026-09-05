import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateEmployee, archiveEmployee } from "../actions";
import { triggerEvent } from "../../events/actions";
import { EmployeeForm } from "../EmployeeForm";
import { ConfirmArchiveButton } from "../ConfirmArchiveButton";
import { TriggerEventForm } from "../../events/TriggerEventForm";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Mascot } from "@/components/Mascot";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate, addDuration, formatDuration } from "@/lib/format";
import { isOverdue, daysUntil } from "@/lib/urgency";
import { TriangleAlert, Hourglass } from "lucide-react";
import { getEventTemplateDotColor } from "@/lib/eventTemplateStyle";
import { summarizeParcours } from "@/lib/parcoursSummary";
import { CcnHint } from "@/components/CcnHint";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { welcome?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  // Filtre explicite par organizationId : ne jamais se fier uniquement
  // à l'id reçu dans l'URL, même si le schéma protège déjà les
  // écritures croisées entre organisations (point 6 — voir aussi
  // actions.ts qui applique la même règle sur les mutations).
  const employee = await prisma.employee.findFirst({
    where: {
      id: params.id,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
  });

  if (!employee) notFound();

  const [memberships, eventTemplates, employeeEvents, organization] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.eventTemplate.findMany({
      where: { archivedAt: null },
      orderBy: { label: "asc" },
    }),
    prisma.employeeEvent.findMany({
      where: { employeeId: employee.id, organizationId: membership.organizationId, deletedAt: null },
      include: { eventTemplate: true, tasks: true },
      orderBy: { triggerDate: "desc" },
    }),
    prisma.organization.findUnique({ where: { id: membership.organizationId } }),
  ]);

  const potentialManagers = memberships.map((m) => ({
    id: m.id,
    label: `${getUserDisplayName(m.user)} (${m.user.email})`,
  }));

  const updateEmployeeWithId = updateEmployee.bind(null, employee.id);
  const archiveEmployeeWithId = archiveEmployee.bind(null, employee.id);
  const triggerEventForEmployee = triggerEvent.bind(null, employee.id);

  const medicalVisitOverdue =
    employee.nextMedicalVisitDate && isOverdue(employee.nextMedicalVisitDate, "TODO");

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/employees" className="text-sm text-ink-soft hover:text-ink">
        ← Retour aux salariés
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-ink">
        {employee.firstName} {employee.lastName}
      </h1>

      {/* Bannière d'accueil juste après création — suppose que la
          redirection de création pointe vers cette page avec
          ?welcome=1 dans l'URL. À vérifier/ajuster dans le fichier de
          création du salarié (actions.ts du dossier employees/new, ou
          équivalent) si le paramètre porte un autre nom. */}
      {searchParams.welcome === "1" && (
        <Card className="mt-4 flex flex-col items-center gap-4 border-accent-teal/25 bg-accent-teal/5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-semibold text-ink">
              Bienvenue à {employee.firstName} !
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              La fiche a bien été créée. Vous pouvez déclencher son premier parcours RH
              ci-dessous.
            </p>
          </div>
          <Mascot pose="newhireHandshake" className="h-28 w-auto shrink-0" />
        </Card>
      )}

      {organization?.conventionCollective && (
        <div className="mt-4">
          <CcnHint conventionCollective={organization.conventionCollective} context="fiche_salarie" />
        </div>
      )}

      <div className="mt-6">
        <TriggerEventForm
          action={triggerEventForEmployee}
          eventTemplates={eventTemplates.map((t) => ({ key: t.key, label: t.label }))}
          employee={{
            hireDate: employee.hireDate.toISOString(),
            probationDuration: employee.probationDuration,
            probationDurationUnit: employee.probationDurationUnit,
          }}
          conventionCollective={organization?.conventionCollective}
        />
      </div>

      {employeeEvents.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink">Parcours RH de {employee.firstName}</h2>
          {employeeEvents.map((event) => {
            const doneCount = event.tasks.filter((task) => task.status === "DONE").length;
            const summary = summarizeParcours(event.tasks);
            return (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card className="transition-colors hover:border-brand-primary/40">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${getEventTemplateDotColor(event.eventTemplate.key)}`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {event.eventTemplate.label}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          Déclenché le {formatDate(event.triggerDate)}
                        </p>
                        {summary.overdueCount > 0 && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent-rose">
                            <TriangleAlert size={12} />
                            {summary.overdueCount} tâche{summary.overdueCount > 1 ? "s" : ""} en
                            retard
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <ProgressBar value={doneCount} max={event.tasks.length} />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Carte agrandie avec la mascotte "medical" — remplace l'ancien
          bandeau compact à icône circulaire. */}
      {employee.nextMedicalVisitDate && (
        <Card
          className={`mt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left ${
            medicalVisitOverdue
              ? "border-accent-rose/30 bg-accent-rose/5"
              : "border-brand-primary/20 bg-brand-primary/5"
          }`}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Suivi médical
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              Prochaine visite : {formatDate(employee.nextMedicalVisitDate)}
              {medicalVisitOverdue && (
                <span className="ml-2 font-normal text-accent-rose">
                  (dépassée de {Math.abs(daysUntil(employee.nextMedicalVisitDate))} jours)
                </span>
              )}
            </p>
          </div>
          <Mascot pose="medical" className="h-24 w-auto shrink-0" />
        </Card>
      )}

      {/* Carte "Période d'essai" laissée telle quelle : aucune pose de
          mascotte dédiée n'existe encore pour ce thème. */}
      {employee.probationDuration && employee.probationDurationUnit && (
        (() => {
          const probationEndDate = addDuration(
            employee.hireDate,
            employee.probationDuration,
            employee.probationDurationUnit
          );
          const overdue = isOverdue(probationEndDate, "TODO");
          return (
            <Card
              className={`mt-4 flex items-center gap-3 ${
                overdue ? "border-accent-rose/30 bg-accent-rose/5" : "border-brand-primary/20 bg-brand-primary/5"
              }`}
              compact
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  overdue ? "bg-accent-rose/10 text-accent-rose" : "bg-brand-primary/10 text-brand-primary"
                }`}
              >
                <Hourglass size={16} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Période d&apos;essai
                </p>
                <p className="text-sm font-semibold text-ink">
                  {formatDuration(employee.probationDuration, employee.probationDurationUnit)},
                  fin prévue le {formatDate(probationEndDate)}
                  {overdue && (
                    <span className="ml-2 font-normal text-accent-rose">
                      (dépassée de {Math.abs(daysUntil(probationEndDate))} jours)
                    </span>
                  )}
                </p>
              </div>
            </Card>
          );
        })()
      )}

      <div className="mt-8 max-w-xl">
        <h2 className="text-sm font-semibold text-ink">Informations du salarié</h2>
        <div className="mt-3">
          <EmployeeForm
            action={updateEmployeeWithId}
            submitLabel="Enregistrer les modifications"
            potentialManagers={potentialManagers}
            defaultValues={{
              firstName: employee.firstName,
              lastName: employee.lastName,
              civility: employee.civility ?? "",
              professionalCategory: employee.professionalCategory ?? "",
              position: employee.position ?? "",
              hireDate: employee.hireDate.toISOString().slice(0, 10),
              contractType: employee.contractType ?? "",
              contractEndDate: employee.contractEndDate
                ? employee.contractEndDate.toISOString().slice(0, 10)
                : "",
              probationDuration: employee.probationDuration?.toString() ?? "",
              probationDurationUnit: employee.probationDurationUnit ?? "",
              nextMedicalVisitDate: employee.nextMedicalVisitDate
                ? employee.nextMedicalVisitDate.toISOString().slice(0, 10)
                : "",
              managerMembershipId: employee.managerMembershipId ?? "",
            }}
          />
        </div>

        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Archiver ce salarié</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Le salarié disparaît des listes actives mais reste conservé pour
                l&apos;historique, rien n&apos;est supprimé définitivement.
              </p>
            </div>
            <ConfirmArchiveButton
              action={archiveEmployeeWithId}
              employeeName={`${employee.firstName} ${employee.lastName}`}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
