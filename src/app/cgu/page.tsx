import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";

export default function CguPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <div className="relative mx-auto max-w-2xl px-6 py-16">
        <Reveal>
          <div className="rounded-2xl border border-surface-border bg-white/75 p-8 shadow-sm backdrop-blur-md sm:p-10">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-blue">
              Version bêta, document en cours de finalisation
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              RH Pilot est actuellement en phase de bêta fermée. Ce document sera complété au fur
              et à mesure de l&apos;avancement administratif du projet (immatriculation en cours).
              Une question ? Contactez-nous directement.
            </p>

            <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-ink-soft">
              <section>
                <h2 className="text-base font-semibold text-ink">1. Objet</h2>
                <p className="mt-2">
                  Les présentes Conditions Générales d&apos;Utilisation (« CGU ») définissent les
                  modalités et conditions dans lesquelles RH Pilot (immatriculation en cours en
                  tant qu&apos;auto-entreprise, SIRET à venir) met à disposition de ses
                  utilisateurs professionnels le logiciel RH Pilot.
                </p>
                <p className="mt-2">
                  Le Service est réservé à un usage strictement professionnel (B2B) et n&apos;est
                  pas destiné aux consommateurs particuliers.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-ink">2. Description du Service</h2>
                <p className="mt-2">
                  RH Pilot est un logiciel en ligne permettant aux entreprises de gérer les fiches
                  de leurs salariés, de déclencher des parcours RH générant automatiquement un plan
                  d&apos;action, et de bénéficier de rappels et de suggestions proactives.
                </p>
                <p className="mt-2">
                  RH Pilot n&apos;est pas un logiciel de paie, ne fournit aucun conseil juridique,
                  et ne garantit la conformité légale d&apos;aucune échéance. Les échéances
                  suggérées sont des recommandations organisationnelles, jamais des calculs
                  juridiques certifiés.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-ink">
                  3. Bêta fermée : conditions particulières
                </h2>
                <p className="mt-2">
                  Le Service est actuellement fourni à titre gratuit, dans le cadre d&apos;une
                  bêta fermée réservée à un nombre limité de testeurs. Aucun engagement de
                  disponibilité continue ni de conservation à long terme des données n&apos;est
                  garanti à ce stade. Les utilisateurs de la bêta sont invités à ne pas y
                  enregistrer de données qu&apos;ils ne pourraient se permettre de perdre.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-ink">4. Obligations du Client</h2>
                <p className="mt-2">
                  Le Client s&apos;engage à utiliser le Service conformément à sa destination
                  professionnelle, à ne saisir que des données qu&apos;il est légalement autorisé
                  à traiter, et à respecter ses propres obligations d&apos;employeur. RH Pilot
                  est un outil d&apos;organisation, pas un substitut à ces obligations.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-ink">
                  5. Limitation de responsabilité
                </h2>
                <p className="mt-2">
                  RH Pilot est un outil d&apos;aide à l&apos;organisation RH. Il ne remplace pas
                  un conseil juridique, un expert-comptable, un service de paie, ou la médecine du
                  travail. L&apos;exactitude juridique des échéances reste sous la seule
                  responsabilité du Client, qui doit vérifier les délais légaux applicables à sa
                  situation.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-ink">6. Contact</h2>
                <p className="mt-2">
                  Pour toute question relative à ces conditions, contactez-nous directement via
                  les coordonnées communiquées lors de votre entrée en bêta.
                </p>
              </section>
            </div>
          </div>
        </Reveal>
      </div>

      <MarketingFooter />
    </div>
  );
}
