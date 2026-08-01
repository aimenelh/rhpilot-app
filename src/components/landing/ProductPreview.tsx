import { CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

const SAMPLE_TASKS = [
  { label: "Créer le contrat de travail", status: "done" as const, meta: "Fait le 12 juil." },
  { label: "Déclarer la DPAE", status: "done" as const, meta: "Fait le 14 juil." },
  { label: "Préparer le poste de travail", status: "overdue" as const, meta: "En retard depuis 2 jours" },
  { label: "Accueillir le salarié", status: "todo" as const, meta: "Échéance demain" },
  { label: "Programmer la visite médicale", status: "todo" as const, meta: "À assigner" },
];

export function ProductPreview() {
  const doneCount = SAMPLE_TASKS.filter((t) => t.status === "done").length;

  return (
    <Card className="w-full max-w-md shadow-lg">
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-teal" />
        <div>
          <p className="text-sm font-semibold text-ink">Embauche — Aimen El Housseini</p>
          <p className="text-xs text-ink-faint">Déclenché le 10 juillet</p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={doneCount} max={SAMPLE_TASKS.length} />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {SAMPLE_TASKS.map((task) => (
          <li key={task.label} className="flex items-center gap-2.5">
            {task.status === "done" && <CircleCheck size={15} className="shrink-0 text-accent-teal" />}
            {task.status === "overdue" && (
              <TriangleAlert size={15} className="shrink-0 text-accent-rose" />
            )}
            {task.status === "todo" && <CircleDashed size={15} className="shrink-0 text-ink-faint" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{task.label}</p>
              <p
                className={`text-xs ${task.status === "overdue" ? "font-medium text-accent-rose" : "text-ink-faint"}`}
              >
                {task.meta}
              </p>
            </div>
            {task.meta === "À assigner" && <Badge tone="neutral">À assigner</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
