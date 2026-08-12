import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// display: "swap" évite tout texte invisible pendant le chargement de
// la police (FOIT) — le texte s'affiche immédiatement dans une police
// de secours, puis bascule sur Inter dès qu'elle est prête.
// variable expose --font-inter en CSS, pour que les écrans Clerk
// (qui ne peuvent pas recevoir de className React) puissent aussi
// l'utiliser via une simple référence de variable.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RH Pilot, votre copilote d'organisation RH",
  description:
    "RH Pilot transforme chaque événement RH en plan d'action complet : tâches, échéances, responsables et preuves.",
  // Bêta ouverte à l'indexation depuis [aujourd'hui] — décision
  // explicite prise avec Aimen, pas un oubli. Voir aussi
  // src/app/robots.ts pour le blocage des pages privées.
  robots: {
    index: true,
    follow: true,
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
    // Inter en priorité, avec le même repli système qu'avant si la
    // variable n'est pour une raison quelconque pas encore prête.
    fontFamily:
      "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
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
      <html lang="fr" className={inter.variable}>
        <body className={`${inter.className} antialiased`}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
