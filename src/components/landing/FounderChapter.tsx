"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import s from "./FounderChapter.module.css";
import { ScrollStage } from "./ScrollStage";

// Chapitre fondateur : la vidéo « Gardez le fil » (l'histoire d'Aimen) en grand,
// puis les premiers retours accrochés au fil, comme à la fin de la vidéo.
// La vidéo ne se charge qu'au clic (preload="none").
const REVIEWS = [
  {
    quote: "Un outil pensé à partir des besoins concrets du terrain, avec une vraie volonté de simplifier le quotidien des professionnels RH.",
    name: "Maxime Dekens",
    role: "Assistant RH",
  },
  {
    quote: "Bravo Aïmen, pour cet outil pensé par RH pour les RH.",
    name: "Alice Stella N.",
    role: "Étudiante RH",
  },
  {
    quote: "Tu peux être fier de toi. Je savais que tu irais loin !",
    name: "Patricia J.",
    role: "Ancienne tutrice d’alternance",
  },
];

export function FounderChapter() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    setStarted(true);
    const el = video.current;
    if (!el) return;
    el.controls = true;
    void el.play().catch(() => {
      // Lecture refusée par le navigateur : les contrôles natifs restent disponibles.
    });
  }

  return (
    <section className={s.chapter} aria-labelledby="fondateur-title" id="histoire" data-no-reveal>
      <ScrollStage scopeId="histoire" watch="[data-reviews]" threshold={0.35} />
      <div className={s.inner}>
        <div className={s.head}>
          <div>
            <h2 id="fondateur-title">
              Le terrain comme
              <br />
              <em>point de départ.</em>
            </h2>
          </div>
          <div className={s.story}>
            <p>
              Bachelor puis Master RH en alternance : d’une start-up de bornes de recharge à un groupe de
              treize cabinets d’ophtalmologie. Partout, des échéances dispersées et l’impression de faire du
              sur-place. J’ai construit RH Pilot pour garder le fil.
            </p>
            <p className={s.signature}>
              <strong>Aimen El Housseini</strong>
              Fondateur de RH Pilot · Montpellier
            </p>
          </div>
        </div>

        <div className={s.player} data-started={started ? "true" : undefined}>
          <video
            ref={video}
            preload="none"
            playsInline
            poster="/marketing/rhpilot-histoire-poster.webp"
            className={s.video}
            aria-label="L’histoire de RH Pilot, racontée par son fondateur"
          >
            <source src="/marketing/rhpilot-histoire.mp4" type="video/mp4" />
            Votre navigateur ne permet pas la lecture de cette vidéo.
          </video>
          {!started && (
            <button type="button" className={s.play} onClick={play} aria-label="Lire la vidéo : l’histoire de RH Pilot, 1 min 25">
              <span className={s.playIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                </svg>
              </span>
              <span className={s.playText}>
                Voir l’histoire
                <small>1 min 25 · avec le son</small>
              </span>
            </button>
          )}
        </div>

        <div className={s.reviews} data-reviews>
          <svg className={s.thread} viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 18 C 180 26 320 40 400 40 S 640 30 800 38 S 1060 46 1200 22" pathLength={1} />
          </svg>
          <ul>
            {REVIEWS.map((review, i) => (
              <li key={review.name} style={{ ["--i" as string]: i }}>
                <span className={s.clip} aria-hidden="true" />
                <figure>
                  <blockquote>{review.quote}</blockquote>
                  <figcaption>
                    <strong>{review.name}</strong> {review.role}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <Link href="/pourquoi" className={s.link}>
            Lire l’histoire du projet
          </Link>
        </div>
      </div>
    </section>
  );
}
