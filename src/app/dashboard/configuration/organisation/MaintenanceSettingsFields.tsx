import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { LEGAL_SICK_PAY, LEGAL_WORK_ACCIDENT_PAY, type SickPayRule } from "@/lib/payroll/bulletin/params";
import { MAINTENANCE_SENIORITY_YEARS, type MaintenanceKind } from "@/lib/payroll/bulletin/maintenance-settings";

export function MaintenanceSettingsFields({ kind, rule }: { kind: MaintenanceKind; rule?: SickPayRule }) {
  const legal = kind === "sickPayRule" ? LEGAL_SICK_PAY : LEGAL_WORK_ACCIDENT_PAY;
  const values = rule ?? legal;
  const parameters = [
    { key: "minSeniorityMonths", label: "Ancienneté minimale (mois)", value: values.minSeniorityMonths, max: 12, step: "1" },
    { key: "waitingDays", label: "Carence (jours civils)", value: values.waitingDays, max: legal.waitingDays, step: "1" },
    { key: "fullRate", label: "Premier taux (%)", value: values.fullRate * 100, max: 100, step: "any" },
    { key: "reducedRate", label: "Second taux (%)", value: values.reducedRate * 100, max: 100, step: "any" },
  ];
  return (
    <fieldset className="mt-5 border-t border-surface-border pt-5">
      <legend className="text-sm font-semibold text-ink">{kind === "sickPayRule" ? "Maintien de salaire maladie" : "Maintien de salaire AT / MP"}</legend>
      <details open={Boolean(rule)} className="mt-2">
      <summary className="cursor-pointer text-sm text-ink-soft">Configurer un maintien conventionnel</summary>
      <Label htmlFor={`${kind}.enabled`}>Règle applicable</Label>
      <Select id={`${kind}.enabled`} name={`${kind}.enabled`} defaultValue={rule ? "1" : "0"}>
        <option value="0">Minimum légal national</option>
        <option value="1">Convention collective ou accord plus favorable</option>
      </Select>
      <FieldHint>Activez la règle conventionnelle après vérification de votre texte. Les champs ci-dessous sont ignorés si vous choisissez le minimum légal. Une règle inférieure au minimum national est refusée.</FieldHint>
      <div className="mt-4">
        <Label htmlFor={`${kind}.source`}>Référence du texte applicable</Label>
        <Input id={`${kind}.source`} name={`${kind}.source`} defaultValue={rule?.source ?? ""} maxLength={500} placeholder="Convention, article, accord et date" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {parameters.map(({ key, label, value, max, step }) => (
          <div key={key}><Label htmlFor={`${kind}.${key}`}>{label}</Label><Input id={`${kind}.${key}`} name={`${kind}.${key}`} type="number" min="0" max={max} step={step} defaultValue={value} /></div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs text-ink-faint">Durées en jours civils, avec déduction des jours déjà indemnisés sur les douze mois précédents. Le premier palier couvre aussi les salariés ayant moins d&apos;un an si votre règle le prévoit.</caption>
          <thead><tr><th className="p-2">Ancienneté</th><th className="p-2">Premier taux</th><th className="p-2">Second taux</th></tr></thead>
          <tbody>{MAINTENANCE_SENIORITY_YEARS.map((years) => {
            const tier = [...values.tiers].reverse().find((candidate) => candidate.minSeniorityYears <= years);
            return <tr key={years} className="border-t border-surface-border"><th className="p-2 font-normal">{years === 0 ? "Moins de 1 an" : `À partir de ${years} an${years > 1 ? "s" : ""}`}</th>{(["fullRateDays", "reducedRateDays"] as const).map((key) => <td key={key} className="p-2"><Input aria-label={`${kind === "sickPayRule" ? "Maladie" : "AT / MP"}, ${years} ans, ${key === "fullRateDays" ? "premier" : "second"} taux : jours`} name={`${kind}.tiers.${years}.${key}`} type="number" min="0" max="366" step="1" defaultValue={tier?.[key] ?? 0} /></td>)}</tr>;
          })}</tbody>
        </table>
      </div>
      <FieldHint>Ces paramètres couvrent un maintien brut en deux taux, identique pour tous les salariés. Les garanties en net, les populations distinctes et les règles d&apos;Alsace-Moselle nécessitent un contrôle complémentaire.</FieldHint>
      </details>
    </fieldset>
  );
}
