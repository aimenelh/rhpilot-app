"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { getUserDisplayName } from "@/lib/displayName";
import { updateCustomTask, deleteCustomTask } from "../actions";

type MemberOption = { id: string; user: { firstName: string | null; lastName: string | null; email: string } };

export function CustomTaskActions({
  task,
  members,
}: {
  task: {
    id: string;
    label: string;
    dueDate: string;
    assignedMembershipId: string | null;
    taskTemplateId: string | null;
  };
  members: MemberOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isFromTemplate = task.taskTemplateId !== null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rememberDelete, setRememberDelete] = useState(false);

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

        {isFromTemplate && (
          <label className="mt-1 flex items-start gap-2 text-xs text-ink-soft">
            <input type="checkbox" name="rememberForFuture" className="mt-0.5" />
            Appliquer aussi ce changement aux futurs parcours de ce type, pour toute votre
            organisation
          </label>
        )}

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
        className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-brand-primary"
      >
        <Pencil size={11} />
        Modifier
      </button>

      <button
        type="button"
        onClick={() => {
          setRememberDelete(false);
          dialogRef.current?.showModal();
        }}
        className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-accent-rose"
      >
        <Trash2 size={11} />
        Supprimer
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-xl border border-surface-border p-0 shadow-card backdrop:bg-ink/40"
      >
        <div className="w-80 p-5">
          <h2 className="text-sm font-semibold text-ink">Supprimer cette étape ?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Cette étape sera définitivement retirée de ce parcours. Si vous préférez simplement
            indiquer qu&apos;elle n&apos;a pas été faite sans la faire disparaître, utilisez
            plutôt le statut « Annulée » à côté.
          </p>
          {isFromTemplate && (
            <label className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={rememberDelete}
                onChange={(event) => setRememberDelete(event.target.checked)}
              />
              Ne plus jamais générer cette étape pour les futurs parcours de ce type, pour toute
              votre organisation
            </label>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                dialogRef.current?.close();
                deleteCustomTask(task.id, rememberDelete);
              }}
            >
              Supprimer l&apos;étape
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
