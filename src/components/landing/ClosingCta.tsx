import Link from "next/link";
import s from "./ClosingCta.module.css";

type ClosingCtaProps = { title?: string; accent?: string; text?: string; action?: string; href?: string };

/** Fin de page : l'aplat corail du haut de page revient, traversé par le fil. */
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
        <path pathLength={1} d="M-30 342 C 200 352 420 328 650 338 C 860 348 960 318 1060 252 C 1160 186 1270 128 1470 84" />
      </svg>
      <div className={s.inner}>
        <div>
          <h2 id="closing-title" className={s.title}>
            {title}
            {accent ? <span className={s.accent}>{accent}</span> : null}
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
