import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";

export const metadata: Metadata = {
  title: "RH Pilot — Votre copilote d'organisation RH",
  description:
    "RH Pilot transforme chaque événement RH en plan d'action complet : tâches, échéances, responsables et preuves.",
  // Bêta fermée : le site ne doit pas apparaître dans les résultats de
  // recherche. À retirer explicitement le jour d'une ouverture publique
  // — ce n'est pas quelque chose qui doit rester "par oubli".
  robots: {
    index: false,
    follow: false,
  },
};

// Habille les écrans Clerk (connexion, inscription, gestion du
// compte) avec les jetons de la charte RH Pilot plutôt que de les
// laisser à l'apparence par défaut — c'était le vrai trou visuel du
// produit, pas le reste de l'application.
const clerkAppearance = {
  variables: {
    colorPrimary: "#2F6FED",
    colorText: "#0F1B3D",
    colorTextSecondary: "#3D4A6B",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0F1B3D",
    borderRadius: "0.625rem",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  elements: {
    card: "shadow-lg border border-surface-border",
    formButtonPrimary:
      "bg-brand-gradient hover:opacity-95 text-sm normal-case shadow-none",
    footerActionLink: "text-brand-blue hover:text-brand-violet",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={frFR as any} appearance={clerkAppearance}>
      <html lang="fr">
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
