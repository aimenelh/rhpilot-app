import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/landing/AuthLayout";
import { ProductPreview } from "@/components/landing/ProductPreview";

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Votre équipe RH n'oublie plus rien."
      subtitle="Créez votre espace en quelques minutes. Sans engagement, sans configuration compliquée."
      preview={<ProductPreview />}
      formTitle="Créez votre espace RH"
      formSubtitle="Quelques minutes pour commencer."
    >
      <SignUp
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
