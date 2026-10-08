"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Logomark, Wordmark } from "./Brand";
import { Users, Route, CalendarDays, Settings, Bell, Menu, X, LayoutGrid, Leaf, FileText, Sparkles, ChevronDown, MessageCircle, WalletCards, type LucideIcon } from "lucide-react";
import { FlashToast } from "./ui/FlashToast";
import { GlobalSearch } from "./GlobalSearch";
import { RhNewsToast } from "./RhNewsToast";
import type { RhNewsItem } from "@/lib/rhNews";
import { IosInstallHint } from "./IosInstallHint";
import "./AppWorkspace.css";
import { NavigationProgress } from "@/components/app/NavigationProgress";

// Chargés après l'affichage de la page : ni la visite ni le Copilote ne doivent retarder le premier rendu.
const AppCopilote = dynamic(() => import("./AppCopilote").then((mod) => mod.AppCopilote), { ssr: false });
const DiscoveryTour = dynamic(() => import("./tour/DiscoveryTour").then((mod) => mod.DiscoveryTour), { ssr: false });

type NavItem = { href: string; label: string; icon: LucideIcon; section?: string; adminOnly?: boolean; payrollOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutGrid, section: "Votre espace" },
  { href: "/dashboard/employees", label: "Salariés", icon: Users },
  { href: "/dashboard/events", label: "Parcours RH", icon: Route },
  { href: "/dashboard/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/dashboard/absences", label: "Congés & absences", icon: Leaf, adminOnly: true },
  { href: "/dashboard/documents", label: "Documents", icon: FileText, adminOnly: true },
  // Paie en accès anticipé : visible pour les seules organisations pilotes (lib/payrollAccess).
  { href: "/dashboard/payroll", label: "Paie", icon: WalletCards, adminOnly: true, payrollOnly: true },
  { href: "/dashboard#copilote", label: "Copilote RH", icon: Sparkles, section: "Pour aller plus loin" },
  { href: "/dashboard/configuration", label: "Configuration", icon: Settings },
];

function useDemoCountdownLabel(target: Date | null) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setLabel(null);
      return;
    }

    const update = () => {
      const diffMs = target.getTime() - Date.now();
      if (diffMs <= 0) {
        setLabel("imminente");
        return;
      }
      const hours = Math.floor(diffMs / 3_600_000);
      const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
      setLabel(hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`);
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [target]);

  return label;
}

export function AppShell({
  organizationName,
  accessRole,
  payrollEnabled,
  discoveryTourCompleted,
  assistantSummary,
  rhNews,
  aiEnabled,
  demoExpiresAt,
  children,
  preview = false,
  employeeCount = 0,
  pendingRequestsCount = 0,
}: {
  organizationName: string;
  accessRole: string;
  payrollEnabled: boolean;
  discoveryTourCompleted: boolean;
  assistantSummary: { userDisplayName: string; overdueCount: number; suggestionsCount: number };
  rhNews: RhNewsItem[];
  aiEnabled: boolean;
  demoExpiresAt: Date | null;
  children: React.ReactNode;
  preview?: boolean;
  employeeCount?: number;
  pendingRequestsCount?: number;
}) {
  const pathname = usePathname();
  const filDashboard = pathname === "/dashboard" || preview;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = menuRef.current;
    const menuButton = menuButtonRef.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); menuButton?.focus(); };
  }, [mobileNavOpen]);
  const roleLabel = ({ OWNER: "Propriétaire", ADMIN: "Administrateur", MEMBER: "Membre" } as Record<string, string>)[accessRole] ?? accessRole;
  const demoCountdownLabel = useDemoCountdownLabel(demoExpiresAt);

  const userInitials = assistantSummary.userDisplayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const navContent = <>
    <Link href="/dashboard" className="workspace-brand" aria-label="RH Pilot, tableau de bord" onClick={() => setMobileNavOpen(false)}><Logomark/><Wordmark/></Link>
    <Link href="/dashboard/configuration/organisation" className="workspace-organization"><span>{organizationName.charAt(0)}</span><div><strong>{organizationName}</strong><small>Votre organisation</small></div><ChevronDown size={14}/></Link>
    <nav aria-label="Navigation principale" className="workspace-nav">
      {NAV_ITEMS.map(item => {
        if (item.adminOnly && accessRole !== "OWNER" && accessRole !== "ADMIN") return null;
        if (item.payrollOnly && !payrollEnabled) return null;
        const isActive = item.href === "/dashboard" ? filDashboard : !item.href.includes("#") && pathname.startsWith(item.href);
        const count = item.href === "/dashboard/employees" ? employeeCount : item.href === "/dashboard/absences" ? pendingRequestsCount : 0;
        return <div key={item.href}>{item.section ? <p className="workspace-nav-label">{item.section}</p> : null}<Link href={preview && item.href === "/dashboard#copilote" ? "#copilote" : item.href} aria-current={isActive ? "page" : undefined} onClick={() => setMobileNavOpen(false)}><item.icon size={20} strokeWidth={1.6}/><span>{item.label}</span>{count > 0 ? <span className="workspace-nav-badge">{count}</span> : null}</Link></div>;
      })}
    </nav>
    <div className="workspace-side-bottom"><div className="workspace-support"><MessageCircle size={17}/><strong>Besoin d’aide ?</strong><p>Une question sur le logiciel ou votre suivi RH : écrivez-nous.</p><Link href="/dashboard/help" onClick={() => setMobileNavOpen(false)}>Contacter l’équipe</Link></div><div className="workspace-profile"><span className="workspace-preview-user">{userInitials}</span><div><strong>{assistantSummary.userDisplayName}</strong><small>{roleLabel}</small></div><Link href="/dashboard/configuration" aria-label="Configurer mon espace"><Settings size={17}/></Link></div></div>
  </>;

  return (
    <div className="app-workspace dashboard-fil-shell flex min-h-screen">
      <a href="#workspace-main" className="workspace-skip">Aller au contenu</a>
      <aside className="workspace-sidebar hidden w-60 shrink-0 flex-col border-r border-surface-border bg-white px-4 py-5 md:flex">
        {navContent}
      </aside>

      {mobileNavOpen && (
        <div ref={menuRef} id="mobile-navigation" className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navigation">
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative flex h-full w-72 max-w-[80vw] flex-col overflow-y-auto bg-white px-4 py-5 shadow-xl"
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
        {demoExpiresAt && demoCountdownLabel && (
          <div className="border-b border-accent-amber/30 bg-accent-amber/10 px-4 py-2 text-center text-xs font-medium text-ink md:px-8">
            Données de démonstration actives · purge automatique dans {demoCountdownLabel}
          </div>
        )}

        <header className="workspace-header flex min-h-16 items-center gap-3 border-b border-surface-border bg-white px-4 md:gap-6 md:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            ref={menuButtonRef}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation"
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-soft md:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="workspace-crumb"><LayoutGrid size={20}/><span>/</span><span>{filDashboard ? "Tableau de bord" : NAV_ITEMS.find(item => !item.href.includes("#") && item.href !== "/dashboard" && pathname.startsWith(item.href))?.label || organizationName}</span></div>
          <div className="workspace-top-actions">
            {preview ? <span className="workspace-preview-label">Proposition · données fictives</span> : !filDashboard ? <div className="workspace-search"><GlobalSearch/></div> : null}
            <Link href="/dashboard/notifications" className="workspace-bell" aria-label="Voir les notifications"><Bell size={20}/></Link>
            {preview ? <span className="workspace-preview-user">{userInitials}</span> : <UserButton afterSignOutUrl="/sign-in" />}
          </div>
        </header>

        <main id="workspace-main" tabIndex={-1} className="workspace-main flex-1 px-4 py-6 md:px-8 md:py-8">
          {!preview && !filDashboard ? <div className="mb-4 sm:hidden"><GlobalSearch /></div> : null}
          <div key={pathname} className="page-fade-in">
            {children}
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <FlashToast />
      {!preview ? <AppCopilote summary={assistantSummary} aiEnabled={aiEnabled} /> : null}
      {!preview ? <DiscoveryTour accessRole={accessRole} payrollEnabled={payrollEnabled} userName={assistantSummary.userDisplayName} completed={discoveryTourCompleted} /> : null}
      <RhNewsToast items={rhNews} />
      <IosInstallHint />
    </div>
  );
}
