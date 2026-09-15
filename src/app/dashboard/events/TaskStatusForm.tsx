"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { TaskStatus } from "@prisma/client";

const STATUS_LABELS: Record<TaskStatus, string> = {
  TO_PREPARE: "À préparer",
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  WAITING_EXTERNAL: "En attente (externe)",
  DONE: "Fait",
  CANCELLED: "Annulée",
};

function SubmitButton({ justSaved }: { justSaved: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={pending}
      className={justSaved ? "border-accent-teal/40 bg-accent-teal/10 text-accent-teal" : ""}
    >
      {pending ? (
        "..."
      ) : justSaved ? (
        <span className="flex items-center gap-1.5">
          <Check size={14} /> Mis à jour
        </span>
      ) : (
        "Mettre à jour"
      )}
    </Button>
  );
}

export function TaskStatusForm({
  action,
  currentStatus,
}: {
  action: (formData: FormData) => Promise<void>;
  currentStatus: TaskStatus;
}) {
  const [justSaved, setJustSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleAction(formData: FormData) {
    await action(formData);
    setJustSaved(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setJustSaved(false), 1800);
  }

  return (
    <div className="min-w-0">
      <form action={handleAction} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <Select
          name="status"
          aria-label="Statut de l’action"
          defaultValue={currentStatus}
          className="w-44 max-w-full"
          onChange={() => setJustSaved(false)}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <SubmitButton justSaved={justSaved} />
      </form>
      <p className="mt-1.5 max-w-xs text-[11px] leading-4 text-ink-faint">
        « Fait » confirme l’action réalisée. La présence d’un justificatif reste un contrôle distinct.
      </p>
    </div>
  );
}
