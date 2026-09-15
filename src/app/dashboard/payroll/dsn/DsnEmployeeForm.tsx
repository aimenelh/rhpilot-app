"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveDsnEmployeeProfile, type DsnFormState } from "./dsnActions";

export type DsnEmployeeFormInitial = {
  hasNir: boolean; birthDate: string; birthPlace: string; birthDepartment: string; birthCountryCode: string; euClassificationCode: string;
  addressLine: string; postalCode: string; city: string; countryCode: string; contractNumber: string; contractNatureCode: string;
  publicPolicyCode: string; pcsEsecCode: string; conventionalStatusCode: string; retirementStatusCode: string; workUnitCode: string;
  referenceWorkQuota: string; contractWorkQuota: string; workModalityCode: string; baseSchemeSupplementCode: string;
  sicknessRegimeCode: string; workLocationId: string; oldAgeRegimeCode: string; foreignWorkerCode: string; employmentStatusCode: string;
  multipleJobsCode: string; multipleEmployersCode: string; workAccidentRegimeCode: string; workAccidentRiskCode: string;
};

function SubmitButton() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Enregistrement sécurisé…" : "Enregistrer le profil DSN"}</button>; }

function Field({ name, label, defaultValue, placeholder, type = "text", required = true, help }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean; help?: string }) {
  return <label className="text-sm text-ink-soft">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} step={type === "number" ? "0.01" : undefined} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" />{help ? <span className="mt-1 block text-xs leading-5 text-ink-faint">{help}</span> : null}</label>;
}

function SelectField({ name, label, defaultValue, options, help }: { name: string; label: string; defaultValue: string; options: Array<[string, string]>; help?: string }) {
  return <label className="text-sm text-ink-soft">{label}<select name={name} required defaultValue={defaultValue} className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink"><option value="">Sélectionner</option>{options.map(([value, text]) => <option key={value} value={value}>{value} — {text}</option>)}</select>{help ? <span className="mt-1 block text-xs leading-5 text-ink-faint">{help}</span> : null}</label>;
}

export default function DsnEmployeeForm({ employeeId, initial }: { employeeId: string; initial: DsnEmployeeFormInitial }) {
  const boundAction = saveDsnEmployeeProfile.bind(null, employeeId);
  const [state, action] = useFormState<DsnFormState, FormData>(boundAction, undefined);
  return (
    <form action={action} className="space-y-7">
      <section className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Identité déclarative</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Le NIR est chiffré avant stockage et n'est jamais réaffiché en clair.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field name="nir" label={initial.hasNir ? "NIR — laisser vide pour conserver la valeur chiffrée" : "NIR (13 chiffres)"} required={!initial.hasNir} placeholder={initial.hasNir ? "Valeur déjà enregistrée" : "13 chiffres, sans la clé"} />
          <Field name="birthDate" label="Date de naissance" type="date" defaultValue={initial.birthDate} />
          <Field name="birthPlace" label="Lieu de naissance — S21.G00.30.007" defaultValue={initial.birthPlace} />
          <Field name="birthDepartment" label="Département de naissance — S21.G00.30.014" defaultValue={initial.birthDepartment} placeholder="34, 2A, 98 ou 99" />
          <Field name="birthCountryCode" label="Pays de naissance — S21.G00.30.015" defaultValue={initial.birthCountryCode} placeholder="FR" help="Code ISO 3166-1 alpha-2." />
          <SelectField name="euClassificationCode" label="Codification UE — S21.G00.30.013" defaultValue={initial.euClassificationCode} options={[["01","France"],["02","Union européenne"],["03","EEE"],["04","Reste du monde"]]} />
          <Field name="addressLine" label="Adresse — S21.G00.30.008" defaultValue={initial.addressLine} />
          <Field name="postalCode" label="Code postal — S21.G00.30.009" defaultValue={initial.postalCode} placeholder="34000" />
          <Field name="city" label="Ville — S21.G00.30.010" defaultValue={initial.city} />
          <Field name="countryCode" label="Code pays de résidence hors système postal français" defaultValue={initial.countryCode} required={false} help="Laissez vide. Les adresses étrangères restent bloquées tant que le code de distribution n'est pas modélisé." />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Contrat — codes NEODeS</h2><p className="mt-1 text-xs leading-5 text-ink-faint">RH Pilot ne devine pas les codes déclaratifs. Ils doivent correspondre à la nomenclature P26V01 et aux notifications de l'entreprise.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field name="contractNumber" label="Numéro du contrat — S21.G00.40.009" defaultValue={initial.contractNumber} help="Entre 5 et 20 caractères." />
          <Field name="contractNatureCode" label="Nature du contrat — S21.G00.40.007" defaultValue={initial.contractNatureCode} placeholder="01 CDI privé, 02 CDD privé" />
          <Field name="publicPolicyCode" label="Dispositif — S21.G00.40.008" defaultValue={initial.publicPolicyCode} placeholder="99 si non concerné" />
          <Field name="pcsEsecCode" label="PCS-ESE — S21.G00.40.004" defaultValue={initial.pcsEsecCode} />
          <Field name="conventionalStatusCode" label="Statut conventionnel — S21.G00.40.002" defaultValue={initial.conventionalStatusCode} />
          <Field name="retirementStatusCode" label="Statut retraite complémentaire — S21.G00.40.003" defaultValue={initial.retirementStatusCode} />
          <Field name="workUnitCode" label="Unité de quotité — S21.G00.40.011" defaultValue={initial.workUnitCode} placeholder="10 = heure" />
          <Field name="referenceWorkQuota" label="Quotité de référence — S21.G00.40.012" type="number" defaultValue={initial.referenceWorkQuota} />
          <Field name="contractWorkQuota" label="Quotité du contrat — S21.G00.40.013" type="number" defaultValue={initial.contractWorkQuota} />
          <Field name="workModalityCode" label="Modalité de travail — S21.G00.40.014" defaultValue={initial.workModalityCode} placeholder="10 temps plein, 20 temps partiel" />
          <SelectField name="baseSchemeSupplementCode" label="Complément régime obligatoire — S21.G00.40.016" defaultValue={initial.baseSchemeSupplementCode} options={[["01","Alsace-Moselle"],["02","CAMIEG"],["03","Alsace-Moselle + CAMIEG"],["99","Non applicable"]]} />
          <Field name="sicknessRegimeCode" label="Régime maladie — S21.G00.40.018" defaultValue={initial.sicknessRegimeCode} placeholder="200 = régime général" />
          <Field name="workLocationId" label="Lieu de travail — S21.G00.40.019" defaultValue={initial.workLocationId} help="Dans le périmètre actuel, utilisez le SIRET de l'établissement employeur." />
          <Field name="oldAgeRegimeCode" label="Régime vieillesse — S21.G00.40.020" defaultValue={initial.oldAgeRegimeCode} />
          <SelectField name="foreignWorkerCode" label="Travailleur à l'étranger — S21.G00.40.024" defaultValue={initial.foreignWorkerCode} options={[["01","Détaché"],["02","Expatrié"],["03","Frontalier"],["99","Non concerné"]]} />
          <SelectField name="employmentStatusCode" label="Statut d'emploi — S21.G00.40.026" defaultValue={initial.employmentStatusCode} options={[["03","Statutaire"],["04","Non statutaire"],["99","Non concerné"]]} />
          <SelectField name="multipleJobsCode" label="Emplois multiples — S21.G00.40.036" defaultValue={initial.multipleJobsCode} options={[["01","Emploi unique"],["02","Emplois multiples"],["03","Situation non connue"]]} />
          <SelectField name="multipleEmployersCode" label="Employeurs multiples — S21.G00.40.037" defaultValue={initial.multipleEmployersCode} options={[["01","Employeur unique"],["02","Employeurs multiples"],["03","Situation non connue"]]} />
          <Field name="workAccidentRegimeCode" label="Régime AT/MP — S21.G00.40.039" defaultValue={initial.workAccidentRegimeCode} placeholder="200 = régime général" />
          <Field name="workAccidentRiskCode" label="Code risque AT/MP — S21.G00.40.040" defaultValue={initial.workAccidentRiskCode} placeholder="Ex. 602MD" help="Reprenez exactement le code notifié par la CARSAT/MSA. 999ZZ uniquement avant première notification." />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3"><SubmitButton /><p className="text-xs text-ink-faint">Aucune donnée de calcul de paie n'est modifiée par ce formulaire.</p></div>
      {state?.error ? <p className="rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="rounded-lg bg-surface-subtle px-3 py-2 text-sm text-ink-soft" role="status">{state.success}</p> : null}
    </form>
  );
}
