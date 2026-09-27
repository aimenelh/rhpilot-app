import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { EspaceAuthFrame } from "@/components/espace/EspaceAuthFrame";
import { espaceAuthAppearance } from "@/components/espace/espaceAuthAppearance";
import { safeEspaceRedirect } from "@/lib/employee-space/tokens";

export const metadata: Metadata = { title: "Connexion à l'espace salarié", robots: { index: false } };

// Accès des salariés, pensé pour le téléphone : contrairement à la connexion
// RH (réservée à l'ordinateur pour l'instant), celle-ci s'affiche partout.
export default function EspaceSignInPage({ searchParams }: { searchParams: { redirect_url?: string } }) {
  const target = safeEspaceRedirect(searchParams.redirect_url);
  return (
    <EspaceAuthFrame note={<>Vous n&apos;avez pas encore d&apos;accès ? Il s&apos;ouvre depuis l&apos;invitation envoyée par votre employeur.</>}>
      <SignIn
        path="/espace/connexion"
        routing="path"
        signUpUrl="/espace/inscription"
        forceRedirectUrl={target}
        signUpForceRedirectUrl={target}
        appearance={espaceAuthAppearance}
      />
    </EspaceAuthFrame>
  );
}
