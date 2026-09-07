import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Rupture conventionnelle : indemnisation chômage réduite en 2026, RH Pilot",
  description:
    "Depuis le 1er septembre 2026, la durée maximale d'indemnisation chômage après une rupture conventionnelle diminue. Ce que ça change dans une négociation.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Actualité réglementaire"
      title="Rupture conventionnelle : l'indemnisation chômage baisse depuis le 1er septembre 2026"
      readTime="4 min de lecture"
    >
      <P>
        La rupture conventionnelle reste, sur le papier, exactement la même procédure&nbsp;:
        un accord entre l&apos;employeur et le salarié, une indemnité de rupture au moins égale
        à l&apos;indemnité légale de licenciement, une homologation par la DREETS. Ce qui change
        au 1er septembre 2026, ce n&apos;est pas la procédure, c&apos;est ce qui se passe après,
        du côté de France Travail.
      </P>

      <H2>Ce qui baisse précisément</H2>
      <P>
        La durée maximale d&apos;indemnisation chômage pour un salarié qui quitte son emploi via
        une rupture conventionnelle diminue&nbsp;:
      </P>
      <List
        items={[
          "Pour les moins de 55 ans : de 18 mois à 15 mois maximum.",
          "Pour les salariés plus âgés, la durée maximale baisse également, avec un palier spécifique au-delà de 57 ans.",
        ]}
      />
      <P>
        Cette baisse ne change rien aux conditions d&apos;éligibilité à l&apos;allocation chômage
        elle-même (durée d&apos;affiliation, etc.), seulement la durée maximale pendant laquelle
        elle peut être versée pour ce motif de rupture précis.
      </P>

      <H2>Pourquoi c&apos;est le genre de détail qui compte dans une négociation</H2>
      <P>
        Une rupture conventionnelle se négocie souvent avec, en toile de fond, une estimation
        implicite de la durée pendant laquelle le salarié pourra être indemnisé le temps de
        retrouver un poste. Un plafond réduit change cette estimation, indépendamment du
        montant de l&apos;indemnité de rupture elle-même. Deux dossiers strictement identiques
        sur le papier, homologués avant et après le 1er septembre 2026, n&apos;ouvrent plus les
        mêmes droits pour le salarié concerné.
      </P>
      <P>
        Ce n&apos;est pas un détail qui change la façon de mener la négociation RH, mais
        c&apos;est une information que le salarié va chercher, et qu&apos;il vaut mieux connaître
        avant lui plutôt qu&apos;après.
      </P>

      <H2>Une date qui concentre plusieurs changements</H2>
      <P>
        Le 1er septembre 2026 est aussi la date d&apos;entrée en vigueur de la réforme
        plafonnant la durée des arrêts de travail prescrits, un sujet distinct mais qui entre
        en vigueur au même moment. Voir{" "}
        <a
          href="/ressources/reforme-arrets-travail-2026"
          className="text-brand-primary hover:underline"
        >
          notre article sur cette réforme
        </a>
        .
      </P>
    </ArticleLayout>
  );
}
