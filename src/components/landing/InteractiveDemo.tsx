"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import s from "./InteractiveDemo.module.css";

type Rect = { x: number; y: number; width: number; height: number };
type Side = "top" | "bottom" | "left" | "right";
type Step = {
  image: string;
  width: number;
  height: number;
  title: string;
  description: string;
  focus: Rect;
  side: Side;
};

const STEPS: Step[] = [
  {
    image: "dashboard-vue-ensemble.png", width: 1885, height: 1035,
    title: "Repérez les priorités",
    description: "Deux tâches sont en retard. Le tableau de bord vous permet de retrouver les salariés et les parcours concernés.",
    focus: { x: 18.8, y: 3.4, width: 16.4, height: 12.8 }, side: "bottom",
  },
  {
    image: "dashboard-copilote.png", width: 1885, height: 1030,
    title: "Interrogez le copilote",
    description: "À partir des données RH, le copilote résume les situations à vérifier : périodes d’essai, visites médicales ou parcours incomplets.",
    focus: { x: 22.3, y: 56.5, width: 33.2, height: 21.4 }, side: "right",
  },
  {
    image: "fiche-salarie.png", width: 1893, height: 1027,
    title: "Ouvrez le dossier du salarié",
    description: "Sur la fiche de Maxime, retrouvez son parcours d’embauche. Six tâches sur huit sont terminées ; deux restent à traiter.",
    focus: { x: 18.7, y: 66.5, width: 50.8, height: 13 }, side: "top",
  },
  {
    image: "parcours-avance.png", width: 1872, height: 1031,
    title: "Suivez chaque action",
    description: "Chaque tâche possède une échéance, un responsable et un statut. Mettez le parcours à jour au fur et à mesure des démarches.",
    focus: { x: 18.4, y: 40.4, width: 51.3, height: 18.6 }, side: "bottom",
  },
  {
    image: "suggestions.png", width: 1571, height: 913,
    title: "Retrouvez les démarches manquantes",
    description: "Julien a été embauché sans parcours associé. La suggestion permet de créer le parcours depuis le tableau de bord.",
    focus: { x: 59.8, y: 32.3, width: 22.4, height: 28.8 }, side: "left",
  },
  {
    image: "suggestions-parcours-cree.png", width: 1882, height: 1025,
    title: "Adaptez le parcours",
    description: "Le parcours de Julien rassemble les démarches à suivre. Vous pouvez y ajouter une étape selon les besoins de votre organisation.",
    focus: { x: 18.4, y: 14.5, width: 23, height: 21.6 }, side: "right",
  },
  {
    image: "calendrier.png", width: 1887, height: 1032,
    title: "Gardez les échéances en vue",
    description: "Le calendrier réunit les tâches de l’organisation. Les échéances à surveiller restent accessibles à côté du planning.",
    focus: { x: 76.7, y: 49.3, width: 21.3, height: 22.2 }, side: "left",
  },
];

// Place the explanation beside the highlighted area, keeping it inside the frame.
function placeBubble(focus: Rect, side: Side, width: number, height: number, bubbleWidth: number, bubbleHeight: number) {
  const x = focus.x * width / 100;
  const y = focus.y * height / 100;
  const w = focus.width * width / 100;
  const h = focus.height * height / 100;
  const gap = 18;
  const positions = {
    top: { left: x + w / 2 - bubbleWidth / 2, top: y - bubbleHeight - gap },
    bottom: { left: x + w / 2 - bubbleWidth / 2, top: y + h + gap },
    left: { left: x - bubbleWidth - gap, top: y + h / 2 - bubbleHeight / 2 },
    right: { left: x + w + gap, top: y + h / 2 - bubbleHeight / 2 },
  };
  const fits = (candidate: Side) => {
    const p = positions[candidate];
    return p.left >= 14 && p.top >= 14 && p.left + bubbleWidth <= width - 14 && p.top + bubbleHeight <= height - 14;
  };
  const chosen = [side, ...(["top", "bottom", "left", "right"] as Side[]).filter((value) => value !== side)].find(fits) ?? side;
  const left = Math.max(14, Math.min(positions[chosen].left, width - bubbleWidth - 14));
  const top = Math.max(14, Math.min(positions[chosen].top, height - bubbleHeight - 14));
  const arrow = chosen === "top" || chosen === "bottom"
    ? Math.max(22, Math.min(x + w / 2 - left, bubbleWidth - 22))
    : Math.max(22, Math.min(y + h / 2 - top, bubbleHeight - 22));
  return { left, top, side: chosen, arrow };
}

export function InteractiveDemo() {
  const [phase, setPhase] = useState<"welcome" | "tour" | "end">("welcome");
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [geometry, setGeometry] = useState({ width: 1100, height: 604, bubbleWidth: 310, bubbleHeight: 200 });
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const titleId = useId();
  const step = STEPS[index];
  const position = placeBubble(step.focus, step.side, geometry.width, geometry.height, geometry.bubbleWidth, geometry.bubbleHeight);

  useEffect(() => {
    const scene = sceneRef.current;
    const bubble = bubbleRef.current;
    if (!scene) return;
    function measure() {
      const sceneBox = scene!.getBoundingClientRect();
      const bubbleBox = bubble?.getBoundingClientRect();
      setGeometry({ width: sceneBox.width, height: sceneBox.height, bubbleWidth: bubbleBox?.width ?? 310, bubbleHeight: bubbleBox?.height ?? 200 });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    if (bubble) observer.observe(bubble);
    measure();
    return () => observer.disconnect();
  }, [phase, index]);

  useEffect(() => {
    if (interacted.current) (phase === "tour" ? bubbleRef.current : panelRef.current)?.focus({ preventScroll: true });
    const viewport = viewportRef.current;
    if (!viewport || phase !== "tour") return;
    const left = (step.focus.x + step.focus.width / 2) * geometry.width / 100 - viewport.clientWidth / 2;
    const top = (step.focus.y + step.focus.height / 2) * geometry.height / 100 - viewport.clientHeight / 2;
    viewport.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: "instant" });
  }, [phase, index, geometry.width, geometry.height, step.focus]);

  useEffect(() => {
    if (phase !== "tour" || index === STEPS.length - 1) return;
    const image = new window.Image();
    image.src = `/demo/${STEPS[index + 1].image}`;
  }, [phase, index]);

  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function start() { interacted.current = true; setIndex(0); setPhase("tour"); }
  function next() {
    interacted.current = true;
    if (index === STEPS.length - 1) setPhase("end");
    else setIndex((value) => value + 1);
  }
  function back() {
    interacted.current = true;
    if (phase === "end") setPhase("tour");
    else setIndex((value) => Math.max(0, value - 1));
  }
  function reset() { interacted.current = true; setIndex(0); setPhase("welcome"); }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (phase !== "tour" || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); back(); }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === rootRef.current) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch { /* The inline tour stays available when fullscreen is unsupported. */ }
  }

  return (
    <div ref={rootRef} className={s.root} onKeyDown={onKeyDown} role="region" aria-label="Démonstration interactive de RH Pilot">
      <div className={s.frame} data-phase={phase}>
        <div ref={viewportRef} className={s.viewport} tabIndex={phase === "tour" ? 0 : undefined} aria-label="Écran du logiciel">
          <div ref={sceneRef} className={s.scene} style={{ aspectRatio: `${step.width} / ${step.height}` }}>
            <img key={step.image} src={`/demo/${step.image}`} alt={phase === "tour" ? step.title : ""} width={step.width} height={step.height} className={s.screen} loading="lazy" />
            {phase === "tour" && (
              <>
                <div className={s.spotlight} style={{ left: `${step.focus.x}%`, top: `${step.focus.y}%`, width: `${step.focus.width}%`, height: `${step.focus.height}%` }} aria-hidden="true" />
                <button type="button" className={s.hotspot} style={{ left: `${step.focus.x + step.focus.width / 2}%`, top: `${step.focus.y + step.focus.height / 2}%` }} onClick={next} aria-label={`Continuer la démonstration : ${step.title}`} aria-describedby={titleId}><span /></button>
              </>
            )}
          </div>
        </div>

        {phase === "tour" ? (
          <div ref={bubbleRef} tabIndex={-1} role="group" aria-labelledby={titleId} className={s.bubble} data-side={position.side} style={{ left: position.left, top: position.top, "--arrow": `${position.arrow}px` } as CSSProperties}>
            <h3 id={titleId}>{step.title}</h3>
            <p>{step.description}</p>
            <div className={s.bubbleControls}>
              <button type="button" className={s.back} onClick={back} disabled={index === 0} aria-label="Étape précédente"><ArrowLeft size={17} /></button>
              <span>{index + 1} / {STEPS.length}</span>
              <button type="button" className={s.next} onClick={next}>{index === STEPS.length - 1 ? "Terminer" : "Suivant"}<ArrowRight size={15} /></button>
            </div>
          </div>
        ) : (
          <div className={s.overlay}>
            <div ref={panelRef} tabIndex={-1} className={s.welcome} role="group" aria-labelledby={titleId}>
              <div className={s.mascot}><img src="/illustrations/mascot/intro-push-wave.png" alt="" width={240} height={240} /></div>
              <p className={s.brand}>RH Pilot</p>
              <h3 id={titleId}>{phase === "welcome" ? "Découvrez votre espace RH" : "À vous d’essayer."}</h3>
              <p>{phase === "welcome" ? "Du tableau de bord au calendrier, découvrez comment suivre vos salariés et leurs échéances." : "Créez votre espace et retrouvez ces fonctions avec les données de votre entreprise."}</p>
              {phase === "welcome" ? (
                <button type="button" onClick={start} className={s.start}>Démarrer le tour <ArrowRight size={16} /></button>
              ) : (
                <><Link href="/sign-up" className={s.start}>Essayer RH Pilot <ArrowRight size={16} /></Link><button type="button" onClick={start} className={s.replay}><RotateCcw size={14} /> Revoir la démonstration</button></>
              )}
            </div>
          </div>
        )}
      </div>
      <div className={s.toolbar}>
        <span className={s.status} aria-live="polite">{phase === "tour" ? `Étape ${index + 1} sur ${STEPS.length}` : phase === "end" ? <><Check size={14} /> Visite terminée</> : `${STEPS.length} étapes · Données de démonstration`}</span>
        <div className={s.tools}>
          {phase !== "welcome" && <button type="button" onClick={reset} aria-label="Recommencer la démonstration"><RotateCcw size={15} /><span>Recommencer</span></button>}
          <button type="button" onClick={toggleFullscreen} aria-label={expanded ? "Quitter le plein écran" : "Agrandir la démonstration"}>{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{expanded ? "Réduire" : "Agrandir"}</span></button>
        </div>
      </div>
    </div>
  );
}
