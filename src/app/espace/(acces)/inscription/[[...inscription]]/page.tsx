import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { EspaceAuthFrame } from "@/components/espace/EspaceAuthFrame";
import { espaceAuthAppearance } from "@/components/espace/espaceAuthAppearance";
import { safeEspaceRedirect } from "@/lib/employee-space/tokens";

export const metadata: Metadata = { title: "Créer mon accès salarié", robots: { index: false } };

// Inscription d'un salarié invité : elle ramène toujours vers l'invitation
// (jamais vers la création d'un espace RH, qui suit l'inscription classique).
export default function EspaceSignUpPage({ searchParams }: { searchParams: { redirect_url?: string; email?: string } }) {
  const target = safeEspaceRedirect(searchParams.redirect_url);
  const email = typeof searchParams.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchParams.email) ? searchParams.email : undefined;
  return (
    <EspaceAuthFrame note={<>Utilisez l&apos;adresse e-mail sur laquelle vous avez reçu l&apos;invitation.</>}>
      <SignUp
        path="/espace/inscription"
        routing="path"
        signInUrl="/espace/connexion"
        forceRedirectUrl={target}
        signInForceRedirectUrl={target}
        initialValues={email ? { emailAddress: email } : undefined}
        appearance={espaceAuthAppearance}
      />
    </EspaceAuthFrame>
  );
}
