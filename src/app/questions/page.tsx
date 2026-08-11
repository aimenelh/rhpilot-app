import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Database, CircleDollarSign, Users, ShieldCheck, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Reveal } from "@/components/landing/Reveal";
import { FaqItem } from "@/components/landing/FaqItem";

export const metadata = {
  title: "Vos questions, avant de vous lancer — RH Pilot",
  description:
    "Excel, SIRH, prix, adoption par l'équipe, sécurité des données : toutes les questions qu'on nous pose vraiment, avec des réponses honnêtes.",
};

const MYTHS = [
  {
    myth: "Pourquoi je prendrais ce logiciel si je me suis habituée à mes tableaux Excel et mon organisation ?",
    reality:
      "Excel fonctionne, jusqu'au jour où quelqu'un oublie de vérifier l'onglet. RH Pilot ne remplace pas votre organisation, il la rend simplement automatique : les échéances se calculent toutes seules, personne n'a besoin de s'en souvenir.",
  },
  {
    myth: "Si ce n'est pas un SIRH, quelle est son utilité ?",
    reality:
      "Un SIRH stocke, archive, centralise. RH Pilot organise, anticipe et coordonne. Il vous dit quoi faire, quand, et pourquoi, plutôt que de simplement garder vos données au même endroit.",
  },
  {
    myth: "Et si mon équipe n'utilise pas l'outil au quotidien ?",
    reality:
      "Personne n'a besoin de formation. Si vous savez lire un tableau de bord et cliquer sur un bouton, vous savez utiliser RH Pilot.",
  },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
      {children}
    </span>
  );
}

export default function QuestionsPage() {
  return (
    <div className="min-h-screen">
      <AmbientNetwork />
      <MarketingHeader />

      {/* Titre */}
      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Reveal variant="scale">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Vos questions, avant de vous lancer.
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Les vraies questions qu&apos;on nous pose, avec des réponses honnêtes. Pas de
            discours commercial.
          </p>
        </Reveal>
      </section>

      {/* Mythe / Réalité — les objections les plus fortes */}
      <section className="mx-auto max-w-2xl px-6 pb-16">
        <div className="flex flex-col gap-10">
          {MYTHS.map((item, index) => (
            <div key={item.myth}>
              <Reveal variant="left" delay={index * 120}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-rose/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-rose">
                  <X size={12} /> Mythe
                </span>
                <p className="mt-3 text-xl font-medium leading-snug text-ink-faint line-through decoration-accent-rose/40 decoration-2">
                  « {item.myth} »
                </p>
              </Reveal>
              <Reveal variant="right" delay={index * 120 + 150}>
                <div className="mt-4 flex items-start gap-3 border-l-2 border-accent-teal/40 pl-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-teal">
                      <Check size={12} /> Réalité
                    </span>
                    <p className="mt-2 text-base leading-relaxed text-ink">{item.reality}</p>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ classée par thème */}
      <section className="relative border-y border-surface-border bg-white/70 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal variant="scale">
            <h2 className="text-center text-2xl font-semibold text-ink">Toutes les autres questions</h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Reveal variant="left">
              <Card>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-teal/10 text-accent-teal">
                    <FileSpreadsheet size={16} />
                  </span>
                  <Kicker>Excel &amp; habitudes</Kicker>
                </div>
                <div className="mt-3">
                  <FaqItem question="Vais-je devoir tout ressaisir mes données existantes ?">
                    Non. Vous pouvez importer vos salariés directement depuis un fichier CSV, ou
                    générer une organisation de démonstration pour explorer RH Pilot avant de vous
                    lancer pour de vrai.
                  </FaqItem>
                  <FaqItem question="Mon organisation actuelle fonctionne, pourquoi changer ?">
                    Excel ne vous prévient jamais qu&apos;une échéance approche. RH Pilot ne
                    remplace pas votre rigueur, il la rend automatique : les dates se calculent
                    toutes seules, sans dépendre de la mémoire de quelqu&apos;un.
                  </FaqItem>
                </div>
              </Card>
            </Reveal>

            <Reveal variant="right">
              <Card>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Database size={16} />
                  </span>
                  <Kicker>Ce n&apos;est pas un SIRH</Kicker>
                </div>
                <div className="mt-3">
                  <FaqItem question="J'ai déjà un SIRH, RH Pilot fait doublon ?">
                    Non. RH Pilot ne remplace aucun outil existant : il rend visible ce qui,
                    sinon, resterait dans la tête de quelqu&apos;un. Beaucoup de nos utilisateurs
                    gardent leur SIRH pour l&apos;administratif pur, et utilisent RH Pilot pour le
                    suivi et les échéances.
                  </FaqItem>
                  <FaqItem question="RH Pilot remplace-t-il mon logiciel de paie ?">
                    Non, et il ne le sera jamais. RH Pilot vous aide à préparer les éléments
                    variables, jamais à les calculer ou les déclarer à votre place.
                  </FaqItem>
                </div>
              </Card>
            </Reveal>

            <Reveal variant="left" delay={100}>
              <Card>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-amber/10 text-accent-amber">
                    <CircleDollarSign size={16} />
                  </span>
                  <Kicker>Prix &amp; engagement</Kicker>
                </div>
                <div className="mt-3">
                  <FaqItem question="Combien ça coûte ?">
                    RH Pilot est actuellement gratuit, en bêta. Le modèle tarifaire définitif
                    n&apos;est pas encore figé, et sera communiqué clairement avant toute mise en
                    place. Jamais de surprise sur votre carte bancaire.
                  </FaqItem>
                  <FaqItem question="Y a-t-il un engagement ?">
                    Aucun. Vous pouvez arrêter d&apos;utiliser RH Pilot à tout moment.
                  </FaqItem>
                </div>
              </Card>
            </Reveal>

            <Reveal variant="right" delay={100}>
              <Card>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                    <Users size={16} />
                  </span>
                  <Kicker>Équipe &amp; adoption</Kicker>
                </div>
                <div className="mt-3">
                  <FaqItem question="Mon équipe va-t-elle devoir apprendre un outil compliqué ?">
                    Non. Si vous savez lire un tableau de bord et cliquer sur un bouton, vous
                    savez utiliser RH Pilot, sans configuration compliquée ni formation
                    nécessaire.
                  </FaqItem>
                  <FaqItem question="Combien de temps pour être opérationnel ?">
                    Quelques minutes. Créez votre organisation, ajoutez un salarié ou générez une
                    démonstration, et RH Pilot commence immédiatement à calculer vos échéances.
                  </FaqItem>
                </div>
              </Card>
            </Reveal>

            <Reveal variant="left" delay={200} className="md:col-span-2">
              <Card>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-rose/10 text-accent-rose">
                    <ShieldCheck size={16} />
                  </span>
                  <Kicker>Données &amp; IA</Kicker>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  <div>
                    <FaqItem question="Mes données sont-elles en sécurité ?">
                      Isolation stricte entre organisations, hébergement en Europe,
                      authentification déléguée à un spécialiste.{" "}
                      <Link href="/securite" className="font-medium text-brand-blue hover:underline">
                        Voir le détail →
                      </Link>
                    </FaqItem>
                    <FaqItem question="Que se passe-t-il si j'arrête d'utiliser RH Pilot ?">
                      Vous pouvez exporter l&apos;ensemble de vos données à tout moment,
                      conformément au RGPD, directement depuis votre espace.
                    </FaqItem>
                  </div>
                  <div>
                    <FaqItem question="L'assistant IA peut-il inventer des informations ?">
                      Non. Il ne répond qu&apos;à partir de vos vraies données, et le dit
                      clairement quand une information lui manque, plutôt que de deviner.
                    </FaqItem>
                    <FaqItem question="RH Pilot me dit-il ce que dit ma convention collective ?">
                      Non. RH Pilot n&apos;interprète jamais votre convention collective : il
                      vous oriente simplement vers la bonne source officielle, au bon moment.
                    </FaqItem>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Reveal variant="bounce">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="text-base font-medium text-ink">
              Une question qu&apos;on n&apos;a pas couverte ?
            </p>
            <Link href="/sign-up" className="mt-5 inline-block">
              <Button className="px-6 py-3 text-base">
                <span className="inline-flex items-center gap-2">
                  Essayez, vous verrez par vous-même <ArrowRight size={16} />
                </span>
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
