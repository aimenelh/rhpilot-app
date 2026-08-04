"use client";

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
  type LucideIcon,
} from "lucide-react";
import { Logomark, Wordmark } from "./Brand";
import { FlashToast } from "./ui/FlashToast";
import { Assistant } from "./assistant/Assistant";
import { TourGuide } from "./tour/TourGuide";

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
  children,
}: {
  organizationName: string;
  accessRole: string;
  assistantSummary: { userDisplayName: string; overdueCount: number; suggestionsCount: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-surface-border bg-white px-4 py-5">
        <div className="flex items-center gap-2 px-2">
          <Logomark />
          <Wordmark />
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <div key={item.href}>
                {item.section && (
                  <p className="mb-1.5 mt-5 px-3 text-[10px] font-normal uppercase tracking-wider text-ink-faint/70">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-ink-soft hover:bg-surface-subtle hover:text-ink"
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
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith(HELP_ITEM.href)
                ? "bg-brand-blue/10 text-brand-blue"
                : "text-ink-faint hover:bg-surface-subtle hover:text-ink-soft"
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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-8">
          <div>
            <p className="text-sm font-semibold text-ink">{organizationName}</p>
            <p className="text-xs text-ink-faint">Rôle d&apos;accès : {accessRole}</p>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </header>

        <main className="flex-1 px-8 py-8">
          <div key={pathname} className="page-fade-in">
            {children}
          </div>
        </main>
      </div>

      <FlashToast />
      <Assistant summary={assistantSummary} />
      <TourGuide />
    </div>
  );
}
