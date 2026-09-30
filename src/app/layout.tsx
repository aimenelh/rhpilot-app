import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { CookieConsent } from "@/components/CookieConsent";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";
import { CANONICAL_SITE_URL } from "@/lib/appUrl";

// Police principale de RH Pilot : DM Sans privilégie la lisibilité,
// des formes douces et une présence plus humaine qu'une police
// géométrique de type Space Grotesk. Elle est utilisée dans toute
// l'application pour garder une identité typographique homogène.
// Fichiers embarqués : une réponse Google Fonts ne doit pas bloquer un build.
const dmSans = localFont({
  src: "./fonts/dm-sans.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-dm-sans",
});

const caveat = localFont({
  src: "./fonts/caveat.woff2",
  weight: "500 700",
  display: "swap",
  variable: "--font-handwriting",
});

// Police d'affichage réservée aux gros titres éditoriaux du marketing
// (hero, titres de page) : un sérif chaleureux et légèrement décalé,
// à côté de DM Sans qui reste la police de tout le reste (interface,
// texte courant, application). Jamais utilisée dans le produit lui-même.
const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces.woff2", weight: "500 700", style: "normal" },
    { path: "./fonts/fraunces-italic.woff2", weight: "500 700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-fraunces",
});

export const viewport: Viewport = {
  themeColor: "#E8432E",
};

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_SITE_URL),
  title: { default: "RH Pilot | Logiciel RH pour TPE et PME", template: "%s | RH Pilot" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "RH Pilot", title: "RH Pilot | Le suivi RH de votre équipe", description: "Salariés, parcours, échéances et documents réunis au même endroit.", images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
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
          <CookieConsent />
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
