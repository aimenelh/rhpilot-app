import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { SignUpStage } from "@/components/auth/SignUpStage";
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
        <SignUpStage>
          <SignUp
            forceRedirectUrl="/creating-account"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none border-0 rounded-none",
                card: "w-full shadow-none border-0 bg-transparent p-0 gap-5",
                header: "hidden",
                socialButtonsBlockButton: "h-12 rounded-xl border-[#e3ddd3] hover:bg-[#fbf8f3]",
                dividerLine: "bg-[#eee8df]",
                dividerText: "text-[#8a8178]",
                formFieldLabel: "text-[13px] font-semibold text-[#615e58]",
                formFieldInput:
                  "h-12 rounded-xl border-[#d9d0c5] text-[15px] focus:border-[#e8432e] focus:ring-4 focus:ring-[rgba(232,67,46,0.12)]",
                formButtonPrimary: "h-12 rounded-xl bg-[#20211f] text-[15px] font-semibold normal-case shadow-none hover:bg-black",
                otpCodeFieldInput: "h-14 w-12 rounded-xl border-[#d9d0c5] text-xl font-semibold focus:border-[#e8432e]",
                footer: "bg-transparent",
                footerActionLink: "font-semibold text-[#b73927] hover:text-[#8f2c1e]",
              },
            }}
          />
        </SignUpStage>
      </div>
    </>
  );
}
