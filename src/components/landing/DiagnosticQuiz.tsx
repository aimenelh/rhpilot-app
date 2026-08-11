"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Hourglass,
  Stethoscope,
  UserRoundX,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { submitDiagnostic, type DiagnosticAnswers } from "@/app/diagnostic/actions";

type Option = { label: string; risky: boolean };
type Question = { id: keyof DiagnosticAnswers; question: string; options: Option[]; riskArea?: string };

const QUESTIONS: Question[] = [
  {
    id: "periodeEssai",
    question: "Avez-vous un process formalisé pour vos périodes d'essai (rappels, délais, décision) ?",
    riskArea: "periode-essai",
    options: [
      { label: "Oui, tout est suivi", risky: false },
      { label: "Ça dépend des cas", risky: true },
      { label: "Non, on gère au cas par cas", risky: true },
    ],
  },
  {
    id: "visiteMedicale",
    question: "Vos visites médicales d'embauche sont-elles toujours programmées dans les délais ?",
    riskArea: "visite-medicale",
    options: [
      { label: "Oui, systématiquement", risky: false },
      { label: "Pas toujours", risky: true },
      { label: "On ne suit pas ça de près", risky: true },
    ],
  },
  {
    id: "responsabilites",
    question: "En cas de nouvelle embauche, tout le monde sait-il qui doit faire quoi ?",
    riskArea: "responsabilites",
    options: [
      { label: "Oui, c'est clair", risky: false },
      { label: "Parfois flou", risky: true },
      { label: "Non, ça se décide sur le moment", risky: true },
    ],
  },
  {
    id: "entretienPro",
    question: "Faites-vous les entretiens professionnels obligatoires tous les 2 ans ?",
    riskArea: "entretien-pro",
    options: [
      { label: "Oui, systématiquement", risky: false },
      { label: "Pas toujours", risky: true },
      { label: "On n'y pense pas vraiment", risky: true },
    ],
  },
  {
    id: "surcharge",
    question: "Combien de temps passez-vous chaque semaine sur des relances ou rappels manuels ?",
    riskArea: "surcharge",
    options: [
      { label: "Moins d'1 heure", risky: false },
      { label: "Entre 1 et 3 heures", risky: true },
      { label: "Plus de 3 heures", risky: true },
    ],
  },
  {
    id: "companySize",
    question: "Combien de salariés gérez-vous aujourd'hui ?",
    options: [
      { label: "Moins de 10", risky: false },
      { label: "Entre 10 et 50", risky: false },
      { label: "Plus de 50", risky: false },
    ],
  },
];

const RISK_AREAS: Record<string, { label: string; icon: typeof Hourglass; tip: string }> = {
  "periode-essai": {
    label: "Suivi des périodes d'essai",
    icon: Hourglass,
    tip: "RH Pilot calcule automatiquement le délai de prévenance et vous alerte avant l'échéance, pas après.",
  },
  "visite-medicale": {
    label: "Visites médicales d'embauche",
    icon: Stethoscope,
    tip: "Un parcours dédié déclenche le suivi dès la prise de poste, avec un rappel avant les trois mois.",
  },
  "responsabilites": {
    label: "Répartition des responsabilités",
    icon: UserRoundX,
    tip: "Chaque tâche a un responsable visible, jamais deviné au dernier moment.",
  },
  "entretien-pro": {
    label: "Entretiens professionnels",
    icon: GraduationCap,
    tip: "RH Pilot vous rappelle l'échéance des 2 ans avant qu'elle ne devienne un risque de sanction.",
  },
  "surcharge": {
    label: "Charge administrative",
    icon: Clock,
    tip: "Moins de relances manuelles à faire soi-même, plus de temps pour le reste.",
  },
};

export function DiagnosticQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isResult = step === QUESTIONS.length;
  const current = QUESTIONS[step];

  function answer(label: string) {
    const next = { ...answers, [current.id]: label };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUESTIONS.length);
      void saveDiagnostic(next as DiagnosticAnswers, null);
    }
  }

  async function saveDiagnostic(finalAnswers: DiagnosticAnswers, providedEmail: string | null) {
    const riskAreas = QUESTIONS.filter((q) => {
      const chosen = finalAnswers[q.id];
      const option = q.options.find((o) => o.label === chosen);
      return option?.risky && q.riskArea;
    }).map((q) => q.riskArea!);

    await submitDiagnostic(finalAnswers, riskAreas, providedEmail);
  }

  async function handleEmailSubmit() {
    if (!email.trim()) return;
    setSubmitting(true);
    await saveDiagnostic(answers as DiagnosticAnswers, email.trim());
    setSubmitting(false);
    setEmailSent(true);
  }

  const riskAreas = isResult
    ? QUESTIONS.filter((q) => {
        const chosen = answers[q.id];
        const option = q.options.find((o) => o.label === chosen);
        return option?.risky && q.riskArea;
      }).map((q) => q.riskArea!)
    : [];

  return (
    <div className="mx-auto max-w-lg">
      {!isResult && (
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= step ? "w-8 bg-brand-blue" : "w-4 bg-surface-border"
              }`}
            />
          ))}
        </div>
      )}

      {!isResult ? (
        <Card className="text-center">
          <p className="text-xs font-medium text-ink-faint">
            Question {step + 1} sur {QUESTIONS.length}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-ink">{current.question}</h2>
          <div className="mt-6 flex flex-col gap-2.5">
            {current.options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => answer(option.label)}
                className="rounded-xl border border-surface-border px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-brand-blue hover:bg-brand-blue/5"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div>
          <Card className="text-center">
            {riskAreas.length <= 1 ? (
              <CheckCircle2 size={28} className="mx-auto text-accent-teal" />
            ) : (
              <AlertTriangle size={28} className="mx-auto text-accent-amber" />
            )}
            <h2 className="mt-3 text-xl font-semibold text-ink">
              {riskAreas.length === 0 && "Votre organisation RH est plutôt bien structurée."}
              {riskAreas.length >= 1 && riskAreas.length <= 2 && "Quelques points méritent votre attention."}
              {riskAreas.length >= 3 && "Plusieurs zones à risque identifiées."}
            </h2>
            {riskAreas.length > 0 && (
              <p className="mt-2 text-sm text-ink-soft">
                C&apos;est exactement le genre de situation que RH Pilot est fait pour
                résoudre.
              </p>
            )}
          </Card>

          {riskAreas.length > 0 && (
            <div className="mt-4 flex flex-col gap-2.5">
              {riskAreas.map((area) => {
                const info = RISK_AREAS[area];
                return (
                  <Card key={area} compact className="flex items-start gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-amber/10 text-accent-amber">
                      <info.icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{info.label}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">{info.tip}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!emailSent ? (
            <Card className="mt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Mail size={14} /> Recevoir ce diagnostic par email
              </p>
              <p className="mt-1 text-xs text-ink-faint">Optionnel — pour le retrouver plus tard.</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.fr"
                  className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={handleEmailSubmit}
                  disabled={submitting || !email.trim()}
                  className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {submitting ? "..." : "Envoyer"}
                </button>
              </div>
            </Card>
          ) : (
            <Card className="mt-4 text-center">
              <p className="text-sm font-medium text-accent-teal">Diagnostic enregistré.</p>
            </Card>
          )}

          <div className="mt-6 text-center">
            <Link href="/sign-up">
              <Button className="px-6 py-3 text-base">
                <span className="inline-flex items-center gap-2">
                  Essayer RH Pilot gratuitement <ArrowRight size={16} />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
