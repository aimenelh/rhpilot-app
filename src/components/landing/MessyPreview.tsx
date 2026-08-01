import { Mail, FileSpreadsheet, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/Card";

const SCATTERED_ITEMS = [
  { icon: Mail, label: "\u201cPenses à faire le contrat de Julie...\u201d", meta: "Email, il y a 12 jours" },
  { icon: FileSpreadsheet, label: "Onglet « RH divers »", meta: "Excel, dernière modif. il y a 3 semaines" },
  { icon: StickyNote, label: "Visite médicale ?", meta: "Post-it, date illisible" },
];

export function MessyPreview() {
  return (
    <Card className="w-full max-w-md border-dashed opacity-80">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        Avant RH Pilot
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {SCATTERED_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 opacity-70">
            <item.icon size={15} className="shrink-0 text-ink-faint" />
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-soft">{item.label}</p>
              <p className="text-xs text-ink-faint">{item.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
