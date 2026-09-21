"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Play,
  RotateCcw,
} from "lucide-react";

type TutorialStep = {
  id: string;
  group: string;
  title: string;
  duration: string;
  description: string;
  video: string;
  points: string[];
};

const VIDEO_BASE =
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_BASE_URL?.replace(/\/$/, "") ??
  "/tutorials/videos";

const steps: TutorialStep[] = [
  {
    id: "creer-espace",
    group: "Démarrage",
    title: "Créer son espace RH",
    duration: "2 min 12 s",
    description: "Créer une organisation et prendre ses premiers repères dans RH Pilot.",
    video: "01-creer-espace.mp4",
    points: [
      "Créer l’organisation",
      "Consulter le tableau de bord",
      "Repérer les principaux accès du logiciel",
    ],
  },
  {
    id: "configurer-organisation",
    group: "Démarrage",
    title: "Configurer l’organisation",
    duration: "2 min 04 s",
    description: "Renseigner les paramètres utiles au fonctionnement de votre espace RH.",
    video: "02-configurer-organisation.mp4",
    points: [
      "Renseigner les informations de l’entreprise",
      "Configurer l’organisation",
      "Vérifier les paramètres essentiels",
    ],
  },
  {
    id: "ajouter-salarie",
    group: "Salariés",
    title: "Ajouter un salarié",
    duration: "2 min 30 s",
    description: "Créer un dossier salarié et retrouver les informations qui structurent son suivi.",
    video: "03-ajouter-salarie.mp4",
    points: [
      "Créer le dossier du salarié",
      "Renseigner les informations du contrat",
      "Retrouver son parcours et ses échéances",
    ],
  },
  {
    id: "assigner-taches",
    group: "Organisation RH",
    title: "Assigner les tâches",
    duration: "1 min 19 s",
    description: "Répartir les actions RH entre les bonnes personnes et suivre leur avancement.",
    video: "04-assigner-taches.mp4",
    points: [
      "Choisir un responsable",
      "Répartir les tâches",
      "Suivre l’état d’avancement",
    ],
  },
  {
    id: "calendrier-rh",
    group: "Organisation RH",
    title: "Lire le calendrier RH",
    duration: "4 min 21 s",
    description: "Visualiser les échéances à venir et retrouver rapidement les actions à traiter.",
    video: "05-calendrier-rh.mp4",
    points: [
      "Lire les échéances du mois",
      "Repérer les tâches à venir",
      "Ouvrir une échéance depuis le calendrier",
    ],
  },
  {
    id: "ajouter-echeance",
    group: "Parcours personnalisés",
    title: "Ajouter une échéance",
    duration: "1 min 58 s",
    description:
      "Personnaliser un parcours déjà généré en ajoutant une échéance adaptée à votre organisation.",
    video: "06-ajouter-echeance.mp4",
    points: [
      "Ouvrir un parcours existant",
      "Ajouter une nouvelle échéance",
      "Adapter le parcours à votre fonctionnement",
    ],
  },
  {
    id: "suivre-echeances",
    group: "Parcours personnalisés",
    title: "Suivre les échéances",
    duration: "1 min 02 s",
    description: "Retrouver les actions ajoutées et vérifier leur suivi dans le parcours.",
    video: "07-suivre-echeances.mp4",
    points: [
      "Contrôler les tâches du parcours",
      "Retrouver les dates associées",
      "Vérifier l’avancement",
    ],
  },
  {
    id: "gerer-absences",
    group: "Absences",
    title: "Gérer les absences",
    duration: "3 min 55 s",
    description: "Ajouter une absence et la retrouver dans les différentes vues de suivi de l’équipe.",
    video: "08-gerer-absences.mp4",
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
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function TutorialGuide() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [watched, setWatched] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setWatched(readProgress());
  }, []);

  const active = steps[activeIndex];
  const progress = Math.round((watched.length / steps.length) * 100);

  const grouped = useMemo(() => {
    return steps.reduce<Array<{ name: string; items: Array<{ step: TutorialStep; index: number }> }>>(
      (groups, step, index) => {
        const last = groups[groups.length - 1];
        if (!last || last.name !== step.group) {
          groups.push({ name: step.group, items: [{ step, index }] });
        } else {
          last.items.push({ step, index });
        }
        return groups;
      },
      [],
    );
  }, []);

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

  function choose(index: number) {
    setActiveIndex(index);
    window.setTimeout(() => {
      videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function previous() {
    if (activeIndex > 0) choose(activeIndex - 1);
  }

  function next() {
    markWatched();
    if (activeIndex < steps.length - 1) choose(activeIndex + 1);
  }

  function reset() {
    persist([]);
    setActiveIndex(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-surface-border bg-white p-4 shadow-card lg:sticky lg:top-28">
        <div className="border-b border-surface-border pb-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Votre progression</p>
            <span className="text-xs font-semibold text-brand-primary">
              {watched.length} / {steps.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-brand-primary transition-[width] duration-500"
              style={{ width: \`\${progress}%\` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            La progression est enregistrée sur ce navigateur.
          </p>
        </div>

        <nav className="mt-4 space-y-5" aria-label="Séquences du tutoriel">
          {grouped.map((group) => (
            <div key={group.name}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                {group.name}
              </p>
              <div className="space-y-1">
                {group.items.map(({ step, index }) => {
                  const isActive = index === activeIndex;
                  const isWatched = watched.includes(step.id);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => choose(index)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-[#FFF1EC] text-brand-primary"
                          : "text-ink-soft hover:bg-surface-subtle hover:text-ink",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                          isActive
                            ? "border-brand-primary bg-brand-primary text-white"
                            : isWatched
                              ? "border-[#C8E2D9] bg-[#EFF8F4] text-[#27725C]"
                              : "border-surface-border bg-white text-ink-faint",
                        ].join(" ")}
                      >
                        {isWatched && !isActive ? <Check size={13} /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{step.title}</span>
                        <span className="mt-0.5 block text-[11px] text-ink-faint">{step.duration}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {watched.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex items-center gap-2 px-2 text-xs font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            <RotateCcw size={13} />
            Recommencer le parcours
          </button>
        )}
      </aside>

      <section className="min-w-0">
        <div className="rounded-xl border border-surface-border bg-white shadow-card">
          <div className="border-b border-surface-border px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
                {active.group} · Séquence {String(activeIndex + 1).padStart(2, "0")}
              </p>
              <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-ink-faint">
                {active.duration}
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
              {active.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft sm:text-base">
              {active.description}
            </p>
          </div>

          <div className="bg-[#111318] p-2 sm:p-3">
            <video
              key={active.id}
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              onEnded={() => {
                markWatched();
                if (activeIndex < steps.length - 1) {
                  window.setTimeout(() => setActiveIndex((index) => index + 1), 700);
                }
              }}
              className="aspect-video w-full rounded-lg bg-black"
            >
              <source src={\`\${VIDEO_BASE}/\${active.video}\`} type="video/mp4" />
              Votre navigateur ne peut pas lire cette vidéo.
            </video>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-7 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm font-semibold text-ink">Dans cette démonstration</p>
              <ul className="mt-3 grid gap-2">
                {active.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF1EC] text-brand-primary">
                      <Check size={12} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => markWatched()}
              className={[
                "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                watched.includes(active.id)
                  ? "border-[#C8E2D9] bg-[#EFF8F4] text-[#27725C]"
                  : "border-surface-border bg-white text-ink hover:bg-surface-subtle",
              ].join(" ")}
            >
              {watched.includes(active.id) ? <CircleCheck size={16} /> : <Play size={15} />}
              {watched.includes(active.id) ? "Séquence vue" : "Marquer comme vue"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-surface-border px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={previous}
              disabled={activeIndex === 0}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={17} />
              Précédente
            </button>

            <p className="hidden text-xs text-ink-faint sm:block">
              {activeIndex + 1} / {steps.length}
            </p>

            <button
              type="button"
              onClick={next}
              disabled={activeIndex === steps.length - 1}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-35"
            >
              Suivante
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
