import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Waypoints, Bell, Database, Shield, Info, ChevronRight, Download, TriangleAlert } from "lucide-react";
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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Configuration</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Gérez les paramètres de votre espace RH Pilot. Personnalisez votre organisation, vos
        parcours, vos notifications et vos données.
      </p>

      {/* Organisation mise en avant à part, uniquement quand elle
          nécessite une action, pas d'effet "6 tuiles identiques". */}
      {organizationSectionIncomplete && (
        <Link href="/dashboard/configuration/organisation" className="mt-6 block">
          <Card className="flex items-center gap-3.5 border-accent-amber/30 bg-accent-amber/5 transition-colors hover:border-accent-amber/50">
            <TriangleAlert size={18} className="shrink-0 text-accent-amber" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Complétez votre organisation</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Votre rôle RH et votre convention collective ne sont pas encore renseignés. RH
                Pilot en a besoin pour bien vous orienter.
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-ink-faint" />
          </Card>
        </Link>
      )}

      <Card className="mt-4 divide-y divide-surface-border p-0">
        {!organizationSectionIncomplete && (
          <Link
            href="/dashboard/configuration/organisation"
            className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-subtle"
          >
            <User size={18} className="mt-0.5 shrink-0 text-brand-primary-dark" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-ink">Organisation</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Votre rôle RH et votre convention collective.
              </p>
            </div>
            <ChevronRight size={16} className="mt-0.5 shrink-0 text-ink-faint" />
          </Link>
        )}

        <Link
          href="/dashboard/configuration/parcours"
          className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-subtle"
        >
          <Waypoints size={18} className="mt-0.5 shrink-0 text-brand-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Parcours RH</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              {eventTemplateCount} parcours disponible{eventTemplateCount > 1 ? "s" : ""}
              {overrideCount > 0 &&
                ` · ${overrideCount} personnalisation${overrideCount > 1 ? "s" : ""}`}
            </p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-ink-faint" />
        </Link>

        <Link
          href="/dashboard/configuration/notifications"
          className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-subtle"
        >
          <Bell size={18} className="mt-0.5 shrink-0 text-accent-teal" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Résumés quotidien/hebdomadaire
              {reminderRuleCount > 0
                ? ` · ${reminderRuleCount} règle${reminderRuleCount > 1 ? "s" : ""} de relance active${reminderRuleCount > 1 ? "s" : ""}`
                : " · Relances automatiques"}
            </p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-ink-faint" />
        </Link>

        <div className="flex items-start gap-3 px-5 py-4">
          <Database size={18} className="mt-0.5 shrink-0 text-accent-amber" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Données</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Exportez ou importez les données de votre organisation.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
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
          </div>
        </div>

        <div className="flex items-start gap-3 px-5 py-4 opacity-60">
          <Shield size={18} className="mt-0.5 shrink-0 text-ink-faint" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Sécurité</h2>
            <p className="mt-0.5 text-sm text-ink-soft">Bientôt disponible.</p>
          </div>
        </div>

        <Link
          href="/dashboard/configuration/a-propos"
          className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-subtle"
        >
          <Info size={18} className="mt-0.5 shrink-0 text-brand-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">À propos</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Informations sur votre organisation et votre espace RH Pilot.
            </p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-ink-faint" />
        </Link>
      </Card>
    </div>
  );
}
