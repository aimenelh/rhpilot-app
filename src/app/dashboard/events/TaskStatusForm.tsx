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
  // Confirmation directement sur le bouton, plutôt qu'une notification
  // à part (toast) : si on modifie plusieurs étapes d'affilée, chaque
  // bouton affiche sa propre confirmation indépendamment, rien ne
  // s'empile ni ne devient envahissant ailleurs à l'écran.
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
    <form action={handleAction} className="flex shrink-0 items-center gap-2">
      <Select
        name="status"
        defaultValue={currentStatus}
        className="w-44"
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
  );
}
