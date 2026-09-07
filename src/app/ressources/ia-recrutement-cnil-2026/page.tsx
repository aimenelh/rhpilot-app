import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "IA et recrutement : ce que la CNIL contrôle en 2026, RH Pilot",
  description:
    "Le recrutement est devenu une priorité de contrôle de la CNIL en 2026, au moment où l'IA Act européen classe les outils de tri de CV comme systèmes à haut risque.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="IA et RH"
      title="IA et recrutement : ce que la CNIL va réellement contrôler en 2026"
      readTime="5 min de lecture"
    >
      <P>
        Le 3 avril 2026, la CNIL a inscrit le recrutement parmi ses thématiques prioritaires de
        contrôle pour l&apos;année. Ce n&apos;est pas une annonce isolée. Elle intervient au
        moment où l&apos;usage de l&apos;IA dans les tâches RH progresse vite. Selon les chiffres
        cités par plusieurs études RH 2025-2026, 43&nbsp;% des organisations utilisaient déjà
        l&apos;IA pour au moins une tâche RH en 2026, contre 26&nbsp;% un an plus tôt.
      </P>

      <H2>Deux textes qui s&apos;appliquent en même temps</H2>
      <P>
        Le sujet ne se limite pas au RGPD. Le règlement européen sur l&apos;intelligence
        artificielle (l&apos;IA Act) classe, dans son annexe III, les systèmes destinés à
        publier des offres d&apos;emploi ciblées, analyser des candidatures, ou évaluer des
        candidats, comme des systèmes à <strong>haut risque</strong>. Cette qualification
        s&apos;applique par défaut, qu&apos;il s&apos;agisse d&apos;un outil de tri automatique
        de CV ou d&apos;un test d&apos;évaluation assisté par IA. Les obligations renforcées qui
        en découlent (documentation, supervision humaine, transparence) sont applicables depuis
        le 2 août 2026.
      </P>
      <P>
        Le RGPD ne disparaît pas pour autant. La CNIL le rappelle explicitement&nbsp;: les deux
        textes se complètent. Un outil de scoring automatique de candidatures peut ainsi relever
        à la fois du RGPD (article 22, sur les décisions individuelles automatisées) et de
        l&apos;IA Act.
      </P>

      <H2>Ce que dit précisément l&apos;article 22 du RGPD</H2>
      <P>
        Si une candidature est écartée sur la seule base d&apos;un score calculé
        automatiquement, sans intervention humaine réelle dans la décision, le candidat dispose
        d&apos;un droit&nbsp;: demander une intervention humaine et obtenir une explication du
        résultat. Un outil qui score des CV pour aider un recruteur à prioriser sa lecture n&apos;a
        pas le même statut qu&apos;un outil qui écarte automatiquement, sans qu&apos;un humain ne
        revoie la décision.
      </P>

      <H2>Ce que les contrôles CNIL regardent concrètement</H2>
      <List
        items={[
          "L'information donnée aux candidats sur l'usage d'un outil automatisé dans le processus.",
          "La possibilité réelle d'obtenir une intervention humaine en cas de décision automatisée.",
          "Les durées de conservation des données candidats, encadrées par un référentiel CNIL publié en avril 2026.",
          "L'analyse d'impact (AIPD), obligatoire pour les traitements à risque élevé.",
        ]}
      />
      <P>
        Les contrôles cibleront en priorité les grandes entreprises et les cabinets de
        recrutement, en raison du volume de candidatures traitées. Mais le référentiel sur les
        durées de conservation, lui, s&apos;applique à toute organisation qui recrute, quelle
        que soit sa taille.
      </P>

      <H2>Une IA qui aide à décider n&apos;est pas une IA qui décide</H2>
      <P>
        C&apos;est tout l&apos;enjeu de cette réglementation, et c&apos;est aussi le principe sur
        lequel repose le Copilote de RH Pilot. Il répond à des questions à partir des données
        réelles de l&apos;organisation, propose des priorités, explique pourquoi une situation
        mérite attention. Il ne décide jamais à la place de quelqu&apos;un, et ne score aucun
        candidat. La distinction que la CNIL et l&apos;IA Act cherchent à faire respecter
        n&apos;est pas une contrainte extérieure au produit, c&apos;est une manière de penser
        l&apos;IA en RH qui, en pratique, tient déjà.
      </P>
    </ArticleLayout>
  );
}
