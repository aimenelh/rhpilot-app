import { redirect } from "next/navigation";
import { Mail, Clock, Users, UserPlus } from "lucide-react";
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

const AVATAR_COLORS = ["bg-brand-blue", "bg-brand-violet", "bg-accent-teal", "bg-accent-amber", "bg-accent-rose"];

function getInitials(user: { firstName: string | null; lastName: string | null; email: string }) {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return user.email[0].toUpperCase();
}

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
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
              <UserPlus size={15} />
            </span>
            <h2 className="text-sm font-semibold text-ink">Inviter quelqu&apos;un</h2>
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">
            Un email avec un lien d&apos;invitation lui sera envoyé, valable 7 jours.
          </p>
          <InviteForm />
        </Card>
      )}

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-subtle text-ink-faint">
            <Users size={15} />
          </span>
          <h2 className="text-sm font-semibold text-ink">Membres actuels</h2>
        </div>
        <ul className="mt-3 flex flex-col divide-y divide-surface-border">
          {members.map((m, index) => {
            const isSelf = m.id === membership.id;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                  >
                    {getInitials(m.user)}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {getUserDisplayName(m.user)}
                      {isSelf && (
                        <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
                          Vous
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-faint">{m.user.email}</p>
                  </div>
                </div>
                <Badge tone="neutral">{ACCESS_ROLE_LABELS[m.accessRole] ?? m.accessRole}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>

      {canInvite && pendingInvitations.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber">
              <Clock size={15} />
            </span>
            <h2 className="text-sm font-semibold text-ink">Invitations en attente</h2>
          </div>
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
