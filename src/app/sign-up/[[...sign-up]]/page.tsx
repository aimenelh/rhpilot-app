import { SignUp } from "@clerk/nextjs";
import { SignUpStage } from "@/components/auth/SignUpStage";
import { authFormAppearance } from "@/components/auth/authAppearance";
import { MobileAppNotice } from "@/components/auth/MobileAppNotice";

export default function SignUpPage() {
  return (
    <>
      {/* Mobile : même choix que la page de connexion, voir son
          commentaire pour le raisonnement. */}
      <div className="md:hidden">
        <MobileAppNotice mode="sign-up" />
      </div>

      <div className="hidden md:block">
        <SignUpStage>
          <SignUp forceRedirectUrl="/creating-account" appearance={authFormAppearance} />
        </SignUpStage>
      </div>
    </>
  );
}
