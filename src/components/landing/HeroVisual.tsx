import {
  Bell,
  FileText,
  Landmark,
  Stethoscope,
  Hourglass,
  CircleCheck,
  CircleDashed,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

const CENTRAL_TASKS = [
  { label: "Contrat", status: "done" as const },
  { label: "DPAE", status: "done" as const },
  { label: "Visite médicale", status: "todo" as const },
  { label: "Accueil & intégration", status: "todo" as const },
];

// Composition "premium" du hero : une carte centrale (le parcours RH — l'objet
// réel du produit, pas une mascotte) autour de laquelle gravitent des cartes
// satellites reliées par de fines lignes en pointillés. Les cartes proches du
// centre sont nettes et au premier plan ; les plus éloignées sont légèrement
// plus petites et translucides pour suggérer de la profondeur. Des halos et
// quelques points lumineux animent le fond sans surcharger la composition.
export function HeroVisual() {
  const doneCount = CENTRAL_TASKS.filter((t) => t.status === "done").length;

  return (
    <div className="hidden items-center gap-10 lg:flex">
      <div className="relative h-[520px] w-[520px] shrink-0">
        {/* Halo derrière la carte centrale */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gradient opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-brand-blue/20"
        />

        {/* Points lumineux */}
        <span aria-hidden className="pointer-events-none absolute left-[18%] top-[36%] h-1.5 w-1.5 rounded-full bg-brand-blue/60 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute right-[16%] top-[64%] h-2 w-2 rounded-full bg-brand-violet/60 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute left-[46%] top-[78%] h-1.5 w-1.5 rounded-full bg-accent-teal/60 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute right-[8%] top-[48%] h-1 w-1 rounded-full bg-brand-blue/50 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute left-[8%] top-[62%] h-1.5 w-1.5 rounded-full bg-brand-violet/40 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute right-[24%] top-[88%] h-1 w-1 rounded-full bg-accent-teal/50 blur-[1px]" />
        <span aria-hidden className="pointer-events-none absolute right-[30%] top-[8%] h-1 w-1 rounded-full bg-brand-blue/40 blur-[1px]" />

        {/* Lignes de connexion vers la carte centrale — plus lumineuses, avec un point qui circule sur chacune */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full text-brand-blue/30"
        >
          <path id="hero-line-1" d="M50,50 Q34,26 20,10" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />
          <path id="hero-line-2" d="M50,50 Q66,26 79,10" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />
          <path id="hero-line-3" d="M50,50 Q34,46 22,42" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />
          <path id="hero-line-4" d="M50,50 Q30,66 22,80" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />
          <path id="hero-line-5" d="M50,50 Q66,38 78,32" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />
          <path id="hero-line-6" d="M50,50 Q49,35 48,20" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />
          <path d="M85,45 Q72,58 60,70" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1.2 1.8" opacity="0.5" />
          <path d="M14,58 Q24,68 35,76" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1.2 1.8" opacity="0.5" />
          <path id="hero-line-7" d="M50,50 Q50,72 50,92" fill="none" stroke="currentColor" strokeWidth="0.45" strokeDasharray="1.6 1.6" />

          <circle r="0.9" fill="currentColor" className="text-brand-blue">
            <animateMotion dur="2.6s" begin="0s" repeatCount="indefinite">
              <mpath href="#hero-line-1" />
            </animateMotion>
          </circle>
          <circle r="0.9" fill="currentColor" className="text-brand-violet">
            <animateMotion dur="2.8s" begin="0.3s" repeatCount="indefinite">
              <mpath href="#hero-line-2" />
            </animateMotion>
          </circle>
          <circle r="0.9" fill="currentColor" className="text-brand-blue">
            <animateMotion dur="3.1s" begin="0.6s" repeatCount="indefinite">
              <mpath href="#hero-line-3" />
            </animateMotion>
          </circle>
          <circle r="0.9" fill="currentColor" className="text-accent-amber">
            <animateMotion dur="2.9s" begin="0.9s" repeatCount="indefinite">
              <mpath href="#hero-line-4" />
            </animateMotion>
          </circle>
          <circle r="0.9" fill="currentColor" className="text-accent-teal">
            <animateMotion dur="3.3s" begin="1.2s" repeatCount="indefinite">
              <mpath href="#hero-line-5" />
            </animateMotion>
          </circle>
          <circle r="0.7" fill="currentColor" className="text-brand-blue">
            <animateMotion dur="2.2s" begin="0.4s" repeatCount="indefinite">
              <mpath href="#hero-line-6" />
            </animateMotion>
          </circle>
          <circle r="0.7" fill="currentColor" className="text-brand-blue">
            <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite">
              <mpath href="#hero-line-7" />
            </animateMotion>
          </circle>
        </svg>

        {/* Carte centrale — le parcours RH, la vedette de la composition (mais discrète) */}
        <div className="absolute left-1/2 top-1/2 z-30 w-60 -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] sm:w-64">
          <Card className="shadow-[0_35px_70px_-20px_rgba(46,111,242,0.35)] ring-1 ring-brand-blue/10">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-teal" />
              <div>
                <p className="text-sm font-semibold text-ink">Embauche — Julie Martin</p>
                <p className="text-xs text-ink-faint">Déclenché aujourd&apos;hui</p>
              </div>
            </div>

            <div className="mt-3">
              <ProgressBar value={doneCount} max={CENTRAL_TASKS.length} />
            </div>

            <ul className="mt-4 flex flex-col gap-2.5">
              {CENTRAL_TASKS.map((task) => (
                <li key={task.label} className="flex items-center gap-2.5">
                  {task.status === "done" ? (
                    <CircleCheck size={16} className="shrink-0 text-accent-teal" />
                  ) : (
                    <CircleDashed size={16} className="shrink-0 text-ink-faint" />
                  )}
                  <p className="text-sm text-ink">{task.label}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Satellite — Rappel envoyé (tout à l'arrière) */}
        <div
          className="absolute z-10 w-44 opacity-55"
          style={{ top: "10%", left: "20%", transform: "translate(-50%, -50%) rotate(-6deg) scale(0.6)" }}
        >
          <div className="hero-float-a">
            <Card compact className="shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-rose/10 text-accent-rose">
                  <Bell size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">Rappel envoyé</p>
                  <p className="truncate text-[11px] text-ink-faint">Il y a 2 jours</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Satellite — Visite médicale (très loin) */}
        <div
          className="absolute z-10 w-48 opacity-40"
          style={{ top: "10%", left: "79%", transform: "translate(-50%, -50%) rotate(5deg) scale(0.5)" }}
        >
          <div className="hero-float-b">
            <Card compact className="shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-violet/10 text-brand-violet">
                  <Stethoscope size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">Visite médicale</p>
                  <p className="truncate text-[11px] text-ink-faint">Dans 23 jours</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Satellite — Contrat de travail (arrière-plan) */}
        <div
          className="absolute z-10 w-40 opacity-65"
          style={{ top: "42%", left: "22%", transform: "translate(-50%, -50%) rotate(-4deg) scale(0.65)" }}
        >
          <div className="hero-float-c">
            <Card compact className="shadow-sm">
              <div className="flex items-center gap-2">
                <FileText size={16} className="shrink-0 text-brand-blue" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">Contrat de travail</p>
                  <p className="truncate text-[11px] text-ink-faint">À compléter</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Satellite — DPAE (arrière-plan) */}
        <div
          className="absolute z-10 w-40 opacity-80"
          style={{ top: "80%", left: "22%", transform: "translate(-50%, -50%) rotate(6deg) scale(0.68)" }}
        >
          <div className="hero-float-b">
            <Card compact className="shadow-sm">
              <div className="flex items-center gap-2">
                <Landmark size={16} className="shrink-0 text-accent-amber" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">DPAE</p>
                  <p className="truncate text-[11px] font-medium text-accent-amber">À effectuer</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Satellite — Période d'essai (arrière-plan) */}
        <div
          className="absolute z-10 w-40 opacity-80"
          style={{ top: "32%", left: "78%", transform: "translate(-50%, -50%) rotate(-5deg) scale(0.7)" }}
        >
          <div className="hero-float-a">
            <Card compact className="shadow-sm">
              <div className="flex items-center gap-2">
                <Hourglass size={16} className="shrink-0 text-accent-teal" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">Période d&apos;essai</p>
                  <p className="truncate text-[11px] text-ink-faint">Dans 12 jours</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Notification flottante */}
        <div
          className="absolute z-20"
          style={{ top: "20%", left: "48%", transform: "translate(-50%, -50%)" }}
        >
          <div className="hero-float-c relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
            <Bell size={18} className="text-brand-blue" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose text-[10px] font-semibold text-white">
              2
            </span>
          </div>
        </div>

        {/* Tableau de bord (bas de composition) — passe devant */}
        <div
          className="absolute z-20 w-56"
          style={{ top: "92%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <Card compact className="shadow-lg">
            <p className="text-[10px] font-medium text-ink-soft">Tableau de bord</p>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center">
              <div>
                <p className="text-sm font-semibold text-accent-rose">0</p>
                <p className="text-[9px] text-ink-faint">en retard</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-amber">3</p>
                <p className="text-[9px] text-ink-faint">semaine</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-blue">12</p>
                <p className="text-[9px] text-ink-faint">suggest.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-teal">24</p>
                <p className="text-[9px] text-ink-faint">terminées</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="hidden max-w-[9rem] shrink-0 xl:block">
        <p className="text-sm italic leading-relaxed text-ink-faint">
          Chaque événement RH devient un parcours.
        </p>
      </div>
    </div>
  );
}
