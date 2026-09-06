import {
  ArrowRight,
  Users,
  FileText,
  CalendarDays,
  ShieldCheck,
  LayoutDashboard,
  ListChecks,
  UserCircle,
  Settings,
} from "lucide-react";
import { Logomark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { acknowledgeWelcome } from "./actions";

const ORBIT_ICONS = [
  { icon: Users, top: "14%", left: "10%", tone: "bg-brand-primary-dark/10 text-brand-primary-dark" },
  { icon: FileText, top: "14%", left: "90%", tone: "bg-accent-amber/10 text-accent-amber" },
  { icon: CalendarDays, top: "86%", left: "9%", tone: "bg-accent-teal/10 text-accent-teal" },
  { icon: ShieldCheck, top: "86%", left: "91%", tone: "bg-brand-primary/10 text-brand-primary" },
];

const PREVIEW_NAV = [
  { icon: LayoutDashboard, label: "Tableau de bord", active: true },
  { icon: Users, label: "Salariés" },
  { icon: ListChecks, label: "Parcours" },
  { icon: CalendarDays, label: "Calendrier" },
  { icon: UserCircle, label: "Équipe" },
  { icon: Settings, label: "Configuration" },
];
const PREVIEW_KPIS = [
  { icon: Users, value: "12", label: "Salariés", tone: "bg-brand-primary-dark/10 text-brand-primary-dark" },
  { icon: ListChecks, value: "8", label: "Parcours actifs", tone: "bg-accent-teal/10 text-accent-teal" },
  { icon: CalendarDays, value: "15", label: "Échéances", tone: "bg-accent-amber/10 text-accent-amber" },
  { icon: ShieldCheck, value: "100%", label: "À jour", tone: "bg-brand-primary/10 text-brand-primary" },
];
const PREVIEW_ROWS = ["bg-brand-primary", "bg-accent-teal", "bg-accent-amber"];
const PREVIEW_DAYS = [28, 29, 30, 1, 2, 3, 4];

export default function WelcomePage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next || "/";

  return (
    <div className="bg-gradient-to-br from-surface-subtle via-white to-brand-primary/5">
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        <div
          aria-hidden
          className="welcome-shape-1 pointer-events-none absolute h-72 w-72 rounded-full bg-brand-primary/10 blur-3xl"
          style={{ top: "4%", left: "4%" }}
        />
        <div
          aria-hidden
          className="welcome-shape-2 pointer-events-none absolute h-64 w-64 rounded-full bg-brand-primary-dark/10 blur-3xl"
          style={{ bottom: "6%", right: "6%" }}
        />
        <div
          aria-hidden
          className="welcome-shape-1 pointer-events-none absolute h-40 w-40 rounded-full bg-accent-teal/10 blur-2xl"
          style={{ top: "45%", left: "2%" }}
        />
        <div
          aria-hidden
          className="welcome-shape-2 pointer-events-none absolute h-40 w-40 rounded-full bg-accent-amber/10 blur-2xl"
          style={{ top: "40%", right: "2%" }}
        />

        <form action={acknowledgeWelcome} className="relative z-10 flex w-full flex-col items-center">
          <input type="hidden" name="next" value={next} />

          <div className="relative h-56 w-full max-w-xl sm:h-64">
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full text-brand-primary-dark/15"
            >
              <ellipse cx="50" cy="50" rx="46" ry="42" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1.6 2.2" />
            </svg>
            <span aria-hidden className="absolute left-[24%] top-[6%] h-1.5 w-1.5 rotate-45 rounded-[2px] bg-brand-primary-dark/40" />
            <span aria-hidden className="absolute right-[26%] top-[10%] h-2 w-2 rotate-45 rounded-[2px] bg-brand-primary/30" />
            <span aria-hidden className="absolute bottom-[10%] left-[30%] h-1.5 w-1.5 rounded-full bg-accent-teal/40" />
            <span aria-hidden className="absolute bottom-[6%] right-[28%] h-2 w-2 rotate-45 rounded-[2px] bg-accent-amber/40" />

            {ORBIT_ICONS.map(({ icon: Icon, top, left, tone }, i) => (
              <div
                key={i}
                className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg"
                style={{ top, left }}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
                  <Icon size={17} />
                </span>
              </div>
            ))}

            <div className="welcome-logo-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 scale-[2.4] rounded-full bg-brand-primary opacity-25 blur-2xl"
              />
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white shadow-xl">
                <Logomark size={48} />
              </div>
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping welcome-pulse-dot rounded-full bg-brand-primary-dark opacity-60" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-brand-primary-dark" />
              </span>
            </div>
          </div>

          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-primary-dark">
            Bêta
          </span>

          <h1 className="mt-5 max-w-2xl text-center text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Bienvenue sur la bêta de{" "}
            <span className="bg-brand-primary bg-clip-text text-transparent">RH Pilot</span>
          </h1>

          <p className="mt-4 max-w-xl text-center text-base leading-relaxed text-ink-soft">
            Nous sommes ravis de vous compter parmi les premiers à tester RH Pilot. Votre
            retour nous aidera à construire le meilleur copilote RH.
          </p>

          <Button type="submit" className="mt-8 px-8 py-3.5 text-base">
            <span className="inline-flex items-center justify-center gap-2">
              Découvrir RH Pilot
              <ArrowRight size={18} />
            </span>
          </Button>

          <div
            aria-hidden
            className="welcome-card-in mt-14 flex w-full max-w-3xl overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl"
          >
            <div className="hidden w-40 shrink-0 border-r border-surface-border bg-surface-subtle/50 p-4 sm:block">
              <div className="flex items-center gap-1.5">
                <Logomark size={16} />
                <span className="text-xs font-bold text-ink">RH Pilot</span>
              </div>
              <div className="mt-5 flex flex-col gap-0.5">
                {PREVIEW_NAV.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                      item.active ? "bg-white font-medium text-brand-primary shadow-sm" : "text-ink-faint"
                    }`}
                  >
                    <item.icon size={12} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 p-5 text-left">
              <p className="text-sm font-bold text-ink">Bonjour Aïmen 👋</p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PREVIEW_KPIS.map((kpi) => (
                  <div key={kpi.label} className="rounded-lg border border-surface-border p-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md ${kpi.tone}`}>
                      <kpi.icon size={12} />
                    </span>
                    <p className="mt-1.5 text-sm font-bold text-ink">{kpi.value}</p>
                    <p className="text-[9px] text-ink-faint">{kpi.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-surface-border p-3">
                  <p className="text-[10px] font-semibold text-ink">Échéances à venir</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {PREVIEW_ROWS.map((color, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />
                        <span className="h-1.5 flex-1 rounded-full bg-surface-subtle" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-surface-border p-3">
                  <p className="text-[10px] font-semibold text-ink">Calendrier</p>
                  <p className="text-[9px] text-ink-faint">Mai 2026</p>
                  <div className="mt-1.5 grid grid-cols-7 gap-y-1 text-center text-[8px] text-ink-faint">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                    {PREVIEW_DAYS.map((d, i) => (
                      <span
                        key={i}
                        className={i === 3 ? "mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-primary text-white" : ""}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
