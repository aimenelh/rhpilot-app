import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Rupture conventionnelle : l’indemnisation chômage réduite au 1er septembre 2026",
  description:
    "Depuis le 1er septembre 2026, la durée maximale d’indemnisation chômage après une rupture conventionnelle est réduite, de 18 à 15 mois pour les moins de 55 ans. La procédure de rupture reste inchangée.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Actualité réglementaire"
      title="Rupture conventionnelle : l’indemnisation chômage réduite au 1er septembre 2026"
      readTime="4 min de lecture"
    >
      <P>
        La procédure de rupture conventionnelle ne change pas&nbsp;: un accord entre
        l’employeur et le salarié, une indemnité de rupture au moins égale à l’indemnité
        légale de licenciement, une homologation par la DREETS. La modification du 1er
        septembre 2026 porte sur ce qui se passe après la rupture, du côté de France Travail.
      </P>

      <H2>La durée maximale d’indemnisation</H2>
      <P>
        La durée maximale d’indemnisation chômage d’un salarié qui quitte son emploi par une
        rupture conventionnelle diminue&nbsp;:
      </P>
      <List
        items={[
          "Pour les moins de 55 ans : de 18 mois à 15 mois maximum.",
          "Pour les salariés plus âgés, la durée maximale baisse également, avec un palier spécifique au-delà de 57 ans.",
        ]}
      />
      <P>
        Les conditions d’éligibilité à l’allocation chômage (durée d’affiliation, etc.) ne
        changent pas. Seule la durée maximale pendant laquelle l’allocation peut être versée
        pour ce motif de rupture est réduite.
      </P>

      <H2>L’effet sur la négociation</H2>
      <P>
        Une rupture conventionnelle se négocie souvent en tenant compte, au moins
        implicitement, de la durée pendant laquelle le salarié pourra être indemnisé avant de
        retrouver un poste. Un plafond réduit modifie cette estimation, indépendamment du
        montant de l’indemnité de rupture. Deux dossiers identiques, homologués l’un avant et
        l’autre après le 1er septembre 2026, n’ouvrent pas les mêmes droits pour le salarié
        concerné.
      </P>
      <P>
        Ce changement ne modifie pas la manière de conduire la négociation. Il s’agit en
        revanche d’une information que le salarié prendra en compte, et qu’il est utile de
        connaître avant l’entretien.
      </P>

      <H2>Autres changements au 1er septembre 2026</H2>
      <P>
        Le 1er septembre 2026 est aussi la date d’entrée en vigueur d’une réforme distincte,
        qui plafonne la durée des arrêts de travail prescrits. Voir{" "}
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
