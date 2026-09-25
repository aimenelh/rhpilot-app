"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logomark } from "@/components/Brand";
import { companyFromEmail } from "./emailCompany";
import s from "./AuthStage.module.css";

// Inscription : pendant que la personne remplit le formulaire (celui de Clerk,
// qui garde la main sur la sécurité), son espace RH prend forme à gauche.
// On écoute seulement la saisie dans le formulaire, dans le navigateur : rien
// n'est envoyé ni enregistré par cet aperçu.

const MODULES = [
  { label: "Salariés", detail: "vos dossiers" },
  { label: "Parcours", detail: "embauche, essai, visite" },
  { label: "Calendrier", detail: "vos échéances" },
  { label: "Copilote", detail: "vos priorités" },
];
const GENERIC_LOCALS = /^(contact|info|infos|rh|admin|hello|bonjour|direction|compta|accueil|office|mail|test)$/;

const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value.trim());
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  if (first.length < 2 || !/^[a-zà-ÿ]+$/.test(first) || GENERIC_LOCALS.test(first)) return "";
  return capitalize(first);
}

export function SignUpStage({ children }: { children: ReactNode }) {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [launch, setLaunch] = useState(0);
  const form = useRef<HTMLDivElement>(null);

  // Le formulaire de Clerk vit dans son propre arbre : on écoute ses champs
  // par leurs noms (firstName, emailAddress, password) et on repère l'étape
  // du code de vérification quand elle apparaît.
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const onInput = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || input.tagName !== "INPUT") return;
      const key = (input.name || input.id || "").replace(/-field$/, "");
      if (key === "firstName") setFirst(input.value.trim().slice(0, 40));
      else if (key === "emailAddress" || key === "identifier") setEmail(input.value.trim().slice(0, 120));
      else if (key === "password") setPassword(input.value.length >= 8);
    };
    const onSubmit = () => setLaunch((n) => n + 1);
    const check = () => setVerifying(Boolean(el.querySelector('input[autocomplete="one-time-code"], .cl-otpCodeFieldInput, input[name^="codeInput"]')));
    el.addEventListener("input", onInput, true);
    el.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true });
    check();
    return () => {
      el.removeEventListener("input", onInput, true);
      el.removeEventListener("submit", onSubmit, true);
      observer.disconnect();
    };
  }, []);

  const name = first || nameFromEmail(email);
  const company = isEmail(email) ? companyFromEmail(email) : null;
  const steps = [Boolean(name), isEmail(email), password || verifying, verifying];
  const progress = steps.filter(Boolean).length;
  const status = verifying
    ? `Un code vient de partir vers ${email || "votre adresse"}. Saisissez-le pour ouvrir votre espace.`
    : progress === 0
      ? "Commencez par votre prénom : l’espace se construit à mesure."
      : !isEmail(email)
        ? `Bonjour ${name}. Votre adresse e-mail servira à vous connecter.`
        : !password
          ? company
            ? `${company} : l’espace prendra ce nom, vous pourrez le changer ensuite.`
            : "Il ne reste qu’un mot de passe d’au moins 8 caractères."
          : "Tout est prêt. Validez pour recevoir votre code.";

  return (
    <div className={s.page}>
      <svg className={s.bgThread} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M-40 760 C 180 700 260 520 430 540 C 620 560 640 760 820 700 C 1000 640 980 380 1140 330 C 1270 290 1350 180 1490 120" />
      </svg>
      <div className={s.inner}>
        <div className={s.left}>
          <Link href="/" className={s.logo}>
            <Logomark size={28} />
            <span>
              RH <b>Pilot</b>
            </span>
          </Link>
          <h1 className={s.title}>
            Votre espace RH
            <em> se prépare déjà.</em>
          </h1>
          <p className={s.lead}>Remplissez le formulaire : votre espace prend forme à mesure que vous écrivez.</p>

          <div className={s.window} data-progress={progress} data-verifying={verifying}>
            <div className={s.bar}>
              <Logomark size={16} />
              <span>RH Pilot</span>
            </div>
            <div className={s.head}>
              <p className={s.eyebrow}>Espace RH de</p>
              <p className={s.name}>
                {name ? <span>{name}</span> : <span className={s.placeholder}>votre prénom</span>}
                <i className={s.caret} aria-hidden="true" />
              </p>
              <p className={s.company} data-show={Boolean(company) || isEmail(email)}>
                {company ?? "Votre entreprise, nommée à l’étape suivante"}
              </p>
            </div>
            <div className={s.track}>
              {launch > 0 ? <span key={launch} className={s.sweep} aria-hidden="true" /> : null}
              <div className={s.line} aria-hidden="true">
                <span style={{ transform: `scaleX(${Math.max(0, Math.min(progress - 1, 3)) / 3})` }} />
              </div>
              <ol className={s.modules}>
                {MODULES.map((module, index) => (
                  <li key={module.label} data-on={index < progress}>
                    <i aria-hidden="true" />
                    <strong>{module.label}</strong>
                    <span>{module.detail}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className={s.status} aria-live="polite">
              {status}
            </p>
          </div>

          <Link href="/securite" className={s.small}>
            Sécurité et RGPD
          </Link>
        </div>

        <div className={s.right}>
          <div ref={form} className={s.formCard}>
            <h2>{verifying ? "Vérifiez votre adresse" : "Créer mon compte"}</h2>
            <p>{verifying ? "Le code est valable quelques minutes." : "Gratuit jusqu’à 3 salariés."}</p>
            <div className={s.clerk}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
