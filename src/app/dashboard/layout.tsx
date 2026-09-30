import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserButton } from "@clerk/nextjs";
import { NEW_ORGANIZATION_COOKIE, hasEmployeeSpace } from "@/lib/employee-space/session";
import { getCurrentMemberships } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnomalies } from "@/lib/anomalies";
import { getUserDisplayName } from "@/lib/displayName";
import { getRhNews } from "@/lib/rhNews";
import { isAiEnabled } from "@/lib/ai";
import { AppShell } from "@/components/AppShell";
import { canUsePayroll } from "@/lib/payrollAccess";
import { Logomark, Wordmark } from "@/components/Brand";
import { InitializingScreen } from "@/components/InitializingScreen";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";
import { employeeAccessWhere, isOrganizationAdmin, taskAccessWhere } from "@/lib/accessPolicy";
import { AUTH_CONTEXT_COOKIE } from "@/lib/authContext";

// Chaque onglet porte le nom de sa page : « Salariés · RH Pilot ».
export const metadata = { title: { default: "Tableau de bord · RH Pilot", template: "%s · RH Pilot" }, robots: { index: false } };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Défense en profondeur : même si le middleware change un jour, une session
  // entrée par le portail salarié ne rend jamais le back-office RH.
  if (cookies().get(AUTH_CONTEXT_COOKIE)?.value === "employee") redirect("/espace");

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
    // Un salarié invité n'a pas d'organisation à piloter : direction son espace.
    if (cookies().get(NEW_ORGANIZATION_COOKIE)?.value !== "1" && (await hasEmployeeSpace(user.id))) redirect("/espace");
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

  const [overdueCount, anomalies, rhNews, oldestDemoEmployee, organizationSubscription, employeeCount, pendingRequestsCount] =
    await Promise.all([
      prisma.task.count({
        where: {
          organizationId: currentMembership.organizationId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lt: startOfToday },
          AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(currentMembership)],
        },
      }),
      isOrganizationAdmin(currentMembership) ? getAnomalies(currentMembership.organizationId) : Promise.resolve([]),
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
      prisma.employee.count({ where: { organizationId: currentMembership.organizationId, deletedAt: null, ...employeeAccessWhere(currentMembership) } }),
      isOrganizationAdmin(currentMembership) ? prisma.absence.count({ where: { organizationId: currentMembership.organizationId, status: { in: ["TO_VALIDATE", "TO_REVIEW_JUSTIFICATION"] }, employee: { deletedAt: null } } }) : Promise.resolve(0),
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
      payrollEnabled={canUsePayroll(currentMembership)}
      discoveryTourCompleted={Boolean(user.discoveryTourCompletedAt)}
      assistantSummary={{
        userDisplayName: getUserDisplayName(user),
        overdueCount,
        suggestionsCount: anomalies.length,
      }}
      rhNews={rhNews}
      aiEnabled={isAiEnabled()}
      demoExpiresAt={demoExpiresAt}
      employeeCount={employeeCount}
      pendingRequestsCount={pendingRequestsCount}
    >
      {children}
    </AppShell>
  );
}
