"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getUserDisplayName } from "@/lib/displayName";
import { updateCustomTask, deleteCustomTask } from "../actions";

type MemberOption = { id: string; user: { firstName: string | null; lastName: string | null; email: string } };

export function CustomTaskActions({
  task,
  members,
}: {
  task: { id: string; label: string; dueDate: string; assignedMembershipId: string | null };
  members: MemberOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await updateCustomTask(task.id, formData);
          setIsEditing(false);
        }}
        className="mt-2 flex flex-col gap-2 rounded-lg border border-surface-border bg-surface-subtle p-3"
      >
        <div>
          <Label htmlFor={`edit-label-${task.id}`}>Libellé</Label>
          <Input id={`edit-label-${task.id}`} name="label" defaultValue={task.label} required />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor={`edit-due-${task.id}`}>Échéance</Label>
            <Input
              id={`edit-due-${task.id}`}
              name="dueDate"
              type="date"
              defaultValue={task.dueDate}
              required
            />
          </div>
          <div className="flex-1">
            <Label htmlFor={`edit-assignee-${task.id}`}>Responsable</Label>
            <Select
              id={`edit-assignee-${task.id}`}
              name="assignedMembershipId"
              defaultValue={task.assignedMembershipId ?? ""}
              required
            >
              <option value="" disabled>
                Choisir...
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {getUserDisplayName(m.user)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" className="text-xs">
            Enregistrer
          </Button>
          <Button type="button" variant="secondary" className="text-xs" onClick={() => setIsEditing(false)}>
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-3">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-brand-blue"
      >
        <Pencil size={11} />
        Modifier
      </button>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-accent-rose"
          >
            <Trash2 size={11} />
            Supprimer
          </button>
        }
        title="Supprimer cette étape ?"
        description="Cette étape sera définitivement retirée de ce parcours. Si vous préférez simplement indiquer qu'elle n'a pas été faite sans la faire disparaître, utilisez plutôt le statut « Annulée » à côté."
        confirmLabel="Supprimer l'étape"
        onConfirm={() => deleteCustomTask(task.id)}
      />
    </div>
  );
}
