import { UserPlus, ListChecks, BellRing } from "lucide-react";

export function StoryStep1() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 py-3 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-teal/10 text-accent-teal">
        <UserPlus size={16} />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">Julie Martin</p>
        <p className="text-xs text-ink-faint">CDI · Embauchée aujourd&apos;hui</p>
      </div>
    </div>
  );
}

export function StoryStep2() {
  return (
    <div className="w-56 rounded-xl border border-surface-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <ListChecks size={15} className="text-brand-primary" />
        <p className="text-xs font-semibold text-ink">Parcours Embauche</p>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
        <div className="h-full rounded-full bg-brand-primary" style={{ width: "37%" }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">3 tâches sur 8 déjà prêtes</p>
    </div>
  );
}

export function StoryStep3() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 py-3 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber">
        <BellRing size={16} />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">Rappel envoyé</p>
        <p className="text-xs text-ink-faint">Visite médicale de Julie dans 3 jours</p>
      </div>
    </div>
  );
}
