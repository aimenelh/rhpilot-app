"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Play,
  RotateCcw,
} from "lucide-react";

import styles from "./TutorialGuide.module.css";

type TutorialPhase = "intro" | "video" | "outro";

type TutorialStep = {
  id: string;
  title: string;
  duration: string;
  description: string;
  video: string;
  points: string[];
};

const steps: TutorialStep[] = [
  {
    id: "creer-espace",
    title: "Créer son espace RH",
    duration: "2 min 10 s",
    description: "Créer une organisation et prendre ses premiers repères dans RH Pilot.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/b9a6afe5-5400-42c5-87ba-df9831405748.mp4",
    points: [
      "Créer l’organisation",
      "Consulter le tableau de bord",
      "Repérer les principaux accès du logiciel",
    ],
  },
  {
    id: "configurer-organisation",
    title: "Configurer l’organisation",
    duration: "2 min 04 s",
    description: "Renseigner les paramètres utiles au fonctionnement de votre espace RH.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/c3460ae1-cc9e-4461-831a-2bc02f8b0ebc.mp4",
    points: [
      "Renseigner les informations de l’entreprise",
      "Configurer l’organisation",
      "Vérifier les paramètres essentiels",
    ],
  },
  {
    id: "ajouter-salarie",
    title: "Ajouter un salarié",
    duration: "2 min 30 s",
    description: "Créer un dossier salarié et retrouver les informations qui structurent son suivi.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/3e090827-1ca6-45b4-9995-9c1a4b990119.mp4",
    points: [
      "Créer le dossier du salarié",
      "Renseigner les informations du contrat",
      "Retrouver son parcours et ses échéances",
    ],
  },
  {
    id: "assigner-taches",
    title: "Assigner les tâches",
    duration: "1 min 19 s",
    description: "Répartir les actions RH entre les bonnes personnes et suivre leur avancement.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/45f50d5a-0df6-40dd-b821-f7061fe5eb96.mp4",
    points: [
      "Choisir un responsable",
      "Répartir les tâches",
      "Suivre l’état d’avancement",
    ],
  },
  {
    id: "calendrier-rh",
    title: "Lire le calendrier RH",
    duration: "4 min 15 s",
    description: "Visualiser les échéances à venir et retrouver rapidement les actions à traiter.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/21a5f9d0-2a89-4932-84df-55a24df1611b.mp4",
    points: [
      "Lire les échéances du mois",
      "Repérer les tâches à venir",
      "Ouvrir une échéance depuis le calendrier",
    ],
  },
  {
    id: "ajouter-echeance",
    title: "Ajouter une échéance",
    duration: "1 min 55 s",
    description:
      "Personnaliser un parcours déjà généré en ajoutant une échéance adaptée à votre organisation.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/0c4373a5-9fd3-42d1-a33f-824eed926757.mp4",
    points: [
      "Ouvrir un parcours existant",
      "Ajouter une nouvelle échéance",
      "Adapter le parcours à votre fonctionnement",
    ],
  },
  {
    id: "suivre-echeances",
    title: "Suivre les échéances",
    duration: "1 min 02 s",
    description: "Retrouver les actions ajoutées et vérifier leur suivi dans le parcours.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/4d3e57c2-4b65-45dd-be19-6bb2d5f82979.mp4",
    points: [
      "Contrôler les tâches du parcours",
      "Retrouver les dates associées",
      "Vérifier l’avancement",
    ],
  },
  {
    id: "gerer-absences",
    title: "Gérer les absences",
    duration: "3 min 55 s",
    description: "Ajouter une absence et la retrouver dans les différentes vues de suivi de l’équipe.",
    video: "https://d2ol7oe51mr4n9.cloudfront.net/user_3JQ1PnqulQZQJHPwS2E3Xg2X2Hk/003d93ac-b32f-48d0-b87b-2d8f2d675564.mp4",
    points: [
      "Créer une absence",
      "Ajouter les informations associées",
      "Lire le planning de l’équipe",
    ],
  },
];

const STORAGE_KEY = "rhpilot.tutorial-progress.v2";

function readProgress(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((value): value is string =>
          typeof value === "string" && steps.some((step) => step.id === value),
        ))]
      : [];
  } catch {
    return [];
  }
}

export function TutorialGuide() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [watched, setWatched] = useState<string[]>([]);
  const [phase, setPhase] = useState<TutorialPhase>("intro");
  const videoRef = useRef<HTMLVideoElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWatched(readProgress());
  }, []);

  const active = steps[activeIndex];
  const progress = Math.round((watched.length / steps.length) * 100);

  function persist(next: string[]) {
    setWatched(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Le guide reste utilisable si le stockage local est désactivé.
    }
  }

  function markWatched(id = active.id) {
    if (watched.includes(id)) return;
    persist([...watched, id]);
  }

  function scrollToPanel() {
    window.setTimeout(() => {
      panelRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 0);
  }

  function choose(index: number) {
    setActiveIndex(index);
    setPhase("intro");
    scrollToPanel();
  }

  function startVideo() {
    setPhase("video");
    window.setTimeout(() => {
      videoRef.current?.play().catch(() => undefined);
    }, 100);
  }

  function replayVideo() {
    setPhase("video");
    window.setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => undefined);
      }
    }, 100);
  }

  function previous() {
    if (activeIndex > 0) choose(activeIndex - 1);
  }

  function next() {
    if (activeIndex < steps.length - 1) choose(activeIndex + 1);
  }

  function reset() {
    persist([]);
    setActiveIndex(0);
    setPhase("intro");
  }

  return (
    <div className={styles.guide}>
      <div className={styles.mobileSelect}>
        <label htmlFor="tutorial-chapter">Choisir une vidéo</label>
        <select id="tutorial-chapter" value={activeIndex} onChange={(event) => choose(Number(event.target.value))}>
          {steps.map((step, index) => (
            <option key={step.id} value={index}>{index + 1}. {step.title} · {step.duration}</option>
          ))}
        </select>
      </div>

      <section ref={panelRef} className={styles.player} aria-label="Lecteur du tutoriel">
        <div className={styles.stage}>
          {phase !== "video" && (
            <div className={styles.cover}>
              <div className={styles.coverContent}>
                <p className={styles.chapterNumber}>
                  {phase === "outro" ? <><Check size={15} /> Vidéo terminée</> : `Tutoriel ${String(activeIndex + 1).padStart(2, "0")} / 08`}
                </p>
                <h2 className={styles.coverTitle}>
                  {phase === "outro" ? (activeIndex === steps.length - 1 ? "À vous de jouer." : "On continue ?") : active.title}
                </h2>
                <p className={styles.coverDescription}>
                  {phase === "outro"
                    ? (activeIndex < steps.length - 1 ? `À suivre : ${steps[activeIndex + 1].title.toLocaleLowerCase("fr")}.` : "Vous pouvez retrouver ces vidéos à tout moment.")
                    : active.description}
                </p>
                <div className={styles.coverActions}>
                  {phase === "intro" ? (
                    <button type="button" onClick={startVideo} className={styles.primaryButton}>
                      <Play size={17} fill="currentColor" /> Regarder la vidéo
                    </button>
                  ) : activeIndex < steps.length - 1 ? (
                    <button type="button" onClick={next} className={styles.primaryButton}>
                      Vidéo suivante <ChevronRight size={17} />
                    </button>
                  ) : (
                    <a href="/dashboard" className={styles.primaryButton}>Ouvrir RH Pilot <ChevronRight size={17} /></a>
                  )}
                  {phase === "outro" && (
                    <button type="button" onClick={replayVideo} className={styles.textButton}>
                      <RotateCcw size={15} /> Revoir
                    </button>
                  )}
                </div>
                {phase === "intro" && <p className={styles.coverDuration}>{active.duration}</p>}
              </div>
              <img src="/illustrations/tutorials/mascot-presenter.webp" alt="" width={1536} height={1024} className={styles.coverArt} />
            </div>
          )}
          {phase === "video" && (
            <video
              key={active.id}
              ref={videoRef}
              aria-label={active.title}
              controls
              playsInline
              preload="metadata"
              onEnded={() => { markWatched(); setPhase("outro"); }}
              className={styles.video}
            >
              <source src={active.video} type="video/mp4" />
              Votre navigateur ne peut pas lire cette vidéo.
            </video>
          )}
        </div>

        {phase !== "intro" && (
          <div className={styles.videoCaption}>
            <h2>{active.title}</h2>
            <p>{active.description}</p>
          </div>
        )}

        <div className={styles.playerFooter}>
          <button type="button" onClick={previous} disabled={activeIndex === 0} className={styles.textButton} aria-label="Vidéo précédente">
            <ChevronLeft size={17} /> Précédente
          </button>
          <button type="button" onClick={() => markWatched()} className={styles.watchedButton} aria-pressed={watched.includes(active.id)}>
            <CircleCheck size={17} /> {watched.includes(active.id) ? "Vidéo vue" : "Marquer comme vue"}
          </button>
          <button type="button" onClick={next} disabled={activeIndex === steps.length - 1} className={styles.textButton} aria-label="Vidéo suivante">
            Suivante <ChevronRight size={17} />
          </button>
        </div>
        <details className={styles.details} key={active.id}>
          <summary>Dans cette vidéo</summary>
          <ul>{active.points.map((point) => <li key={point}>{point}</li>)}</ul>
        </details>
      </section>

      <aside className={styles.chapters} aria-label="Liste des tutoriels">
        <div className={styles.chaptersHeading}><h2>Les vidéos</h2><span>8 vidéos · 19 min</span></div>
        <nav aria-label="Vidéos du tutoriel">
          {steps.map((step, index) => (
            <button key={step.id} type="button" onClick={() => choose(index)} aria-current={index === activeIndex ? "step" : undefined} className={styles.chapter}>
              <span className={styles.chapterIndex}>{watched.includes(step.id) ? <Check size={16} aria-label="Vue" /> : String(index + 1).padStart(2, "0")}</span>
              <span><span className={styles.chapterTitle}>{step.title}</span><span className={styles.chapterDuration}>{step.duration}</span></span>
              {index === activeIndex && <Play size={13} fill="currentColor" className={styles.chapterPlay} />}
            </button>
          ))}
        </nav>
        <div className={styles.progress}>
          <p>{watched.length} sur {steps.length} vidéos vues</p>
          <div className={styles.progressTrack} role="progressbar" aria-label="Vidéos vues" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={watched.length}>
            <span style={{ width: progress + "%" }} />
          </div>
          {watched.length > 0 && <button type="button" onClick={reset} className={styles.resetButton}>Réinitialiser</button>}
        </div>
      </aside>
    </div>
  );
}
