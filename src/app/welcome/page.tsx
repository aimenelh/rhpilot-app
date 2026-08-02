import { Rocket, FlaskConical, MessageCircleHeart, Heart, ArrowRight, ListChecks, BellRing } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { acknowledgeWelcome } from "./actions";

const POINTS = [
  {
    icon: FlaskConical,
    title: "Déjà pleinement utilisable",
    text: "Certaines fonctionnalités évolueront encore pendant la bêta.",
  },
  {
    icon: MessageCircleHeart,
    title: "Votre retour guide les prochaines évolutions",
    text: "Une remarque, une incompréhension ou un bug nous aide à améliorer RH Pilot.",
  },
  {
    icon: Heart,
    title: "Utilisez RH Pilot naturellement",
    text: "Pas besoin de « tout tester » — faites comme dans votre quotidien.",
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

      <div
        aria-hidden
        className="welcome-shape-2 pointer-events-none absolute hidden w-48 rounded-xl border border-ink/10 bg-white/10 px-4 py-3 opacity-[0.12] backdrop-blur-sm sm:block"
        style={{ top: "16%", right: "14%", transform: "rotate(-6deg)" }}
      >
        <div className="flex items-center gap-2">
          <ListChecks size={14} className="text-ink" />
          <div className="h-2 w-24 rounded bg-ink" />
        </div>
      </div>
      <div
        aria-hidden
        className="welcome-shape-1 pointer-events-none absolute hidden w-40 rounded-xl border border-ink/10 bg-white/10 px-4 py-3 opacity-[0.12] backdrop-blur-sm sm:block"
        style={{ bottom: "18%", left: "12%", transform: "rotate(5deg)" }}
      >
        <div className="flex items-center gap-2">
          <BellRing size={14} className="text-ink" />
          <div className="h-2 w-20 rounded bg-ink" />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
        <div className="welcome-logo-float relative mb-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-brand-gradient opacity-20 blur-2xl"
          />
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white shadow-xl">
            <Logomark size={48} />
          </div>
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping welcome-pulse-dot rounded-full bg-brand-violet opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-brand-violet" />
          </span>
        </div>

        <div className="welcome-card-in w-full rounded-2xl border border-surface-border bg-white p-8 text-center shadow-lg sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
            <Rocket size={13} />
            Bienvenue dans la bêta
          </span>

          <h1 className="mt-5 text-2xl font-semibold leading-tight text-ink sm:text-[28px]">
            Merci d&apos;être parmi les premiers à tester RH Pilot.
          </h1>

          <p className="mt-4 text-sm font-medium text-brand-blue">
            Votre regard aujourd&apos;hui contribuera directement aux évolutions de demain.
          </p>

          <ul className="mt-10 flex flex-col gap-6 text-left">
            {POINTS.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <point.icon size={15} />
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-ink">{point.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-9 border-t border-surface-border pt-7">
            <p className="text-sm leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">Votre avis compte réellement.</span> Cette
              bêta n&apos;a pas pour objectif de démontrer que RH Pilot est parfait — elle a
              pour objectif de construire le meilleur copilote RH possible avec ceux qui
              l&apos;utiliseront demain.
            </p>
          </div>

          <form action={acknowledgeWelcome} className="mt-7">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" className="w-full py-3 text-base">
              <span className="inline-flex items-center justify-center gap-2">
                Découvrir RH Pilot
                <ArrowRight size={18} />
              </span>
            </Button>
            <p className="mt-2 text-xs text-ink-faint">≈ 2 minutes pour découvrir votre espace</p>
          </form>
        </div>

        <p className="relative z-10 mt-8 max-w-sm text-center text-sm leading-relaxed text-ink-faint">
          RH Pilot ne se construit pas seulement avec du code. Il se construit aussi grâce
          aux professionnels RH qui prennent le temps de partager leur expérience. Merci
          d&apos;en faire partie.
        </p>
      </div>
    </div>
  );
}
