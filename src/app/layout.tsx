import type { Metadata, Viewport } from "next";
import { DM_Sans, Caveat, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { Analytics } from "@vercel/analytics/next";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

// Police principale de RH Pilot : DM Sans privilégie la lisibilité,
// des formes douces et une présence plus humaine qu'une police
// géométrique de type Space Grotesk. Elle est utilisée dans toute
// l'application pour garder une identité typographique homogène.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-handwriting",
});

// Police d'affichage réservée aux gros titres éditoriaux du marketing
// (hero, titres de page) : un sérif chaleureux et légèrement décalé,
// à côté de DM Sans qui reste la police de tout le reste (interface,
// texte courant, application). Jamais utilisée dans le produit lui-même.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

export const viewport: Viewport = {
  themeColor: "#E8432E",
};

export const metadata: Metadata = {
  title: "RH Pilot, votre copilote d'organisation RH",
  description:
    "RH Pilot transforme chaque événement RH en plan d'action complet : tâches, échéances, responsables et preuves.",
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

// Habille les écrans Clerk avec les mêmes repères typographiques que
// le reste de RH Pilot pour éviter toute rupture visuelle.
const clerkAppearance = {
  variables: {
    colorPrimary: "#E8432E",
    colorText: "#14151A",
    colorTextSecondary: "#4A4A4D",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#14151A",
    borderRadius: "0.625rem",
    fontFamily:
      "var(--font-dm-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
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
      <html lang="fr" className={`${dmSans.variable} ${caveat.variable} ${fraunces.variable}`}>
        <body className={`${dmSans.className} antialiased`}>
          {children}
          <Analytics />
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
