import { BookOpen } from "lucide-react";

type CcnContext = "embauche" | "fin_periode_essai" | "visite_medicale" | "fiche_salarie";

const MESSAGES: Record<CcnContext, string> = {
  embauche: "Votre convention collective peut prévoir des formalités complémentaires lors de l'embauche.",
  fin_periode_essai:
    "Certaines conventions collectives prévoient des durées ou modalités particulières concernant la période d'essai.",
  visite_medicale: "Votre convention collective peut prévoir des dispositions particulières de suivi médical.",
  fiche_salarie: "Pensez à vérifier les dispositions de votre convention collective pour ce salarié.",
};

// Toujours le même outil officiel (code.travail.gouv.fr), jamais une
// page précise à l'intérieur d'une convention — je n'ai aucun moyen
// fiable de garantir qu'un lien plus profond tombe au bon article, et
// un lien qui tombe au mauvais endroit serait pire qu'un lien général.
const OFFICIAL_TOOL_URL = "https://code.travail.gouv.fr/outils/convention-collective";

export function CcnHint({
  conventionCollective,
  context,
}: {
  conventionCollective: string | null | undefined;
  context: CcnContext;
}) {
  if (!conventionCollective) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-brand-primary/5 px-3.5 py-3 text-sm">
      <BookOpen size={16} className="mt-0.5 shrink-0 text-brand-primary" />
      <div>
        <p className="text-ink-soft">{MESSAGES[context]}</p>
        <a
          href={OFFICIAL_TOOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-medium text-brand-primary hover:underline"
        >
          Consulter la convention collective {conventionCollective} →
        </a>
      </div>
    </div>
  );
}
