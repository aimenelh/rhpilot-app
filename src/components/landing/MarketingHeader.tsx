"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logomark, Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { PublicCopilotePreview } from "@/components/landing/PublicCopilotePreview";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { HumanWorkVideo } from "@/components/landing/HumanWorkVideo";
import { PayrollHumanPhoto } from "@/components/landing/PayrollHumanPhoto";

const NAV_LINKS = [
  { href: "/services", label: "Nos services" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/pourquoi", label: "Pourquoi RH Pilot ?" },
  { href: "/questions", label: "Vos questions" },
  { href: "/ressources", label: "Ressources" },
];

const PAYROLL_LINKS = [
  { href: "/gestion-paie", label: "Vue d’ensemble" },
  { href: "/gestion-paie/production", label: "Production de la paie" },
  { href: "/gestion-paie/variables", label: "Variables de paie" },
  { href: "/gestion-paie/conges-absences", label: "Congés & absences" },
  { href: "/gestion-paie/arrets-travail", label: "Arrêts de travail" },
  { href: "/gestion-paie/referentiel-conventionnel", label: "Référentiel conventionnel" },
  { href: "/gestion-paie/complementaire-sante", label: "Complémentaire santé" },
  { href: "/gestion-paie/cotisations-sociales", label: "Cotisations sociales" },
  { href: "/gestion-paie/montant-net-social", label: "Montant net social" },
  { href: "/gestion-paie/bulletin-de-paie", label: "Bulletin de paie" },
  { href: "/gestion-paie/tracabilite-calcul", label: "Traçabilité du calcul" },
  { href: "/gestion-paie/profil-paie", label: "Profil de paie" },
  { href: "/gestion-paie/contexte-employeur", label: "Contexte employeur" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const payrollActive = pathname === "/gestion-paie" || pathname?.startsWith("/gestion-paie/");

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-surface-border bg-white">
        <AnnouncementBar />
        <header className="relative mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
              <Logomark size={30} />
              <Wordmark />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <Link href="/services" className={`whitespace-nowrap text-sm font-medium transition-colors ${isActive("/services") ? "text-brand-primary" : "text-ink-soft hover:text-ink"}`}>
                Nos services
              </Link>

              <div className="relative" onMouseEnter={() => setPayrollOpen(true)} onMouseLeave={() => setPayrollOpen(false)}>
                <button
                  type="button"
                  aria-expanded={payrollOpen}
                  aria-haspopup="menu"
                  onClick={() => setPayrollOpen((value) => !value)}
                  className={`inline-flex whitespace-nowrap items-center gap-1 text-sm font-medium transition-colors ${payrollActive ? "text-brand-primary" : "text-ink-soft hover:text-ink"}`}
                >
                  Gestion de la paie
                  <ChevronDown size={15} className={`transition-transform ${payrollOpen ? "rotate-180" : ""}`} />
                </button>
                {payrollOpen && (
                  <div className="absolute left-1/2 top-full z-50 w-[34rem] -translate-x-1/2 pt-3">
                    <div className="max-h-[75vh] overflow-y-auto rounded-2xl border border-surface-border bg-white p-2 shadow-xl">
                      <div className="grid grid-cols-2 gap-1">
                        {PAYROLL_LINKS.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setPayrollOpen(false)}
                            className={`block rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive(link.href) ? "bg-brand-primary/10 font-medium text-brand-primary" : "text-ink-soft hover:bg-surface-subtle hover:text-ink"}`}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {NAV_LINKS.slice(1).map((link) => (
                <Link key={link.href} href={link.href} className={`whitespace-nowrap text-sm font-medium transition-colors ${isActive(link.href) ? "text-brand-primary" : "text-ink-soft hover:text-ink"}`}>
                  {link.label}
                </Link>
              ))}
              <span aria-hidden className="h-4 w-px bg-surface-border" />
              <Link href="/sign-in" className={`whitespace-nowrap text-sm font-medium transition-colors ${isActive("/sign-in") ? "text-brand-primary" : "text-ink-soft hover:text-ink"}`}>
                Se connecter
              </Link>
              <Link href="/sign-up" className="shrink-0"><Button>Essayer gratuitement</Button></Link>
            </nav>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-soft md:hidden"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {open && (
            <nav className="absolute inset-x-6 top-full z-50 mt-3 flex max-h-[80vh] flex-col gap-1 overflow-y-auto rounded-2xl border border-surface-border bg-white p-3 shadow-xl md:hidden">
              <Link href="/services" onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${isActive("/services") ? "bg-brand-primary/10 text-brand-primary" : "text-ink-soft hover:bg-surface-subtle"}`}>Nos services</Link>

              <div className="rounded-xl bg-surface-subtle/60 px-2 py-2">
                <Link href="/gestion-paie" onClick={() => setOpen(false)} className={`block rounded-lg px-2 py-2 text-sm font-medium ${payrollActive ? "text-brand-primary" : "text-ink"}`}>
                  Gestion de la paie
                </Link>
                <div className="mt-1 flex flex-col gap-0.5 border-l border-surface-border pl-2">
                  {PAYROLL_LINKS.slice(1).map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`rounded-lg px-2 py-2 text-sm ${isActive(link.href) ? "text-brand-primary" : "text-ink-soft hover:text-ink"}`}>{link.label}</Link>
                  ))}
                </div>
              </div>

              {NAV_LINKS.slice(1).map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${isActive(link.href) ? "bg-brand-primary/10 text-brand-primary" : "text-ink-soft hover:bg-surface-subtle"}`}>{link.label}</Link>
              ))}
              <div className="my-1 border-t border-surface-border" />
              <Link href="/sign-in" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-subtle">Se connecter</Link>
              <Link href="/sign-up" onClick={() => setOpen(false)} className="mt-2"><Button className="w-full">Essayer gratuitement</Button></Link>
            </nav>
          )}
        </header>
      </div>
      {pathname === "/" && <HumanWorkVideo />}
      {payrollActive && <PayrollHumanPhoto />}
      <PublicCopilotePreview />
    </>
  );
}
