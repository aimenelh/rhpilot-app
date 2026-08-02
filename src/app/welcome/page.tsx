import {
  Rocket,
  Heart,
  ArrowRight,
  MessageCircleHeart,
  Users,
  Target,
  Sparkles,
  Clock,
  UserPlus,
  HeartPulse,
  Check,
} from "lucide-react";
import { Logomark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { acknowledgeWelcome } from "./actions";

const POINTS = [
  {
    icon: Users,
    text: "Une version déjà pleinement utilisable.",
  },
  {
    icon: Target,
    text: "Vos retours nous aident à aller plus loin.",
  },
  {
    icon: Sparkles,
    text: "Ensemble, construisons un outil vraiment utile.",
  },
];

export default function WelcomePage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next || "/";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-surface-subtle via-white to-brand-blue/5 px-6 py-16">
      <div
        aria-hidden
        className="welcome-shape-1 pointer-events-none absolute h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl"
        style={{ top: "8%", left: "6%" }}
      />
      <div
        aria-hidden
        className="welcome-shape-2 pointer-events-none absolute h-64 w-64 rounded-full bg-brand-violet/10 blur-3xl"
        style={{ bottom: "10%", right: "8%" }}
      />
      <div
        aria-hidden
        className="welcome-shape-1 pointer-events-none absolute h-40 w-40 rounded-full bg-accent-teal/10 blur-2xl"
        style={{ top: "55%", left: "16%" }}
      />

      {/* Cartes flottantes de contexte (décoratives) */}
      <div
        aria-hidden
        className="welcome-shape-2 pointer-events-none absolute hidden w-44 items-center gap-2.5 rounded-2xl border border-surface-border bg-white/90 px-4 py-3 shadow-md sm:flex"
        style={{ top: "14%", right: "9%", transform: "rotate(-4deg)" }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <Clock size={15} />
        </span>
        <span className="text-xs font-medium text-ink-soft">Période d&apos;essai</span>
        <Check size={14} className="ml-auto shrink-0 text-accent-teal" />
      </div>
      <div
        aria-hidden
        className="welcome-shape-1 pointer-events-none absolute hidden w-40 items-center gap-2.5 rounded-2xl border border-surface-border bg-white/90 px-4 py-3 shadow-md sm:flex"
        style={{ bottom: "14%", left: "7%", transform: "rotate(4deg)" }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
          <UserPlus size={15} />
        </span>
        <span className="text-xs font-medium text-ink-soft">Embauche</span>
        <Check size={14} className="ml-auto shrink-0 text-accent-teal" />
      </div>
      <div
        aria-hidden
        className="welcome-shape-2 pointer-events-none absolute hidden w-44 items-center gap-2.5 rounded-2xl border border-surface-border bg-white/90 px-4 py-3 shadow-md sm:flex"
        style={{ bottom: "10%", right: "6%", transform: "rotate(-3deg)" }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-teal/10 text-accent-teal">
          <HeartPulse size={15} />
        </span>
        <span className="text-xs font-medium text-ink-soft">Visite médicale</span>
        <Check size={14} className="ml-auto shrink-0 text-accent-teal" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <div className="welcome-logo-float relative mb-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-brand-gradient opacity-20 blur-2xl"
          />
          <svg
            aria-hidden
            viewBox="0 0 220 220"
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-56 w-56 -translate-x-1/2 -translate-y-1/2 text-ink/15"
          >
            <ellipse
              cx="110"
              cy="110"
              rx="104"
              ry="68"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              transform="rotate(-8 110 110)"
            />
          </svg>
          <span
            aria-hidden
            className="absolute -left-6 top-3 h-3 w-3 rotate-45 rounded-[3px] bg-brand-violet/40"
          />
          <span
            aria-hidden
            className="absolute -right-5 bottom-3 h-2.5 w-2.5 rounded-full bg-brand-blue/40"
          />
          <span
            aria-hidden
            className="absolute right-6 -top-6 h-2 w-2 rotate-45 rounded-[2px] bg-accent-teal/50"
          />
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white shadow-xl">
            <Logomark size={48} />
          </div>
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping welcome-pulse-dot rounded-full bg-brand-violet opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-brand-violet" />
          </span>
        </div>

        <div className="welcome-card-in w-full rounded-2xl border border-surface-border bg-white p-8 text-center shadow-lg sm:p-9">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
            <Rocket size={13} />
            Bienvenue dans la bêta
          </span>

          <h1 className="mt-5 text-2xl font-semibold leading-tight text-ink sm:text-[28px]">
            Merci d&apos;être parmi les premiers à tester{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">RH Pilot</span>.
          </h1>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-brand-blue">
            <span className="hidden h-px w-6 bg-brand-blue/25 sm:inline-block" />
            <span className="inline-flex items-center gap-1.5">
              <Heart size={13} className="fill-brand-blue text-brand-blue" />
              Votre regard aujourd&apos;hui contribuera directement aux évolutions de demain.
            </span>
            <span className="hidden h-px w-6 bg-brand-blue/25 sm:inline-block" />
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {POINTS.map((point, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <point.icon size={18} />
                </span>
                <p className="mt-3 text-xs leading-relaxed text-ink-soft">{point.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-xl bg-surface-subtle/70 p-5 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white">
              <MessageCircleHeart size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Votre avis compte réellement.</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Cette bêta n&apos;a pas pour objectif de prouver que le logiciel est parfait —
                elle a pour objectif de comprendre ce qui peut encore être amélioré.
              </p>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-ink-soft">
            <Heart size={13} className="text-brand-violet" />
            Merci de participer à cette aventure dès ses premiers jours.
          </p>

          <form action={acknowledgeWelcome} className="mt-6">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" className="w-full py-3 text-base">
              <span className="inline-flex items-center justify-center gap-2">
                Découvrir RH Pilot
                <ArrowRight size={18} />
              </span>
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
              <Clock size={12} />
              ≈ 2 minutes pour découvrir votre espace
            </p>
          </form>

          <div className="-mx-8 -mb-8 mt-8 rounded-b-2xl bg-surface-subtle/60 px-8 py-4 text-xs text-ink-faint sm:-mx-10 sm:-mb-10">
            Version bêta — certaines fonctionnalités continueront d&apos;évoluer au fil des
            prochaines semaines.
          </div>
        </div>
      </div>
    </div>
  );
}
