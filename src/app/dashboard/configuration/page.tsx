import { redirect } from "next/navigation";
import { Download, Sparkles, ArrowRight } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { updateConventionCollective, updateFunctionalRole, revertTaskTemplateOverride, createReminderRule, deleteReminderRule } from "../settings/organizationActions";

export const dynamic = "force-dynamic";

const COMMON_CCN = [
  "Syntec",
  "Métallurgie",
  "Commerce de gros",
  "Commerce de détail et de gros à prédominance alimentaire",
  "HCR (Hôtels, cafés, restaurants)",
  "Bâtiment et travaux publics (BTP)",
  "Pharmacie d'officine",
  "Banque",
  "Assurance",
  "Transport routier",
  "Immobilier",
  "Bureaux d'études techniques",
  "Cabinets d'avocats",
  "Cabinets d'experts-comptables",
  "Coiffure",
  "Aide à domicile",
  "Sport",
  "Animation",
  "Publicité",
  "Industrie pharmaceutique",
  "Automobile (services)",
  "Bricolage",
  "Restauration rapide",
  "Propreté",
  "Sécurité privée",
  "Textile",
  "Notariat",
  "Optique-lunetterie",
  "Import-export",
  "Édition",
];

export default async function ConfigurationPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";

  const [organization, eventTemplates, overrides, reminderRules] = await Promise.all([
    prisma.organization.findUnique({ where: { id: membership.organizationId } }),
    prisma.eventTemplate.findMany({
      where: { archivedAt: null },
      include: { taskTemplates: { where: { archivedAt: null }, orderBy: { stepOrder: "asc" } } },
      orderBy: { label: "asc" },
    }),
    prisma.taskTemplateOverride.findMany({ where: { organizationId: membership.organizationId } }),
    prisma.reminderRule.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { daysBeforeDue: "desc" },
    }),
  ]);

  const overrideByTaskTemplateId = new Map(overrides.map((o) => [o.taskTemplateId, o]));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Configuration</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Tout ce qui configure votre espace RH Pilot : votre rôle, votre convention
        collective, vos modèles de parcours, et l&apos;export de vos données.
      </p>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Votre rôle dans l&apos;organisation</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Certaines tâches des parcours RH sont conçues pour être assignées automatiquement
          à &laquo;&nbsp;la personne RH&nbsp;&raquo; de l&apos;organisation. RH Pilot ne
          devine jamais qui occupe ce rôle. Sans cette information, ces tâches restent
          volontairement &laquo;&nbsp;À assigner&nbsp;&raquo;.
        </p>

        <form action={updateFunctionalRole} className="mt-4">
          <Label htmlFor="functionalRole">Mon rôle</Label>
          <Select
            id="functionalRole"
            name="functionalRole"
            defaultValue={membership.functionalRole ?? ""}
          >
            <option value="">Non renseigné</option>
            <option value="RH">RH</option>
            <option value="DIRIGEANT">Dirigeant</option>
          </Select>
          <FieldHint>
            Si plusieurs personnes de votre organisation sont marquées &laquo;&nbsp;RH&nbsp;&raquo;,
            l&apos;assignation automatique reste également désactivée : l&apos;ambiguïté
            n&apos;est jamais résolue au hasard.
          </FieldHint>

          <Button type="submit" className="mt-4">
            Enregistrer
          </Button>
        </form>
      </Card>

      {canEditOrganization && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-ink">Convention collective</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Renseignez celle applicable à votre organisation. RH Pilot vous orientera alors
            vers la bonne source officielle au bon moment (embauche, période d&apos;essai,
            visite médicale), sans jamais interpréter ses règles à votre place.
          </p>

          <form action={updateConventionCollective} className="mt-4">
            <Label htmlFor="conventionCollective">Nom de la convention collective</Label>
            <Input
              id="conventionCollective"
              name="conventionCollective"
              list="ccn-suggestions"
              defaultValue={organization?.conventionCollective ?? ""}
              placeholder="Ex. Syntec"
            />
            <datalist id="ccn-suggestions">
              {COMMON_CCN.map((ccn) => (
                <option key={ccn} value={ccn} />
              ))}
            </datalist>
            <FieldHint>
              Tapez pour voir des suggestions parmi les conventions les plus courantes, ou
              indiquez la vôtre librement si elle n&apos;y figure pas. Laissez vide pour ne
              rien afficher.
            </FieldHint>

            <Button type="submit" className="mt-4">
              Enregistrer
            </Button>
          </form>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-base font-semibold text-ink">Modèles de parcours</h2>
        <p className="mt-1 text-sm text-ink-soft">
          RH Pilot propose une base pour chaque type d&apos;événement, jamais imposée :
          chaque étape peut être adaptée à votre façon de travailler, directement depuis un
          parcours déjà généré.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {eventTemplates.map((eventTemplate) => {
            const templateOverrideCount = eventTemplate.taskTemplates.filter((t) =>
              overrideByTaskTemplateId.has(t.id)
            ).length;

            return (
              <Card key={eventTemplate.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{eventTemplate.label}</h3>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {eventTemplate.taskTemplates.length} étape
                      {eventTemplate.taskTemplates.length > 1 ? "s" : ""} standard
                    </p>
                  </div>
                  {templateOverrideCount > 0 && (
                    <Badge tone="brand">
                      {templateOverrideCount} personnalisation{templateOverrideCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                <ul className="mt-4 flex flex-col divide-y divide-surface-border">
                  {eventTemplate.taskTemplates.map((taskTemplate) => {
                    const override = overrideByTaskTemplateId.get(taskTemplate.id);
                    return (
                      <li key={taskTemplate.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          {override ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <span className="truncate text-ink-faint line-through">
                                {taskTemplate.label}
                              </span>
                              {override.action === "MODIFIED" && (
                                <>
                                  <ArrowRight size={12} className="shrink-0 text-ink-faint" />
                                  <span className="truncate font-medium text-brand-blue">
                                    {override.label}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="truncate text-sm text-ink-soft">{taskTemplate.label}</p>
                          )}
                          <p className="mt-0.5 text-xs text-ink-faint">
                            {override?.action === "REMOVED"
                              ? "Ne sera plus jamais générée pour votre organisation"
                              : `À ${override?.action === "MODIFIED" && override.dueOffsetDays !== null ? override.dueOffsetDays : taskTemplate.dueOffsetDays} jour(s) du déclenchement`}
                          </p>
                        </div>
                        {override && canEditOrganization && (
                          <form action={revertTaskTemplateOverride.bind(null, override.id)}>
                            <Button type="submit" variant="secondary" className="shrink-0 text-xs">
                              Revenir au standard
                            </Button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-brand-blue/5 px-4 py-3 text-sm text-ink-soft">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-blue" />
          <p>
            Pour personnaliser une étape, ouvrez un parcours déjà généré, modifiez ou
            supprimez l&apos;étape concernée, puis cochez « Appliquer aussi ce changement aux
            futurs parcours de ce type ».
          </p>
        </div>
      </div>

      {canEditOrganization && (
        <Card className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Relances automatiques</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Sans règle définie, aucune relance automatique n&apos;est envoyée — seuls les
            résumés programmés depuis Notifications continuent de fonctionner normalement.
            Ajoutez une règle pour prévenir la personne assignée (et/ou son manager) un
            certain nombre de jours avant chaque échéance.
          </p>

          {reminderRules.length > 0 && (
            <ul className="mt-4 flex flex-col divide-y divide-surface-border">
              {reminderRules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="text-sm text-ink">
                    <strong>{rule.daysBeforeDue} jour{rule.daysBeforeDue > 1 ? "s" : ""}</strong>{" "}
                    avant l&apos;échéance, prévenir{" "}
                    {rule.notifyAssignee && rule.notifyManager
                      ? "la personne assignée et son manager"
                      : rule.notifyAssignee
                        ? "la personne assignée"
                        : "le manager de la personne assignée"}
                  </p>
                  <form action={deleteReminderRule.bind(null, rule.id)}>
                    <Button type="submit" variant="secondary" className="shrink-0 text-xs">
                      Supprimer
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={createReminderRule} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="daysBeforeDue">Jours avant l&apos;échéance</Label>
              <Input
                id="daysBeforeDue"
                name="daysBeforeDue"
                type="number"
                min={0}
                max={90}
                required
                className="w-28"
              />
            </div>
            <label className="flex items-center gap-1.5 pb-2.5 text-sm text-ink-soft">
              <input type="checkbox" name="notifyAssignee" defaultChecked />
              Assigné
            </label>
            <label className="flex items-center gap-1.5 pb-2.5 text-sm text-ink-soft">
              <input type="checkbox" name="notifyManager" />
              Manager
            </label>
            <Button type="submit" className="text-sm">
              Ajouter la règle
            </Button>
          </form>
        </Card>
      )}

      <Card className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Export de vos données</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Conformément au RGPD, exportez à tout moment l&apos;ensemble des données de votre
          organisation.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a href="/api/export/employees" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              <Download size={14} />
              Salariés (CSV)
            </Button>
          </a>
          <a href="/api/export/organization" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              <Download size={14} />
              Toutes les données (JSON)
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
