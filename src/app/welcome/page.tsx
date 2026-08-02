import { Rocket, MessageCircleHeart } from "lucide-react";
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
        style={{ top: "10%", left: "8%" }}
      />
      <div
        aria-hidden
        className="welcome-shape-2 pointer-events-none absolute h-64 w-64 rounded-full bg-brand-violet/10 blur-3xl"
        style={{ bottom: "12%", right: "10%" }}
      />
      <div
        aria-hidden
        className="welcome-shape-1 pointer-events-none absolute h-40 w-40 rounded-full bg-accent-teal/10 blur-2xl"
        style={{ top: "55%", left: "18%" }}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
        <div className="welcome-logo-float mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Logomark size={32} />
          </div>
        </div>

        <div className="welcome-card-in w-full rounded-2xl border border-surface-border bg-white p-8 text-center shadow-lg sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
            <Rocket size={13} />
            Bienvenue dans la bêta
          </span>

          <h1 className="mt-5 text-2xl font-semibold leading-tight text-ink sm:text-[28px]">
            Merci d&apos;être parmi les premiers à tester RH Pilot.
          </h1>

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
              Découvrir RH Pilot
            </Button>
          </form>

          <p className="mt-3 text-xs text-ink-faint">
            Version bêta — certaines fonctionnalités continueront d&apos;évoluer au fil des
            prochaines semaines.
          </p>
        </div>

        <p className="relative z-10 mt-8 max-w-sm text-center text-sm leading-relaxed text-ink-faint">
          RH Pilot ne se construit pas seulement avec du code. Il se construit grâce aux
          retours des professionnels RH qui l&apos;utilisent au quotidien. Merci de faire
          partie de cette aventure.
        </p>
      </div>
    </div>
  );
}
