import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ArticleLayout, H2, P, List } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Délai de prévenance en fin de période d’essai",
  description:
    "Les délais de prévenance prévus par les articles L1221-25 et L1221-26 du Code du travail pour rompre une période d’essai, et leurs effets lorsque le délai dépasse la date de fin de l’essai.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Obligations RH"
      title="Délai de prévenance en fin de période d’essai"
      readTime="4 min de lecture"
    >
      <P>
        Pendant la période d’essai, le contrat de travail peut être rompu librement, sans
        justification et sans procédure de licenciement. La rupture peut venir de
        l’employeur, lorsque le collaborateur ne convient pas au poste, ou du salarié,
        lorsqu’il décide de partir avant la fin de l’essai.
      </P>
      <P>
        Cette liberté reste encadrée : la loi impose un délai de prévenance avant toute
        rupture, à l’employeur comme au salarié. Ce délai n’est pas fixe. Il augmente avec
        l’ancienneté du salarié dans l’entreprise.
      </P>

      <H2>Ce que prévoit le Code du travail</H2>
      <P>
        Lorsque l’employeur met fin à la période d’essai (article L1221-25 du Code du
        travail), il doit prévenir le salarié au moins :
      </P>
      <List
        items={[
          "24 heures avant, s’il est présent depuis moins de 8 jours",
          "48 heures avant, entre 8 jours et 1 mois de présence",
          "2 semaines avant, entre 1 et 3 mois de présence",
          "1 mois avant, au-delà de 3 mois de présence",
        ]}
      />
      <P>
        Lorsque le salarié met fin à sa période d’essai (article L1221-26), le délai est plus
        court et ne comporte que deux paliers : 48 heures, ramenées à 24 heures s’il est
        présent depuis moins de 8 jours.
      </P>

      <H2>Quand le délai dépasse la fin de l’essai</H2>
      <P>
        Prenons l’exemple d’une période d’essai de trois mois. Le collaborateur est présent
        depuis deux mois et trois semaines lorsque vous décidez de ne pas le garder. Le délai
        de prévenance applicable est de deux semaines, alors que la période d’essai se
        termine une semaine plus tard.
      </P>
      <P>
        Dans ce cas, le délai de prévenance dépasse la date de fin théorique de l’essai. La
        loi précise que la période d’essai ne peut pas être prolongée du fait du délai de
        prévenance. La relation de travail doit donc s’arrêter à la date de fin de l’essai : si
        le salarié continue de travailler au-delà, le contrat devient définitif. La partie du
        délai de prévenance qui n’a pas pu être respectée ouvre droit, sauf faute grave, à une
        indemnité compensatrice.
      </P>
      <P>
        Plus la rupture est notifiée tard, plus le risque de dépasser la date de fin
        théorique augmente, et plus l’indemnité due est élevée.
      </P>

      <H2>Suivre la date de fin d’essai</H2>
      <P>
        La règle elle-même est simple. La difficulté consiste à connaître, au bon moment, la
        date réelle de fin de la période d’essai et la durée de présence du salarié. Lorsque
        plusieurs embauches sont gérées en parallèle, ce calcul est difficile à tenir à la
        main de façon fiable.
      </P>
      <P>
        Dans RH Pilot, la date de fin de période d’essai est calculée dès la création du
        parcours d’embauche. Ce calcul ne remplace pas votre décision. Il évite que la date
        dépende de la mémoire d’une personne.
      </P>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-surface-border pt-8 text-center">
        <p className="text-sm font-medium text-ink">
          RH Pilot suit les périodes d’essai de vos salariés.
        </p>
        <Link href="/sign-up">
          <Button className="px-6 py-2.5 text-sm">
            <span className="inline-flex items-center gap-2">
              Créer mon espace <ArrowRight size={14} />
            </span>
          </Button>
        </Link>
      </div>
    </ArticleLayout>
  );
}
