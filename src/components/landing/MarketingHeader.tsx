"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logomark, Wordmark } from "@/components/Brand";
import { AnnouncementBar } from "./AnnouncementBar";
import { OctoberRoseAnnouncement, OctoberRoseProvider, OctoberRoseRibbonButton } from "./OctoberRoseCampaign";
import { PublicCopilotePreview } from "./PublicCopilotePreview";
import { PAYROLL_TOPIC_GROUPS } from "./payroll/payrollTopics";

const GROUPS = [
  {
    label: "Le logiciel",
    links: [
      { href: "/services", label: "Vue d’ensemble" },
      { href: "/services#salaries", label: "Dossiers salariés" },
      { href: "/services#parcours", label: "Parcours RH & documents" },
      { href: "/services#echeances", label: "Calendrier & rappels" },
      { href: "/espace-salarie", label: "Espace salarié" },
      { href: "/services#copilote", label: "Copilote RH" },
      { href: "/services#demo", label: "Voir une démonstration" },
    ],
  },
  {
    label: "Paie",
    // Les douze sujets sont rendus par groupes (PAYROLL_TOPIC_GROUPS) sous ces deux entrées.
    links: [
      { href: "/gestion-paie", label: "Vue d’ensemble de la paie" },
      { href: "/gestion-paie#bulletin", label: "Calculer un bulletin en direct" },
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
    <OctoberRoseProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:p-4"
      >
        Aller au contenu
      </a>
      <div className="sticky top-0 z-40">
        <OctoberRoseAnnouncement fallback={<AnnouncementBar />} />
        <header
          ref={root}
          className="border-b border-surface-border bg-white"
        onBlur={(event) => {
          // Ne fermer que si le focus part vraiment ailleurs (navigation au
          // clavier). Safari, sur iPhone comme sur Mac, ne donne pas le focus à
          // un lien qu'on touche : le focus part vers « rien » (relatedTarget
          // nul) juste avant le clic. Fermer à ce moment retirait le lien de la
          // page et le toucher ne menait nulle part. Un appui hors du menu
          // reste géré par l'écouteur pointerdown.
          const next = event.relatedTarget as Node | null;
          if (next && !event.currentTarget.contains(next)) {
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
          <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/"
            aria-label="RH Pilot, accueil"
            onClick={close}
            className="flex shrink-0 items-center gap-2.5"
            data-header-lockup
          >
            <Logomark size={32} />
            <Wordmark />
          </Link>
          <OctoberRoseRibbonButton />
          </div>
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
                    className={`absolute left-0 top-full mt-5 grid max-h-[70vh] overflow-auto rounded-lg border border-surface-border bg-white p-3 shadow-elevated ${item.label === "Paie" ? "w-[680px]" : "w-64"}`}
                  >
                    {item.label === "Paie" ? (
                      <>
                        <div className="grid grid-cols-2 gap-1 border-b border-surface-border pb-2">
                          {item.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={close}
                              className="rounded px-3 py-3 text-sm font-semibold text-ink hover:bg-surface-subtle"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          {PAYROLL_TOPIC_GROUPS.map((topicGroup) => (
                            <div key={topicGroup.title}>
                              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-faint">{topicGroup.title}</p>
                              {topicGroup.topics.map((topic) => (
                                <Link
                                  key={topic.href}
                                  href={topic.href}
                                  onClick={close}
                                  className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-surface-subtle hover:text-ink"
                                >
                                  {topic.label}
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      item.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={close}
                          className="rounded px-3 py-3 text-sm text-ink-soft hover:bg-surface-subtle hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            <Link href="/tarifs" className={navLink("/tarifs")}>
              Tarifs
            </Link>
            <Link href="/tutoriels" className={navLink("/tutoriels")}>
              Tutoriels
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
          <div className="hidden items-center gap-4 lg:flex">
            <div className="relative">
              <button
                type="button"
                ref={(el) => {
                  triggers.current.Connexion = el;
                }}
                aria-expanded={group === "Connexion"}
                aria-controls="nav-connexion"
                onClick={() =>
                  setGroup(group === "Connexion" ? null : "Connexion")
                }
                className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-brand-primary"
              >
                Connexion
                <ChevronDown size={13} />
              </button>
              {group === "Connexion" && (
                <div
                  id="nav-connexion"
                  className="absolute right-0 top-full mt-5 w-72 rounded-lg border border-surface-border bg-white p-2 shadow-elevated"
                >
                  <Link
                    href="/sign-in"
                    onClick={close}
                    className="block rounded-md px-3 py-3 hover:bg-surface-subtle"
                  >
                    <span className="block text-sm font-semibold text-ink">Espace RH</span>
                    <span className="mt-0.5 block text-xs leading-5 text-ink-faint">
                      Pour les dirigeants, RH et managers
                    </span>
                  </Link>
                  <Link
                    href="/espace/connexion"
                    onClick={close}
                    className="block rounded-md px-3 py-3 hover:bg-surface-subtle"
                  >
                    <span className="block text-sm font-semibold text-ink">Espace salarié</span>
                    <span className="mt-0.5 block text-xs leading-5 text-ink-faint">
                      Bulletins, congés, absences et documents
                    </span>
                  </Link>
                </div>
              )}
            </div>
            <Link href="/sign-up" className={action}>
              Créer mon espace
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
                  {item.label === "Paie"
                    ? PAYROLL_TOPIC_GROUPS.map((topicGroup) => (
                        <div key={topicGroup.title} className="mt-2">
                          <p className="pl-3 pt-2 text-xs font-semibold text-ink-faint">{topicGroup.title}</p>
                          {topicGroup.topics.map((topic) => (
                            <Link
                              key={topic.href}
                              href={topic.href}
                              onClick={close}
                              className="block py-2.5 pl-3 text-sm text-ink-soft"
                            >
                              {topic.label}
                            </Link>
                          ))}
                        </div>
                      ))
                    : null}
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
              href="/tutoriels"
              onClick={close}
              className="block py-4 text-sm font-semibold"
            >
              Tutoriels
            </Link>
            <Link
              href="/pourquoi"
              onClick={close}
              className="block py-3 text-sm font-semibold"
            >
              À propos
            </Link>
            <div className="mt-2 border-t border-surface-border pt-3">
              <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Connexion
              </p>
              <Link
                href="/sign-in"
                onClick={close}
                className="block rounded-md py-3 text-sm font-semibold text-ink"
              >
                Espace RH
                <span className="mt-0.5 block text-xs font-normal text-ink-faint">
                  Dirigeants, RH et managers
                </span>
              </Link>
              <Link
                href="/espace/connexion"
                onClick={close}
                className="block rounded-md py-3 text-sm font-semibold text-ink"
              >
                Espace salarié
                <span className="mt-0.5 block text-xs font-normal text-ink-faint">
                  Bulletins, congés, absences et documents
                </span>
              </Link>
            </div>
            <Link
              href="/sign-up"
              onClick={close}
              className={`${action} mt-3 w-full`}
            >
              Créer mon espace
            </Link>
          </nav>
        )}
      </header>
      </div>
      <PublicCopilotePreview />
    </OctoberRoseProvider>
  );
}
