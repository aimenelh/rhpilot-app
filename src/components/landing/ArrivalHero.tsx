import { ThreadHero } from "./ThreadHero";
import s from "./ArrivalHero.module.css";

/** Haut de la page d'accueil : la phrase qui se complète et le fil du plan d'action. */
export function ArrivalHero() {
  return (
    <section className={s.hero} aria-labelledby="arrival-title">
      <ThreadHero />
    </section>
  );
}
