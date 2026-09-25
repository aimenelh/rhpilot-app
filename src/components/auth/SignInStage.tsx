"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logomark } from "@/components/Brand";
import { firstNameFromEmail, greetingFor } from "./greeting";
import s from "./AuthStage.module.css";

// Connexion : plus calme que l'inscription. On salue selon l'heure, on montre
// la semaine en cours et les trois listes sur lesquelles le tableau de bord
// s'ouvre (en retard, à assigner, cette semaine). Rien n'est lu côté serveur
// avant la connexion : les listes restent des emplacements vides, qui se
// mettent à charger quand on valide.

const LISTS = [
  { label: "En retard", tone: "#e8432e", bars: [46, 22] },
  { label: "À assigner", tone: "#20211f", bars: [34] },
  { label: "Cette semaine", tone: "#d97706", bars: [52, 18] },
];
const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const CODE_INPUT = 'input[autocomplete="one-time-code"], .cl-otpCodeFieldInput, input[name^="codeInput"]';
const ERROR = ".cl-formFieldErrorText, .cl-alert";

// Titres de Clerk remplacés par les nôtres ; les autres étapes (mot de passe
// oublié, autre méthode…) gardent le titre de Clerk, qui reste juste.
const TITLES: Record<string, string> = {
  "S'identifier": "Se connecter",
  "Tapez votre mot de passe": "Votre mot de passe",
};

type ClerkView = { title: string; subtitle: string; code: boolean; password: boolean; identity: string; error: boolean };
const EMPTY: ClerkView = { title: "", subtitle: "", code: false, password: false, identity: "", error: false };
const sameView = (a: ClerkView, b: ClerkView) =>
  a.title === b.title && a.subtitle === b.subtitle && a.code === b.code && a.password === b.password && a.identity === b.identity && a.error === b.error;

// Clerk garde un champ mot de passe caché dès la première étape (pour les
// gestionnaires de mots de passe) : seul un champ réellement affiché compte.
function visiblePassword(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[name="password"]')).some(
    (input) => input.tabIndex !== -1 && (input.closest(".cl-formField") ?? input).getBoundingClientRect().height > 0,
  );
}

const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value.trim());

function weekOf(now: Date) {
  const offset = (now.getDay() + 6) % 7; // lundi = 0
  return Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + i));
}

export function SignInStage({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [email, setEmail] = useState("");
  const [view, setView] = useState<ClerkView>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [launch, setLaunch] = useState(0);
  const clerk = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ClerkView>(EMPTY);

  // L'heure et la date viennent du navigateur, après le montage.
  useEffect(() => {
    setNow(new Date());
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Le formulaire de Clerk vit dans son propre arbre : on lit son étape (titre,
  // champ mot de passe, code, erreur) et l'adresse saisie, sans rien envoyer.
  useEffect(() => {
    const el = clerk.current;
    if (!el) return;
    const read = () => {
      const next: ClerkView = {
        title: (el.querySelector(".cl-headerTitle")?.textContent ?? "").replace(/’/g, "'").trim(),
        subtitle: (el.querySelector(".cl-headerSubtitle")?.textContent ?? "").trim(),
        code: Boolean(el.querySelector(CODE_INPUT)),
        password: visiblePassword(el),
        identity: (el.querySelector(".cl-identityPreviewText")?.textContent ?? "").trim(),
        error: Boolean(el.querySelector(ERROR)),
      };
      const prev = viewRef.current;
      if (sameView(prev, next)) return;
      // Une erreur ou une nouvelle étape arrête le chargement lancé à la validation.
      if (next.error || prev.title !== next.title || prev.code !== next.code) setLoading(false);
      viewRef.current = next;
      setView(next);
    };
    const onInput = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || input.tagName !== "INPUT") return;
      const key = (input.name || input.id || "").replace(/-field$/, "");
      if (key === "identifier" || key === "emailAddress") setEmail(input.value.trim().slice(0, 120));
    };
    const onSubmit = () => {
      setLoading(true);
      setLaunch((n) => n + 1);
    };
    el.addEventListener("input", onInput, true);
    el.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(read);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    read();
    return () => {
      el.removeEventListener("input", onInput, true);
      el.removeEventListener("submit", onSubmit, true);
      observer.disconnect();
    };
  }, []);

  const address = view.identity || email;
  const name = firstNameFromEmail(address);
  const greeting = now ? greetingFor(now) : "Bonjour";
  const days = now ? weekOf(now) : [];
  const today = now ? (now.getDay() + 6) % 7 : 0;
  const date = now ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(now) : "";

  const title = TITLES[view.title] ?? (view.title || "Se connecter");
  const subtitle = !view.subtitle || /^pour continuer vers/i.test(view.subtitle) ? (title === "Se connecter" ? "Accédez à votre espace RH." : "") : view.subtitle;

  const status = view.code
    ? `Un code vient de partir vers ${address || "votre adresse"}. Saisissez-le pour entrer.`
    : loading
      ? "Connexion en cours, vos listes se chargent."
      : view.password
        ? "Il ne reste que votre mot de passe."
        : isEmail(email)
          ? "Continuez : votre mot de passe vient juste après."
          : "À la connexion, le tableau de bord s’ouvre sur ces trois listes.";

  return (
    <div className={s.page}>
      <svg className={s.bgThread} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M-40 872 C 260 900 520 820 720 700 C 900 590 830 300 1010 180 C 1170 80 1330 150 1490 86" />
      </svg>
      <div className={s.inner}>
        <div className={s.left}>
          <Link href="/" className={s.logo}>
            <Logomark size={28} />
            <span>
              RH <b>Pilot</b>
            </span>
          </Link>
          <h1 className={s.greet} data-ready={now !== null}>
            {greeting}
            {name ? (
              <>
                {" "}
                <span key={name} className={s.who}>
                  {name}
                </span>
              </>
            ) : null}
            .<em> On reprend où vous en étiez.</em>
          </h1>

          <div className={s.window} data-loading={loading}>
            <div className={s.bar}>
              <Logomark size={16} />
              <span>RH Pilot</span>
              <span className={s.barRight}>Tableau de bord</span>
            </div>
            <div className={s.head}>
              <p className={s.eyebrow}>Aujourd’hui</p>
              <p className={s.date}>{date || " "}</p>
            </div>
            <div className={s.week} aria-hidden="true">
              <div className={s.weekLine}>
                <span style={{ transform: `scaleX(${drawn ? today / 6 : 0})` }} />
              </div>
              <ol>
                {LETTERS.map((letter, i) => (
                  <li key={i} data-past={now !== null && i < today} data-today={now !== null && i === today}>
                    <span>{letter}</span>
                    <b>{days[i]?.getDate() ?? " "}</b>
                    <i />
                  </li>
                ))}
              </ol>
            </div>
            <ul className={s.lists}>
              {LISTS.map((list) => (
                <li key={list.label}>
                  <i style={{ background: list.tone }} aria-hidden="true" />
                  <strong>{list.label}</strong>
                  <span className={s.skeleton} aria-hidden="true">
                    {list.bars.map((width, i) => (
                      <em key={`${launch}-${i}`} style={{ width: `${width}%` }} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className={s.status} aria-live="polite">
              {status}
            </p>
          </div>

          <Link href="/securite" className={s.small}>
            Sécurité et RGPD
          </Link>
        </div>

        <div className={s.right}>
          <div className={s.formCard}>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
            <div ref={clerk} className={s.clerk}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
