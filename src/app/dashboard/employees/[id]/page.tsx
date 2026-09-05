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

      {/* En-tête façon dossier : nom, résumé en une ligne, actions
          rapides vers les sections existantes plus bas (le formulaire
          d'édition et la carte d'archivage ne bougent pas, on ajoute
          juste un raccourci visible immédiatement). */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {employee.position || "Poste non renseigné"} · Embauché·e le {formatDate(employee.hireDate)} · Actif
          </p>
        </div>
        <div className="flex items-center gap-4 pt-1 text-sm font-medium">
          <a href="#informations" className="text-brand-primary hover:underline">
            Modifier
          </a>
          <a href="#archiver" className="text-ink-faint hover:text-ink-soft">
            Archiver
          </a>
        </div>
      </div>

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

      {/* Bloc résumé : lecture seule, les informations essentielles
          d'un coup d'œil -- distinct du formulaire d'édition plus bas
          (section "Informations du salarié"), qui reste la même
          édition complète qu'avant. */}
      <Card className="mt-5">
        <h2 className="text-sm font-semibold text-ink">Résumé</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-faint">Poste</dt>
            <dd className="mt-0.5 text-sm text-ink">{employee.position || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Date d&apos;embauche</dt>
            <dd className="mt-0.5 text-sm text-ink">{formatDate(employee.hireDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Type de contrat</dt>
            <dd className="mt-0.5 text-sm text-ink">{employee.contractType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Manager direct</dt>
            <dd className="mt-0.5 text-sm text-ink">
              {(() => {
                const manager = memberships.find(
                  (m: { id: string }) => m.id === employee.managerMembershipId
                );
                return manager ? getUserDisplayName(manager.user) : "Non défini";
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Catégorie professionnelle</dt>
            <dd className="mt-0.5 text-sm text-ink">{employee.professionalCategory ?? "—"}</dd>
          </div>
        </dl>
      </Card>

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

      {/* Parcours RH : le formulaire de déclenchement vit ici
          maintenant (auparavant tout en haut de page, avant même le
          résumé) -- c'est l'action naturelle de cette section, pas
          une action à part entière avant d'avoir vu qui est le
          salarié. */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Parcours RH de {employee.firstName}</h2>
        <div className="mt-3">
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
          <div className="mt-3 flex flex-col gap-3">
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
      </div>

      {/* Documents : la fonctionnalité elle-même n'existe pas encore
          (voir audit Phase 2 -- le modèle Attachment existe en base
          mais aucune route d'upload/téléchargement n'est construite).
          On rend la zone visible dès maintenant, honnêtement vide,
          plutôt que de l'omettre -- ça prépare le terrain visuel pour
          plus tard, notamment la paie. */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Documents</h2>
        <Card className="mt-3 border-dashed" compact>
          <p className="text-sm text-ink-faint">Aucun document pour le moment.</p>
        </Card>
      </div>

      <div id="informations" className="mt-8 max-w-xl scroll-mt-6">
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

        <Card id="archiver" className="mt-4 scroll-mt-6">
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
