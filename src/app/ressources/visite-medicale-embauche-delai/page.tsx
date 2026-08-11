import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ArticleLayout, H2, P } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Visite médicale d'embauche : ce qu'il faut savoir — RH Pilot",
  description:
    "La visite médicale d'embauche a été remplacée par la VIP en 2017. Ses délais réels, ses exceptions, et pourquoi elle passe souvent à la trappe.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Obligations RH"
      title="Visite médicale d'embauche : ce qu'il faut savoir (et le nom a changé)"
      readTime="4 min de lecture"
    >
      <P>
        Si vous cherchez encore le formulaire de « visite médicale d&apos;embauche » dans vos
        process RH, il est temps de le mettre à jour. Cette visite n&apos;existe plus,
        officiellement, depuis le 1er janvier 2017. Elle a été remplacée par la VIP, la
        visite d&apos;information et de prévention, qui répond à une logique un peu
        différente, avec ses propres délais.
      </P>

      <H2>Ce que dit la loi</H2>
      <P>
        L&apos;article R4624-10 du Code du travail est sans ambiguïté sur le délai : tout
        salarié nouvellement embauché doit bénéficier d&apos;une VIP dans un délai qui
        n&apos;excède pas trois mois à compter de la prise effective de son poste.
      </P>
      <P>
        Trois mois, pas trois mois environ. Passé ce délai, l&apos;obligation n&apos;est plus
        respectée, même si le rendez-vous a été demandé dans les temps auprès du service de
        santé au travail.
      </P>
      <P>
        La visite peut être réalisée par un médecin du travail, mais aussi par un
        collaborateur médecin ou un infirmier en santé au travail, ce qui, en pratique,
        permet souvent d&apos;obtenir un rendez-vous plus vite qu&apos;en attendant
        spécifiquement un médecin.
      </P>

      <H2>Un cas qui change tout : le suivi renforcé</H2>
      <P>
        Ce délai de trois mois ne s&apos;applique pas à tout le monde. Les salariés affectés
        à un poste à risque particulier (exposition à un agent chimique dangereux, travail en
        hauteur, conduite d&apos;engins, entre autres) relèvent d&apos;un suivi individuel
        renforcé, avec un examen médical d&apos;aptitude à réaliser avant la prise de poste,
        pas dans les trois mois qui suivent.
      </P>
      <P>
        Autrement dit, la première question à se poser n&apos;est pas « quand programmer la
        visite » mais « quel type de suivi s&apos;applique à ce poste ». Se tromper dans un
        sens, en traitant un poste à risque comme un poste standard, peut avoir des
        conséquences bien plus sérieuses qu&apos;un simple retard administratif.
      </P>

      <H2>Une exception utile à connaître</H2>
      <P>
        Si le salarié a déjà passé une VIP dans les cinq ans précédant son embauche (trois
        ans pour certaines catégories), et qu&apos;il occupe un poste identique avec des
        risques équivalents, une nouvelle visite n&apos;est pas obligatoire, à condition que
        le professionnel de santé dispose de la dernière attestation de suivi. Ça peut faire
        gagner un temps précieux sur un recrutement, à condition de penser à demander ce
        document.
      </P>

      <H2>Ce qui, en pratique, fait dérailler ce suivi</H2>
      <P>
        Le délai de trois mois paraît large. Il l&apos;est, sur le papier. Le problème vient
        rarement du délai lui-même, mais du fait qu&apos;il démarre dès la prise de poste, pas
        dès la signature du contrat, pas dès la décision d&apos;embaucher. Une fois que la
        personne est arrivée, l&apos;attention de l&apos;équipe RH se déplace naturellement
        vers l&apos;intégration, la formation, les premiers projets. La visite médicale, elle,
        reste en arrière-plan jusqu&apos;à ce que quelqu&apos;un s&apos;en souvienne, souvent
        trop tard.
      </P>
      <P>
        C&apos;est précisément pour cette raison que RH Pilot déclenche automatiquement ce
        suivi dès la création du parcours d&apos;embauche, avec un rappel qui arrive avant
        l&apos;échéance plutôt qu&apos;après.
      </P>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-surface-border pt-8 text-center">
        <p className="text-sm font-medium text-ink">
          Voir comment RH Pilot suit vos visites médicales automatiquement
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
