"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Lock } from "lucide-react";
import { CopilotAvatar, CopilotHead } from "@/components/copilote/CopilotAvatar";
import { CopilotGreeting } from "@/components/copilote/CopilotGreeting";
import { ASSISTANT_NAME } from "@/components/copilote/assistant";

// Réponses pré-écrites, cohérentes avec les pages Tarifs, Sécurité et Questions :
// jamais d'appel à l'API pour un visiteur non connecté (ni coût, ni risque
// d'abus sur une page publique).
const PUBLIC_FAQ: { question: string; answer: string; link?: { href: string; label: string } }[] = [
  {
    question: "Que fait RH Pilot ?",
    answer:
      "RH Pilot centralise le suivi RH des TPE et PME : fiches salariés, parcours d’embauche et de départ, échéances, documents et espace salarié. Pour chaque événement, il prépare les étapes, les dates et les rappels.",
    link: { href: "/services", label: "Découvrir le logiciel" },
  },
  {
    question: "Combien coûte RH Pilot ?",
    answer:
      "L’offre gratuite couvre jusqu’à 3 salariés. Au-delà, l’offre Pro coûte 15 € HT par mois, plus 3 € HT par salarié suivi. Les comptes salariés ne sont pas facturés.",
    link: { href: "/tarifs", label: "Voir les tarifs" },
  },
  {
    question: "Le calcul de la paie est-il disponible ?",
    answer:
      "Le calcul de la paie est en accès anticipé, sur invitation. La DSN est produite en fichier d’essai : vous le déposez en mode test sur net-entreprises pour le comparer à votre déclaration habituelle.",
    link: { href: "/gestion-paie", label: "La gestion de la paie" },
  },
  {
    question: "Mes salariés ont-ils accès à leurs bulletins ?",
    answer:
      "Oui. Chaque salarié a son espace, sur téléphone ou ordinateur, avec ses bulletins, ses congés, ses demandes d’absence et ses documents de fin de contrat.",
    link: { href: "/espace-salarie", label: "L’espace salarié" },
  },
  {
    question: "Où sont hébergées les données ?",
    answer:
      "La base de données RH est hébergée à Francfort et chaque organisation est cloisonnée. Certains sous-traitants, comme l’authentification ou l’envoi d’e-mails, traitent des données aux États-Unis, dans le cadre prévu par le RGPD.",
    link: { href: "/securite", label: "Sécurité et sous-traitants" },
  },
  {
    question: "Puis-je essayer sans créer de compte ?",
    answer: "Oui. La démonstration du logiciel se parcourt sans compte, sur ordinateur ou sur téléphone.",
    link: { href: "/services#demo", label: "Ouvrir la démonstration" },
  },
];

// Pas besoin d'inviter à se connecter sur les pages où on est déjà en
// train de le faire.
const HIDDEN_ON_PATHS = ["/sign-up", "/sign-in"];

type Turn = (typeof PUBLIC_FAQ)[number];

export function PublicCopilotePreview() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [talking, setTalking] = useState(false);
  const [answered, setAnswered] = useState<Turn[]>([]);

  if (HIDDEN_ON_PATHS.some((path) => pathname?.startsWith(path))) return null;

  const remaining = PUBLIC_FAQ.filter((f) => !answered.some((a) => a.question === f.question));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="mb-3 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <CopilotHead size={34} />
              <div>
                <p className="text-sm font-semibold text-ink">{ASSISTANT_NAME}</p>
                <p className="text-xs text-ink-faint">Assistante IA de RH Pilot</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-surface-subtle"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <CopilotHead size={24} className="mb-1 shrink-0" />
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2 text-sm text-ink">
                Bonjour, je suis {ASSISTANT_NAME}. Choisissez une question ci-dessous. Pour poser les vôtres sur vos
                propres données, connectez-vous à votre espace.
              </div>
            </div>

            {answered.map((turn) => (
              <div key={turn.question} className="flex flex-col gap-2">
                <div className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-brand-primary px-3.5 py-2 text-sm text-white">
                  {turn.question}
                </div>
                <div className="flex items-end gap-2">
                  <CopilotHead size={24} className="mb-1 shrink-0" />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-subtle px-3.5 py-2 text-sm text-ink">
                    {turn.answer}
                    {turn.link && (
                      <Link href={turn.link.href} className="mt-1.5 block font-semibold text-brand-primary-dark underline underline-offset-2">
                        {turn.link.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {remaining.length > 0 && (
              <div className="flex flex-col items-start gap-2">
                {remaining.map((f) => (
                  <button
                    key={f.question}
                    type="button"
                    onClick={() => setAnswered((prev) => [...prev, f])}
                    className="rounded-full border border-brand-primary-dark/20 bg-white px-3 py-1.5 text-left text-xs font-medium text-ink-soft transition-colors hover:border-brand-primary-dark/40 hover:text-brand-primary-dark"
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
            Créez votre espace pour poser vos questions
          </Link>
        </div>
      )}

      <div className="relative">
        {!isOpen && (
          <CopilotGreeting
            storageKey="rhpilot.assistante.bonjour.v1"
            delayMs={pathname === "/" ? 3400 : 1600}
            message={`Bonjour, je suis ${ASSISTANT_NAME}, l’assistante IA de RH Pilot. Je réponds à vos questions sur le logiciel, les tarifs et la sécurité de vos données.`}
            onShow={() => {
              setTalking(true);
              window.setTimeout(() => setTalking(false), 2400);
            }}
            onOpen={() => setIsOpen(true)}
          />
        )}
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? `Fermer la fenêtre de ${ASSISTANT_NAME}` : `Poser une question à ${ASSISTANT_NAME}, l’assistante IA de RH Pilot`}
          aria-expanded={isOpen}
          className="block rounded-2xl focus-visible:outline-offset-4"
        >
          <CopilotAvatar width={84} talking={talking} />
        </button>
      </div>
    </div>
  );
}
