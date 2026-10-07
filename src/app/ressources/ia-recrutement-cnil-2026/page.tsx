import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "IA et recrutement : les contrôles de la CNIL en 2026",
  description:
    "Le recrutement fait partie des thématiques prioritaires de contrôle de la CNIL en 2026. L’IA Act européen classe par ailleurs les outils de tri de CV parmi les systèmes à haut risque.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="IA et RH"
      title="IA et recrutement : les contrôles de la CNIL en 2026"
      readTime="5 min de lecture"
    >
      <P>
        Le 3 avril 2026, la CNIL a inscrit le recrutement parmi ses thématiques prioritaires de
        contrôle pour l’année. Cette annonce intervient alors que l’usage de l’IA dans les
        tâches RH progresse. Selon les chiffres cités par plusieurs études RH 2025-2026,
        43&nbsp;% des organisations utilisaient l’IA pour au moins une tâche RH en 2026, contre
        26&nbsp;% un an plus tôt.
      </P>

      <H2>Le RGPD et l’IA Act</H2>
      <P>
        Le recrutement assisté par IA relève de deux textes. Le règlement européen sur
        l’intelligence artificielle (l’IA Act) classe, dans son annexe III, les systèmes
        destinés à publier des offres d’emploi ciblées, à analyser des candidatures ou à
        évaluer des candidats parmi les systèmes à <strong>haut risque</strong>. Cette
        qualification s’applique par défaut, qu’il s’agisse d’un outil de tri automatique de
        CV ou d’un test d’évaluation assisté par IA. Les obligations renforcées qui en
        découlent (documentation, supervision humaine, transparence) sont applicables depuis
        le 2 août 2026.
      </P>
      <P>
        Le RGPD continue de s’appliquer en parallèle. La CNIL rappelle que les deux textes se
        complètent. Un outil de scoring automatique de candidatures peut ainsi relever à la
        fois du RGPD (article 22, sur les décisions individuelles automatisées) et de l’IA
        Act.
      </P>

      <H2>L’article 22 du RGPD</H2>
      <P>
        Lorsqu’une candidature est écartée sur la seule base d’un score calculé
        automatiquement, sans intervention humaine réelle dans la décision, le candidat
        dispose du droit de demander une intervention humaine et d’obtenir une explication du
        résultat. Un outil qui attribue un score aux CV pour aider un recruteur à prioriser sa
        lecture n’a pas le même statut qu’un outil qui écarte des candidatures
        automatiquement, sans qu’une personne revoie la décision.
      </P>

      <H2>Les points examinés lors des contrôles</H2>
      <List
        items={[
          "L’information donnée aux candidats sur l’usage d’un outil automatisé dans le processus.",
          "La possibilité réelle d’obtenir une intervention humaine en cas de décision automatisée.",
          "Les durées de conservation des données candidats, encadrées par un référentiel CNIL publié en avril 2026.",
          "L’analyse d’impact (AIPD), obligatoire pour les traitements à risque élevé.",
        ]}
      />
      <P>
        Les contrôles cibleront en priorité les grandes entreprises et les cabinets de
        recrutement, en raison du volume de candidatures traitées. Le référentiel sur les
        durées de conservation s’applique en revanche à toute organisation qui recrute,
        quelle que soit sa taille.
      </P>

      <H2>Aide à la décision et décision automatisée</H2>
      <P>
        La distinction entre un outil qui aide une personne à décider et un outil qui décide à
        sa place est au cœur de ces deux textes. Le Copilote de RH Pilot repose sur ce
        principe. Il répond à des questions à partir des données de l’organisation, propose
        des priorités et indique pourquoi une situation mérite attention. Il ne prend aucune
        décision à la place d’un utilisateur et n’attribue aucun score aux candidats.
      </P>
    </ArticleLayout>
  );
}
