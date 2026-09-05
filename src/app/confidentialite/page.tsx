import Link from "next/link";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Politique de confidentialité, RH Pilot",
  description:
    "Quelles données RH Pilot collecte, pourquoi, avec qui elles sont partagées et où elles sont hébergées, sous-traitant par sous-traitant.",
};

// Dernière révision : garder cette date à jour à chaque modification
// du contenu ci-dessous, c'est la seule chose que la loi demande de
// signaler explicitement en haut d'une politique de confidentialité.
const LAST_UPDATED = "17 août 2026";

const SUBPROCESSORS = [
  {
    name: "Clerk",
    role: "Authentification (connexion, gestion des comptes)",
    location: "États-Unis",
    detail:
      "Les données de connexion (email, identité) sont stockées aux États-Unis. Clerk dispose d'un représentant pour la protection des données en Europe et s'appuie sur les clauses contractuelles types pour encadrer ce transfert, conformément au RGPD.",
  },
  {
    name: "Neon",
    role: "Base de données (salariés, parcours, tâches)",
    location: "Europe (Francfort, Allemagne)",
    detail: "L'ensemble des données RH que vous saisissez dans RH Pilot est hébergé sur ce serveur, en Europe.",
  },
  {
    name: "Anthropic",
    role: "Copilote (réponses aux questions posées)",
    location: "États-Unis",
    detail:
      "Les questions posées au Copilote, accompagnées des données strictement nécessaires pour y répondre, sont transmises à Anthropic. Conservées au maximum 30 jours puis supprimées automatiquement, jamais utilisées pour entraîner leurs modèles.",
  },
  {
    name: "Vercel",
    role: "Hébergement du site et de l'application",
    location: "Exécution en Europe, société basée aux États-Unis",
    detail:
      "L'application s'exécute sur des serveurs européens, mais Vercel Inc. (l'entreprise) est basée aux États-Unis et certaines données de compte transitent sous les mêmes garanties contractuelles.",
  },
  {
    name: "Resend",
    role: "Envoi des emails (invitations, résumés de tâches)",
    location: "États-Unis",
    detail:
      "Les emails sont envoyés depuis l'Europe, mais les métadonnées de compte sont stockées aux États-Unis. Resend est certifié dans le cadre du Data Privacy Framework UE-États-Unis.",
  },
  {
    name: "Vercel Analytics",
    role: "Statistiques de fréquentation du site",
    location: "Anonymisé, sans cookie",
    detail:
      "Aucun cookie, aucune donnée permettant de vous identifier individuellement. Une session est automatiquement effacée après 24 heures.",
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-surface-border py-10 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      <section className="mx-auto max-w-2xl px-6 py-16">
        <Reveal variant="left">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Politique de confidentialité
          </h1>
          <p className="mt-4 text-base text-ink-faint">Dernière mise à jour : {LAST_UPDATED}</p>
          <p className="mt-4 text-lg text-ink-soft">
            Cette page dit précisément quelles données RH Pilot collecte, pourquoi, avec qui elles sont
            partagées, et où elles sont réellement hébergées, prestataire par prestataire. Pas de
            formule vague du type « vos données sont en sécurité » sans expliquer ce que ça recouvre.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-16">
        <Section title="1. Deux rôles distincts">
          <p>
            RH Pilot traite deux catégories de données, avec deux responsabilités différentes au sens du
            RGPD.
          </p>
          <p>
            Pour les données de votre compte (email, identité, préférences), RH Pilot est{" "}
            <strong className="font-semibold text-ink">responsable du traitement</strong> : c&apos;est
            nous qui décidons pourquoi et comment ces données sont utilisées.
          </p>
          <p>
            Pour les données que vous saisissez sur vos salariés (nom, date d&apos;embauche, contrat,
            visite médicale...), RH Pilot agit comme{" "}
            <strong className="font-semibold text-ink">sous-traitant</strong>. Votre entreprise reste
            responsable du traitement de ces données : c&apos;est vous qui décidez de les saisir, de les
            conserver ou de les supprimer, RH Pilot se contente de les stocker et de les organiser pour
            vous.
          </p>
        </Section>

        <Section title="2. Quelles données sont collectées">
          <p>
            <strong className="font-semibold text-ink">Données de compte</strong> : email, nom, mot de
            passe (géré directement par Clerk, jamais stocké par RH Pilot lui-même).
          </p>
          <p>
            <strong className="font-semibold text-ink">Données RH que vous saisissez</strong> : identité
            des salariés, dates de contrat, période d&apos;essai, visites médicales, tâches et
            échéances associées.
          </p>
          <p>
            <strong className="font-semibold text-ink">Questions posées au Copilote</strong> : le texte
            de votre question, et les données de l&apos;organisation strictement nécessaires pour y
            répondre.
          </p>
          <p>
            <strong className="font-semibold text-ink">Données de navigation</strong> : statistiques de
            fréquentation anonymisées, sans cookie, sans identification individuelle possible.
          </p>
        </Section>

        <Section title="3. Pourquoi ces données sont collectées">
          <p>
            Faire fonctionner RH Pilot : calculer vos échéances, générer vos parcours RH, répondre à vos
            questions. Rien de plus. Aucune donnée n&apos;est vendue, louée ou utilisée à des fins
            publicitaires.
          </p>
        </Section>

        <Section title="4. Avec qui ces données sont partagées, et où">
          <p className="mb-2">
            RH Pilot s&apos;appuie sur un nombre volontairement restreint de prestataires spécialisés,
            plutôt que de tout construire soi-même. Voici, sans approximation, ce que fait chacun et où
            les données concernées sont réellement traitées.
          </p>
          <div className="mt-2 flex flex-col gap-4">
            {SUBPROCESSORS.map((p) => (
              <Card key={p.name} compact>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold text-ink">{p.name}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{p.location}</p>
                </div>
                <p className="mt-1 text-sm font-medium text-ink-soft">{p.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.detail}</p>
              </Card>
            ))}
          </div>
          <p className="mt-4">
            Pour les prestataires basés aux États-Unis, le transfert de données est encadré soit par des
            clauses contractuelles types approuvées par la Commission européenne, soit par une
            certification dans le cadre du Data Privacy Framework UE-États-Unis, conformément aux
            exigences du RGPD.
          </p>
        </Section>

        <Section title="5. Combien de temps ces données sont conservées">
          <p>
            Vos données RH sont conservées tant que votre compte est actif. Vous pouvez exporter
            l&apos;ensemble de vos données à tout moment depuis votre espace, ou demander leur
            suppression complète en nous contactant.
          </p>
          <p>
            Les questions posées au Copilote sont conservées au maximum 30 jours du côté d&apos;Anthropic,
            puis supprimées automatiquement de leurs systèmes.
          </p>
        </Section>

        <Section title="6. Vos droits">
          <p>
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation et de portabilité de vos données, ainsi que du droit de vous
            opposer à leur traitement. Pour l&apos;exercer, écrivez-nous à l&apos;adresse indiquée
            ci-dessous. Vous pouvez aussi déposer une réclamation auprès de la CNIL
            (www.cnil.fr) si vous estimez que vos droits ne sont pas respectés.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            RH Pilot n&apos;utilise aucun cookie de mesure d&apos;audience ou publicitaire. Clerk dépose
            un cookie technique indispensable au maintien de votre connexion : sans lui, vous seriez
            déconnecté à chaque page. Ce type de cookie est exempté de consentement par la loi, car
            strictement nécessaire au fonctionnement du service.
          </p>
        </Section>

        <Section title="8. Sécurité">
          <p>
            Isolation stricte des données entre organisations : une entreprise ne peut jamais voir les
            données d&apos;une autre. Authentification déléguée à un spécialiste plutôt que gérée en
            interne. Connexions chiffrées de bout en bout.
          </p>
        </Section>

        <Section title="9. Modifications de cette politique">
          <p>
            Cette page peut évoluer, notamment si un prestataire change ou si une nouvelle fonctionnalité
            traite des données différemment. La date de dernière mise à jour en haut de page reflète
            toujours la version en vigueur.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Pour toute question sur cette politique ou pour exercer vos droits, écrivez à{" "}
            <Link href="mailto:aimenoffi@gmail.com" className="font-medium text-brand-primary hover:underline">
              aimenoffi@gmail.com
            </Link>
            .
          </p>
        </Section>
      </section>

      <MarketingFooter />
    </div>
  );
}
