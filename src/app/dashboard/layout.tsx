import { UserButton } from "@clerk/nextjs";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnomalies } from "@/lib/anomalies";
import { getUserDisplayName } from "@/lib/displayName";
import { getRhNews } from "@/lib/rhNews";
import { isAiEnabled } from "@/lib/ai";
import { AppShell } from "@/components/AppShell";
import { Logomark, Wordmark } from "@/components/Brand";
import { InitializingScreen } from "@/components/InitializingScreen";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, memberships } = await getCurrentMemberships();

  // Cas rare : le webhook Clerk n'a pas encore (ou plus) de
  // correspondance. Écran d'attente qui se rafraîchit tout seul —
  // jamais besoin de deviner quand recharger manuellement.
  if (!user) {
    return <InitializingScreen />;
  }

  // Aucune organisation : pas de navigation à afficher tant qu'il n'y a
  // rien à naviguer. Écran centré, sans sidebar — mais la déconnexion
  // doit rester accessible, sinon un utilisateur qui veut changer de
  // compte reste bloqué ici sans issue (bug remonté en test réel).
  if (memberships.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-6">
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <span className="text-xs text-ink-faint">{user.email}</span>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <div className="mb-8 flex items-center gap-2">
          <Logomark size={32} />
          <Wordmark />
        </div>
        {children}
      </div>
    );
  }

  const currentMembership = memberships[0];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [overdueCount, anomalies, rhNews, oldestDemoEmployee, organizationSubscription] =
    await Promise.all([
      prisma.task.count({
        where: {
          organizationId: currentMembership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lt: startOfToday },
          employeeEvent: { employee: { deletedAt: null } },
        },
      }),
      getAnomalies(currentMembership.organizationId),
      getRhNews(),
      // Salarié de démo le plus ancien encore actif — sert à calculer
      // la date de purge automatique (createdAt + 48h) pour la bannière.
      prisma.employee.findFirst({
        where: {
          organizationId: currentMembership.organizationId,
          isDemoData: true,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      // Statut d'abonnement : la purge (et donc la bannière) ne concerne
      // que les organisations encore sur le palier Gratuit.
      prisma.organization.findUnique({
        where: { id: currentMembership.organizationId },
        select: { subscriptionStatus: true },
      }),
    ]);

  const isOnGratuit = organizationSubscription?.subscriptionStatus !== "active";
  const demoExpiresAt =
    isOnGratuit && oldestDemoEmployee
      ? new Date(oldestDemoEmployee.createdAt.getTime() + 48 * 60 * 60 * 1000)
      : null;

  return (
    <AppShell
      organizationName={currentMembership.organization.name}
      accessRole={currentMembership.accessRole}
      assistantSummary={{
        userDisplayName: getUserDisplayName(user),
        overdueCount,
        suggestionsCount: anomalies.length,
      }}
      rhNews={rhNews}
      aiEnabled={isAiEnabled()}
      demoExpiresAt={demoExpiresAt}
    >
      {children}
    </AppShell>
  );
}
