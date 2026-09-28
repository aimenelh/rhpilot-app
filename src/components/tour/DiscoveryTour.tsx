"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Route, Settings, Upload, UserPlus, UsersRound, X } from "lucide-react";
import { TOUR_DONE_VALUE, TOUR_STORAGE_KEY, WELCOME_SEEN_KEY } from "@/lib/tourStorage";
import {
  AbsencesVisual,
  CopilotVisual,
  DashboardVisual,
  EmployeeSpaceVisual,
  EmployeesVisual,
  JourneyVisual,
  PayrollVisual,
  WelcomeVisual,
} from "./DiscoveryVisuals";

// Visite de découverte : une présentation animée de RH Pilot, en plein écran,
// sans quitter la page. Elle s'ouvre seule à la première connexion et se
// relance depuis la page Aide (/dashboard?tour=1) ou l'évènement START_TOUR_EVENT.

const STORAGE_KEY = "rhpilot_discovery_tour_v1";
// Ancienne visite en surbrillance : quelqu'un qui l'a terminée ne revoit pas la nouvelle d'office.
const PREVIOUS_TOUR_KEY = "rhpilot_product_tour_v4";
export const START_TOUR_EVENT = "rhpilot:start-tour";

type Audience = "all" | "admin" | "owner";

type Chapter = {
  key: string;
  eyebrow: string;
  /** Les mots entre *astérisques* sont mis en valeur. */
  title: string;
  text: string;
  points: string[];
  Visual: () => JSX.Element;
  audience: Audience;
};

const CHAPTERS: Chapter[] = [
  {
    key: "bienvenue",
    eyebrow: "Bienvenue",
    title: "Tout votre suivi RH, *au même endroit.*",
    text: "En deux minutes, voici ce que RH Pilot fait pour vous. Rien à configurer pendant la visite : regardez, on s'occupe du reste.",
    points: [],
    Visual: WelcomeVisual,
    audience: "all",
  },
  {
    key: "tableau-de-bord",
    eyebrow: "Tableau de bord",
    title: "Ce qui compte *remonte tout seul.*",
    text: "Chaque matin, le tableau de bord vous montre ce qui est en retard, ce qui arrive cette semaine et ce qui n'a pas encore de responsable.",
    points: ["Priorités classées par urgence", "Taux de dossiers à jour", "Rappels par e-mail au bon moment"],
    Visual: DashboardVisual,
    audience: "all",
  },
  {
    key: "salaries",
    eyebrow: "Salariés",
    title: "Une fiche claire *pour chaque salarié.*",
    text: "Contrat, parcours en cours, congés, paie et espace salarié : tout est rangé en quelques onglets, sans fouiller.",
    points: ["Ajout manuel ou import depuis un tableur", "Le menu ⋯ pour agir depuis la liste", "Archivage sans rien supprimer"],
    Visual: EmployeesVisual,
    audience: "all",
  },
  {
    key: "parcours",
    eyebrow: "Parcours",
    title: "Une phrase, *un plan daté.*",
    text: "Embauche, période d'essai, visite médicale, départ : RH Pilot transforme l'évènement en étapes datées, chacune avec son responsable et ses pièces à fournir.",
    points: ["Échéances calculées selon le Code du travail", "Responsables assignés automatiquement", "Justificatifs joints à chaque étape"],
    Visual: JourneyVisual,
    audience: "all",
  },
  {
    key: "absences",
    eyebrow: "Absences et obligations",
    title: "Absences et échéances, *sous contrôle.*",
    text: "Demandes, justificatifs et planning d'équipe au même endroit ; DUERP, entretiens professionnels et CSE rappelés avant qu'il soit trop tard.",
    points: ["Validation des demandes en un clic", "Justificatifs suivis jusqu'à réception", "Obligations RH listées avec leur date"],
    Visual: AbsencesVisual,
    audience: "admin",
  },
  {
    key: "paie",
    eyebrow: "Paie · avant-première",
    title: "La paie, *sans tableur ni surprise.*",
    text: "Saisissez les variables du mois dans un seul tableau : RH Pilot calcule chaque bulletin, le contrôle et vous explique chaque ligne.",
    points: ["Cotisations et réduction générale à jour", "Contrôles avant la clôture", "Bulletins prêts à publier"],
    Visual: PayrollVisual,
    audience: "owner",
  },
  {
    key: "espace-salarie",
    eyebrow: "Espace salarié",
    title: "Le bulletin arrive *dans sa poche.*",
    text: "Chaque salarié a son espace sécurisé : bulletins dans un coffre-fort, solde de congés, demandes d'absence. Accessible même après son départ.",
    points: ["Invitation depuis la fiche salarié", "Chaque consultation est journalisée", "Aucune pièce jointe par e-mail"],
    Visual: EmployeeSpaceVisual,
    audience: "admin",
  },
  {
    key: "copilote",
    eyebrow: "Copilote",
    title: "Une question ? *Le contexte sous les yeux.*",
    text: "Le Copilote répond à partir de vos salariés, de vos parcours et de ce qui est déjà fait. Il vous dit quoi faire, et pour quand.",
    points: ["Toujours en bas à droite de l'écran", "Répond avec vos données, pas des généralités"],
    Visual: CopilotVisual,
    audience: "all",
  },
];

const LAST = "demarrer";

function allowed(audience: Audience, accessRole: string) {
  if (audience === "owner") return accessRole === "OWNER";
  if (audience === "admin") return accessRole === "OWNER" || accessRole === "ADMIN";
  return true;
}

function Accent({ text }: { text: string }) {
  return (
    <>
      {text.split("*").map((part, i) =>
        i % 2 === 1 ? (
          <em key={i} className="font-display font-normal italic text-brand-primary">
            {part}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Le produit reste utilisable si le stockage navigateur est indisponible.
  }
}

export function DiscoveryTour({ accessRole, userName }: { accessRole: string; userName: string }) {
  const pathname = usePathname();
  const chapters = CHAPTERS.filter((chapter) => allowed(chapter.audience, accessRole));
  const total = chapters.length + 1;
  const [index, setIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((at = 0) => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    writeStorage(WELCOME_SEEN_KEY, "1");
    setDirection(1);
    setIndex(at);
  }, []);

  // Ouverture : relance demandée, visite en cours, ou toute première connexion.
  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1") {
      params.delete("tour");
      const query = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      open(0);
      return;
    }
    const stored = readStorage(STORAGE_KEY);
    if (stored === TOUR_DONE_VALUE) return;
    if (readStorage(PREVIOUS_TOUR_KEY) === TOUR_DONE_VALUE || readStorage(TOUR_STORAGE_KEY) === TOUR_DONE_VALUE) {
      writeStorage(STORAGE_KEY, TOUR_DONE_VALUE);
      return;
    }
    const saved = stored === null ? NaN : Number(stored);
    if (Number.isInteger(saved) && saved > 0 && saved < total) {
      open(saved);
      return;
    }
    if (pathname === "/dashboard" && !readStorage(WELCOME_SEEN_KEY)) open(0);
  }, [pathname, open, total]);

  useEffect(() => {
    const onStart = () => open(0);
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, [open]);

  const close = useCallback(() => {
    writeStorage(STORAGE_KEY, TOUR_DONE_VALUE);
    writeStorage(TOUR_STORAGE_KEY, TOUR_DONE_VALUE);
    setIndex(null);
    previousFocus.current?.focus?.();
  }, []);

  const go = useCallback(
    (next: number) => {
      if (index === null || next === index || next < 0 || next >= total) return;
      setDirection(next > index ? 1 : -1);
      setIndex(next);
      writeStorage(STORAGE_KEY, String(next));
    },
    [index, total],
  );

  // Clavier, défilement bloqué derrière la visite, focus dans la fenêtre.
  useEffect(() => {
    if (index === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
      else if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]")).filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [index, go, close]);

  if (index === null) return null;

  const chapter = index < chapters.length ? chapters[index] : null;
  // Sans prénom connu, le nom affiché est l'e-mail : pas de « Bonjour aimen@… ».
  const firstName = userName.includes("@") ? "" : userName.trim().split(/\s+/)[0];
  const isAdmin = accessRole === "OWNER" || accessRole === "ADMIN";
  const enter = direction === 1 ? "dz-in-next" : "dz-in-prev";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <div className="dz-backdrop absolute inset-0 bg-ink/45 backdrop-blur-[6px]" onClick={close} aria-hidden />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discovery-title"
        className="dz-card relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1000px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_40px_120px_-40px_rgba(20,21,26,0.6)] outline-none focus-visible:outline-none md:h-[590px] md:flex-row"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer la visite"
          className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink-faint backdrop-blur transition-colors hover:bg-surface-subtle hover:text-ink"
        >
          <X size={17} />
        </button>

        {/* Illustration (en haut sur mobile, à droite sur ordinateur) */}
        <div className={`relative h-[250px] shrink-0 bg-[#F7F5EF] md:order-2 md:block md:h-auto md:w-[52%] ${chapter ? "" : "hidden"}`}>
          <div key={`visual-${index}`} className={`${enter} absolute inset-0 overflow-hidden`}>
            {/* Sur mobile, l'illustration garde sa composition et se réduit à l'échelle. */}
            <div className="dz-visual-box">
              {chapter ? <chapter.Visual /> : <StartVisual isAdmin={isAdmin} onPick={close} />}
            </div>
          </div>
        </div>

        {/* Texte et navigation */}
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-5 pt-5 sm:px-9 md:order-1 md:pt-9">
          <ProgressThread total={total} index={index} onPick={go} labels={[...chapters.map((c) => c.eyebrow), "Démarrer"]} />

          <div key={`text-${index}`} className="min-h-0 flex-1 overflow-y-auto pt-6 md:pt-9">
            <p className="dz-rise text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-primary" style={{ animationDelay: "0.05s" }}>
              {chapter ? chapter.eyebrow : "C'est à vous"}
            </p>
            <h2 id="discovery-title" className="dz-rise mt-3 text-[28px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-[34px]" style={{ animationDelay: "0.12s" }}>
              {chapter ? (
                index === 0 && firstName ? (
                  <>
                    Bonjour {firstName}.<br />
                    <Accent text={chapter.title} />
                  </>
                ) : (
                  <Accent text={chapter.title} />
                )
              ) : (
                <Accent text="Par où *commencer ?*" />
              )}
            </h2>
            <p className="dz-rise mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft" style={{ animationDelay: "0.2s" }}>
              {chapter
                ? chapter.text
                : "Trois gestes suffisent pour voir RH Pilot travailler pour vous. Vous pourrez revoir cette visite à tout moment depuis la page Aide."}
            </p>
            {!chapter ? (
              <div className="mt-5 md:hidden">
                <StartActions isAdmin={isAdmin} onPick={close} />
              </div>
            ) : null}
            {chapter && chapter.points.length > 0 ? (
              <ul className="mt-5 space-y-2">
                {chapter.points.map((point, i) => (
                  <li key={point} className="dz-rise flex items-start gap-2.5 text-sm text-ink" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-border pt-4">
            {index === 0 ? (
              <button type="button" onClick={close} className="h-10 whitespace-nowrap rounded-xl px-2 text-sm font-medium text-ink-faint transition-colors hover:text-ink">
                Passer<span className="hidden sm:inline"> la visite</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-surface-border px-3.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-subtle"
              >
                <ArrowLeft size={15} /> Précédent
              </button>
            )}
            <div className="flex items-center gap-3">
              <span className="hidden text-xs tabular-nums text-ink-faint sm:inline">
                {index + 1} / {total}
              </span>
              {chapter ? (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="group inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(232,67,46,0.9)] transition hover:bg-brand-primary-dark"
                >
                  {index === 0 ? (
                    <>
                      Commencer<span className="hidden sm:inline"> la visite</span>
                    </>
                  ) : (
                    "Suivant"
                  )}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/90">
                  Terminer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fil de progression : un trait corail qui avance d'étape en étape, chaque point est cliquable.
function ProgressThread({ total, index, onPick, labels }: { total: number; index: number; onPick: (i: number) => void; labels: string[] }) {
  const ratio = total > 1 ? index / (total - 1) : 1;
  return (
    <div className="relative mr-10 h-4">
      <div className="absolute inset-x-[6px] top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-surface-border" />
      <div
        className="absolute left-[6px] top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-brand-primary transition-[width] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ width: `calc((100% - 12px) * ${ratio})` }}
      />
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          aria-label={`Aller à : ${labels[i]}`}
          aria-current={i === index ? "step" : undefined}
          className="absolute top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ left: `calc(6px + (100% - 12px) * ${total > 1 ? i / (total - 1) : 0})` }}
        >
          <span
            className={`block rounded-full transition-all duration-500 ${
              i === index ? "h-3 w-3 bg-brand-primary ring-4 ring-brand-primary/20" : i < index ? "h-2 w-2 bg-brand-primary" : "h-2 w-2 bg-surface-border"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Dernier chapitre : les premiers gestes, sous forme de cartes (illustration sur
// ordinateur, directement sous le texte sur mobile pour rester faciles à toucher).
function StartVisual({ isAdmin, onPick }: { isAdmin: boolean; onPick: () => void }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-y-auto p-5"
      style={{ backgroundColor: "#F7F5EF", backgroundImage: "radial-gradient(rgba(20,21,26,0.07) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      <div className="w-full max-w-[400px]">
        <StartActions isAdmin={isAdmin} onPick={onPick} />
      </div>
    </div>
  );
}

function StartActions({ isAdmin, onPick }: { isAdmin: boolean; onPick: () => void }) {
  const actions = [
    { href: "/dashboard/employees/new", icon: UserPlus, title: "Ajouter un salarié", text: "Sa fiche et son premier parcours", admin: true },
    { href: "/dashboard/employees/import", icon: Upload, title: "Importer un fichier", text: "Toute l'équipe depuis un tableur", admin: true },
    { href: "/dashboard/events", icon: Route, title: "Lancer un parcours", text: "Embauche, essai, départ…", admin: false },
    { href: "/dashboard/configuration", icon: Settings, title: "Vérifier l'entreprise", text: "Convention, adresse, paramètres", admin: true },
    { href: "/dashboard/team", icon: UsersRound, title: "Inviter l'équipe", text: "Managers et dirigeants", admin: true },
  ].filter((action) => isAdmin || !action.admin);
  return (
    <div className="grid gap-2.5">
      {actions.map(({ href, icon: Icon, title, text }, i) => (
        <Link
          key={href}
          href={href}
          onClick={onPick}
          className="dz-slide-left group flex items-center gap-3.5 rounded-2xl border border-[#E4DED4] bg-white px-4 py-3 shadow-[0_18px_40px_-30px_rgba(60,40,25,0.6)] transition hover:border-brand-primary/40"
          style={{ animationDelay: `${0.15 + i * 0.1}s` }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary group-hover:text-white">
            <Icon size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{title}</span>
            <span className="block truncate text-xs text-ink-faint">{text}</span>
          </span>
          <ArrowRight size={15} className="ml-auto shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand-primary" />
        </Link>
      ))}
    </div>
  );
}
