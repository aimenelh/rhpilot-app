"use client";

import { useEffect, useRef, useState } from "react";
import {
  Stethoscope,
  FileText,
  FileWarning,
  Users,
  Bell,
  Hourglass,
  Monitor,
  Coffee,
  BookOpen,
  PenTool,
  Flower2,
  ShoppingCart,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Sparkles,
  TriangleAlert,
  CircleCheck,
  Check,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Logomark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const FIND_ITEMS = [
  { id: "lea", icon: Stethoscope, label: "Visite médicale — Léa", tone: "text-accent-teal bg-accent-teal/10", top: "28%", left: "36%", rotate: -6 },
  { id: "karim", icon: Users, label: "Entretien annuel — Karim", tone: "text-brand-blue bg-brand-blue/10", top: "14%", left: "58%", rotate: 4 },
  { id: "ines", icon: FileText, label: "Contrat CDD — Inès", tone: "text-brand-violet bg-brand-violet/10", top: "62%", left: "55%", rotate: -4 },
  { id: "yanis", icon: FileWarning, label: "Document manquant — Yanis", tone: "text-accent-amber bg-accent-amber/10", top: "82%", left: "32%", rotate: 5 },
  { id: "julie", icon: Bell, label: "Rappel équipe — Julie", tone: "text-accent-rose bg-accent-rose/10", top: "46%", left: "16%", rotate: 3 },
];

const DECOR = [
  { icon: Monitor, top: "16%", left: "12%", rotate: 0, size: 34 },
  { icon: Coffee, top: "78%", left: "12%", rotate: -8, size: 24 },
  { icon: BookOpen, top: "20%", left: "82%", rotate: 6, size: 28 },
  { icon: PenTool, top: "50%", left: "88%", rotate: 30, size: 20 },
  { icon: Flower2, top: "8%", left: "90%", rotate: 0, size: 22 },
];

const DEFAULT_STEPS = ["Documents", "Visite médicale", "Intégration", "Suivi à J+30"];

const QUESTIONS = [
  {
    q: "Que dois-je anticiper cette semaine ?",
    a: "La période d'essai de Mathis se termine dans 5 jours et aucune décision n'a encore été formalisée. C'est le seul point qui mérite votre attention immédiate.",
  },
  {
    q: "Résume mon activité RH.",
    a: "8 parcours sont actifs, 3 tâches ont été terminées cette semaine, et une échéance nécessite une action de votre part : la période d'essai de Mathis.",
  },
  {
    q: "Quels parcours sont actuellement actifs ?",
    a: "3 parcours d'embauche, 2 périodes d'essai en cours de suivi, et 3 parcours de visite médicale à jour.",
  },
];

const REVEAL_GROUPS = [
  { title: "Anticiper", items: "Échéances · Notifications · Suggestions", tone: "text-accent-rose bg-accent-rose/10" },
  { title: "Structurer", items: "Parcours · Collaborateurs · Calendrier", tone: "text-brand-blue bg-brand-blue/10" },
  { title: "Assister", items: "Assistant IA · Résumé du mois", tone: "text-brand-violet bg-brand-violet/10" },
  { title: "Piloter", items: "Tableau de bord · Suivi global", tone: "text-accent-teal bg-accent-teal/10" },
];

const TOTAL_STEPS = 6;

const STEP_GLOW: Record<number, [string, string]> = {
  0: ["rgba(46,111,242,0.10)", "rgba(123,92,250,0.08)"],
  1: ["rgba(253,200,39,0.10)", "rgba(244,63,94,0.08)"],
  2: ["rgba(244,63,94,0.14)", "rgba(253,200,39,0.06)"],
  3: ["rgba(46,111,242,0.12)", "rgba(46,111,242,0.06)"],
  4: ["rgba(123,92,250,0.14)", "rgba(46,111,242,0.06)"],
  5: ["rgba(20,201,176,0.12)", "rgba(46,111,242,0.06)"],
  6: ["rgba(46,111,242,0.12)", "rgba(123,92,250,0.1)"],
};

export function ServicesExperience() {
  const [step, setStep] = useState(0);
  const [parcoursSteps, setParcoursSteps] = useState(DEFAULT_STEPS);
  const [askedIndex, setAskedIndex] = useState<number | null>(null);
  const [summaryShown, setSummaryShown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [found, setFound] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [lostTextShown, setLostTextShown] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (reducedMotion || !canHover) return;
    const node = containerRef.current;
    if (!node) return;
    let ticking = false;
    function onMove(e: MouseEvent) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = node!.getBoundingClientRect();
        node!.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
        node!.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
        ticking = false;
      });
    }
    node.addEventListener("mousemove", onMove);
    return () => node.removeEventListener("mousemove", onMove);
  }, [reducedMotion]);

  function markFound(id: string) {
    setFound((prev) => new Set(prev).add(id));
  }

  function revealMathis() {
    setRevealed(true);
    setTimeout(() => setLostTextShown(true), 900);
  }

  function moveStep(index: number, dir: -1 | 1) {
    setParcoursSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeStep(index: number) {
    setParcoursSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function addStep() {
    setParcoursSteps((prev) => [...prev, "Formation obligatoire"]);
  }

  function restart() {
    setStep(0);
    setParcoursSteps(DEFAULT_STEPS);
    setAskedIndex(null);
    setSummaryShown(false);
    setFound(new Set());
    setRevealed(false);
    setLostTextShown(false);
  }

  const canAdvance = step === 4 ? askedIndex !== null : step === 5 ? summaryShown : step !== 1 && step < 6;
  function advance() {
    if (!canAdvance) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (step === 1) return;
      if (e.key === "Enter" || e.key === " ") {
        if (step < 6) {
          e.preventDefault();
          advance();
        }
      } else if (e.key === "Escape") {
        window.location.href = "/";
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, askedIndex, summaryShown]);

  const [glowA, glowB] = STEP_GLOW[step] ?? STEP_GLOW[0];

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16"
      style={{ ["--spot-x" as string]: "50%", ["--spot-y" as string]: "30%" }}
    >
      <style>{`
        @keyframes sceneIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .scene-in { animation: sceneIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .scene-in { animation: none; }
        }
        .press-fx { transition: transform 0.15s ease; }
        .press-fx:active { transform: scale(0.96); }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-[1200ms] ease-out"
        style={{
          background: `radial-gradient(50% 45% at 20% 15%, ${glowA}, transparent 60%), radial-gradient(45% 40% at 85% 80%, ${glowB}, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background: "radial-gradient(320px circle at var(--spot-x) var(--spot-y), rgba(46,111,242,0.06), transparent 70%)",
        }}
      />

      <Link href="/" className="absolute left-6 top-6 flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
        <Logomark size={26} />
      </Link>
      <Link
        href="/"
        aria-label="Quitter l'expérience"
        className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
      >
        <X size={16} />
      </Link>

      <div className="mx-auto w-full max-w-3xl">
        {step > 0 && step < TOTAL_STEPS && (
          <div className="mb-10 flex items-center justify-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i < step ? "w-8 bg-brand-blue" : "w-4 bg-surface-border"}`} />
            ))}
          </div>
        )}

        <div key={step} className="scene-in">
          {step === 0 && (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
                Sauriez-vous retrouver toutes les échéances RH d&apos;un bureau ?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base text-ink-soft">
                Vivez en direct comment RH Pilot remet de l&apos;ordre dans une journée chargée.
              </p>
              <Button className="press-fx mt-8 px-6 py-3 text-base" onClick={() => setStep(1)}>
                <span className="inline-flex items-center gap-2">
                  Commencer l&apos;expérience <ArrowRight size={16} />
                </span>
              </Button>
              <p className="mt-4 text-xs text-ink-faint">Échap pour quitter à tout moment</p>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-faint">
                {found.size < 5
                  ? `Retrouvez les 5 échéances cachées sur ce bureau. (${found.size}/5)`
                  : "Vous avez tout trouvé."}
              </p>

              <div
                className="relative mx-auto mt-6 h-[380px] w-full max-w-xl overflow-hidden rounded-2xl border border-surface-border shadow-inner"
                style={{ background: "linear-gradient(135deg, #f6efe3, #efe2cd)" }}
              >
                {DECOR.map((d, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[#b8a888]"
                    style={{ top: d.top, left: d.left, transform: `translate(-50%, -50%) rotate(${d.rotate}deg)` }}
                  >
                    <d.icon size={d.size} strokeWidth={1.5} />
                  </span>
                ))}

                {FIND_ITEMS.map((item) => {
                  const isFound = found.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => markFound(item.id)}
                      className="press-fx absolute w-24"
                      style={{ top: item.top, left: item.left, transform: `translate(-50%, -50%) rotate(${item.rotate}deg)` }}
                    >
                      <Card compact className={`shadow-md transition-opacity ${isFound ? "opacity-70 ring-1 ring-accent-teal/40" : ""}`}>
                        <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${item.tone}`}>
                          {isFound ? <Check size={13} /> : <item.icon size={13} />}
                        </span>
                        <p className="mt-1 text-[10px] font-medium leading-tight text-ink">{item.label}</p>
                      </Card>
                    </button>
                  );
                })}

                <div className="absolute" style={{ top: "70%", left: "80%", transform: "translate(-50%, -50%)" }}>
                  <div className="relative h-16 w-24">
                    <div className={`absolute inset-0 rotate-[-9deg] transition-all duration-300 ${revealed ? "ring-2 ring-accent-rose/50" : ""}`}>
                      <Card compact className="shadow-md">
                        <Hourglass size={13} className="mx-auto text-brand-violet" />
                        <p className="mt-1 text-[10px] font-medium leading-tight text-ink">
                          Fin de période d&apos;essai — Mathis
                        </p>
                      </Card>
                    </div>
                    <div
                      className="absolute inset-0 z-10 transition-transform duration-700 ease-out"
                      style={{ transform: revealed ? "translate(110px, -18px) rotate(22deg)" : "rotate(3deg)" }}
                    >
                      <Card compact className="bg-white shadow-md">
                        <ShoppingCart size={13} className="mx-auto text-ink-faint" />
                        <p className="mt-1 text-[10px] font-medium leading-tight text-ink-soft">Liste de courses</p>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>

              {found.size === 5 && !revealed && (
                <Button className="press-fx mt-8 px-6 py-3 text-base" onClick={revealMathis}>
                  <span className="inline-flex items-center gap-2">
                    J&apos;ai tout trouvé <ArrowRight size={16} />
                  </span>
                </Button>
              )}

              {lostTextShown && (
                <div className="scene-in mt-8">
                  <p className="text-3xl font-bold text-accent-rose">Perdu…</p>
                  <p className="mx-auto mt-3 max-w-sm text-base text-ink">
                    Vous avez oublié la fin de période d&apos;essai de <strong>Mathis</strong>.
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-ink-faint">
                    Elle était juste là, sous la liste de courses.
                  </p>
                  <div className="mx-auto mt-8 max-w-md border-t border-surface-border pt-6">
                    <p className="text-sm text-ink-soft">Mais ce n&apos;est pas grave, car :</p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      « La mémoire ne devrait jamais être le principal outil d&apos;une équipe RH. »
                    </p>
                  </div>
                  <Button className="press-fx mt-8 px-6 py-3 text-base" onClick={() => setStep(2)}>
                    <span className="inline-flex items-center gap-2">
                      Voir comment RH Pilot change ça <ArrowRight size={16} />
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-faint">RH Pilot a identifié 1 priorité.</p>
              <Card className="mx-auto mt-6 max-w-sm text-left shadow-lg">
                <div className="flex items-center gap-2">
                  <TriangleAlert size={16} className="text-accent-rose" />
                  <p className="text-sm font-semibold text-ink">À anticiper</p>
                </div>
                <p className="mt-2 text-base font-medium text-ink">Période d&apos;essai — Mathis</p>
                <p className="text-sm text-ink-faint">Échéance dans 5 jours</p>
              </Card>
              <Button className="press-fx mt-8 px-6 py-3 text-base" onClick={() => setStep(3)}>
                <span className="inline-flex items-center gap-2">
                  Générer le parcours <ArrowRight size={16} />
                </span>
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-faint">Votre parcours. Vos règles.</p>
              <Card className="mx-auto mt-6 max-w-sm text-left shadow-lg">
                <ul className="flex flex-col divide-y divide-surface-border">
                  {parcoursSteps.map((label, i) => (
                    <li key={`${label}-${i}`} className="flex items-center justify-between gap-2 py-2.5">
                      <span className="text-sm text-ink">{label}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" aria-label="Monter l'étape" onClick={() => moveStep(i, -1)} className="rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink">
                          <ArrowUp size={13} />
                        </button>
                        <button type="button" aria-label="Descendre l'étape" onClick={() => moveStep(i, 1)} className="rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink">
                          <ArrowDown size={13} />
                        </button>
                        <button type="button" aria-label="Retirer l'étape" onClick={() => removeStep(i)} className="rounded p-1 text-ink-faint hover:bg-accent-rose/10 hover:text-accent-rose">
                          <X size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={addStep} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline">
                  <Plus size={13} /> Ajouter une étape
                </button>
              </Card>
              <Button className="press-fx mt-8 px-6 py-3 text-base" onClick={() => setStep(4)}>
                <span className="inline-flex items-center gap-2">
                  Continuer <ArrowRight size={16} />
                </span>
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-faint">Une question ? Votre assistant est déjà là.</p>
              <Card className="mx-auto mt-6 max-w-md text-left shadow-lg">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Sparkles size={14} className="text-brand-violet" /> Assistant RH Pilot
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUESTIONS.map((item, i) => (
                    <button
                      key={item.q}
                      type="button"
                      onClick={() => setAskedIndex(i)}
                      className={`press-fx rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        askedIndex === i ? "border-brand-blue bg-brand-blue text-white" : "border-brand-violet/20 text-ink-soft hover:border-brand-violet/40 hover:text-brand-violet"
                      }`}
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
                {askedIndex !== null && (
                  <div className="scene-in mt-3 rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2.5 text-sm text-ink">
                    {QUESTIONS[askedIndex].a}
                  </div>
                )}
              </Card>
              <Button className="press-fx mt-8 px-6 py-3 text-base disabled:opacity-40" disabled={askedIndex === null} onClick={() => setStep(5)}>
                <span className="inline-flex items-center gap-2">
                  Continuer <ArrowRight size={16} />
                </span>
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-faint">Votre journée est organisée.</p>
              <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
                <Card compact>
                  <p className="text-xl font-semibold text-accent-rose">2</p>
                  <p className="text-[11px] text-ink-faint">priorités</p>
                </Card>
                <Card compact>
                  <p className="text-xl font-semibold text-accent-amber">4</p>
                  <p className="text-[11px] text-ink-faint">cette semaine</p>
                </Card>
                <Card compact>
                  <p className="text-xl font-semibold text-brand-blue">8</p>
                  <p className="text-[11px] text-ink-faint">parcours actifs</p>
                </Card>
              </div>

              <Card className="mx-auto mt-4 max-w-sm text-left shadow-sm">
                <button type="button" onClick={() => setSummaryShown(true)} className="press-fx flex items-center gap-1.5 text-sm font-semibold text-brand-violet">
                  <Sparkles size={14} /> Résumer mon mois
                </button>
                {summaryShown && (
                  <p className="scene-in mt-2.5 text-sm leading-relaxed text-ink">
                    Ce mois-ci, 8 parcours ont avancé et 3 échéances ont été traitées sans
                    intervention de votre part. La semaine du 18 reste la plus chargée : à
                    surveiller.
                  </p>
                )}
              </Card>

              <Button className="press-fx mt-8 px-6 py-3 text-base disabled:opacity-40" disabled={!summaryShown} onClick={() => setStep(6)}>
                <span className="inline-flex items-center gap-2">
                  Voir ce que vous venez de découvrir <ArrowRight size={16} />
                </span>
              </Button>
            </div>
          )}

          {step === 6 && (
            <div className="text-center">
              <CircleCheck size={28} className="mx-auto text-accent-teal" />
              <h2 className="mt-3 text-2xl font-semibold text-ink">Vous venez de découvrir RH Pilot.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                Tout ce que vous venez de faire existe réellement, pour votre organisation.
              </p>

              <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                {REVEAL_GROUPS.map((group) => (
                  <Card key={group.title} compact className="text-left">
                    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${group.tone}`}>
                      {group.title}
                    </span>
                    <p className="mt-2 text-xs text-ink-soft">{group.items}</p>
                  </Card>
                ))}
              </div>

              <div className="mt-9 flex flex-col items-center gap-3">
                <Link href="/sign-up">
                  <Button className="press-fx px-6 py-3 text-base">Essayer RH Pilot gratuitement</Button>
                </Link>
                <button type="button" onClick={restart} className="flex items-center gap-1.5 text-xs font-medium text-ink-faint hover:text-ink">
                  <RotateCcw size={12} /> Revoir l&apos;expérience
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
