"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, FolderOpen, Sun } from "lucide-react";

const ITEMS = [
  { href: "/espace", label: "Bulletins", icon: FileText },
  { href: "/espace/conges", label: "Congés", icon: Sun },
  { href: "/espace/absences", label: "Absences", icon: CalendarDays },
  { href: "/espace/documents", label: "Documents", icon: FolderOpen },
];

function isActive(pathname: string, href: string) {
  return href === "/espace" ? pathname === "/espace" : pathname.startsWith(href);
}

/** Onglets en haut sur ordinateur, barre fixe en bas sur téléphone. */
export function EspaceNav() {
  const pathname = usePathname() ?? "/espace";
  return (
    <>
      <nav aria-label="Espace salarié" className="hidden border-b border-surface-border bg-white sm:block">
        <div className="mx-auto flex max-w-3xl gap-1 px-6">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${active ? "border-brand-primary text-ink" : "border-transparent text-ink-faint hover:text-ink"}`}>
                <item.icon size={16} strokeWidth={2} /> {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <nav aria-label="Espace salarié" className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-4">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-brand-primary" : "text-ink-faint"}`}>
                <item.icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
