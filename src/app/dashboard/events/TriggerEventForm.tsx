"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Rocket } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import type { TriggerEventFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" data-tour="trigger-event" disabled={pending}>
      {pending ? "Génération..." : "Générer le plan d'action"}
    </Button>
  );
}

export function TriggerEventForm({
  action,
  eventTemplates,
  employee,
}: {
  action: (state: TriggerEventFormState, formData: FormData) => Promise<TriggerEventFormState>;
  eventTemplates: { key: string; label: string }[];
  employee: {
    hireDate: string;
    probationDuration: number | null;
    probationDurationUnit: "DAYS" | "WEEKS" | "MONTHS" | null;
  };
}) {
  const [state, formAction] = useFormState<TriggerEventFormState, FormData>(action, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const [triggerDate, setTriggerDate] = useState(today);

  // Pré-remplit une date suggérée selon le type d'événement choisi et
  // les informations déjà connues du salarié — une suggestion
  // modifiable, jamais une valeur imposée ni un calcul juridique
  // garanti (cf. décision prise au moment des seeds).
  function handleTemplateChange(key: string) {
    if (key === "embauche") {
      setTriggerDate(employee.hireDate.slice(0, 10));
      return;
    }
    if (key === "fin_periode_essai" && employee.probationDuration && employee.probationDurationUnit) {
      const suggested = new Date(employee.hireDate);
      const unit = employee.probationDurationUnit;
      if (unit === "DAYS") suggested.setDate(suggested.getDate() + employee.probationDuration);
      else if (unit === "WEEKS") suggested.setDate(suggested.getDate() + employee.probationDuration * 7);
      else suggested.setMonth(suggested.getMonth() + employee.probationDuration);
      setTriggerDate(suggested.toISOString().slice(0, 10));
      return;
    }
    setTriggerDate(today);
  }

  return (
    <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/[0.03] to-brand-violet/[0.03]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white">
          <Rocket size={16} />
        </span>
        <h2 className="text-base font-semibold text-ink">Déclencher un événement RH</h2>
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">
        Génère automatiquement le plan d&apos;action complet : tâches, échéances et
        responsables affectés en un clic.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-4" noValidate>
        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose"
          >
            {state.error}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="eventTemplateKey">Type d&apos;événement</Label>
            <Select
              id="eventTemplateKey"
              name="eventTemplateKey"
              required
              defaultValue=""
              onChange={(event) => handleTemplateChange(event.target.value)}
            >
              <option value="" disabled>
                Choisir...
              </option>
              {eventTemplates.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="triggerDate">Date de l&apos;événement</Label>
            <Input
              id="triggerDate"
              name="triggerDate"
              type="date"
              required
              value={triggerDate}
              onChange={(event) => setTriggerDate(event.target.value)}
            />
          </div>
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}
