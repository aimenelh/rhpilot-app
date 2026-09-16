"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logomark, Wordmark } from "@/components/Brand";
import { AnnouncementBar } from "./AnnouncementBar";
import { PublicCopilotePreview } from "./PublicCopilotePreview";

const GROUPS = [
  {
    label: "Le logiciel",
    links: [
      { href: "/services", label: "Vue d’ensemble" },
      { href: "/services#salaries", label: "Dossiers salariés" },
      { href: "/services#parcours", label: "Parcours RH & documents" },
      { href: "/services#echeances", label: "Calendrier & rappels" },
      { href: "/services#copilote", label: "Copilote RH" },
      { href: "/services#demo", label: "Voir une démonstration" },
    ],
  },
  {
    label: "Paie",
    links: [
      { href: "/gestion-paie", label: "Vue d’ensemble" },
      { href: "/gestion-paie/production", label: "Production de la paie" },
      { href: "/gestion-paie/variables", label: "Variables de paie" },
      { href: "/gestion-paie/conges-absences", label: "Congés & absences" },
      { href: "/gestion-paie/arrets-travail", label: "Arrêts de travail" },
      {
        href: "/gestion-paie/referentiel-conventionnel",
        label: "Référentiel conventionnel",
      },
      {
        href: "/gestion-paie/complementaire-sante",
        label: "Complémentaire santé",
      },
      {
        href: "/gestion-paie/cotisations-sociales",
        label: "Cotisations sociales",
      },
      { href: "/gestion-paie/montant-net-social", label: "Montant net social" },
      { href: "/gestion-paie/bulletin-de-paie", label: "Bulletin de paie" },
      {
        href: "/gestion-paie/tracabilite-calcul",
        label: "Traçabilité du calcul",
      },
      { href: "/gestion-paie/profil-paie", label: "Profil de paie" },
      { href: "/gestion-paie/contexte-employeur", label: "Contexte employeur" },
    ],
  },
  {
    label: "Ressources",
    links: [
      { href: "/ressources", label: "Guides & articles" },
      { href: "/questions", label: "Questions fréquentes" },
      { href: "/diagnostic", label: "Diagnostic RH" },
      { href: "/securite", label: "Sécurité & données" },
    ],
  },
];
const action =
  "inline-flex items-center justify-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark";
export function MarketingHeader() {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    setMobile(false);
    setGroup(null);
  }, [pathname]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setGroup(null);
        setMobile(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const close = () => {
    setMobile(false);
    setGroup(null);
  };
  const navLink = (href: string) =>
    `text-sm font-medium transition-colors hover:text-brand-primary ${pathname === href ? "text-brand-primary" : "text-ink-soft"}`;
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:p-4"
      >
        Aller au contenu
      </a>
      <div className="sticky top-0 z-40">
        <AnnouncementBar />
        <header
          ref={root}
          className="border-b border-surface-border bg-white"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setGroup(null);
            setMobile(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            if (group) triggers.current[group]?.focus();
            else if (mobile) menuButton.current?.focus();
            close();
          }
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="RH Pilot, accueil"
            onClick={close}
            className="flex shrink-0 items-center gap-2.5"
          >
            <Logomark size={32} />
            <Wordmark />
          </Link>
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-7 lg:flex"
          >
            {GROUPS.slice(0, 2).map((item) => (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  ref={(el) => {
                    triggers.current[item.label] = el;
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
                  aria-expanded={group === item.label}
                  aria-controls={`nav-${item.label === "Paie" ? "paie" : "logiciel"}`}
                  onClick={() =>
                    setGroup(group === item.label ? null : item.label)
                  }
                >
                  {item.label}
                  <ChevronDown size={13} />
                </button>
                {group === item.label && (
                  <div
                    id={`nav-${item.label === "Paie" ? "paie" : "logiciel"}`}
                    className={`absolute left-0 top-full mt-5 grid max-h-[70vh] overflow-auto rounded-lg border border-surface-border bg-white p-3 shadow-elevated ${item.label === "Paie" ? "w-[520px] grid-cols-2" : "w-64"}`}
                  >
                    {item.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={close}
                        className="rounded px-3 py-3 text-sm text-ink-soft hover:bg-surface-subtle hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link href="/tarifs" className={navLink("/tarifs")}>
              Tarifs
            </Link>
            <div className="relative">
              <button
                type="button"
                ref={(el) => {
                  triggers.current.Ressources = el;
                }}
                aria-expanded={group === "Ressources"}
                aria-controls="nav-ressources"
                onClick={() =>
                  setGroup(group === "Ressources" ? null : "Ressources")
                }
                className="flex items-center gap-1.5 text-sm font-medium text-ink-soft"
              >
                Ressources
                <ChevronDown size={13} />
              </button>
              {group === "Ressources" && (
                <div
                  id="nav-ressources"
                  className="absolute left-0 top-full mt-5 w-60 rounded-lg border border-surface-border bg-white p-3 shadow-elevated"
                >
                  {GROUPS[2].links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className="block rounded px-3 py-3 text-sm text-ink-soft hover:bg-surface-subtle"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/pourquoi" className={navLink("/pourquoi")}>
              À propos
            </Link>
          </nav>
          <div className="hidden items-center gap-6 lg:flex">
            <Link href="/sign-in" className={navLink("/sign-in")}>
              Connexion
            </Link>
            <Link href="/sign-up" className={action}>
              Essayer gratuitement
            </Link>
          </div>
          <button
            ref={menuButton}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-surface-border lg:hidden"
            aria-label={mobile ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobile}
            aria-controls="mobile-navigation"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobile && (
          <nav
            id="mobile-navigation"
            aria-label="Navigation mobile"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-80px)] overflow-auto border-b border-surface-border bg-white px-6 pb-6 shadow-elevated lg:hidden"
          >
            {GROUPS.map((item) => (
              <details
                key={item.label}
                className="border-b border-surface-border py-4"
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {item.label}
                </summary>
                <div className="mt-3 flex flex-col">
                  {item.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className="py-3 pl-3 text-sm text-ink-soft"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
            <Link
              href="/tarifs"
              onClick={close}
              className="block py-4 text-sm font-semibold"
            >
              Tarifs
            </Link>
            <Link
              href="/pourquoi"
              onClick={close}
              className="block py-3 text-sm font-semibold"
            >
              À propos
            </Link>
            <Link
              href="/sign-in"
              onClick={close}
              className="block py-4 text-sm"
            >
              Connexion
            </Link>
            <Link
              href="/sign-up"
              onClick={close}
              className={`${action} w-full`}
            >
              Essayer gratuitement
            </Link>
          </nav>
        )}
      </header>
      </div>
      <PublicCopilotePreview />
    </>
  );
}
