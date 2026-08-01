import { redirect } from "next/navigation";
import { Send, Mail, TriangleAlert } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUserDisplayName } from "@/lib/displayName";
import { sendDigestsNow } from "./actions";

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

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Historique des rappels et résumés envoyés — pour savoir qui a déjà été relancé.
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
        Déclenchement manuel pour l&apos;instant (utile pour tester) — l&apos;envoi automatique
        quotidien/hebdomadaire selon la préférence de chacun sera activé au moment du
        déploiement en ligne.
      </p>

      <div className="mt-6">
        {notifications.length === 0 ? (
          <EmptyState
            title="Aucune notification envoyée pour l'instant"
            description="Les rappels manuels et résumés automatiques apparaîtront ici, avec leur destinataire et la date d'envoi."
          />
        ) : (
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
                {notifications.map((notification) => (
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
        )}
      </div>
    </div>
  );
}
