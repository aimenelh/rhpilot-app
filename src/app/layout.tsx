import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { Analytics } from "@vercel/analytics/next";
import { PwaRegister } from "@/components/PwaRegister";
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

// Police d'accroche pour les titres (h1/h2/h3) uniquement — le corps
// de texte reste en Inter. Appliquée globalement via globals.css
// (règle "h1, h2, h3"), pas besoin de toucher chaque page une par
// une. Seuls les deux poids réellement utilisés sont chargés.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-heading",
});

export const viewport: Viewport = {
  themeColor: "#E8432E",
};

export const metadata: Metadata = {
  title: "RH Pilot, votre copilote d'organisation RH",
  description:
    "RH Pilot transforme chaque événement RH en plan d'action complet : tâches, échéances, responsables et preuves.",
  // Bêta ouverte à l'indexation ; les pages privées restent bloquées
  // séparément (voir src/app/robots.ts).
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RH Pilot",
  },
};

// Habille les écrans Clerk (connexion, inscription, gestion du
// compte) avec les jetons de la charte RH Pilot plutôt que de les
// laisser à l'apparence par défaut.
const clerkAppearance = {
  variables: {
    colorPrimary: "#E8432E",
    colorText: "#14151A",
    colorTextSecondary: "#4A4A4D",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#14151A",
    borderRadius: "0.625rem",
    // Inter en priorité, avec le même repli système qu'avant si la
    // variable n'est pour une raison quelconque pas encore prête.
    fontFamily:
      "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  elements: {
    card: "shadow-lg border border-surface-border",
    formButtonPrimary:
      "bg-brand-primary hover:opacity-95 text-sm normal-case shadow-none",
    footerActionLink: "text-brand-primary hover:text-brand-primary-dark",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={frFR as any} appearance={clerkAppearance}>
      <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <body className={`${inter.className} antialiased`}>
          {children}
          <Analytics />
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
