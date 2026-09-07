import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/landing/AuthLayout";
import { AttentionPreview } from "@/components/landing/AttentionPreview";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  return (
    <>
      {/* Mobile : l'application elle-même (pas le site vitrine) n'est
          pas encore optimisée pour petit écran -- on le dit
          honnêtement plutôt que de laisser une expérience cassée.
          hidden/block plutôt qu'une détection JS : plus simple, plus
          fiable, aucune hydratation à gérer. */}
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center md:hidden">
        <Mascot pose="calm" className="h-28 w-auto" />
        <h1 className="text-xl font-semibold text-ink">Bientôt disponible sur mobile</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          RH Pilot se pilote pour l&apos;instant depuis un ordinateur. En attendant, vous pouvez
          explorer le site sur votre téléphone.
        </p>
        <Link href="/">
          <Button variant="secondary" className="mt-2 text-sm">
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>

      <div className="hidden md:block">
        <AuthLayout
          title="Bon retour."
          subtitle="Reconnectez-vous pour retrouver vos parcours RH et ce qui mérite votre attention aujourd'hui."
          preview={<AttentionPreview />}
          formTitle="Connectez-vous"
          formSubtitle="Accédez à votre espace RH Pilot."
        >
          <SignIn
            forceRedirectUrl="/entering"
            appearance={{
              elements: {
                rootBox: "w-full max-w-md",
                card: "shadow-none border-none bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              },
            }}
          />
        </AuthLayout>
      </div>
    </>
  );
}
