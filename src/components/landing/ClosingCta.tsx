import Link from "next/link";
import s from "./ClosingCta.module.css";

type ClosingCtaProps = { title?: string; accent?: string; text?: string; action?: string; href?: string };

/** Fin de page : le fil corail de l'introduction revient et traverse l'appel final. */
export function ClosingCta({
  title = "Le prochain événement RH arrive.",
  accent = "Gardez le fil.",
  text = "Créez votre espace et préparez votre premier parcours. C’est gratuit jusqu’à 3 salariés.",
  action = "Créer mon premier plan",
  href = "/sign-up",
}: ClosingCtaProps = {}) {
  return (
    <section className={s.close} aria-labelledby="closing-title">
      <svg className={s.thread} viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M-30 300 C 180 330 330 250 470 280 C 610 310 700 350 820 300 C 960 240 1010 150 1120 160 C 1230 170 1300 110 1470 70" />
      </svg>
      <div className={s.inner}>
        <div>
          <h2 id="closing-title" className={s.title}>
            {title}
            <em>{accent}</em>
          </h2>
          <p className={s.text}>{text}</p>
        </div>
        <div className={s.action}>
          <Link href={href} className={s.primary}>
            {action}
          </Link>
        </div>
      </div>
    </section>
  );
}
