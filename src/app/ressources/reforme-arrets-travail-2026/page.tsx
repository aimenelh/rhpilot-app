import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Arrêts de travail : ce qui change au 1er septembre 2026, RH Pilot",
  description:
    "Un décret publié en juin 2026 plafonne pour la première fois la durée des arrêts de travail prescrits. Ce que ça change concrètement pour une équipe RH.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Actualité réglementaire"
      title="Arrêts de travail : ce qui change réellement au 1er septembre 2026"
      readTime="5 min de lecture"
    >
      <P>
        Jusqu&apos;à présent, rien n&apos;encadrait vraiment la durée d&apos;un premier arrêt de
        travail. Un médecin pouvait prescrire la durée qu&apos;il jugeait nécessaire, sans
        plafond réglementaire. Un décret publié le 12 juin 2026 (décret n° 2026-498), pris en
        application de l&apos;article 81 de la loi de financement de la Sécurité sociale pour
        2026, change ça à partir du 1er septembre 2026.
      </P>

      <H2>Ce que dit précisément le décret</H2>
      <P>Concrètement, à compter du 1er septembre 2026 :</P>
      <List
        items={[
          "Une première prescription d'arrêt de travail est plafonnée à 31 jours.",
          "Une prolongation est plafonnée à 62 jours.",
          "Ces plafonds concernent les médecins, mais aussi les chirurgiens-dentistes et les sages-femmes.",
          "Le motif de l'arrêt doit désormais figurer sur l'avis transmis à l'Assurance Maladie.",
        ]}
      />
      <P>
        Le texte prévoit une soupape : le professionnel de santé peut dépasser ces plafonds s&apos;il
        justifie, directement sur la prescription, que l&apos;état de santé du patient le
        nécessite. Ce n&apos;est donc pas une durée maximale absolue, mais un plafond par défaut,
        avec une dérogation qui doit être explicite.
      </P>
      <P>
        Autre nouveauté : quand un arrêt cumule trois mois de prolongations, le prescripteur
        peut solliciter l&apos;avis du service du contrôle médical de l&apos;Assurance Maladie.
        L&apos;objectif affiché du gouvernement est de contenir la hausse des dépenses
        d&apos;indemnités journalières, en poussant à un réexamen plus régulier des arrêts longs.
      </P>

      <H2>Ce que ça change concrètement côté RH</H2>
      <P>
        Ce texte s&apos;adresse d&apos;abord aux prescripteurs, pas directement aux employeurs. Mais
        il change ce qu&apos;une équipe RH doit savoir regarder sur un avis d&apos;arrêt de
        travail reçu à partir de septembre 2026&nbsp;: une prescription qui dépasse 31 jours
        d&apos;emblée, ou une prolongation qui dépasse 62 jours, n&apos;est plus la norme silencieuse
        qu&apos;elle pouvait être avant. Ce n&apos;est pas anormal en soi (la dérogation médicale
        existe), mais c&apos;est désormais un signal à repérer, pas à laisser passer sans y
        prêter attention.
      </P>
      <P>
        Le décret modifie aussi, dans les mêmes textes, la prescription des arrêts liés à une
        interruption volontaire de grossesse par voie médicamenteuse réalisée par une
        sage-femme&nbsp;: l&apos;ancienne limite de 4 jours renouvelable une fois disparaît.
      </P>

      <H2>Une réforme parmi d&apos;autres au 1er septembre</H2>
      <P>
        Cette date concentre plusieurs changements distincts pour les RH. La durée maximale
        d&apos;indemnisation chômage après une rupture conventionnelle baisse également à partir
        du 1er septembre&nbsp;: c&apos;est le sujet de{" "}
        <a
          href="/ressources/rupture-conventionnelle-chomage-2026"
          className="text-brand-primary hover:underline"
        >
          notre article dédié
        </a>
        . Deux réformes qui n&apos;ont rien à voir l&apos;une avec l&apos;autre sur le fond, mais qui
        entrent en vigueur au même moment, et qu&apos;une équipe RH doit intégrer en même temps.
      </P>
    </ArticleLayout>
  );
}
