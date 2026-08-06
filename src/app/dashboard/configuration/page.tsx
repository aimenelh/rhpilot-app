import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Waypoints, Bell, Database, Shield, Info, ChevronRight, Download } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const [organization, eventTemplateCount, overrideCount, reminderRuleCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { conventionCollective: true },
    }),
    prisma.eventTemplate.count({ where: { archivedAt: null } }),
    prisma.taskTemplateOverride.count({ where: { organizationId: membership.organizationId } }),
    prisma.reminderRule.count({ where: { organizationId: membership.organizationId } }),
  ]);

  const organizationSectionIncomplete = !membership.functionalRole || !organization?.conventionCollective;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-ink">Configuration</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Gérez les paramètres de votre espace RH Pilot. Personnalisez votre organisation, vos
        parcours, vos notifications et vos données.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Organisation */}
        <Link href="/dashboard/configuration/organisation">
          <Card className="h-full transition-colors hover:border-brand-blue/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
                  <User size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Organisation</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Définissez votre rôle RH et votre convention collective.
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
            </div>
            <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-faint">
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-ink-faint" /> Mon rôle
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-ink-faint" /> Convention collective
              </li>
            </ul>
            {organizationSectionIncomplete && (
              <span className="mt-3 inline-block rounded-full bg-accent-amber/10 px-2.5 py-1 text-xs font-medium text-accent-amber">
                À compléter
              </span>
            )}
          </Card>
        </Link>

        {/* Parcours RH */}
        <Link href="/dashboard/configuration/parcours">
          <Card className="h-full transition-colors hover:border-brand-blue/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Waypoints size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Parcours RH</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Configurez les modèles de parcours utilisés pour vos événements RH.
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-soft">
                {eventTemplateCount} parcours disponible{eventTemplateCount > 1 ? "s" : ""}
              </span>
              {overrideCount > 0 && (
                <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-blue">
                  {overrideCount} personnalisation{overrideCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Card>
        </Link>

        {/* Notifications */}
        <Link href="/dashboard/configuration/notifications">
          <Card className="h-full transition-colors hover:border-brand-blue/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-teal/10 text-accent-teal">
                  <Bell size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Notifications</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Définissez les résumés et relances automatiques.
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
            </div>
            <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-faint">
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-ink-faint" /> Résumés (quotidien / hebdomadaire)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-ink-faint" />
                {reminderRuleCount > 0
                  ? `${reminderRuleCount} règle${reminderRuleCount > 1 ? "s" : ""} de relance active${reminderRuleCount > 1 ? "s" : ""}`
                  : "Relances automatiques"}
              </li>
            </ul>
          </Card>
        </Link>

        {/* Données — pas de sous-page : les boutons sont déjà l'action finale,
            inutile d'ajouter un clic pour y accéder */}
        <Card className="h-full">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-amber/10 text-accent-amber">
              <Database size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Données</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Exportez ou importez les données de votre organisation.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/export/employees">
              <Button variant="secondary" className="text-xs">
                <Download size={13} />
                Salariés
              </Button>
            </a>
            <a href="/api/export/organization">
              <Button variant="secondary" className="text-xs">
                <Download size={13} />
                Tout exporter
              </Button>
            </a>
            <Button variant="secondary" className="text-xs opacity-60" disabled>
              Importer (bientôt)
            </Button>
          </div>
        </Card>

        {/* Sécurité — n'existe pas encore : affiché honnêtement comme à venir,
            jamais un lien vers une page qui n'a rien derrière */}
        <Card className="h-full opacity-60">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-faint/10 text-ink-faint">
              <Shield size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Sécurité</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Gérez les accès, la sécurité et les préférences de votre espace.
              </p>
            </div>
          </div>
          <span className="mt-3 inline-block rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-faint">
            Bientôt disponible
          </span>
        </Card>

        {/* À propos */}
        <Link href="/dashboard/configuration/a-propos">
          <Card className="h-full transition-colors hover:border-brand-blue/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Info size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">À propos</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Informations sur votre organisation et votre espace RH Pilot.
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
