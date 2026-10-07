import s from "./CopilotScene.module.css";

// Un copilote au casque corail, dessiné pour la page, posé sur le bord bas de
// l'en-tête corail. En option : la question d'un dirigeant et la réponse du
// copilote, comme sur les cartes de la page d'accueil. Les fichiers viennent
// de public/illustrations/copilotes/ (figure + calque des yeux fermés).

export type CopilotFigure =
  | "suivi"
  | "paie"
  | "espace"
  | "securite"
  | "tarifs"
  | "ressources"
  | "salut"
  | "tutoriels"
  | "contact"
  | "perdu"
  | "legal"
  | "fondateur";

type Persona = "nadia" | "marc" | "sophie";

const PERSONAS: Record<Persona, string> = { nadia: "Nadia", marc: "Marc", sophie: "Sophie" };
const NO_BLINK: CopilotFigure[] = ["fondateur"];

export function CopilotScene({
  figure,
  ask,
  answer,
  thought,
  side = "right",
  tone = "coral",
  className,
}: {
  figure: CopilotFigure;
  /** Question posée par un dirigeant (bulle blanche). */
  ask?: { persona: Persona; text: string };
  /** Réponse du copilote (bulle foncée). */
  answer?: string;
  /** Pensée du personnage (bulle en pointillés). */
  thought?: string;
  /** Côté du personnage dans la scène ; à droite, il regarde vers le texte. */
  side?: "left" | "right";
  /** "light" quand la scène est posée sur un fond clair, dans une section. */
  tone?: "coral" | "light";
  className?: string;
}) {
  const blink = !NO_BLINK.includes(figure);
  return (
    <div className={`${s.scene} ${tone === "light" ? s.light : ""} ${className ?? ""}`} data-side={side} data-bubbles={ask || answer || thought ? "true" : undefined}>
      <div className={s.halo} aria-hidden="true" />
      <div className={s.figure} aria-hidden="true">
        <div className={s.pose}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/illustrations/copilotes/${figure}.svg`} alt="" width={320} height={400} />
          {blink && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/illustrations/copilotes/${figure}-blink.svg`} alt="" width={320} height={400} className={s.blink} />
          )}
        </div>
      </div>
      {ask && (
        <figure className={s.ask}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/illustrations/copilotes/persona-${ask.persona}.svg`} alt="" width={30} height={38} />
          <figcaption>
            <span>{PERSONAS[ask.persona]}</span>
            <q>{ask.text}</q>
          </figcaption>
        </figure>
      )}
      {answer && <p className={s.answer}>{answer}</p>}
      {thought && <p className={s.thought}>{thought}</p>}
    </div>
  );
}
