import Link from "next/link";
import { redirect } from "next/navigation";
import { TriangleAlert, Clock, CircleCheck, FileWarning } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Input } from "@/components/ui/Field";
import { Mascot } from "@/components/Mascot";
import { formatDate } from "@/lib/format";
import { getEventTemplateDotColor } from "@/lib/eventTemplateStyle";
import { summarizeParcours } from "@/lib/parcoursSummary";
import { isProbationHistoricalAtEntry } from "@/lib/probationTracking";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const query = searchParams.q?.trim() ?? "";

  const fetchedEvents = await prisma.employeeEvent.findMany({
    where: {
      organizationId: membership.organizationId,
      employee: { deletedAt: null },
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { employee: { firstName: { contains: query, mode: "insensitive" } } },
              { employee: { lastName: { contains: query, mode: "insensitive" } } },
              { eventTemplate: { label: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      employee: true,
      eventTemplate: true,
      tasks: {
        include: { attachments: { select: { id: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const events = fetchedEvents.filter(
    (event) =>
      !(
        event.eventTemplate.key === "fin_periode_essai" &&
        isProbationHistoricalAtEntry(event.employee)
      )
  );

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Parcours RH actifs</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Suivez les étapes, les responsables, les échéances et les pièces attendues de chaque parcours.
          </p>
        </div>
        <Link href="/dashboard/events/bulk-trigger" className="shrink-0">
          <Button variant="secondary" className="text-sm">
            Déclencher en masse
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          {events.length === 0
            ? query
              ? "Aucun parcours ne correspond à cette recherche."
              : "Aucun parcours déclenché pour l'instant."
            : `${events.length} parcours en cours de suivi.`}
        </p>
        <form method="get" className="w-full sm:max-w-sm">
          <Input
            type="search"
            name="q"
            aria-label="Rechercher un parcours"
            defaultValue={query}
            placeholder="Rechercher un salarié ou un parcours..."
          />
        </form>
      </div>

      <div className="mt-6">
        {events.length === 0 ? (
          query ? (
            <Card className="text-center">
              <p className="text-sm font-medium text-ink">Aucun résultat</p>
              <p className="mt-1 text-sm text-ink-soft">Essayez un autre nom ou type de parcours.</p>
            </Card>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Mascot pose="createJourney" className="h-32 w-auto" />
              <EmptyState
                title="Aucun parcours RH pour l'instant"
                description="Déclenchez un événement depuis la fiche d'un salarié pour générer son plan d'action."
                action={
                  <Link href="/dashboard/employees">
                    <Button>Voir les salariés →</Button>
                  </Link>
                }
              />
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => {
              const doneCount = event.tasks.filter((task) => task.status === "DONE").length;
              const missingProofCount = event.tasks.filter(
                (task) =>
                  task.status !== "CANCELLED" &&
                  task.proofRequired &&
                  task.attachments.length === 0
              ).length;
              const summary = summarizeParcours(event.tasks);
              const allActionsDone = event.tasks.length > 0 && doneCount === event.tasks.length;

              return (
                <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                  <Card interactive>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getEventTemplateDotColor(event.eventTemplate.key)}`}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink">
                              {event.employee.firstName} {event.employee.lastName}
                            </p>
                            <Badge tone="neutral">{event.eventTemplate.label}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Déclenché le {formatDate(event.triggerDate)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            {summary.overdueCount > 0 ? (
                              <span className="flex items-center gap-1 font-medium text-accent-rose">
                                <TriangleAlert size={12} />
                                {summary.overdueCount} tâche{summary.overdueCount > 1 ? "s" : ""} en retard
                              </span>
                            ) : allActionsDone && missingProofCount > 0 ? (
                              <span className="flex items-center gap-1 font-medium text-accent-amber">
                                <FileWarning size={12} />
                                Actions terminées · {missingProofCount} justificatif
                                {missingProofCount > 1 ? "s" : ""} manquant
                                {missingProofCount > 1 ? "s" : ""}
                              </span>
                            ) : summary.isUpToDate && allActionsDone ? (
                              <span className="flex items-center gap-1 text-accent-teal">
                                <CircleCheck size={12} />
                                Actions terminées
                              </span>
                            ) : summary.nextDueLabel ? (
                              <span className="flex items-center gap-1 text-ink-faint">
                                <Clock size={12} />
                                Prochaine échéance : {summary.nextDueLabel.toLowerCase()}
                              </span>
                            ) : null}
                            <span className="text-ink-faint">· {summary.lastActivityLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full shrink-0 sm:w-36">
                        <ProgressBar value={doneCount} max={event.tasks.length} />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
