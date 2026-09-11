"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { getWithholdingTaxProfile, saveWithholdingTaxRate, type WithholdingTaxData, type WithholdingTaxFormState } from "./withholdingTaxActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button>;
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

  return (
    <div className="mt-6 border-t border-line pt-6" id="prelevement-source">
      <h3 className="text-sm font-semibold text-ink">Prélèvement à la source</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Le taux vient de la DGFiP (retour de la DSN), pas d&apos;un calcul RH Pilot. Renseignez ici le
        taux reçu, ou le taux non personnalisé si aucun taux propre au salarié n&apos;a été transmis.
      </p>

      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose">
          {state.error}
        </p>
      )}

      {!canEdit ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-ink-faint">Taux</p><p className="mt-1 text-sm font-semibold text-ink">{profile ? `${(profile.rate * 100).toFixed(2).replace(".", ",")} %` : "Non renseigné"}</p></div>
          <div><p className="text-xs text-ink-faint">Prise d&apos;effet</p><p className="mt-1 text-sm font-semibold text-ink">{profile?.validFrom ?? "—"}</p></div>
          <div><p className="text-xs text-ink-faint">Origine</p><p className="mt-1 text-sm font-semibold text-ink">{profile ? (profile.source === "DGFIP" ? "Taux DGFiP" : "Taux non personnalisé") : "—"}</p></div>
        </div>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="pas-rate">Taux (%)</Label>
              <Input id="pas-rate" name="ratePercent" type="number" step="0.01" min="0" max="100" defaultValue={profile ? (profile.rate * 100).toFixed(2) : ""} required />
            </div>
            <div>
              <Label htmlFor="pas-validFrom">Prise d&apos;effet</Label>
              <Input id="pas-validFrom" name="validFrom" type="date" defaultValue={profile?.validFrom ?? todayIso()} required />
            </div>
            <div>
              <Label htmlFor="pas-source">Origine du taux</Label>
              <Select id="pas-source" name="source" defaultValue={profile?.source ?? "DGFIP"} required>
                <option value="DGFIP">Taux transmis par la DGFiP</option>
                <option value="NON_PERSONNALISE">Taux non personnalisé (grille par défaut)</option>
              </Select>
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
      )}
    </div>
  );
}
