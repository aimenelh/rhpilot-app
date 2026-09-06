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

const FUNCTIONAL_ROLE_LABELS: Record<string, string> = {
  RH: "RH",
  DIRIGEANT: "Dirigeant",
};

// Rouge volontairement exclu : accent-rose sert déjà de code couleur
// "urgent / en retard" ailleurs dans l'app, le réutiliser ici pour un
// avatar neutre créerait une fausse alerte visuelle.
const AVATAR_TONES = [
  { bg: "bg-brand-primary/10", text: "text-brand-primary" },
  { bg: "bg-brand-primary-dark/10", text: "text-brand-primary-dark" },
  { bg: "bg-accent-teal/10", text: "text-accent-teal" },
  { bg: "bg-accent-amber/10", text: "text-accent-amber" },
];

// Couleur stable par personne (dérivée de son id), plutôt que par
// position dans la liste — sinon tout le monde change de couleur
// dès qu'un membre part ou qu'un autre rejoint.
function avatarTone(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[hash];
}

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
            <UserPlus size={16} className="text-brand-primary" />
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
          <Users size={16} className="text-ink-faint" />
          <h2 className="text-sm font-semibold text-ink">Membres actuels</h2>
        </div>
        <ul className="mt-3 flex flex-col divide-y divide-surface-border">
          {members.map((m) => {
            const isSelf = m.id === membership.id;
            const tone = avatarTone(m.user.id);
            return (
              <li
                key={m.id}
                className="-mx-2.5 flex items-center justify-between gap-3 rounded-lg px-2.5 py-3 transition-colors duration-150 hover:bg-surface-subtle/70"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tone.bg} ${tone.text}`}
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
                    <p className="text-xs text-ink-faint">
                      {m.user.email}
                      {m.functionalRole && FUNCTIONAL_ROLE_LABELS[m.functionalRole] && (
                        <> · {FUNCTIONAL_ROLE_LABELS[m.functionalRole]}</>
                      )}
                    </p>
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
            <Clock size={16} className="text-accent-amber" />
            <h2 className="text-sm font-semibold text-ink">Invitations en attente</h2>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-surface-border">
            {pendingInvitations.map((invitation) => (
              <li
                key={invitation.id}
                className="-mx-2.5 flex items-center justify-between rounded-lg px-2.5 py-3 transition-colors duration-150 hover:bg-surface-subtle/70"
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={15} className="shrink-0 text-ink-faint" />
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
