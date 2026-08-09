"use client";

import { useEffect, useState } from "react";
import {
  Hourglass,
  Stethoscope,
  FileText,
  Users,
  Bell,
  UserPlus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Sparkles,
  TriangleAlert,
  CircleCheck,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const CHAOS_ITEMS = [
  { icon: Hourglass, label: "Période d'essai", tone: "text-brand-violet bg-brand-violet/10" },
  { icon: Stethoscope, label: "Visite médicale", tone: "text-accent-teal bg-accent-teal/10" },
  { icon: FileText, label: "Document manquant", tone: "text-accent-amber bg-accent-amber/10" },
  { icon: Users, label: "Entretien", tone: "text-brand-blue bg-brand-blue/10" },
  { icon: Bell, label: "Rappel", tone: "text-accent-rose bg-accent-rose/10" },
  { icon: UserPlus, label: "Nouveau collaborateur", tone: "text-brand-violet bg-brand-violet/10" },
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

export function ServicesExperience() {
  const [step, setStep] = useState(0);
  const [parcoursSteps, setParcoursSteps] = useState(DEFAULT_STEPS);
  const [askedIndex, setAskedIndex] = useState<number | null>(null);
  const [summaryShown, setSummaryShown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

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
  }

  return (
    <div className="mx-auto max-w-3xl">
      <style>{`
        @keyframes stepIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .step-in { animation: stepIn 0.5s ease-out both; }
        @keyframes softFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .soft-float { animation: softFloat 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .step-in, .soft-float { animation: none; }
        }
      `}</style>

      {/* Indicateur de progression */}
      {step > 0 && step < TOTAL_STEPS && (
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full transition-colors ${
                i < step ? "bg-brand-blue" : "bg-surface-border"
              }`}
            />
          ))}
        </div>
      )}

      <div key={step} className="step-in">
        {/* Étape 0 — Intro */}
        {step === 0 && (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
              Votre journée RH commence ici.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-ink-soft">
              Vivez en direct comment RH Pilot remet de l&apos;ordre dans une journée chargée.
            </p>
            <Button className="mt-8 px-6 py-3 text-base" onClick={() => setStep(1)}>
              <span className="inline-flex items-center gap-2">
                Commencer l&apos;expérience <ArrowRight size={16} />
              </span>
            </Button>
          </div>
        )}

        {/* Étape 1 — Le chaos */}
        {step === 1 && (
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-faint">6 éléments nécessitent votre attention.</p>
            <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
              {CHAOS_ITEMS.map((item, i) => (
                <Card
                  key={item.label}
                  compact
                  className={`${reducedMotion ? "" : "soft-float"} shadow-sm`}
                  style={{ animationDelay: `${i * 0.3}s`, transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2}deg)` }}
                >
                  <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${item.tone}`}>
                    <item.icon size={16} />
                  </span>
                  <p className="mt-2 text-xs font-medium text-ink">{item.label}</p>
                </Card>
              ))}
            </div>
            <Button className="mt-8 px-6 py-3 text-base" onClick={() => setStep(2)}>
              <span className="inline-flex items-center gap-2">
                Laisser RH Pilot faire le tri <ArrowRight size={16} />
              </span>
            </Button>
          </div>
        )}

        {/* Étape 2 — RH Pilot intervient */}
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
            <Button className="mt-8 px-6 py-3 text-base" onClick={() => setStep(3)}>
              <span className="inline-flex items-center gap-2">
                Générer le parcours <ArrowRight size={16} />
              </span>
            </Button>
          </div>
        )}

        {/* Étape 3 — Automatiser */}
        {step === 3 && (
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-faint">Votre parcours. Vos règles.</p>
            <Card className="mx-auto mt-6 max-w-sm text-left shadow-lg">
              <ul className="flex flex-col divide-y divide-surface-border">
                {parcoursSteps.map((label, i) => (
                  <li key={`${label}-${i}`} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="text-sm text-ink">{label}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Monter l'étape"
                        onClick={() => moveStep(i, -1)}
                        className="rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label="Descendre l'étape"
                        onClick={() => moveStep(i, 1)}
                        className="rounded p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label="Retirer l'étape"
                        onClick={() => removeStep(i)}
                        className="rounded p-1 text-ink-faint hover:bg-accent-rose/10 hover:text-accent-rose"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addStep}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline"
              >
                <Plus size={13} /> Ajouter une étape
              </button>
            </Card>
            <Button className="mt-8 px-6 py-3 text-base" onClick={() => setStep(4)}>
              <span className="inline-flex items-center gap-2">
                Continuer <ArrowRight size={16} />
              </span>
            </Button>
          </div>
        )}

        {/* Étape 4 — Assistant IA */}
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
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      askedIndex === i
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-brand-violet/20 text-ink-soft hover:border-brand-violet/40 hover:text-brand-violet"
                    }`}
                  >
                    {item.q}
                  </button>
                ))}
              </div>
              {askedIndex !== null && (
                <div className="step-in mt-3 rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2.5 text-sm text-ink">
                  {QUESTIONS[askedIndex].a}
                </div>
              )}
            </Card>
            <Button
              className="mt-8 px-6 py-3 text-base disabled:opacity-40"
              disabled={askedIndex === null}
              onClick={() => setStep(5)}
            >
              <span className="inline-flex items-center gap-2">
                Continuer <ArrowRight size={16} />
              </span>
            </Button>
          </div>
        )}

        {/* Étape 5 — Résumé */}
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
              <button
                type="button"
                onClick={() => setSummaryShown(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-violet"
              >
                <Sparkles size={14} /> Résumer mon mois
              </button>
              {summaryShown && (
                <p className="step-in mt-2.5 text-sm leading-relaxed text-ink">
                  Ce mois-ci, 8 parcours ont avancé et 3 échéances ont été traitées sans
                  intervention de votre part. La semaine du 18 reste la plus chargée : à
                  surveiller.
                </p>
              )}
            </Card>

            <Button
              className="mt-8 px-6 py-3 text-base disabled:opacity-40"
              disabled={!summaryShown}
              onClick={() => setStep(6)}
            >
              <span className="inline-flex items-center gap-2">
                Voir ce que vous venez de découvrir <ArrowRight size={16} />
              </span>
            </Button>
          </div>
        )}

        {/* Étape 6 — Reveal */}
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
                <Button className="px-6 py-3 text-base">Essayer RH Pilot gratuitement</Button>
              </Link>
              <button
                type="button"
                onClick={restart}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-faint hover:text-ink"
              >
                <RotateCcw size={12} /> Revoir l&apos;expérience
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
