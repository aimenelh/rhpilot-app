import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <MarketingHeader />

      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-ink">Politique des cookies</h1>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-soft">
          <p>
            RH Pilot utilise uniquement des cookies <strong className="text-ink">strictement
            nécessaires</strong> au fonctionnement de l&apos;application : authentification,
            maintien de votre session, et sécurité. Ces cookies ne servent qu&apos;à vous
            permettre de rester connecté et d&apos;utiliser le Service en toute sécurité. Ils
            ne suivent pas votre navigation à des fins publicitaires ou statistiques.
          </p>

          <div>
            <h2 className="text-base font-semibold text-ink">
              Cookies déposés aujourd&apos;hui
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <strong className="text-ink">Authentification et session</strong> (Clerk) :
                permet de vous garder connecté et de sécuriser votre accès à votre espace RH
                Pilot.
              </li>
            </ul>
          </div>

          <p>
            <strong className="text-ink">Aucun cookie publicitaire ou de suivi</strong> (Google
            Analytics, Meta Pixel, ou équivalent) n&apos;est déposé sans votre consentement
            préalable. Si RH Pilot venait à en utiliser un jour, cette page serait mise à jour
            et un bandeau de consentement serait ajouté avant tout dépôt de ce type de cookie,
            pas après.
          </p>

          <p>
            Pour toute question relative à cette politique, contactez-nous directement via les
            coordonnées communiquées lors de votre entrée en bêta.
          </p>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
