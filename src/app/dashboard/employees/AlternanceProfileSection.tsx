"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { getAlternanceMinimumPreview, getAlternanceProfile, saveAlternanceProfile, type AlternanceMinimumPreview, type AlternanceProfileData, type AlternanceProfileFormState } from "./alternanceActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button>;
}

function dateOnly(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatEuros(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function AlternanceProfileSection({ employeeId, canEdit, embedded = false }: { employeeId: string; canEdit: boolean; embedded?: boolean }) {
  const [profile, setProfile] = useState<AlternanceProfileData | null | undefined>(undefined);
  const [preview, setPreview] = useState<AlternanceMinimumPreview | null>(null);
  const [state, formAction] = useFormState<AlternanceProfileFormState, FormData>(
    saveAlternanceProfile.bind(null, employeeId),
    undefined
  );

  useEffect(() => {
    let active = true;
    Promise.all([getAlternanceProfile(employeeId), getAlternanceMinimumPreview(employeeId)]).then(([data, minimum]) => {
      if (active) {
        setProfile(data);
        setPreview(minimum);
      }
    });
    return () => { active = false; };
  }, [employeeId, state]);

  if (profile === undefined || profile === null) return null;

  const isApprenticeship = profile.contractType === "APPRENTISSAGE";
  const wrapperClass = embedded ? "mt-6 border-t border-line pt-6" : "mt-5";

  return (
    <div className={wrapperClass} id="alternance">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Alternance : paramètres légaux</h3>
          {preview?.status === "APPLICABLE" && (
            <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary">
              {preview.percentageOfSmic}% du SMIC minimum
            </span>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          Ces informations déterminent le minimum légal applicable. Le salaire brut saisi dans le profil paie reste la rémunération contractuelle réellement appliquée.
        </p>
      </div>

      {preview?.status === "APPLICABLE" && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface-muted p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-ink-faint">Âge retenu</p>
            <p className="mt-1 text-sm font-semibold text-ink">{preview.age} ans</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Minimum légal</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatEuros(preview.monthlyMinimumCents)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">SMIC de référence</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatEuros(preview.smicMonthlyCents)}</p>
          </div>
        </div>
      )}
      {preview?.status === "UNRESOLVED" && (
        <p className="mt-4 rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3.5 py-2.5 text-sm text-ink">
          {preview.detail}
        </p>
      )}

      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3.5 py-2.5 text-sm text-accent-rose">
          {state.error}
        </p>
      )}

      {!canEdit ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><p className="text-xs text-ink-faint">Date de naissance</p><p className="mt-1 text-sm font-semibold text-ink">{profile.birthDate ? dateOnly(profile.birthDate) : "Non renseignée"}</p></div>
          <div><p className="text-xs text-ink-faint">Paramètre légal</p><p className="mt-1 text-sm font-semibold text-ink">{isApprenticeship ? (profile.contractYear ? `${profile.contractYear}e année` : "Non renseigné") : profile.hasBaccalaureateOrHigher === null ? "Non renseigné" : profile.hasBaccalaureateOrHigher ? "Baccalauréat ou supérieur" : "Inférieur au baccalauréat"}</p></div>
          <div><p className="text-xs text-ink-faint">Prise d'effet</p><p className="mt-1 text-sm font-semibold text-ink">{dateOnly(profile.validFrom)}</p></div>
          <div><p className="text-xs text-ink-faint">Référence</p><p className="mt-1 text-sm font-semibold text-ink">{profile.sourceReference || "Non renseignée"}</p></div>
        </div>
      ) : (
        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="alternance-birthDate">Date de naissance</Label>
              <Input id="alternance-birthDate" name="birthDate" type="date" defaultValue={dateOnly(profile.birthDate)} required />
              <FieldHint>Utilisée pour déterminer la tranche d'âge au début de la période de paie.</FieldHint>
            </div>
            {isApprenticeship ? (
              <div>
                <Label htmlFor="alternance-contractYear">Année d'exécution</Label>
                <Select id="alternance-contractYear" name="contractYear" defaultValue={profile.contractYear ? String(profile.contractYear) : ""} required>
                  <option value="">Sélectionner</option>
                  <option value="1">1re année</option>
                  <option value="2">2e année</option>
                  <option value="3">3e année</option>
                </Select>
                <FieldHint>Détermine le taux minimum d'apprentissage.</FieldHint>
              </div>
            ) : (
              <div>
                <Label htmlFor="alternance-baccalaureate">Niveau de qualification</Label>
                <Select id="alternance-baccalaureate" name="hasBaccalaureateOrHigher" defaultValue={profile.hasBaccalaureateOrHigher === null ? "" : String(profile.hasBaccalaureateOrHigher)} required>
                  <option value="">Sélectionner</option>
                  <option value="true">Baccalauréat ou diplôme supérieur</option>
                  <option value="false">Inférieur au baccalauréat</option>
                </Select>
                <FieldHint>Utilisé pour déterminer le minimum de professionnalisation avant 26 ans.</FieldHint>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="alternance-validFrom">Prise d'effet</Label>
              <Input id="alternance-validFrom" name="validFrom" type="date" defaultValue={dateOnly(profile.validFrom)} required />
            </div>
            <div>
              <Label htmlFor="alternance-validUntil">Fin de validité</Label>
              <Input id="alternance-validUntil" name="validUntil" type="date" defaultValue={dateOnly(profile.validUntil)} />
              <FieldHint>Laisser vide pour une version ouverte jusqu'à son remplacement.</FieldHint>
            </div>
          </div>

          <div>
            <Label htmlFor="alternance-sourceReference">Référence justificative <span className="font-normal text-ink-faint">(facultatif)</span></Label>
            <Input id="alternance-sourceReference" name="sourceReference" defaultValue={profile.sourceReference ?? ""} placeholder="Ex. contrat signé le 01/09/2026" />
          </div>

          <div className="flex justify-end pt-1">
            <SubmitButton />
          </div>
        </form>
      )}
    </div>
  );
}
