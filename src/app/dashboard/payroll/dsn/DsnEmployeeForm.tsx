"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, type ChangeEvent } from "react";
import { DSN_FIXED_TERM_REASONS, DSN_PREPARED_DIPLOMA_LEVELS, DSN_PUBLIC_POLICIES } from "@/lib/payroll/dsn-fixed-term";
import { saveDsnEmployeeProfile, type DsnFormState } from "./dsnActions";

export type DsnEmployeeFormInitial = {
  hasNir: boolean; birthDate: string; birthPlace: string; birthDepartment: string; birthCountryCode: string; euClassificationCode: string;
  addressLine: string; postalCode: string; city: string; countryCode: string; contractNumber: string; contractNatureCode: string;
  publicPolicyCode: string; fixedTermReasonCode: string; pcsEsecCode: string; conventionalStatusCode: string; retirementStatusCode: string; workUnitCode: string;
  referenceWorkQuota: string; contractWorkQuota: string; workModalityCode: string; baseSchemeSupplementCode: string;
  sicknessRegimeCode: string; workLocationId: string; oldAgeRegimeCode: string; foreignWorkerCode: string; employmentStatusCode: string;
  multipleJobsCode: string; multipleEmployersCode: string; workAccidentRegimeCode: string; workAccidentRiskCode: string;
  preparedDiplomaLevel: string;
};

function SubmitButton() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer le profil DSN"}</button>; }

function Field({ name, label, defaultValue, placeholder, type = "text", required = true, help, onChange }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean; help?: string; onChange?: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="text-sm text-ink-soft">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} onChange={onChange} step={type === "number" ? "0.01" : undefined} className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm text-ink" />{help ? <span className="mt-1 block text-xs leading-5 text-ink-faint">{help}</span> : null}</label>;
}

function SelectField({ name, label, defaultValue, options, help, onChange }: { name: string; label: string; defaultValue: string; options: Array<[string, string]>; help?: string; onChange?: (event: ChangeEvent<HTMLSelectElement>) => void }) {
  return <label className="text-sm text-ink-soft">{label}<select name={name} required defaultValue={defaultValue} onChange={onChange} className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink"><option value="">Sélectionner</option>{options.map(([value, text]) => <option key={value} value={value}>{text} ({value})</option>)}</select>{help ? <span className="mt-1 block text-xs leading-5 text-ink-faint">{help}</span> : null}</label>;
}

export default function DsnEmployeeForm({ employeeId, initial }: { employeeId: string; initial: DsnEmployeeFormInitial }) {
  const boundAction = saveDsnEmployeeProfile.bind(null, employeeId);
  const [contractNature, setContractNature] = useState(initial.contractNatureCode);
  const [publicPolicy, setPublicPolicy] = useState(initial.publicPolicyCode);
  const apprenticeship = publicPolicy === "64" || publicPolicy === "65";
  const [state, action] = useFormState<DsnFormState, FormData>(boundAction, undefined);
  return (
    <form action={action} className="space-y-7">
      <section className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Identité déclarative</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Le NIR est chiffré avant stockage et n'est jamais réaffiché en clair.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field name="nir" label={initial.hasNir ? "NIR (laisser vide pour conserver la valeur chiffrée)" : "NIR (13 chiffres)"} required={!initial.hasNir} placeholder={initial.hasNir ? "Valeur déjà enregistrée" : "13 chiffres, sans la clé"} />
          <Field name="birthDate" label="Date de naissance" type="date" defaultValue={initial.birthDate} />
          <Field name="birthPlace" label="Lieu de naissance" defaultValue={initial.birthPlace} />
          <Field name="birthDepartment" label="Département de naissance" defaultValue={initial.birthDepartment} placeholder="34, 2A, 98 ou 99" />
          <Field name="birthCountryCode" label="Pays de naissance" defaultValue={initial.birthCountryCode} placeholder="FR" help="Code ISO 3166-1 alpha-2." />
          <SelectField name="euClassificationCode" label="Codification UE" defaultValue={initial.euClassificationCode} options={[["01","France"],["02","Union européenne"],["03","EEE"],["04","Reste du monde"]]} />
          <Field name="addressLine" label="Adresse" defaultValue={initial.addressLine} />
          <Field name="postalCode" label="Code postal" defaultValue={initial.postalCode} placeholder="34000" />
          <Field name="city" label="Ville" defaultValue={initial.city} />
          <Field name="countryCode" label="Code pays de résidence hors système postal français" defaultValue={initial.countryCode} required={false} help="À laisser vide. Les adresses à l’étranger ne sont pas encore prises en charge dans la DSN." />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="font-semibold text-ink">Contrat : codes NEODeS</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Les codes déclaratifs doivent correspondre à la nomenclature P26V01 et aux notifications reçues par l’entreprise.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field name="contractNumber" label="Numéro du contrat" defaultValue={initial.contractNumber} help="Entre 5 et 20 caractères." />
          <SelectField name="contractNatureCode" label="Nature du contrat" defaultValue={initial.contractNatureCode} options={[["01", "CDI de droit privé"], ["02", "CDD de droit privé"]]} help="Un contrat d'apprentissage à durée limitée est un CDD." onChange={(event) => setContractNature(event.target.value)} />
          <SelectField name="publicPolicyCode" label="Dispositif" defaultValue={initial.publicPolicyCode} options={DSN_PUBLIC_POLICIES} onChange={(event) => setPublicPolicy(event.target.value)} />
          {contractNature === "02" && !apprenticeship && <SelectField name="fixedTermReasonCode" label="Motif de recours au CDD" defaultValue={initial.fixedTermReasonCode} options={DSN_FIXED_TERM_REASONS} help="Reprenez le motif indiqué sur le contrat signé." />}
          {apprenticeship && <SelectField name="preparedDiplomaLevel" label="Diplôme préparé par l'apprenti" defaultValue={initial.preparedDiplomaLevel} options={DSN_PREPARED_DIPLOMA_LEVELS} help="Niveau du diplôme ou du titre visé par le contrat d'apprentissage." />}
          <Field name="pcsEsecCode" label="PCS-ESE" defaultValue={initial.pcsEsecCode} />
          <Field name="conventionalStatusCode" label="Statut conventionnel" defaultValue={initial.conventionalStatusCode} />
          <Field name="retirementStatusCode" label="Statut retraite complémentaire" defaultValue={initial.retirementStatusCode} />
          <Field name="workUnitCode" label="Unité de quotité" defaultValue={initial.workUnitCode} placeholder="10 = heure" />
          <Field name="referenceWorkQuota" label="Quotité de référence" type="number" defaultValue={initial.referenceWorkQuota} />
          <Field name="contractWorkQuota" label="Quotité du contrat" type="number" defaultValue={initial.contractWorkQuota} />
          <Field name="workModalityCode" label="Modalité de travail" defaultValue={initial.workModalityCode} placeholder="10 temps plein, 20 temps partiel" />
          <SelectField name="baseSchemeSupplementCode" label="Complément régime obligatoire" defaultValue={initial.baseSchemeSupplementCode} options={[["01","Alsace-Moselle"],["02","CAMIEG"],["03","Alsace-Moselle + CAMIEG"],["99","Non applicable"]]} />
          <Field name="sicknessRegimeCode" label="Régime maladie" defaultValue={initial.sicknessRegimeCode} placeholder="200 = régime général" />
          <Field name="workLocationId" label="Lieu de travail" defaultValue={initial.workLocationId} help="Dans le périmètre actuel, utilisez le SIRET de l'établissement employeur." />
          <Field name="oldAgeRegimeCode" label="Régime vieillesse" defaultValue={initial.oldAgeRegimeCode} />
          <SelectField name="foreignWorkerCode" label="Travailleur à l'étranger" defaultValue={initial.foreignWorkerCode} options={[["01","Détaché"],["02","Expatrié"],["03","Frontalier"],["99","Non concerné"]]} />
          <SelectField name="employmentStatusCode" label="Statut d'emploi" defaultValue={initial.employmentStatusCode} options={[["03","Statutaire"],["04","Non statutaire"],["99","Non concerné"]]} />
          <SelectField name="multipleJobsCode" label="Emplois multiples" defaultValue={initial.multipleJobsCode} options={[["01","Emploi unique"],["02","Emplois multiples"],["03","Situation non connue"]]} />
          <SelectField name="multipleEmployersCode" label="Employeurs multiples" defaultValue={initial.multipleEmployersCode} options={[["01","Employeur unique"],["02","Employeurs multiples"],["03","Situation non connue"]]} />
          <Field name="workAccidentRegimeCode" label="Régime AT/MP" defaultValue={initial.workAccidentRegimeCode} placeholder="200 = régime général" />
          <Field name="workAccidentRiskCode" label="Code risque AT/MP" defaultValue={initial.workAccidentRiskCode} placeholder="Code de votre notification" help="Reprenez exactement le code notifié par la CARSAT/MSA. 999ZZ uniquement avant première notification." />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3"><SubmitButton /><p className="text-xs text-ink-faint">Aucune donnée de calcul de paie n'est modifiée par ce formulaire.</p></div>
      {state?.error ? <p className="rounded-lg bg-accent-amber/10 px-3 py-2 text-sm text-accent-amber" role="alert">{state.error}</p> : null}
      {state?.success ? <p className="rounded-lg bg-surface-subtle px-3 py-2 text-sm text-ink-soft" role="status">{state.success}</p> : null}
    </form>
  );
}
