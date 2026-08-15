"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Lock } from "lucide-react";
import { Logomark } from "@/components/Brand";

// Réponses pré-écrites, reprises mot pour mot de la page /questions —
// jamais d'appel à l'API pour un visiteur non connecté : ni coût, ni
// risque d'abus sur une page publique ouverte à tout le monde.
const PUBLIC_FAQ: { question: string; answer: string }[] = [
  {
    question: "RH Pilot remplace-t-il mon logiciel de paie ?",
    answer:
      "Non, et il ne le sera jamais. RH Pilot vous aide à préparer les éléments variables, jamais à les calculer ou les déclarer à votre place.",
  },
  {
    question: "Combien ça coûte ?",
    answer:
      "RH Pilot est actuellement gratuit, en bêta. Le modèle tarifaire définitif n'est pas encore figé, et sera communiqué clairement avant toute mise en place.",
  },
  {
    question: "Mon équipe va-t-elle devoir apprendre un outil compliqué ?",
    answer:
      "Non. Si vous savez lire un tableau de bord et cliquer sur un bouton, vous savez utiliser RH Pilot.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Isolation stricte entre organisations, hébergement en Europe, authentification déléguée à un spécialiste.",
  },
];

// Pas besoin d'inviter à se connecter sur les pages où on est déjà en
// train de le faire.
const HIDDEN_ON_PATHS = ["/sign-up", "/sign-in"];

type Turn = { question: string; answer: string };

export function PublicCopilotePreview() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [answered, setAnswered] = useState<Turn[]>([]);

  if (HIDDEN_ON_PATHS.includes(pathname ?? "")) return null;

  const remaining = PUBLIC_FAQ.filter((f) => !answered.some((a) => a.question === f.question));

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 flex w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-border bg-gradient-to-br from-brand-violet/[0.04] to-brand-blue/[0.04] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Logomark size={26} />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-violet text-white ring-2 ring-white">
                  <Sparkles size={8} />
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                Copilote RH Pilot
                <span className="rounded-full bg-brand-violet/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-violet">
                  IA
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le Copilote"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-surface-subtle"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto px-4 py-3">
            {answered.length === 0 ? (
              <p className="text-xs text-ink-faint">
                Un aperçu des questions les plus fréquentes. Connectez-vous pour poser les vôtres.
              </p>
            ) : (
              answered.map((turn) => (
                <div key={turn.question} className="flex flex-col gap-2">
                  <div className="self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-blue px-3.5 py-2 text-sm text-white">
                    {turn.question}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="mb-1 shrink-0">
                      <Logomark size={18} />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2 text-sm text-ink">
                      {turn.answer}
                    </div>
                  </div>
                </div>
              ))
            )}

            {remaining.length > 0 && (
              <div className="flex flex-col items-start gap-2">
                {remaining.map((f) => (
                  <button
                    key={f.question}
                    type="button"
                    onClick={() => setAnswered((prev) => [...prev, f])}
                    className="rounded-full border border-brand-violet/20 bg-white px-3 py-1.5 text-left text-xs font-medium text-ink-soft transition-colors hover:border-brand-violet/40 hover:text-brand-violet"
                  >
                    {f.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/sign-up"
            className="flex items-center gap-2 border-t border-surface-border px-4 py-3 text-sm text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink-soft"
          >
            <Lock size={14} />
            Connectez-vous pour poser vos propres questions
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Fermer le Copilote" : "Ouvrir le Copilote RH Pilot"}
        aria-expanded={isOpen}
        className="motion-reduce:transition-none flex h-14 w-14 items-center justify-center rounded-full border border-surface-border bg-white shadow-xl transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? (
          <X size={22} className="text-ink-soft" />
        ) : (
          <span className="relative inline-flex">
            <Logomark size={30} />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-violet text-white ring-2 ring-white">
              <Sparkles size={9} />
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
