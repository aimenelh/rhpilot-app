import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/landing/AuthLayout";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/Button";

export default function SignUpPage() {
  return (
    <>
      {/* Mobile : même choix que la page de connexion, voir son
          commentaire pour le raisonnement. */}
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
          title="Votre équipe RH n'oublie plus rien."
          subtitle="Ajoutez votre premier salarié et RH Pilot commence à suivre ses échéances."
          preview={<ProductPreview />}
          formTitle="Créez votre espace RH"
          formSubtitle="Gratuit jusqu'à 3 salariés."
        >
          <SignUp
            forceRedirectUrl="/creating-account"
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
