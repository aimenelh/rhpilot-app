import { redirect } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { revertTaskTemplateOverride } from "../settings/organizationActions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const canManage = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";

  const [eventTemplates, overrides] = await Promise.all([
    prisma.eventTemplate.findMany({
      where: { archivedAt: null },
      include: {
        taskTemplates: { where: { archivedAt: null }, orderBy: { stepOrder: "asc" } },
      },
      orderBy: { label: "asc" },
    }),
    prisma.taskTemplateOverride.findMany({
      where: { organizationId: membership.organizationId },
    }),
  ]);

  const overrideByTaskTemplateId = new Map(overrides.map((o) => [o.taskTemplateId, o]));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Modèles de parcours</h1>
      <p className="mt-1 text-sm text-ink-soft">
        RH Pilot propose une base pour chaque type d&apos;événement, jamais imposée : chaque
        étape peut être adaptée à votre façon de travailler, directement depuis un parcours
        déjà généré. Les personnalisations mémorisées s&apos;appliquent automatiquement aux
        futurs parcours de ce type.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {eventTemplates.map((eventTemplate) => {
          const templateOverrideCount = eventTemplate.taskTemplates.filter((t) =>
            overrideByTaskTemplateId.has(t.id)
          ).length;

          return (
            <Card key={eventTemplate.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">{eventTemplate.label}</h2>
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
                      {override && canManage && (
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

      <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-brand-blue/5 px-4 py-3 text-sm text-ink-soft">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-blue" />
        <p>
          Pour personnaliser une étape, ouvrez un parcours déjà généré, modifiez ou supprimez
          l&apos;étape concernée, puis cochez « Appliquer aussi ce changement aux futurs
          parcours de ce type ».
        </p>
      </div>
    </div>
  );
}
