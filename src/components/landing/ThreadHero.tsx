"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import s from "./ThreadHero.module.css";

type Role = "RH" | "Manager" | "Dirigeant";
type Step = { date: string; label: string; role: Role; proof?: string };
type Scenario = {
  key: string;
  menu: string;
  lines: [string, string];
  steps: Step[];
  /** Index de la prochaine action : les précédentes sont faites. */
  next: number;
};

// Les plans affichés reprennent les parcours réels de RH Pilot
// (prisma/seed.ts : ordre, décalages en jours, responsables, pièces).
const SCENARIOS: Scenario[] = [
  {
    key: "embauche",
    menu: "Une arrivée",
    lines: ["Quand Léa arrive", "le 5 octobre,"],
    next: 1,
    steps: [
      { date: "25 sept.", label: "Préparer le contrat de travail", role: "RH" },
      { date: "2 oct.", label: "Déclarer la DPAE", role: "RH", proof: "Accusé de réception" },
      { date: "3 oct.", label: "Préparer le poste de travail", role: "Manager" },
      { date: "4 oct.", label: "Faire signer le contrat", role: "RH", proof: "Contrat signé" },
      { date: "5 oct.", label: "Accueillir Léa", role: "Manager" },
      { date: "20 oct.", label: "Demander la visite médicale", role: "RH" },
      { date: "4 nov.", label: "Point d’intégration à 30 jours", role: "Manager" },
      { date: "19 nov.", label: "Suivre la visite médicale", role: "RH" },
    ],
  },
  {
    key: "fin_periode_essai",
    menu: "Une fin de période d’essai",
    lines: ["Quand l’essai de Karim", "finit le 20 octobre,"],
    next: 2,
    steps: [
      { date: "29 sept.", label: "Vérifier le délai de prévenance", role: "RH" },
      { date: "5 oct.", label: "Entretien de bilan", role: "Manager", proof: "Compte-rendu" },
      { date: "13 oct.", label: "Décider : confirmation ou rupture", role: "Dirigeant" },
      { date: "17 oct.", label: "Formaliser la décision", role: "RH" },
      { date: "20 oct.", label: "Clôturer le dossier", role: "RH" },
    ],
  },
  {
    key: "visite_medicale",
    menu: "Une visite médicale",
    lines: ["Quand Tom a sa visite", "médicale le 30 octobre,"],
    next: 1,
    steps: [
      { date: "30 sept.", label: "Identifier le type de suivi", role: "RH" },
      { date: "9 oct.", label: "Prendre rendez-vous", role: "RH", proof: "Convocation" },
      { date: "16 oct.", label: "Informer Tom de la date", role: "RH" },
      { date: "30 oct.", label: "Confirmer la visite", role: "RH" },
      { date: "6 nov.", label: "Mettre à jour sa fiche", role: "RH" },
    ],
  },
];

// Géométrie du fil. Bureau : une onde douce, en fraction de la largeur de la bande
// (t = 0 à 1), prolongée hors champ. Mobile : un fil vertical, pas fixe en pixels.
const BAND_H = 340;
const T0 = -0.25;
const T1 = 1.25;
const wave = (t: number) => 170 + 20 * Math.sin(2 * Math.PI * 0.85 * t + 0.4) + 7 * Math.sin(2 * Math.PI * 2.3 * t + 1.9);
const WIDE_PATH = Array.from({ length: 301 }, (_, i) => {
  const t = T0 + ((T1 - T0) * i) / 300;
  return `${i ? "L" : "M"}${((t - T0) * 1000).toFixed(1)} ${wave(t).toFixed(1)}`;
}).join("");
const knotT = (i: number, n: number) => 0.07 + (0.86 * i) / (n - 1);

const STEP_Y = 100;
const TOP_Y = 34;
const narrowX = (y: number) => 22 + 8 * Math.sin(y / 64 + 0.5);
const narrowHeight = (n: number) => TOP_Y + (n - 1) * STEP_Y + 96;
const narrowPath = (h: number) =>
  Array.from({ length: 121 }, (_, i) => {
    const y = -24 + ((h + 48) * i) / 120;
    return `${i ? "L" : "M"}${narrowX(y).toFixed(1)} ${y.toFixed(1)}`;
  }).join("");

// Le stylo met 1,6 s à parcourir le fil ; chaque nœud apparaît quand il passe.
const DRAW_START = 0.45;
const DRAW = 1.6;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

function Plan({ scenario, played }: { scenario: Scenario; played: boolean }) {
  const n = scenario.steps.length;
  const h = narrowHeight(n);
  const todayT = (knotT(scenario.next - 1, n) + knotT(scenario.next, n)) / 2;
  // Mobile : le repère se place juste au-dessus de la prochaine action.
  const todayY = TOP_Y + scenario.next * STEP_Y - 30;
  const style: Vars = { "--mh": `${h}px` };
  if (played) style["--intro-offset"] = "0s";
  return (
    <div className={s.band} style={style}>
      <svg className={s.wide} viewBox={`0 0 1500 ${BAND_H}`} preserveAspectRatio="none" aria-hidden="true">
        <path className={s.thread} d={WIDE_PATH} pathLength={1} />
      </svg>
      <svg className={s.tall} viewBox={`0 0 60 ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <path className={s.thread} d={narrowPath(h)} pathLength={1} />
      </svg>
      <div
        className={s.today}
        aria-hidden="true"
        style={{ "--t": todayT, "--y": `${wave(todayT)}px`, "--my": `${todayY}px`, "--d": `${DRAW_START + DRAW * ((todayT - T0) / (T1 - T0))}s`, "--md": `${DRAW_START + DRAW * ((todayY + 24) / (h + 48))}s` } as Vars}
      >
        <span>Aujourd’hui</span>
      </div>
      <ol className={s.steps} aria-label={`Plan d’action RH Pilot : ${scenario.menu.toLowerCase()}`}>
        {scenario.steps.map((step, i) => {
          const t = knotT(i, n);
          const y = TOP_Y + i * STEP_Y;
          const state = i < scenario.next ? "done" : i === scenario.next ? "next" : "todo";
          const vars: Vars = {
            "--t": t,
            "--y": `${wave(t)}px`,
            "--mx": `${narrowX(y)}px`,
            "--my": `${y}px`,
            "--d": `${DRAW_START + DRAW * ((t - T0) / (T1 - T0))}s`,
            "--md": `${DRAW_START + DRAW * ((y + 24) / (h + 48))}s`,
          };
          return (
            <li key={step.label} className={s.step} data-state={state} data-side={i % 2 ? "below" : "above"} style={vars}>
              <span className={s.knot} aria-hidden="true">
                {state === "done" && (
                  <svg viewBox="0 0 12 12" width="10" height="10">
                    <path d="M2.5 6.3 5 8.7 9.6 3.6" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={s.label}>
                <time className={s.date}>{step.date}</time>
                <span className={s.what}>{step.label}</span>
                <span className={s.meta}>
                  {step.role}
                  {step.proof ? ` · ${step.proof}` : ""}
                </span>
                {state === "next" && <span className={s.inlineNote}>rappel envoyé</span>}
                <span className={s.hidden}>{state === "done" ? " (fait)" : state === "next" ? " (prochaine action, rappel envoyé)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ThreadHero() {
  const root = useRef<HTMLDivElement>(null);
  const clause = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLLIElement | null)[]>([]);
  const menuId = useId();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [played, setPlayed] = useState(false);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const current = useRef(0);
  const auto = useRef(true);
  const hovering = useRef(false);
  const swap = useRef(0);

  const choose = useCallback((next: number) => {
    if (next === current.current) return;
    current.current = next;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(swap.current);
    setPhase("out");
    swap.current = window.setTimeout(() => {
      setIndex(next);
      setPlayed(true);
      setPhase("in");
    }, instant ? 0 : 240);
  }, []);

  // Démonstration automatique : un seul tour des trois événements, qui s'arrête
  // dès que le visiteur touche à la phrase, et attend s'il survole le plan.
  // Pas sur mobile : la phrase change de hauteur et ferait bouger la page sous le doigt.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 760px)").matches) return;
    const el = root.current;
    const offset = el ? parseFloat(getComputedStyle(el).getPropertyValue("--intro-offset")) || 0 : 0;
    const order = [1, 2, 0];
    let step = 0;
    let timer = 0;
    const tick = () => {
      if (!auto.current) return;
      if (hovering.current || document.hidden) {
        timer = window.setTimeout(tick, 1200);
        return;
      }
      choose(order[step]);
      step += 1;
      if (step < order.length) timer = window.setTimeout(tick, 6500);
    };
    timer = window.setTimeout(tick, Math.max(1500, (offset + 7.5) * 1000 - performance.now()));
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(swap.current);
    };
  }, [choose]);

  // Fermer le menu au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    options.current[current.current]?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const takeOver = () => {
    auto.current = false;
    setTouched(true);
  };

  const pick = (next: number) => {
    takeOver();
    setOpen(false);
    choose(next);
    clause.current?.focus();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const focused = options.current.findIndex((item) => item === document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      options.current[(focused + delta + SCENARIOS.length) % SCENARIOS.length]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (focused >= 0) pick(focused);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      clause.current?.focus();
    }
  };

  const scenario = SCENARIOS[index];
  const clauseStyle: Vars | undefined = played ? { "--intro-offset": "0s" } : undefined;

  return (
    <div
      ref={root}
      className={s.hero}
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => (hovering.current = false)}
    >
      <div className={s.top}>
        <div className={s.titleWrap}>
          <h1 id="arrival-title" className={s.title}>
            <button
              ref={clause}
              type="button"
              className={s.clause}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => {
                takeOver();
                setOpen((value) => !value);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  takeOver();
                  setOpen(true);
                }
              }}
            >
              <span key={scenario.key} className={s.clauseText} data-phase={phase} style={clauseStyle}>
                <span className={s.line}>{scenario.lines[0]}</span>
                <span className={s.line}>
                  {scenario.lines[1]}
                  <span className={s.chevron} aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="0.42em" height="0.42em">
                      <path d="M4 7.5 10 13.5 16 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {!touched && (
                      <span className={s.hint}>
                        <svg viewBox="0 0 46 26" width="40" height="23">
                          <path d="M44 8 C32 18 18 20 5 13 M5 13 L12 20 M5 13 L14 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        changez l’événement
                      </span>
                    )}
                  </span>
                </span>
              </span>
            </button>
            <span className={`${s.line} ${s.slogan}`}>vous gardez le fil.</span>
          </h1>
          {open && (
            <ul id={menuId} role="listbox" aria-label="Choisir un événement RH" className={s.menu} onKeyDown={onMenuKey}>
              {SCENARIOS.map((item, i) => (
                <li
                  key={item.key}
                  ref={(node) => {
                    options.current[i] = node;
                  }}
                  role="option"
                  tabIndex={-1}
                  aria-selected={i === index}
                  onClick={() => pick(i)}
                >
                  <span>{item.menu}</span>
                  <small>{item.steps.length} actions datées</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={s.below}>
          <p className={s.lead}>
            RH Pilot, le logiciel RH des TPE et PME, transforme chaque événement en plan daté : qui fait quoi, pour quand, avec les rappels.
          </p>
          <div className={s.actions}>
            <Link href="/sign-up" className={s.primary}>
              Créer mon premier plan
            </Link>
            <Link href="/services#demo" className={s.secondary}>
              Voir la démonstration
            </Link>
          </div>
          <p className={s.offer}>Gratuit jusqu’à 3 salariés.</p>
        </div>
      </div>
      <div className={s.plan} data-phase={phase}>
        <Plan key={scenario.key} scenario={scenario} played={played} />
      </div>
      <span className={s.hidden} aria-live="polite">
        {played ? `${scenario.menu} : ${scenario.steps.length} actions datées.` : ""}
      </span>
      <p className={s.caption}>Le plan ci-dessus est celui que RH Pilot crée, action par action.</p>
    </div>
  );
}
