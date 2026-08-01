"use client";

import { useFormStatus } from "react-dom";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "..." : "Mettre à jour"}
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
  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <Select name="status" defaultValue={currentStatus} className="w-44">
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <SubmitButton />
    </form>
  );
}
