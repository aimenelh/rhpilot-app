"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Mail } from "lucide-react";
import { Logomark, Wordmark } from "./Brand";
import { FlashToast } from "./ui/FlashToast";
import { Assistant } from "./assistant/Assistant";
import { TourGuide } from "./tour/TourGuide";

type NavItem = {
  href: string;
  label: string;
  available: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", available: true },
  { href: "/dashboard/employees", label: "Salariés", available: true },
  { href: "/dashboard/events", label: "Parcours", available: true },
  { href: "/dashboard/calendar", label: "Calendrier", available: true },
  { href: "/dashboard/notifications", label: "Notifications", available: true },
  { href: "/dashboard/team", label: "Équipe", available: true },
  { href: "/dashboard/organization", label: "Organisation", available: true },
  { href: "/dashboard/help", label: "Aide", available: true },
];

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

            if (!item.available) {
              return (
                <span
                  key={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-faint"
                >
                  {item.label}
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px]">
                    Bientôt
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-ink-soft hover:bg-surface-subtle hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
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
