"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Mail,
  LayoutDashboard,
  Users,
  ListChecks,
  CalendarDays,
  UsersRound,
  Settings,
  Bell,
  HelpCircle,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logomark, Wordmark } from "./Brand";
import { FlashToast } from "./ui/FlashToast";
import { AppCopilote } from "./AppCopilote";
import { TourGuide } from "./tour/TourGuide";
import { GlobalSearch } from "./GlobalSearch";
import { RhNewsToast } from "./RhNewsToast";
import type { RhNewsItem } from "@/lib/rhNews";
import { IosInstallHint } from "./IosInstallHint";

type NavItem = {
  href: string;
  label: string;
  available: boolean;
  icon: LucideIcon;
  section?: string; // affiche un séparateur avec ce titre juste avant cette entrée
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", available: true, icon: LayoutDashboard },
  { href: "/dashboard/employees", label: "Salariés", available: true, icon: Users },
  { href: "/dashboard/events", label: "Parcours", available: true, icon: ListChecks },
  { href: "/dashboard/calendar", label: "Calendrier", available: true, icon: CalendarDays },
  {
    href: "/dashboard/team",
    label: "Équipe",
    available: true,
    icon: UsersRound,
    section: "Administration",
  },
  { href: "/dashboard/configuration", label: "Configuration", available: true, icon: Settings },
  { href: "/dashboard/notifications", label: "Notifications", available: true, icon: Bell },
];

// Aide n'est pas de l'administration — elle reste disponible partout,
// tout en bas, à côté du lien de retour.
const HELP_ITEM: NavItem = { href: "/dashboard/help", label: "Aide", available: true, icon: HelpCircle };

export function AppShell({
  organizationName,
  accessRole,
  assistantSummary,
  rhNews,
  aiEnabled,
  children,
}: {
  organizationName: string;
  accessRole: string;
  assistantSummary: { userDisplayName: string; overdueCount: number; suggestionsCount: number };
  rhNews: RhNewsItem[];
  aiEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Contenu de la navigation, partagé entre la sidebar desktop (toujours
  // visible) et le tiroir mobile (ouvert/fermé via l'état ci-dessus) —
  // un seul endroit à maintenir pour les deux versions.
  const navContent = (
    <>
      <div className="flex items-center gap-2 px-2">
        <Logomark />
        <Wordmark />
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);

          return (
            <div key={item.href}>
              {item.section && (
                <p className="mb-1.5 mt-5 px-3 text-[10px] font-normal uppercase tracking-wider text-ink-faint/70">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-ink-soft hover:translate-x-0.5 hover:bg-surface-subtle hover:text-ink"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        <Link
          href={HELP_ITEM.href}
          onClick={() => setMobileNavOpen(false)}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
            pathname.startsWith(HELP_ITEM.href)
              ? "bg-brand-blue/10 text-brand-blue"
              : "text-ink-faint hover:translate-x-0.5 hover:bg-surface-subtle hover:text-ink-soft"
          }`}
        >
          <HELP_ITEM.icon size={16} />
          {HELP_ITEM.label}
        </Link>
        <a
          href="mailto:aimenoffi@gmail.com?subject=Retour%20b%C3%AAta%20RH%20Pilot"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink-soft"
        >
          <Mail size={15} />
          Envoyer un retour
        </a>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop — inchangée dans son fonctionnement, juste
          masquée sous md et remplacée par le tiroir ci-dessous. */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-surface-border bg-white px-4 py-5 md:flex">
        {navContent}
      </aside>

      {/* Tiroir mobile — fond assombri cliquable pour fermer, contenu
          qui ne ferme pas au clic à l'intérieur (stopPropagation). */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-label="Menu de navigation">
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white px-4 py-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-subtle hover:text-ink"
            >
              <X size={18} />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-surface-border bg-white px-4 md:gap-6 md:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-soft md:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="truncate text-sm font-semibold text-ink">{organizationName}</p>
            <p className="truncate text-xs text-ink-faint">Rôle d&apos;accès : {accessRole}</p>
          </div>

          <div className="hidden flex-1 sm:block">
            <GlobalSearch />
          </div>

          <div className="shrink-0">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div key={pathname} className="page-fade-in">
            {children}
          </div>
        </main>
      </div>

      <FlashToast />
      {/* Le Copilote a repris tout ce que faisait l'ancien Assistant
          ("Aide") : accueil personnalisé, onboarding des nouveaux
          utilisateurs, entrée vers le tour guidé — en plus des
          questions libres sur l'organisation et sur RH Pilot. */}
      <AppCopilote summary={assistantSummary} aiEnabled={aiEnabled} />
      <TourGuide />
      <RhNewsToast items={rhNews} />
      <IosInstallHint />
    </div>
  );
}
