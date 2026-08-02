import { redirect } from "next/navigation";
import { Mail, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InviteForm } from "./InviteForm";
import { RevokeInvitationButton } from "./RevokeInvitationButton";

export const dynamic = "force-dynamic";

const ACCESS_ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
};

export default async function TeamPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const canInvite = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";

  const [members, pendingInvitations] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: membership.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Équipe</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {members.length} membre{members.length > 1 ? "s" : ""} dans votre organisation.
      </p>

      {canInvite && (
        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Inviter quelqu&apos;un</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Un email avec un lien d&apos;invitation lui sera envoyé, valable 7 jours.
          </p>
          <InviteForm />
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-ink">Membres actuels</h2>
        <ul className="mt-3 flex flex-col divide-y divide-surface-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-ink">{getUserDisplayName(m.user)}</p>
                <p className="text-xs text-ink-faint">{m.user.email}</p>
              </div>
              <Badge tone="neutral">{ACCESS_ROLE_LABELS[m.accessRole] ?? m.accessRole}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      {canInvite && pendingInvitations.length > 0 && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-ink">Invitations en attente</h2>
          <ul className="mt-3 flex flex-col divide-y divide-surface-border">
            {pendingInvitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink-faint">
                    <Mail size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{invitation.email}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-faint">
                      <Clock size={11} />
                      Envoyée le {formatDate(invitation.createdAt)} ·{" "}
                      {ACCESS_ROLE_LABELS[invitation.accessRole] ?? invitation.accessRole}
                    </p>
                  </div>
                </div>
                <RevokeInvitationButton invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!canInvite && (
        <p className="mt-4 text-xs text-ink-faint">
          Seuls les propriétaires et administrateurs peuvent inviter de nouveaux membres.
        </p>
      )}
    </div>
  );
}
