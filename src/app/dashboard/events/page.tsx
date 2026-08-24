import Link from "next/link";
import { redirect } from "next/navigation";
import { TriangleAlert, Clock, CircleCheck } from "lucide-react";
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

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const query = searchParams.q?.trim() ?? "";

  const events = await prisma.employeeEvent.findMany({
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
    include: { employee: true, eventTemplate: true, tasks: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">Parcours RH actifs</h1>
        <Link href="/dashboard/events/bulk-trigger" className="shrink-0">
          <Button variant="secondary" className="text-sm">
            Déclencher en masse
          </Button>
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        RH Pilot génère un plan d&apos;action complet pour chaque événement, mais chaque
        entreprise s&apos;organise à sa façon : ajoutez une étape ou changez l&apos;ordre
        directement depuis la fiche d&apos;un parcours.
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {events.length === 0
          ? query
            ? "Aucun parcours ne correspond à cette recherche."
            : "Aucun parcours déclenché pour l'instant."
          : `${events.length} parcours en cours de suivi.`}
      </p>

      <form method="get" className="mt-4 max-w-xs">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Rechercher un salarié ou un type de parcours..."
        />
      </form>

      <div className="mt-6">
        {events.length === 0 ? (
          query ? null : (
            <div className="flex flex-col items-center gap-4">
              <Mascot pose="createJourney" className="h-32 w-auto" />
              <EmptyState
                title="Aucun parcours RH pour l'instant"
                description="Déclenchez un événement (embauche, fin de période d'essai...) depuis la fiche d'un salarié pour générer automatiquement son plan d'action."
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
              const summary = summarizeParcours(event.tasks);

              return (
                <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                  <Card interactive>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${getEventTemplateDotColor(event.eventTemplate.key)}`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink">
                              {event.employee.firstName} {event.employee.lastName}
                            </p>
                            <Badge tone="neutral">{event.eventTemplate.label}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Déclenché le {formatDate(event.triggerDate)}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs">
                            {summary.overdueCount > 0 ? (
                              <span className="flex items-center gap-1 font-medium text-accent-rose">
                                <TriangleAlert size={12} />
                                {summary.overdueCount} tâche{summary.overdueCount > 1 ? "s" : ""} en
                                retard
                              </span>
                            ) : summary.isUpToDate && doneCount === event.tasks.length ? (
                              <span className="flex items-center gap-1 text-accent-teal">
                                <CircleCheck size={12} />
                                Toutes les tâches sont à jour
                              </span>
                            ) : summary.nextDueLabel ? (
                              <span className="flex items-center gap-1 text-ink-faint">
                                <Clock size={12} />
                                Prochaine échéance : {summary.nextDueLabel.toLowerCase()}
                              </span>
                            ) : null}
                            <span className="text-ink-faint">· {summary.lastActivityLabel}</span>
                          </p>
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
      </div>
    </div>
  );
}
