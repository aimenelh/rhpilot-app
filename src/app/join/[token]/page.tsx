import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logomark, Wordmark } from "@/components/Brand";
import Link from "next/link";

function ErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-6">
      <div className="mb-6 flex items-center gap-2">
        <Logomark size={24} />
        <Wordmark />
      </div>
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-base font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{description}</p>
        <Link href="/" className="mt-5 inline-block">
          <Button variant="secondary">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}

export default async function JoinPage({ params }: { params: { token: string } }) {
  const { userId: clerkUserId } = auth();

  // Pas encore connecté : direction inscription/connexion, avec retour
  // automatique sur cette page une fois fait — le jeton n'est jamais perdu.
  if (!clerkUserId) {
    redirect(`/sign-up?redirect_url=${encodeURIComponent(`/join/${params.token}`)}`);
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { organization: true },
  });

  if (!invitation) {
    return (
      <ErrorScreen
        title="Invitation introuvable"
        description="Ce lien d'invitation n'existe pas ou a peut-être déjà été utilisé."
      />
    );
  }

  if (invitation.acceptedAt) {
    return (
      <ErrorScreen
        title="Invitation déjà utilisée"
        description="Cette invitation a déjà été acceptée. Connectez-vous normalement pour accéder à votre organisation."
      />
    );
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <ErrorScreen
        title="Invitation expirée"
        description="Ce lien n'est plus valable (7 jours de validité). Demandez à la personne qui vous a invité·e de vous en envoyer une nouvelle."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    // Même écran d'attente que le tableau de bord dans ce cas rare
    // (webhook Clerk pas encore synchronisé) — jamais une page cassée.
    return (
      <ErrorScreen
        title="Initialisation de votre compte en cours"
        description="Rechargez cette page dans un instant."
      />
    );
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <ErrorScreen
        title="Cette invitation ne vous est pas destinée"
        description={`Ce lien a été envoyé à ${invitation.email}. Vous êtes actuellement connecté·e avec ${user.email} — déconnectez-vous puis reconnectez-vous avec la bonne adresse.`}
      />
    );
  }

  const alreadyMember = await prisma.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
  });
  if (alreadyMember) {
    return (
      <ErrorScreen
        title="Vous appartenez déjà à une organisation"
        description="RH Pilot ne permet pas encore d'appartenir à plusieurs organisations. Contactez-nous si vous devez en changer."
      />
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        accessRole: invitation.accessRole,
      },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: user.id,
        action: "invitation.accepted",
        entityType: "Invitation",
        entityId: invitation.id,
      },
    });
  });

  redirect("/dashboard");
}
