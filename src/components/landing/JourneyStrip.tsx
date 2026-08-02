import { ArrowRight, Hourglass, Stethoscope, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";

const STEPS = [
  { icon: UserPlus, title: "Embauche", meta: "CDI" },
  { icon: Hourglass, title: "Fin de période d'essai", meta: "À confirmer" },
  { icon: Stethoscope, title: "Visite médicale", meta: "Périodique" },
];

export function JourneyStrip() {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-2">
      {STEPS.map((step, index) => (
        <div key={step.title} className="flex items-center gap-2">
          <Card compact className="w-44 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                <step.icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{step.title}</p>
                <p className="truncate text-[11px] text-ink-faint">{step.meta}</p>
              </div>
            </div>
          </Card>
          {index < STEPS.length - 1 && (
            <ArrowRight size={16} className="hidden shrink-0 text-ink-faint sm:block" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}
