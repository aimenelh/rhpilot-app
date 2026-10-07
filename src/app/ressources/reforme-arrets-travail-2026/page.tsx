import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Arrêts de travail : ce qui change au 1er septembre 2026",
  description:
    "Le décret n° 2026-498, publié le 12 juin 2026, plafonne la durée des arrêts de travail prescrits à compter du 1er septembre 2026 : 31 jours pour une première prescription, 62 jours pour une prolongation.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Actualité réglementaire"
      title="Arrêts de travail : ce qui change au 1er septembre 2026"
      readTime="5 min de lecture"
    >
      <P>
        Avant le 1er septembre 2026, la durée d’un premier arrêt de travail n’était soumise à
        aucun plafond réglementaire. Le médecin pouvait prescrire la durée qu’il jugeait
        nécessaire. Un décret publié le 12 juin 2026 (décret n° 2026-498), pris en
        application de l’article 81 de la loi de financement de la Sécurité sociale pour
        2026, introduit un plafond à partir du 1er septembre 2026.
      </P>

      <H2>Le contenu du décret</H2>
      <P>À compter du 1er septembre 2026 :</P>
      <List
        items={[
          "Une première prescription d’arrêt de travail est plafonnée à 31 jours.",
          "Une prolongation est plafonnée à 62 jours.",
          "Ces plafonds concernent les médecins, mais aussi les chirurgiens-dentistes et les sages-femmes.",
          "Le motif de l’arrêt doit désormais figurer sur l’avis transmis à l’Assurance Maladie.",
        ]}
      />
      <P>
        Le texte prévoit une dérogation : le professionnel de santé peut dépasser ces plafonds
        s’il justifie, directement sur la prescription, que l’état de santé du patient le
        nécessite. Il s’agit donc d’un plafond par défaut et non d’une durée maximale absolue.
        La dérogation doit être explicite.
      </P>
      <P>
        Lorsqu’un arrêt cumule trois mois de prolongations, le prescripteur peut par ailleurs
        solliciter l’avis du service du contrôle médical de l’Assurance Maladie. L’objectif
        affiché du gouvernement est de contenir la hausse des dépenses d’indemnités
        journalières, par un réexamen plus régulier des arrêts longs.
      </P>

      <H2>Les effets pour l’employeur</H2>
      <P>
        Le décret s’adresse d’abord aux prescripteurs, et non directement aux employeurs. Il
        modifie toutefois la lecture des avis d’arrêt de travail reçus à partir de septembre
        2026&nbsp;: une première prescription de plus de 31 jours, ou une prolongation de plus
        de 62 jours, ne relève plus du cas ordinaire. Une telle durée n’est pas anormale en
        soi, puisque la dérogation médicale existe, mais elle constitue désormais un élément à
        relever.
      </P>
      <P>
        Le décret modifie aussi, dans les mêmes textes, la prescription des arrêts liés à une
        interruption volontaire de grossesse par voie médicamenteuse réalisée par une
        sage-femme&nbsp;: l’ancienne limite de 4 jours renouvelable une fois est supprimée.
      </P>

      <H2>Autres changements au 1er septembre 2026</H2>
      <P>
        Cette date concentre plusieurs changements distincts pour les RH. La durée maximale
        d’indemnisation chômage après une rupture conventionnelle baisse également à partir
        du 1er septembre&nbsp;: voir{" "}
        <a
          href="/ressources/rupture-conventionnelle-chomage-2026"
          className="text-brand-primary hover:underline"
        >
          notre article dédié
        </a>
        . Les deux réformes sont indépendantes sur le fond, mais entrent en vigueur à la même
        date.
      </P>
    </ArticleLayout>
  );
}
