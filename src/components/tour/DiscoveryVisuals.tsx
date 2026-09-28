"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ClipboardCheck,
  Compass,
  FileCheck2,
  Route,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { Logomark } from "@/components/Brand";

// Illustrations animées de la visite de découverte : de petites interfaces
// qui se construisent sous les yeux, en CSS pur (classes dz-* de globals.css).
// Chaque illustration est remontée à chaque chapitre, ses animations repartent de zéro.

const delay = (seconds: number) => ({ animationDelay: `${seconds}s` });

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Texte qui se tape tout seul, après un délai. */
function useTyped(text: string, startMs: number, charsPerSecond = 22) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setCount((value) => {
          if (value >= text.length) {
            if (interval) clearInterval(interval);
            return value;
          }
          return value + 1;
        });
      }, 1000 / charsPerSecond);
    }, startMs);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, startMs, charsPerSecond]);
  return { typed: text.slice(0, count), done: count >= text.length };
}

/** Nombre qui monte jusqu'à sa valeur, après un délai. */
function useCountUp(target: number, startMs: number, durationMs = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let frame = 0;
    const timeout = setTimeout(() => {
      const begin = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - begin) / durationMs);
        setValue(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, startMs);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [target, startMs, durationMs]);
  return value;
}

const euros = (value: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "#F7F5EF",
        backgroundImage: "radial-gradient(rgba(20,21,26,0.07) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      {children}
    </div>
  );
}

function Panel({ className = "", style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-[#E4DED4] bg-white shadow-[0_24px_50px_-28px_rgba(60,40,25,0.45)] ${className}`} style={style}>
      {children}
    </div>
  );
}

// 1. Bienvenue : le fil relie les modules autour du logo.
const ORBIT = [
  { icon: Compass, x: 18, y: 22 },
  { icon: Users, x: 50, y: 10 },
  { icon: Route, x: 82, y: 22 },
  { icon: CalendarDays, x: 88, y: 62 },
  { icon: WalletCards, x: 62, y: 88 },
  { icon: Sparkles, x: 26, y: 84 },
  { icon: ClipboardCheck, x: 10, y: 55 },
];

export function WelcomeVisual() {
  const path = ORBIT.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z";
  return (
    <Stage>
      <div className="relative aspect-square w-[min(88%,380px)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <path d={path} pathLength={1} fill="none" stroke="#E8432E" strokeWidth={0.7} strokeLinejoin="round" strokeLinecap="round" className="dz-draw" style={delay(0.2)} />
        </svg>
        {ORBIT.map(({ icon: Icon, x, y }, i) => (
          // Le conteneur centre, l'enfant anime : l'animation ne doit pas écraser le décalage.
          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            <div
              className="dz-pop flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E4DED4] bg-white text-ink shadow-[0_10px_24px_-14px_rgba(60,40,25,0.5)]"
              style={delay(0.25 + i * 0.2)}
            >
              <Icon size={20} strokeWidth={1.8} />
            </div>
          </div>
        ))}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="dz-pop" style={delay(1.7)}>
            <div className="dz-float rounded-[22px] shadow-[0_24px_40px_-16px_rgba(232,67,46,0.55)]">
              <Logomark size={84} />
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}

// 2. Tableau de bord : ce qui compte remonte tout seul.
const PRIORITIES = [
  { title: "Déclarer la DPAE de Sofia", who: "Camille · RH", tag: "En retard", tone: "bg-accent-rose/10 text-accent-rose" },
  { title: "Visite médicale de Tom", who: "Camille · RH", tag: "Cette semaine", tone: "bg-accent-amber/10 text-accent-amber" },
  { title: "Point à 30 jours de Karim", who: "À attribuer", tag: "Sans responsable", tone: "bg-brand-primary/10 text-brand-primary" },
];

export function DashboardVisual() {
  const upToDate = useCountUp(92, 900);
  return (
    <Stage>
      <div className="w-[min(90%,400px)] space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Salariés", value: "12" },
            { label: "Parcours", value: "8" },
            { label: "À jour", value: `${Math.round(upToDate)} %` },
          ].map((kpi, i) => (
            <Panel key={kpi.label} className="dz-rise px-3 py-3" style={delay(0.15 + i * 0.1)}>
              <p className="text-[11px] text-ink-faint">{kpi.label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{kpi.value}</p>
            </Panel>
          ))}
        </div>
        <Panel className="dz-rise p-4" style={delay(0.45)}>
          <p className="text-xs font-semibold text-ink">À traiter en priorité</p>
          <div className="mt-3 space-y-2">
            {PRIORITIES.map((item, i) => (
              <div key={item.title} className="dz-slide-left flex items-center gap-3 rounded-xl border border-surface-border px-3 py-2.5" style={delay(0.8 + i * 0.28)}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${i === 0 ? "dz-pulse bg-accent-rose" : i === 1 ? "bg-accent-amber" : "bg-brand-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{item.title}</p>
                  <p className="text-[11px] text-ink-faint">{item.who}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tone}`}>{item.tag}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Stage>
  );
}

// 3. Salariés : la liste, puis la fiche en onglets.
const PEOPLE = [
  { initials: "CM", name: "Camille Morel", role: "Responsable RH", color: "bg-accent-teal" },
  { initials: "KB", name: "Karim Belhaj", role: "Technicien", color: "bg-brand-primary" },
  { initials: "SL", name: "Sofia Lambert", role: "Assistante", color: "bg-[#5B4BB7]" },
];

export function EmployeesVisual() {
  const [tab, setTab] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = [1900, 2700, 3500].map((ms, i) => setTimeout(() => setTab(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  const tabs = ["Aperçu", "Paie", "Espace", "Informations"];
  return (
    <Stage>
      <div className="relative h-[300px] w-[min(92%,420px)]">
        <Panel className="dz-rise absolute left-0 top-0 w-[62%] p-3" style={delay(0.1)}>
          <p className="px-1 text-xs font-semibold text-ink">Salariés</p>
          <div className="mt-2 space-y-1.5">
            {PEOPLE.map((person, i) => (
              <div
                key={person.name}
                className={`dz-slide-left flex items-center gap-2.5 rounded-lg px-2 py-2 ${i === 2 ? "bg-brand-primary/5 ring-1 ring-brand-primary/30" : ""}`}
                style={delay(0.3 + i * 0.15)}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${person.color}`}>{person.initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-ink">{person.name}</p>
                  <p className="truncate text-[10px] text-ink-faint">{person.role}</p>
                </div>
                <span className="ml-auto text-ink-faint">⋯</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="dz-slide-left absolute bottom-0 right-0 w-[70%] p-4" style={delay(1.1)}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B4BB7] text-xs font-semibold text-white">SL</span>
            <div>
              <p className="text-sm font-semibold text-ink">Sofia Lambert</p>
              <p className="text-[11px] text-ink-faint">CDI · entrée le 8 octobre</p>
            </div>
          </div>
          <div className="relative mt-3 flex gap-3 border-b border-surface-border text-[11px]">
            {tabs.map((label, i) => (
              <span key={label} className={`pb-1.5 transition-colors duration-300 ${i === tab ? "font-semibold text-ink" : "text-ink-faint"}`}>
                {label}
              </span>
            ))}
            <span
              className="absolute bottom-[-1px] h-0.5 rounded-full bg-brand-primary transition-all duration-500"
              style={{ left: `${[0, 23, 43, 67][tab]}%`, width: `${[17, 12, 16, 30][tab]}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["Parcours", "Embauche · 5/8"],
              ["Congés", "18,5 jours"],
              ["Visite médicale", "23 octobre"],
              ["Espace salarié", "Activé"],
            ].map(([label, value], i) => (
              <div key={label} className="dz-rise rounded-lg bg-surface-subtle px-2.5 py-2" style={delay(1.4 + i * 0.1)}>
                <p className="text-[10px] text-ink-faint">{label}</p>
                <p className="text-[12px] font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Stage>
  );
}

// 4. Parcours : une phrase devient un plan daté.
const STEPS = [
  { date: "29 sept.", label: "Contrat" },
  { date: "5 oct.", label: "DPAE" },
  { date: "8 oct.", label: "Accueil" },
  { date: "23 oct.", label: "Visite médicale" },
  { date: "9 nov.", label: "Point 30 j" },
];

export function JourneyVisual() {
  const { typed, done } = useTyped("Embauche de Sofia le 8 octobre", 350, 24);
  return (
    <Stage>
      <div className="w-[min(92%,420px)]">
        <Panel className="dz-rise flex items-center gap-2.5 px-3.5 py-3" style={delay(0.05)}>
          <Route size={16} className="shrink-0 text-brand-primary" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {typed}
            {!done ? <span className="dz-caret ml-px inline-block h-4 w-[2px] translate-y-0.5 bg-ink" /> : null}
          </span>
          <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-white transition-colors duration-300 ${done ? "bg-brand-primary" : "bg-ink-faint/40"}`}>Lancer</span>
        </Panel>
        <div className="relative mt-10 h-28">
          <div className="dz-grow-x absolute left-[4%] right-[4%] top-5 h-[3px] rounded-full bg-brand-primary" style={delay(1.9)} />
          {STEPS.map((step, i) => (
            <div key={step.label} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${6 + i * 22}%` }}>
              <p className="dz-rise text-[10px] font-semibold text-brand-primary-dark" style={delay(2.1 + i * 0.16)}>{step.date}</p>
              <span className="dz-pop mx-auto mt-1 block h-3.5 w-3.5 rounded-full border-[3px] border-brand-primary bg-white" style={delay(2.05 + i * 0.16)} />
              <p className="dz-rise mt-2 w-[72px] text-[11px] leading-tight text-ink" style={delay(2.2 + i * 0.16)}>{step.label}</p>
            </div>
          ))}
        </div>
        <p className="dz-rise text-center text-xs text-ink-soft" style={delay(3.1)}>
          <span className="font-semibold text-ink">8 actions</span> datées, chacune avec son responsable
        </p>
      </div>
    </Stage>
  );
}

// 5. Absences et obligations : le planning se remplit, les échéances arrivent.
const DAYS = ["L", "M", "M", "J", "V"];
const LEAVES = [
  { name: "Camille", start: 0, span: 3, tone: "bg-accent-teal" },
  { name: "Karim", start: 2, span: 2, tone: "bg-brand-primary" },
  { name: "Sofia", start: 4, span: 1, tone: "bg-[#5B4BB7]" },
];

export function AbsencesVisual() {
  return (
    <Stage>
      <div className="w-[min(92%,420px)] space-y-3">
        <Panel className="dz-rise p-4" style={delay(0.1)}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">Planning de l&apos;équipe</p>
            <p className="text-[11px] text-ink-faint">Semaine du 12 oct.</p>
          </div>
          <div className="mt-3 grid grid-cols-[64px_repeat(5,1fr)] gap-y-2 text-[11px]">
            <span />
            {DAYS.map((day, i) => <span key={i} className="text-center text-ink-faint">{day}</span>)}
            {LEAVES.map((leave, row) => (
              <div key={leave.name} className="contents">
                <span className="self-center text-ink-soft">{leave.name}</span>
                <div className="relative col-span-5 h-6 rounded-md bg-surface-subtle">
                  <div
                    className={`dz-grow-x absolute inset-y-0.5 rounded ${leave.tone}`}
                    style={{ left: `${leave.start * 20 + 1}%`, width: `${leave.span * 20 - 2}%`, ...delay(0.5 + row * 0.25) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          <Panel className="dz-slide-left flex items-center gap-2.5 p-3" style={delay(1.4)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-teal/10 text-accent-teal"><Check size={15} /></span>
            <div>
              <p className="text-[12px] font-medium text-ink">Justificatif reçu</p>
              <p className="text-[10px] text-ink-faint">Arrêt de Karim</p>
            </div>
          </Panel>
          <Panel className="dz-slide-left flex items-center gap-2.5 p-3" style={delay(1.7)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber"><FileCheck2 size={15} /></span>
            <div>
              <p className="text-[12px] font-medium text-ink">DUERP à revoir</p>
              <p className="text-[10px] text-ink-faint">dans 21 jours</p>
            </div>
          </Panel>
        </div>
      </div>
    </Stage>
  );
}

// 6. Paie : le tableau se remplit, le bulletin se calcule.
const GRID = [
  ["Camille", "6", "150", "20"],
  ["Karim", "", "", "19"],
  ["Sofia", "4", "80", "15"],
];

export function PayrollVisual() {
  const net = useCountUp(2300.59, 2300, 1200);
  let cell = 0;
  return (
    <Stage>
      <div className="relative h-[310px] w-[min(94%,430px)]">
        <Panel className="dz-rise absolute left-0 top-0 w-[88%] p-3.5" style={delay(0.1)}>
          <p className="text-xs font-semibold text-ink">Paie d&apos;octobre 2026</p>
          <div className="mt-2.5 grid grid-cols-[1.3fr_repeat(3,1fr)] gap-1.5 text-[10px]">
            {["", "H. sup.", "Prime", "Titres-resto"].map((head) => <span key={head} className="px-1 text-ink-faint">{head}</span>)}
            {GRID.map((row) =>
              row.map((value, col) => {
                if (col === 0) return <span key={`${row[0]}-name`} className="self-center px-1 text-[11px] font-medium text-ink">{value}</span>;
                const index = value ? cell++ : -1;
                return (
                  <span key={`${row[0]}-${col}`} className="h-7 rounded-md border border-surface-border bg-white">
                    {value ? (
                      <span className="dz-fill flex h-full items-center justify-end rounded-md px-2 text-[11px] tabular-nums text-ink" style={delay(0.5 + index * 0.13)}>
                        {value}
                      </span>
                    ) : null}
                  </span>
                );
              }),
            )}
          </div>
        </Panel>
        <Panel className="dz-slide-left absolute bottom-0 right-0 w-[64%] p-4" style={delay(1.9)}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-ink">Camille Morel</p>
            <p className="text-[10px] text-ink-faint">Bulletin d&apos;octobre</p>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-ink-soft">
            <div className="flex justify-between"><span>Salaire brut</span><span className="tabular-nums text-ink">3 088,46 €</span></div>
            <div className="flex justify-between"><span>Cotisations</span><span className="tabular-nums">−679,46 €</span></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-ink px-3 py-2 text-white">
            <span className="text-[11px] font-medium">Net à payer</span>
            <span className="text-base font-semibold tabular-nums">{euros(net)} €</span>
          </div>
          <span
            className="dz-stamp absolute -right-2 -top-3 rounded-md border-2 border-accent-teal bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal"
            style={delay(3.6)}
          >
            Contrôlé
          </span>
        </Panel>
      </div>
    </Stage>
  );
}

// 7. Espace salarié : le bulletin arrive sur le téléphone.
export function EmployeeSpaceVisual() {
  return (
    <Stage>
      <div className="dz-rise relative h-[320px] w-[168px] rounded-[34px] bg-ink p-2 shadow-[0_40px_60px_-30px_rgba(20,15,10,0.7)]" style={delay(0.05)}>
        <div className="relative h-full overflow-hidden rounded-[27px] bg-[#F7F5EF] px-3 pt-9">
          <span className="absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-full bg-ink" />
          <div className="flex items-center gap-1.5">
            <Logomark size={18} />
            <p className="text-[10px] font-semibold text-ink">Mon espace</p>
          </div>
          <p className="mt-3 text-[13px] font-semibold text-ink">Mes bulletins</p>
          <div className="mt-2 space-y-1.5">
            {["Octobre 2026", "Septembre 2026", "Août 2026"].map((month, i) => (
              <div key={month} className="dz-rise flex items-center justify-between rounded-lg bg-white px-2 py-1.5" style={delay(1.6 + i * 0.12)}>
                <span className="text-[10px] font-medium text-ink">{month}</span>
                {i === 0 ? <span className="text-[8px] font-semibold text-brand-primary">Nouveau</span> : null}
              </div>
            ))}
          </div>
          <div className="dz-rise mt-2 rounded-lg bg-white px-2 py-1.5" style={delay(2)}>
            <p className="text-[8px] text-ink-faint">Congés disponibles</p>
            <p className="text-[12px] font-semibold text-ink">18,5 jours</p>
          </div>
          <div className="dz-notify absolute inset-x-2 top-8 flex gap-2 rounded-xl bg-white p-2 shadow-[0_12px_24px_-10px_rgba(20,15,10,0.45)]">
            <Bell size={13} className="mt-0.5 shrink-0 text-brand-primary" />
            <p className="text-[9px] leading-snug text-ink">
              <span className="font-semibold">Votre bulletin d&apos;octobre</span> est disponible.
            </p>
          </div>
        </div>
      </div>
    </Stage>
  );
}

// 8. Copilote : une question, une réponse tirée de vos données.
const ANSWERS = [
  { when: "Jeu. 15 oct.", text: "Décider de la suite de l'essai de Karim", tone: "bg-brand-primary" },
  { when: "Mar. 13 oct.", text: "Convoquer Tom à la visite médicale", tone: "bg-accent-teal" },
  { when: "En attente", text: "Accusé de réception DPAE de Sofia", tone: "bg-[#5B4BB7]" },
];

export function CopilotVisual() {
  const { typed, done } = useTyped("Que dois-je anticiper cette semaine ?", 300, 26);
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => setAnswered(true), prefersReducedMotion() ? 0 : 750);
    return () => clearTimeout(timeout);
  }, [done]);
  return (
    <Stage>
      <Panel className="dz-rise w-[min(92%,410px)] overflow-hidden" style={delay(0.05)}>
        <div className="flex items-center gap-2 border-b border-surface-border px-4 py-2.5">
          <Logomark size={20} />
          <p className="text-[13px] font-semibold text-ink">Copilote</p>
          <span className="ml-auto text-[10px] font-medium text-accent-teal">● vos données</span>
        </div>
        <div className="min-h-[230px] space-y-2.5 p-4">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-primary px-3 py-2 text-[12px] font-medium text-white">
              {typed}
              {!done ? <span className="dz-caret ml-px inline-block h-3 w-[2px] translate-y-0.5 bg-white" /> : null}
            </p>
          </div>
          {done && !answered ? (
            <div className="flex gap-1 px-1 pt-1">
              {[0, 1, 2].map((i) => <span key={i} className="dz-dot h-1.5 w-1.5 rounded-full bg-ink-faint" style={delay(i * 0.15)} />)}
            </div>
          ) : null}
          {answered ? (
            <div className="space-y-1.5">
              <p className="dz-rise text-[11px] text-ink-soft">Trois points demandent votre attention :</p>
              {ANSWERS.map((answer, i) => (
                <div key={answer.text} className="dz-slide-left flex items-center gap-2.5 rounded-lg border border-surface-border px-2.5 py-2" style={delay(0.15 + i * 0.18)}>
                  <span className={`w-1 self-stretch rounded-full ${answer.tone}`} />
                  <span className="w-[66px] shrink-0 text-[10px] font-semibold text-ink">{answer.when}</span>
                  <span className="text-[11px] text-ink">{answer.text}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>
    </Stage>
  );
}
