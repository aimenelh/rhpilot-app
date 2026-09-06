import { redirect } from "next/navigation";
import { Send, Mail, TriangleAlert } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label, Select, FieldHint } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Mascot } from "@/components/Mascot";
import { getUserDisplayName } from "@/lib/displayName";
import { sendDigestsNow, updateNotificationPreference } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  digest_daily: "Résumé quotidien",
  digest_weekly: "Résumé hebdomadaire",
  manual_reminder: "Rappel manuel",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function NotificationsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const notifications = await prisma.notification.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      recipientMembership: { include: { user: true } },
      sentByUser: true,
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  // Regroupe par période plutôt que d'afficher 50 lignes d'un coup —
  // même logique de lisibilité que le calendrier (Aujourd'hui / Cette
  // semaine / Plus ancien), appliquée ici à un journal d'envois plutôt
  // qu'à des échéances. Calculé directement ici (pas dans une fonction
  // à part) pour que le type complet de chaque notification (avec
  // recipientMembership, sentByUser...) reste intact.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const notificationGroups = [
    {
      label: "Aujourd'hui",
      items: notifications.filter((n: { sentAt: Date }) => n.sentAt >= todayStart),
    },
    {
      label: "Cette semaine",
      items: notifications.filter(
        (n: { sentAt: Date }) => n.sentAt < todayStart && n.sentAt >= weekStart
      ),
    },
    {
      label: "Plus ancien",
      items: notifications.filter((n: { sentAt: Date }) => n.sentAt < weekStart),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Historique des rappels et résumés envoyés, pour savoir qui a déjà été relancé.
          </p>
        </div>
        <form action={sendDigestsNow}>
          <Button type="submit" variant="secondary">
            <Send size={14} />
            Envoyer les résumés maintenant
          </Button>
        </form>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Le bouton ci-dessus déclenche un envoi immédiat. L&apos;envoi automatique
        quotidien/hebdomadaire suit la préférence choisie ci-dessous, pour chacun.
      </p>

      <Card className="mt-4 max-w-sm">
        <h2 className="text-sm font-semibold text-ink">Votre fréquence de résumé</h2>
        <p className="mt-1 text-sm text-ink-soft">
          À quelle fréquence souhaitez-vous recevoir un résumé de vos actions urgentes ?
        </p>
        <form action={updateNotificationPreference} className="mt-3">
          <Label htmlFor="notificationFrequency">Fréquence</Label>
          <Select
            id="notificationFrequency"
            name="notificationFrequency"
            defaultValue={membership.notificationFrequency}
          >
            <option value="DAILY">Quotidien</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="OFF">Désactivé</option>
          </Select>
          <FieldHint>
            Ne s&apos;applique qu&apos;aux tâches qui vous sont directement assignées. Un
            rappel manuel ponctuel reste toujours possible, quelle que soit cette préférence.
          </FieldHint>
          <Button type="submit" className="mt-3">
            Enregistrer
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <Mascot pose="reminder" className="h-32 w-auto" />
            <EmptyState
              title="Aucune notification envoyée pour l'instant"
              description="Les rappels manuels et résumés automatiques apparaîtront ici, avec leur destinataire et la date d'envoi."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {notificationGroups.map((group) => (
              <div key={group.label}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {group.label}
                </h2>
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-surface-border bg-surface-subtle text-xs uppercase tracking-wide text-ink-faint">
                      <tr>
                        <th className="px-5 py-3 font-medium">Destinataire</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium">Sujet</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                        <th className="px-5 py-3 font-medium">Envoyé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {group.items.map((notification) => (
                        <tr key={notification.id}>
                          <td className="px-5 py-3 text-ink">
                            {getUserDisplayName(notification.recipientMembership.user)}
                          </td>
                          <td className="px-5 py-3 text-ink-soft">
                            <span className="flex items-center gap-1.5">
                              <Mail size={13} />
                              {TYPE_LABELS[notification.type] ?? notification.type}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-ink-soft">{notification.subject}</td>
                          <td className="px-5 py-3">
                            {notification.delivered ? (
                              <Badge tone="teal">Envoyé</Badge>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-medium text-accent-rose">
                                <TriangleAlert size={13} />
                                Échec d&apos;envoi
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-ink-faint">
                            {formatDateTime(notification.sentAt)}
                            {notification.sentByUser && (
                              <span className="block text-xs">
                                par {getUserDisplayName(notification.sentByUser)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
