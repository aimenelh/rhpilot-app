"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import type { AlternanceProfileFormState } from "./alternanceActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer le profil"}</Button>;
}

function dateOnly(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

type Props = {
  employeeId: string;
  contractType: string | null;
  birthDate: string | null;
  contractYear: number | null;
  hasBaccalaureateOrHigher: boolean | null;
  validFrom: string | null;
  validUntil: string | null;
  sourceReference: string | null;
  action: (
    state: AlternanceProfileFormState,
    formData: FormData
  ) => Promise<AlternanceProfileFormState>;
};

export function AlternanceProfileSection({
  employeeId: _employeeId,
  contractType,
  birthDate,
  contractYear,
  hasBaccalaureateOrHigher,
  validFrom,
  validUntil,
  sourceReference,
  action,
}: Props) {
  const [state, formAction] = useFormState<AlternanceProfileFormState, FormData>(action, undefined);
  const [saved, setSaved] = useState(false);
  const isApprenticeship = contractType === "APPRENTISSAGE";

  useEffect(() => {
    if (!state?.error) setSaved(true);
  }, [state]);

  if (!["APPRENTISSAGE", "PROFESSIONNALISATION"].includes(contractType ?? "")) return null;

  return (
    <Card className="mt-5" id="alternance">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-ink">Profil alternance</h2>
        <p className="text-sm text-ink-soft">
          Ces informations permettent de contrôler le minimum de rémunération applicable avant le calcul de la paie.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose">
          {state.error}
        </p>
      )}
      {saved && !state?.error && (
        <p className="mt-4 rounded-lg border border-accent-teal/25 bg-accent-teal/5 px-3.5 py-2.5 text-sm text-ink">
          Profil alternance enregistré. Il sera pris en compte par le contrôle du minimum lors du prochain calcul.
        </p>
      )}

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="alternance-birthDate">Date de naissance</Label>
            <Input id="alternance-birthDate" name="birthDate" type="date" defaultValue={dateOnly(birthDate)} required />
            <FieldHint>Utilisée pour déterminer la tranche d'âge au début de la période de paie.</FieldHint>
          </div>
          {isApprenticeship ? (
            <div>
              <Label htmlFor="alternance-contractYear">Année du contrat</Label>
              <Select id="alternance-contractYear" name="contractYear" defaultValue={contractYear ? String(contractYear) : ""} required>
                <option value="">Sélectionner</option>
                <option value="1">1re année</option>
                <option value="2">2e année</option>
                <option value="3">3e année</option>
              </Select>
              <FieldHint>Le taux légal d'apprentissage dépend de l'année d'exécution du contrat.</FieldHint>
            </div>
          ) : (
            <div>
              <Label htmlFor="alternance-baccalaureate">Niveau de qualification</Label>
              <Select
                id="alternance-baccalaureate"
                name="hasBaccalaureateOrHigher"
                defaultValue={hasBaccalaureateOrHigher === null ? "" : String(hasBaccalaureateOrHigher)}
                required
              >
                <option value="">Sélectionner</option>
                <option value="true">Baccalauréat ou diplôme supérieur</option>
                <option value="false">Inférieur au baccalauréat</option>
              </Select>
              <FieldHint>Ce niveau intervient dans le minimum du contrat de professionnalisation lorsque le salarié a moins de 26 ans.</FieldHint>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="alternance-validFrom">Prise d'effet</Label>
            <Input id="alternance-validFrom" name="validFrom" type="date" defaultValue={dateOnly(validFrom)} required />
          </div>
          <div>
            <Label htmlFor="alternance-validUntil">Fin de validité</Label>
            <Input id="alternance-validUntil" name="validUntil" type="date" defaultValue={dateOnly(validUntil)} />
            <FieldHint>Laisser vide pour une version ouverte jusqu'à son remplacement.</FieldHint>
          </div>
        </div>

        <div>
          <Label htmlFor="alternance-sourceReference">Référence justificative (facultatif)</Label>
          <Input id="alternance-sourceReference" name="sourceReference" defaultValue={sourceReference ?? ""} placeholder="Ex. contrat d'apprentissage signé le 01/09/2026" />
          <FieldHint>La saisie est conservée dans l'historique du profil pour faciliter la traçabilité.</FieldHint>
        </div>

        <div className="flex justify-end pt-1">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}
