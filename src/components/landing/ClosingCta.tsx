import Link from "next/link";
import s from "./ClosingCta.module.css";

type ClosingCtaProps = { title?: string; accent?: string; text?: string; action?: string; href?: string };

const TEAM = ["paie", "suivi", "espace"] as const;

/**
 * Fin de page : l'aplat corail du haut de page revient, traversé par le fil,
 * avec les trois copilotes (suivi RH, paie, espace salarié) debout sur le bord.
 */
export function ClosingCta({
  title = "Essayez RH Pilot avec votre équipe.",
  accent,
  text = "Gratuit jusqu’à 3 salariés. Au-delà, l’offre Pro coûte 15 € HT par mois et 3 € HT par salarié.",
  action = "Créer mon espace",
  href = "/sign-up",
}: ClosingCtaProps = {}) {
  return (
    <section className={s.close} aria-labelledby="closing-title">
      <svg className={s.thread} viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M-30 300 C 200 312 380 290 560 300 C 760 312 900 330 1080 300 C 1240 274 1330 250 1470 236" />
      </svg>
      <div className={s.inner}>
        <div className={s.copy}>
          <h2 id="closing-title" className={s.title}>
            {title}
            {accent ? <span className={s.accent}>{accent}</span> : null}
          </h2>
          <p className={s.text}>{text}</p>
          <Link href={href} className={s.primary}>
            {action}
          </Link>
        </div>
        <div className={s.team} aria-hidden="true">
          {TEAM.map((key, i) => (
            <div key={key} className={s.member} data-key={key} style={{ ["--i" as string]: i }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/illustrations/copilotes/${key}.svg`} alt="" width={320} height={400} loading="lazy" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/illustrations/copilotes/${key}-blink.svg`} alt="" width={320} height={400} loading="lazy" className={s.blink} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
