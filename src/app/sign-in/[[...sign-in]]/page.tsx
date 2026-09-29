import { SignIn } from "@clerk/nextjs";
import { SignInStage } from "@/components/auth/SignInStage";
import { authFormAppearance } from "@/components/auth/authAppearance";
import { MobileAppNotice } from "@/components/auth/MobileAppNotice";

export default function SignInPage() {
  return (
    <>
      {/* Mobile : l'application elle-même (pas le site vitrine) n'est
          pas encore optimisée pour petit écran -- on le dit
          honnêtement plutôt que de laisser une expérience cassée.
          hidden/block plutôt qu'une détection JS : plus simple, plus
          fiable, aucune hydratation à gérer. */}
      <div className="md:hidden">
        <MobileAppNotice mode="sign-in" />
      </div>

      <div className="hidden md:block">
        <SignInStage>
          <SignIn forceRedirectUrl="/entering" appearance={authFormAppearance} />
        </SignInStage>
      </div>
    </>
  );
}
