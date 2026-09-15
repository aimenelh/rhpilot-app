"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveDsnEmployeeProfile, type DsnFormState } from "./dsnActions";

export type DsnEmployeeFormInitial = {
  hasNir: boolean;
  birthDate: string;
  birthPlace: string;
  birthDepartment: string;
  addressLine: string;
  postalCode: string;
  city: string;
  countryCode: string;
  contractNumber: string;
  contractNatureCode: string;
  publicPolicyCode: string;
  pcsEsecCode: string;
  conventionalStatusCode: string;
  retirementStatusCode: string;
  workUnitCode: string;
  referenceWorkQuota: string;
  contractWorkQuota: string;
  workModalityCode: string;
  sicknessRegimeCode: string;
  oldAgeRegimeCode: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enregistrement sécurisé…" : "Enregistrer le profil DSN"}
    </button>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required = true,
  help,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <label className="text-sm text-ink-soft">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink"
      />
      {help ? <span className="mt-1 block text-xs leading-5 text-ink-faint">{help}</span> : null}
    </label>
  );
}

export default function DsnEmployeeForm({
  employeeId,
  initial,
}: {
  employeeId: string;
  initial: DsnEmployeeFormInitial;
}) {
  const boundAction = saveDsnEmployeeProfile.bind(null, employeeId);
  const [state, action] = useFormState<DsnFormState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="space-y-7">
      <section className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Identité déclarative</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          Le NIR est chiffré avant stockage. Il n'est jamais réaffiché en clair dans ce formulaire.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            name="nir"
            label={initial.hasNir ? "NIR — laisser vide pour conserver la valeur chiffrée" : "NIR (13 chiffres)"}
            required={!initial.hasNir}
            placeholder={initial.hasNir ? "Valeur déjà enregistrée" : "13 chiffres, sans la clé de contrôle"}
            help="La DSN utilise les 13 chiffres du numéro d'inscription au répertoire."
          />
          <Field name="birthDate" label="Date de naissance" type="date" defaultValue={initial.birthDate} />
          <Field name="birthPlace" label="Lieu de naissance" defaultValue={initial.birthPlace} />
          <Field name="birthDepartment" label="Département de naissance" defaultValue={initial.birthDepartment} placeholder="Ex. 34" />
          <Field name="addressLine" label="Adresse" defaultValue={initial.addressLine} />
          <Field name="postalCode" label="Code postal" defaultValue={initial.postalCode} />
          <Field name="city" label="Ville" defaultValue={initial.city} />
          <Field name="countryCode" label="Code pays si nécessaire" defaultValue={initial.countryCode} required={false} placeholder="Laisser vide pour une adresse française" />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Contrat — codes NEODeS</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          RH Pilot ne devine pas les codes déclaratifs. Les valeurs ci-dessous doivent correspondre à la nomenclature DSN P26V01 applicable au salarié.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field name="contractNumber" label="Numéro du contrat" defaultValue={initial.contractNumber} help="Entre 5 et 20 caractères." />
          <Field name="contractNatureCode" label="Nature du contrat — S21.G00.40.007" defaultValue={initial.contractNatureCode} placeholder="Ex. 01 pour un CDI privé" />
          <Field name="publicPolicyCode" label="Dispositif — S21.G00.40.008" defaultValue={initial.publicPolicyCode} placeholder="Ex. 99 si non concerné" />
          <Field name="pcsEsecCode" label="PCS-ESE — S21.G00.40.004" defaultValue={initial.pcsEsecCode} />
          <Field name="conventionalStatusCode" label="Statut conventionnel — S21.G00.40.002" defaultValue={initial.conventionalStatusCode} />
          <Field name="retirementStatusCode" label="Statut retraite complémentaire — S21.G00.40.003" defaultValue={initial.retirementStatusCode} />
          <Field name="workUnitCode" label="Unité de quotité — S21.G00.40.011" defaultValue={initial.workUnitCode} placeholder="10 = heure" />
          <Field name="referenceWorkQuota" label="Quotité de référence — S21.G00.40.012" type="number" defaultValue={initial.referenceWorkQuota} placeholder="151.67" />
          <Field name="contractWorkQuota" label="Quotité du contrat — S21.G00.40.013" type="number" defaultValue={initial.contractWorkQuota} placeholder="151.67" />
          <Field name="workModalityCode" label="Modalité de travail — S21.G00.40.014" defaultValue={initial.workModalityCode} placeholder="10 = temps plein, 20 = temps partiel" />
          <Field name="sicknessRegimeCode" label="Régime maladie — S21.G00.40.018" defaultValue={initial.sicknessRegimeCode} />
          <Field name="oldAgeRegimeCode" label="Régime vieillesse — S21.G00.40.020" defaultValue={initial.oldAgeRegimeCode} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <p className="text-xs text-ink-faint">Aucune donnée de calcul de paie n'est modifiée par ce formulaire.</p>
      </div>
      {state?.error ? <p className="rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="rounded-lg bg-surface-subtle px-3 py-2 text-sm text-ink-soft" role="status">{state.success}</p> : null}
    </form>
  );
}
