import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/landing/AuthLayout";
import { AttentionPreview } from "@/components/landing/AttentionPreview";

export default function SignInPage() {
  return (
    <AuthLayout
      title="Bon retour."
      subtitle="Reconnectez-vous pour retrouver vos parcours RH et ce qui mérite votre attention aujourd'hui."
      preview={<AttentionPreview />}
      formTitle="Connectez-vous"
      formSubtitle="Accédez à votre espace RH Pilot."
    >
      <SignIn
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
  );
}
