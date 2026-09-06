"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createAbsence } from "./actions";
import { Button } from "@/components/ui/Button";

type Employee = { id: string; firstName: string; lastName: string };

const TYPE_LABELS: Record<string, string> = {
  PAID_LEAVE: "Congés payés",
  RTT: "RTT",
  SICK_LEAVE: "Maladie",
  WORK_ACCIDENT: "Accident du travail",
  UNPAID_LEAVE: "Absence sans solde",
  FAMILY_EVENT: "Événement familial",
  OTHER: "Autre",
};

function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer l'absence"}</Button>;
}

export default function AbsenceCreateForm({ employees }: { employees: Employee[] }) {
  const [state, formAction] = useFormState(createAbsence, undefined);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <label className="text-xs font-medium text-ink-soft">Salarié</label>
        <select name="employeeId" required className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
          <option value="">Sélectionner…</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-ink-soft">Type</label>
        <select name="type" required className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink">
          <option value="">Sélectionner…</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-ink-soft">Du</label>
          <input name="startDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-soft">Au</label>
          <input name="endDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" />
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-lg border border-surface-border bg-surface-subtle/40 p-3">
        <input name="justificationRequired" type="checkbox" className="mt-0.5" />
        <span>
          <span className="block text-sm font-medium text-ink">Justificatif demandé</span>
          <span className="mt-0.5 block text-xs text-ink-faint">À cocher lorsque l'entreprise doit recevoir et vérifier un document.</span>
        </span>
      </label>
      <div>
        <label className="text-xs font-medium text-ink-soft">Note interne (optionnel)</label>
        <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" placeholder="Informations utiles pour le suivi RH…" />
      </div>
      {state?.error ? <p className="rounded-md bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="rounded-md bg-accent-teal/10 px-3 py-2 text-sm text-accent-teal" role="status">{state.success}</p> : null}
      <SubmitButton />
    </form>
  );
}
