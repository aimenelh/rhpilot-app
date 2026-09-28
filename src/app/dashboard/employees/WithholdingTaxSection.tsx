"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { getWithholdingTaxProfile, saveWithholdingTaxRate, type WithholdingTaxData, type WithholdingTaxFormState } from "./withholdingTaxActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button>;
}

function frDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function WithholdingTaxSection({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  const [profile, setProfile] = useState<WithholdingTaxData | undefined>(undefined);
  const [state, formAction] = useFormState<WithholdingTaxFormState, FormData>(
    saveWithholdingTaxRate.bind(null, employeeId),
    undefined
  );

  useEffect(() => {
    let active = true;
    getWithholdingTaxProfile(employeeId).then((data) => { if (active) setProfile(data); });
    return () => { active = false; };
  }, [employeeId, state]);

  if (profile === undefined) return null;
  // Un « taux non personnalisé » saisi autrefois est remplacé par la grille automatique au calcul.
  const personalized = Boolean(profile && profile.source !== "NON_PERSONNALISE");

  return (
    <div className="mt-6 border-t border-line pt-6" id="prelevement-source">
      <h3 className="text-sm font-semibold text-ink">Prélèvement à la source</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Rien à saisir à l&apos;embauche : tant que la DGFiP n&apos;a pas transmis de taux pour ce salarié,
        RH Pilot applique d&apos;elle-même la grille de taux non personnalisé, selon le salaire du mois et le
        territoire. Le taux personnel arrive ensuite dans le compte rendu de la DSN ; reportez-le ici.
      </p>
      <p className="mt-3 text-sm text-ink">
        {personalized
          ? <>Taux appliqué : {(profile!.rate * 100).toFixed(2).replace(".", ",")} % transmis par la DGFiP, depuis le {frDate(profile!.validFrom)}.</>
          : <>Taux appliqué : grille par défaut, calculée automatiquement chaque mois.</>}
      </p>

      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose">
          {state.error}
        </p>
      )}

      {canEdit ? (
        <details className="mt-4" open={personalized || Boolean(state?.error)}>
          <summary className="cursor-pointer text-sm font-medium text-brand-primary">{personalized ? "Modifier le taux transmis par la DGFiP" : "Saisir le taux transmis par la DGFiP"}</summary>
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="source" value="DGFIP" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pas-rate">Taux personnalisé (%)</Label>
                <Input id="pas-rate" name="ratePercent" type="number" step="0.01" min="0" max="100" defaultValue={personalized ? (profile!.rate * 100).toFixed(2) : ""} required />
              </div>
              <div>
                <Label htmlFor="pas-validFrom">Prise d&apos;effet</Label>
                <Input id="pas-validFrom" name="validFrom" type="date" defaultValue={personalized ? profile!.validFrom : todayIso()} required />
              </div>
            </div>
            <div>
              <Label htmlFor="pas-sourceReference">Référence justificative <span className="font-normal text-ink-faint">(facultatif)</span></Label>
              <Input id="pas-sourceReference" name="sourceReference" defaultValue={profile?.sourceReference ?? ""} placeholder="Ex. CRM DSN du 05/09/2026" />
              <FieldHint>Le compte rendu métier (CRM) reçu après la DSN mensuelle indique le taux à appliquer.</FieldHint>
            </div>
            <div className="flex justify-end pt-1">
              <SubmitButton />
            </div>
          </form>
          {personalized ? (
            <form action={formAction} className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
              <input type="hidden" name="source" value="NON_PERSONNALISE" />
              <input type="hidden" name="ratePercent" value="0" />
              <input type="hidden" name="validFrom" value={todayIso()} />
              <p className="text-xs text-ink-faint">La DGFiP ne transmet plus de taux pour ce salarié, ou il a opté pour le taux non personnalisé ?</p>
              <Button type="submit" variant="secondary">Revenir à la grille par défaut</Button>
            </form>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
