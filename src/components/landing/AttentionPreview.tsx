import { TriangleAlert, Clock, UserRoundX } from "lucide-react";
import { Card } from "@/components/ui/Card";

const SAMPLE_ITEMS = [
  {
    icon: TriangleAlert,
    tone: "text-accent-rose",
    label: "Préparer le contrat de travail (Aimen El Housseini)",
    meta: "En retard depuis 2 jours",
  },
  {
    icon: UserRoundX,
    tone: "text-brand-blue",
    label: "Programmer la visite médicale (Camille Vidal)",
    meta: "À assigner",
  },
  {
    icon: Clock,
    tone: "text-accent-amber",
    label: "Formaliser la décision de période d'essai",
    meta: "Échéance dans 3 jours",
  },
];

export function AttentionPreview() {
  return (
    <Card className="w-full max-w-md shadow-lg">
      <div className="flex items-center gap-2">
        <TriangleAlert size={18} className="text-accent-amber" />
        <p className="text-sm font-semibold text-ink">Votre attention est requise</p>
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-surface-border">
        {SAMPLE_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-3 py-3">
            <item.icon size={16} className={`shrink-0 ${item.tone}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{item.label}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{item.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
