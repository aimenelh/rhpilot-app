"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logomark, Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { PublicCopilotePreview } from "@/components/landing/PublicCopilotePreview";

const NAV_LINKS = [
  { href: "/services", label: "Nos services" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/pourquoi", label: "Pourquoi RH Pilot ?" },
  { href: "/questions", label: "Vos questions" },
  { href: "/ressources", label: "Ressources" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <>
    <header className="relative mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Logomark size={30} />
          <Wordmark />
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href) ? "text-brand-primary" : "text-ink-soft hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <span aria-hidden className="h-4 w-px bg-surface-border" />
          <Link
            href="/sign-in"
            className={`text-sm font-medium transition-colors ${
              isActive("/sign-in") ? "text-brand-primary" : "text-ink-soft hover:text-ink"
            }`}
          >
            Se connecter
          </Link>
          <Link href="/sign-up">
            <Button>Essayer gratuitement</Button>
          </Link>
        </nav>

        {/* Bouton menu mobile */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-soft md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Menu mobile déplié */}
      {open && (
        <nav className="absolute inset-x-6 top-full z-50 mt-3 flex flex-col gap-1 rounded-2xl border border-surface-border bg-white p-3 shadow-xl md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(link.href) ? "bg-brand-primary/10 text-brand-primary" : "text-ink-soft hover:bg-surface-subtle"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-1 border-t border-surface-border" />
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-subtle"
          >
            Se connecter
          </Link>
          <Link href="/sign-up" onClick={() => setOpen(false)} className="mt-2">
            <Button className="w-full">Essayer gratuitement</Button>
          </Link>
        </nav>
      )}
    </header>
    <PublicCopilotePreview />
    </>
  );
}
