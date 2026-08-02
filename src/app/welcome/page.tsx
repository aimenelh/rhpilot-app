import { Rocket, MessageCircleHeart, ArrowRight, ListChecks, BellRing } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { acknowledgeWelcome } from "./actions";

export default function WelcomePage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next || "/";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-surface-subtle via-white to-brand-blue/5 px-6 py-16">
      {/* Formes discrètes en arrière-plan, très floues, mouvement lent */}
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

      {/* Cartes RH Pilot très transparentes, au loin — on ne les
          remarque pas consciemment, mais elles donnent l'impression
          que le logiciel existe déjà, pas juste une page d'attente */}
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
        {/* Logo, plus grand, avec halo lumineux et un point qui pulse */}
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

          <p className="mt-3 text-sm font-medium text-brand-blue">
            Votre regard aujourd&apos;hui contribuera directement aux évolutions de demain.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Avant toute chose, merci de nous accorder un peu de votre temps. RH Pilot est
            encore en phase de bêta. Cette version est déjà pleinement utilisable, mais elle
            continuera d&apos;évoluer grâce à vos retours. Chaque remarque, chaque idée ou
            chaque difficulté rencontrée nous aide à construire un outil plus simple, plus
            fiable et réellement utile pour les professionnels RH.
          </p>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-surface-subtle px-4 py-3.5 text-left">
            <MessageCircleHeart size={18} className="mt-0.5 shrink-0 text-brand-violet" />
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">Votre avis compte réellement.</span> Cette
              bêta n&apos;a pas pour objectif de prouver que le logiciel est parfait — elle a
              pour objectif de comprendre ce qui peut encore être amélioré.
            </p>
          </div>

          <p className="mt-5 text-xs text-ink-faint">
            Merci de participer à cette aventure dès ses premiers jours.
          </p>

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

          <p className="mt-4 text-xs text-ink-faint">
            Version bêta — certaines fonctionnalités continueront d&apos;évoluer au fil des
            prochaines semaines.
          </p>
        </div>

        <p className="relative z-10 mt-8 max-w-sm text-center text-sm leading-relaxed text-ink-faint">
          Chaque retour reçu est lu et pris en compte. Merci de contribuer aux premières
          étapes de RH Pilot.
        </p>
      </div>
    </div>
  );
}
