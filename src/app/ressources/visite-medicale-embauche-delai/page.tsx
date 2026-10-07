import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ArticleLayout, H2, P } from "@/components/landing/ArticleLayout";

export const metadata = {
  title: "Visite médicale d’embauche : délais et exceptions",
  description:
    "Depuis le 1er janvier 2017, la visite médicale d’embauche est remplacée par la visite d’information et de prévention (VIP). Délai de trois mois, suivi individuel renforcé et cas de dispense.",
};

export default function Article() {
  return (
    <ArticleLayout
      category="Obligations RH"
      title="Visite médicale d’embauche : délais et exceptions"
      readTime="4 min de lecture"
    >
      <P>
        La « visite médicale d’embauche » n’existe plus officiellement depuis le 1er janvier
        2017. Elle a été remplacée par la VIP, la visite d’information et de prévention, qui
        répond à une logique un peu différente et obéit à ses propres délais. Les procédures
        RH qui font encore référence à l’ancienne visite sont à mettre à jour.
      </P>

      <H2>Ce que prévoit le Code du travail</H2>
      <P>
        Selon l’article R4624-10 du Code du travail, tout salarié nouvellement embauché doit
        bénéficier d’une VIP dans un délai qui n’excède pas trois mois à compter de la prise
        effective de son poste.
      </P>
      <P>
        Passé ce délai, l’obligation n’est pas respectée, même si le rendez-vous a été demandé
        dans les temps auprès du service de santé au travail.
      </P>
      <P>
        La visite peut être réalisée par un médecin du travail, mais aussi par un
        collaborateur médecin ou un infirmier en santé au travail, ce qui permet souvent
        d’obtenir un rendez-vous plus rapidement qu’en attendant spécifiquement un médecin.
      </P>

      <H2>Le suivi individuel renforcé</H2>
      <P>
        Le délai de trois mois ne s’applique pas à tous les salariés. Ceux qui sont affectés à
        un poste à risque particulier (exposition à un agent chimique dangereux, travail en
        hauteur, conduite d’engins, entre autres) relèvent d’un suivi individuel renforcé.
        L’examen médical d’aptitude doit alors être réalisé avant la prise de poste, et non
        dans les trois mois qui suivent.
      </P>
      <P>
        Avant de programmer la visite, il faut donc déterminer quel type de suivi s’applique
        au poste. Traiter un poste à risque comme un poste standard peut avoir des
        conséquences plus sérieuses qu’un simple retard administratif.
      </P>

      <H2>Dispense de nouvelle visite</H2>
      <P>
        Si le salarié a déjà bénéficié d’une VIP dans les cinq ans précédant son embauche
        (trois ans pour certaines catégories) et qu’il occupe un poste identique avec des
        risques équivalents, une nouvelle visite n’est pas obligatoire, à condition que le
        professionnel de santé dispose de la dernière attestation de suivi. Cette dispense
        peut alléger les démarches liées au recrutement, à condition de demander ce document.
      </P>

      <H2>Le point de départ du délai</H2>
      <P>
        Le délai de trois mois court à partir de la prise de poste, et non de la signature du
        contrat ou de la décision d’embaucher. Après l’arrivée du salarié, l’équipe RH se
        consacre à l’intégration, à la formation et aux premiers projets. La visite médicale
        peut alors être perdue de vue et n’être programmée qu’après l’échéance.
      </P>
      <P>
        Dans RH Pilot, cette échéance est calculée dès la création du parcours d’embauche,
        avec un rappel avant la date.
      </P>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-surface-border pt-8 text-center">
        <p className="text-sm font-medium text-ink">
          RH Pilot suit les visites médicales de vos salariés dès l’embauche.
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
