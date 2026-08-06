import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { createReminderRule, deleteReminderRule } from "../../settings/organizationActions";

export const dynamic = "force-dynamic";

export default async function NotificationsConfigPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";

  const reminderRules = await prisma.reminderRule.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { daysBeforeDue: "desc" },
  });

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/configuration"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={14} /> Configuration
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-ink">Notifications</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Les résumés programmés (quotidien / hebdomadaire) se gèrent depuis la page{" "}
        <Link href="/dashboard/notifications" className="text-brand-blue hover:underline">
          Notifications
        </Link>{" "}
        du menu. Les relances ci-dessous sont spécifiques aux échéances de vos parcours RH.
      </p>

      {canEditOrganization ? (
        <Card className="mt-6">
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
      ) : (
        <Card className="mt-6">
          <p className="text-sm text-ink-soft">
            Seuls les propriétaires et administrateurs de l&apos;organisation peuvent gérer les
            règles de relance.
          </p>
        </Card>
      )}
    </div>
  );
}
