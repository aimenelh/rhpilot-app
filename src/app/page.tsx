import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LandingPage } from "@/components/landing/LandingPage";
import { CANONICAL_SITE_URL } from "@/lib/appUrl";

export default function HomePage() {
  const { userId } = auth();
  if (userId) redirect("/dashboard");
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "RH Pilot", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: CANONICAL_SITE_URL, description: "Logiciel de suivi RH pour les TPE et PME : salariés, parcours, échéances et documents.", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Gratuit jusqu’à 3 salariés" } }) }} /><LandingPage /></>;
}
 