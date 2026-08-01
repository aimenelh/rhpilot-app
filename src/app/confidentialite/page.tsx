import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <MarketingHeader />

      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-blue">
          Version bêta — document en cours de finalisation
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Politique de confidentialité</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          RH Pilot est actuellement en phase de bêta fermée (immatriculation en tant
          qu&apos;auto-entreprise en cours). Ce document reflète fidèlement comment vos
          données sont traitées aujourd&apos;hui.
        </p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-ink-soft">
          <section>
            <h2 className="text-base font-semibold text-ink">1. Qui traite vos données ?</h2>
            <p className="mt-2">
              RH Pilot est éditeur du Service. Concernant les données des salariés saisies
              dans le Service : <strong className="text-ink">l&apos;entreprise cliente est
              responsable du traitement</strong>, RH Pilot agit en tant que sous-traitant au
              sens de l&apos;article 28 du RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">2. Quelles données sont collectées</h2>
            <p className="mt-2">
              <strong className="text-ink">Compte utilisateur</strong> : email, prénom, nom (via
              Clerk, notre fournisseur d&apos;authentification).
            </p>
            <p className="mt-2">
              <strong className="text-ink">Salariés</strong>, saisis par le Client : identité,
              poste, date d&apos;embauche, type de contrat, durée de période d&apos;essai,
              prochaine date de suivi médical (jamais son contenu ou son résultat), manager
              direct, historique des parcours RH.
            </p>
            <p className="mt-2">
              <strong className="text-ink">Journal d&apos;audit</strong> des actions effectuées
              dans le Service, à des fins de traçabilité et de sécurité.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">3. Finalités</h2>
            <p className="mt-2">
              Fournir le Service, envoyer les notifications demandées, assurer la sécurité et
              la traçabilité des actions. Les données ne sont jamais utilisées pour entraîner
              un modèle d&apos;intelligence artificielle sans consentement explicite préalable,
              ni vendues à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">4. Sous-traitants ultérieurs</h2>
            <p className="mt-2">Les données peuvent être transmises à :</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              <li>• <strong className="text-ink">Neon</strong> — hébergement de la base de données (Union européenne).</li>
              <li>• <strong className="text-ink">Clerk</strong> — authentification et gestion des comptes.</li>
              <li>• <strong className="text-ink">Resend</strong> — envoi des emails transactionnels.</li>
              <li>• <strong className="text-ink">Vercel</strong> — hébergement de l&apos;application.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">5. Durée de conservation</h2>
            <p className="mt-2">
              Les salariés archivés restent accessibles à l&apos;organisation (historique),
              sans suppression automatique tant que le compte est actif. Les comptes
              désactivés sont anonymisés immédiatement, puis supprimés après une période de
              rétention raisonnable, sauf obligation légale de conservation plus longue.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">6. Vos droits</h2>
            <p className="mt-2">
              Conformément au RGPD : droit d&apos;accès, de rectification, d&apos;effacement,
              de limitation, de portabilité et d&apos;opposition. Pour les salariés d&apos;une
              entreprise cliente, ces demandes doivent être adressées à l&apos;employeur
              (responsable de traitement). Vous disposez également du droit d&apos;introduire
              une réclamation auprès de la CNIL (www.cnil.fr).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">7. Sécurité</h2>
            <p className="mt-2">
              Isolation stricte des données entre chaque organisation cliente, authentification
              sécurisée déléguée à un fournisseur spécialisé, accès aux fichiers joints
              strictement privé via liens temporaires signés.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">8. Contact</h2>
            <p className="mt-2">
              Pour toute question relative à cette politique, contactez-nous directement via
              les coordonnées communiquées lors de votre entrée en bêta.
            </p>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
