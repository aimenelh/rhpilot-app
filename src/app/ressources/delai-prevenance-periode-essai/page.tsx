import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Délai de prévenance en fin de période d'essai — RH Pilot",
  description:
    "Ce que dit précisément le Code du travail sur le délai de prévenance en fin de période d'essai, et le piège que presque personne ne voit venir.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Obligations RH"
      title="Délai de prévenance en fin de période d'essai : le détail que presque tout le monde oublie"
      readTime="4 min de lecture"
    >
      <P>
        Une période d&apos;essai qui ne se passe pas comme prévu, ça arrive à tout le monde.
        Le collaborateur ne convient pas au poste, ou c&apos;est lui qui décide de partir
        avant la fin. Sur le principe, rien de plus simple : pendant cette période, le
        contrat peut être rompu librement, sans justification, sans procédure de
        licenciement. C&apos;est même tout l&apos;intérêt de la période d&apos;essai.
      </P>
      <P>
        Mais « librement » ne veut pas dire « du jour au lendemain ». La loi impose un délai
        de prévenance avant toute rupture, aussi bien à l&apos;employeur qu&apos;au salarié.
        Et ce délai, contrairement à ce qu&apos;on pourrait croire, n&apos;est pas fixe : il
        grandit avec l&apos;ancienneté du salarié dans l&apos;entreprise.
      </P>

      <H2>Ce que dit précisément la loi</H2>
      <P>
        Quand c&apos;est l&apos;employeur qui met fin à la période d&apos;essai (article
        L1221-25 du Code du travail), le salarié doit être prévenu au moins :
      </P>
      <List
        items={[
          "24 heures avant, s'il est présent depuis moins de 8 jours",
          "48 heures avant, entre 8 jours et 1 mois de présence",
          "2 semaines avant, entre 1 et 3 mois de présence",
          "1 mois avant, au-delà de 3 mois de présence",
        ]}
      />
      <P>
        Quand c&apos;est le salarié qui démissionne pendant sa période d&apos;essai (article
        L1221-26), le délai est plus court et ne varie qu&apos;une fois : 48 heures, ramenées
        à 24 heures s&apos;il est présent depuis moins de 8 jours.
      </P>

      <H2>Le piège que presque personne ne voit venir</H2>
      <P>
        Voici où ça devient intéressant. Imaginez une période d&apos;essai de trois mois. Le
        collaborateur en est à deux mois et trois semaines quand vous décidez de ne pas le
        garder. Le délai de prévenance applicable est de deux semaines, mais la période
        d&apos;essai, elle, se termine dans une semaine.
      </P>
      <P>
        Résultat : le délai de prévenance dépasse la date de fin théorique de
        l&apos;essai. Et la loi est claire sur ce point, la période d&apos;essai ne peut pas
        être prolongée à cause du délai de prévenance. Le contrat continue donc de courir
        jusqu&apos;à la fin du délai. Si l&apos;employeur ne fait pas travailler le salarié
        pendant cette période, il lui doit une indemnité compensatrice équivalente au salaire
        qu&apos;il aurait perçu.
      </P>
      <P>
        Concrètement : plus vous attendez pour notifier une fin de période d&apos;essai, plus
        le risque de dépasser la date de fin théorique augmente, et plus ça coûte cher.
      </P>

      <H2>Pourquoi c&apos;est justement le genre de chose qui se perd</H2>
      <P>
        Le délai de prévenance n&apos;a rien de compliqué sur le papier. Le problème,
        ce n&apos;est jamais la règle elle-même, c&apos;est de savoir, au bon moment, à
        quelle date une période d&apos;essai se termine réellement, et depuis combien de
        temps le salarié est présent. Sur une équipe qui gère plusieurs embauches en
        parallèle, ce calcul se fait rarement à la main de façon fiable.
      </P>
      <P>
        C&apos;est exactement le genre d&apos;échéance que RH Pilot calcule automatiquement
        dès qu&apos;un parcours d&apos;embauche est créé, pas pour remplacer votre jugement,
        juste pour que la date ne dépende plus de la mémoire de quelqu&apos;un.
      </P>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-surface-border pt-8 text-center">
        <p className="text-sm font-medium text-ink">
          Voir comment RH Pilot suit vos périodes d&apos;essai automatiquement
        </p>
        <Link href="/sign-up">
          <Button className="px-6 py-2.5 text-sm">
            <span className="inline-flex items-center gap-2">
              Essayer gratuitement <ArrowRight size={14} />
            </span>
          </Button>
        </Link>
      </div>
    </ArticleLayout>
  );
}
