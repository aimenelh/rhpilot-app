"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { getUserDisplayName } from "@/lib/displayName";
import { addCustomTask } from "../actions";

type MemberOption = { id: string; user: { firstName: string | null; lastName: string | null; email: string } };

export function AddCustomTaskForm({
  employeeEventId,
  members,
}: {
  employeeEventId: string;
  members: MemberOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
      >
        <Plus size={15} />
        Ajouter une étape à ce parcours
      </button>
    );
  }

  return (
    <Card compact>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        Nouvelle étape
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Utile pour un besoin propre à votre organisation, non couvert par le parcours standard.
      </p>
      <form action={addCustomTask.bind(null, employeeEventId)} className="mt-3 flex flex-col gap-3">
        <div>
          <Label htmlFor="custom-task-label">Libellé</Label>
          <Input id="custom-task-label" name="label" required placeholder="Ex. Remettre le badge d'accès" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="custom-task-due">Échéance</Label>
            <Input id="custom-task-due" name="dueDate" type="date" required />
          </div>
          <div className="flex-1">
            <Label htmlFor="custom-task-assignee">Responsable</Label>
            <Select id="custom-task-assignee" name="assignedMembershipId" defaultValue="" required>
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
          <Button type="submit">Ajouter cette étape</Button>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}
