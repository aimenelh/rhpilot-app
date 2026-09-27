import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { InitializingScreen } from "@/components/InitializingScreen";
import { EspaceAuthFrame } from "@/components/espace/EspaceAuthFrame";
import { ActionForm } from "@/components/espace/ActionForm";
import { SubmitButton } from "@/components/espace/SubmitButton";
import { findInvitationByToken, invitationProblem } from "@/lib/employee-space/invitations";
import { acceptEmployeeInvitation } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation à l'espace salarié", robots: { index: false } };

const PROBLEMS = {
  "not-found": { title: "Lien introuvable", text: "Ce lien d'invitation n'existe pas ou a été remplacé par une invitation plus récente. Demandez à votre employeur de vous la renvoyer." },
  revoked: { title: "Invitation annulée", text: "Votre employeur a annulé cette invitation. Rapprochez-vous de lui si vous pensez qu'il s'agit d'une erreur." },
  expired: { title: "Invitation expirée", text: "Ce lien n'est plus valable. Demandez à votre employeur de vous renvoyer l'invitation depuis RH Pilot." },
  used: { title: "Espace déjà activé", text: "Cette invitation a déjà servi. Connectez-vous pour retrouver votre espace." },
} as const;

export default async function JoinEmployeeSpacePage({ params }: { params: { token: string } }) {
  const invitation = await findInvitationByToken(params.token);
  const { userId } = auth();
  const joinPath = `/espace/rejoindre/${params.token}`;

  const earlyProblem = invitationProblem(invitation, null);
  if (earlyProblem && earlyProblem !== "wrong-email") {
    const content = PROBLEMS[earlyProblem];
    return (
      <EspaceAuthFrame organizationName={invitation?.organizationName}>
        <h1 className="text-xl font-semibold text-ink">{content.title}</h1>
        <p className="mt-2 text-[15px] leading-6 text-ink-soft">{content.text}</p>
        <Link href="/espace/connexion" className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-surface-border px-4 text-[15px] font-semibold text-ink hover:bg-surface-subtle">Se connecter</Link>
      </EspaceAuthFrame>
    );
  }
  if (!invitation) return null;

  if (!userId) {
    const signUp = `/espace/inscription?redirect_url=${encodeURIComponent(joinPath)}&email=${encodeURIComponent(invitation.email)}`;
    const signIn = `/espace/connexion?redirect_url=${encodeURIComponent(joinPath)}`;
    return (
      <EspaceAuthFrame organizationName={invitation.organizationName} note={<>Vos bulletins vous sont remis sous forme électronique dans cet espace. Vous pouvez à tout moment demander à les recevoir sur papier.</>}>
        <h1 className="text-xl font-semibold text-ink">Bonjour {invitation.firstName},</h1>
        <p className="mt-2 text-[15px] leading-6 text-ink-soft">
          Votre espace salarié vous attend : bulletins de salaire, congés, demandes d&apos;absence et documents, depuis votre téléphone ou un ordinateur.
        </p>
        <p className="mt-3 text-sm text-ink-soft">Créez votre accès avec l&apos;adresse <strong className="font-semibold text-ink">{invitation.email}</strong>.</p>
        <Link href={signUp} className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-[15px] font-semibold text-white hover:opacity-90">Créer mon accès</Link>
        <Link href={signIn} className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-surface-border px-4 text-[15px] font-semibold text-ink hover:bg-surface-subtle">J&apos;ai déjà un compte RH Pilot</Link>
      </EspaceAuthFrame>
    );
  }

  const user = await getCurrentUser();
  if (!user) return <InitializingScreen />;

  if (invitationProblem(invitation, user.email) === "wrong-email") {
    return (
      <EspaceAuthFrame organizationName={invitation.organizationName}>
        <h1 className="text-xl font-semibold text-ink">Ce n&apos;est pas la bonne adresse</h1>
        <p className="mt-2 text-[15px] leading-6 text-ink-soft">
          L&apos;invitation a été envoyée à <strong className="font-semibold text-ink">{invitation.email}</strong>, et vous êtes connecté avec {user.email}. Déconnectez-vous, puis reprenez le lien de l&apos;invitation.
        </p>
        <SignOutButton redirectUrl={joinPath}>
          <button type="button" className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-surface-border px-4 text-[15px] font-semibold text-ink hover:bg-surface-subtle">Me déconnecter</button>
        </SignOutButton>
      </EspaceAuthFrame>
    );
  }

  return (
    <EspaceAuthFrame organizationName={invitation.organizationName}>
      <h1 className="text-xl font-semibold text-ink">Activer votre espace</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-soft">
        {invitation.organizationName} vous a invité à consulter vos documents en tant que <strong className="font-semibold text-ink">{invitation.firstName} {invitation.lastName}</strong>.
      </p>
      <ActionForm action={async () => { "use server"; return acceptEmployeeInvitation(params.token); }} className="mt-6">
        <SubmitButton pendingLabel="Activation…" className="w-full">Activer mon espace</SubmitButton>
      </ActionForm>
    </EspaceAuthFrame>
  );
}
