import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import p from "@/components/landing/InnerPages.module.css";
import { Reveal } from "@/components/landing/Reveal";

export default function CguPage() {
  return (
    <div className={p.editorial}>
      <MarketingHeader />
      <main id="main-content" className={p.legal}>
        <div className="relative mx-auto max-w-2xl px-6 py-16">
          <Reveal>
            <div className="rounded-2xl border border-surface-border bg-white/75 p-8 shadow-sm backdrop-blur-md sm:p-10">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-primary">
                Conditions d’utilisation, document en cours de finalisation
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-ink">
                Conditions Générales d&apos;Utilisation
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Ce document
                sera complété au fur et à mesure de l&apos;avancement
                administratif du projet (immatriculation en cours). Une question
                ? Contactez-nous directement.
              </p>

              <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-ink-soft">
                <section>
                  <h2 className="text-base font-semibold text-ink">1. Objet</h2>
                  <p className="mt-2">
                    Les présentes Conditions Générales d&apos;Utilisation (« CGU
                    ») définissent les modalités et conditions dans lesquelles
                    RH Pilot (immatriculation en cours en tant
                    qu&apos;auto-entreprise, SIRET à venir) met à disposition de
                    ses utilisateurs professionnels le logiciel RH Pilot.
                  </p>
                  <p className="mt-2">
                    Le Service est réservé à un usage strictement professionnel
                    (B2B) et n&apos;est pas destiné aux consommateurs
                    particuliers.
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-ink">
                    2. Description du Service
                  </h2>
                  <p className="mt-2">
                    RH Pilot est un logiciel en ligne permettant aux entreprises
                    de gérer les fiches de leurs salariés, de déclencher des
                    parcours RH générant automatiquement un plan d&apos;action,
                    et de bénéficier de rappels et de suggestions proactives.
                  </p>
                  <p className="mt-2">
                    RH Pilot comprend un module de paie qui calcule les bulletins
                    à partir des données saisies par le Client. Le Client reste
                    responsable de l&apos;exactitude de ces données, de la
                    vérification des bulletins avant leur validation et de ses
                    déclarations sociales. RH Pilot ne fournit aucun conseil
                    juridique. Les échéances suggérées sont des recommandations
                    organisationnelles, jamais des calculs juridiques certifiés.
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-ink">
                    3. Disponibilité et conservation des données
                  </h2>
                  <p className="mt-2">
                    Les bulletins de paie et documents mis à disposition des
                    salariés dans leur espace salarié sont conservés pendant
                    cinquante ans à compter de leur émission. Ils restent
                    accessibles au salarié après la fin de son contrat, ainsi
                    qu&apos;après la résiliation de l&apos;abonnement du Client
                    ou la suppression de son compte. Chaque salarié peut à tout
                    moment télécharger l&apos;intégralité de ses documents en une
                    seule fois, au format PDF.
                  </p>
                  <p className="mt-2">
                    En cas de fermeture du service, les Clients et les salariés
                    disposant d&apos;un espace en sont informés au moins trois
                    mois à l&apos;avance, afin de récupérer leurs documents.
                  </p>
                  <p className="mt-2">
                    Les autres données du Client sont conservées pendant la durée
                    de son abonnement ; il peut les exporter à tout moment. Les
                    conditions tarifaires sont présentées sur la page Tarifs.
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-ink">
                    4. Obligations du Client
                  </h2>
                  <p className="mt-2">
                    Le Client s&apos;engage à utiliser le Service conformément à
                    sa destination professionnelle, à ne saisir que des données
                    qu&apos;il est légalement autorisé à traiter, et à respecter
                    ses propres obligations d&apos;employeur. RH Pilot est un
                    outil d&apos;organisation, pas un substitut à ces
                    obligations.
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-ink">
                    5. Espace salarié
                  </h2>
                  <p className="mt-2">
                    Le Client peut ouvrir à ses salariés un espace personnel
                    gratuit, qui ne donne aucun accès aux données de
                    l&apos;organisation. Il lui appartient d&apos;informer chaque
                    salarié de son droit de refuser le bulletin électronique,
                    dans les conditions prévues par l&apos;article D3243-7 du
                    Code du travail ; RH Pilot fournit la note d&apos;information
                    et en conserve la date de remise. Le salarié peut refuser le
                    format électronique à tout moment depuis son espace.
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-ink">
                    6. Limitation de responsabilité
                  </h2>
                  <p className="mt-2">
                    RH Pilot est un outil d&apos;aide à l&apos;organisation RH et
                    à la paie. Il ne remplace pas un conseil juridique, un
                    expert-comptable ou la médecine du travail. L&apos;exactitude
                    juridique des échéances et des bulletins validés reste sous
                    la responsabilité du Client, qui doit vérifier les règles
                    applicables à sa situation.
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-ink">
                    7. Contact
                  </h2>
                  <p className="mt-2">
                    Pour toute question relative à ces conditions,
                    contactez-nous directement via les coordonnées communiquées
                    lors de votre inscription.
                  </p>
                </section>
              </div>
            </div>
          </Reveal>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
