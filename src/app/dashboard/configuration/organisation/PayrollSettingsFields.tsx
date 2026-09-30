import { MaintenanceSettingsFields } from "./MaintenanceSettingsFields";
import type { SickPayRule } from "@/lib/payroll/bulletin/params";

import { Card } from "@/components/ui/Card";
import { FieldHint, Input, Label, Select } from "@/components/ui/Field";

export type PayrollSettingsValues = {
  /** Effectif saisi par l'entreprise (vide : calcul automatique). */
  sickPayRule?: SickPayRule;
  workAccidentPayRule?: SickPayRule;
  payrollHeadcount: string;
  automaticHeadcount: string;
  /** Taux saisi par l'entreprise (vide : barème Urssaf). */
  mobilityRate: string;
  mobilityAutomatic: { rate: string; detail: string | null; checkedAt: string | null } | null;
  mobilityCommuneKnown: boolean;
  paidLeaveMethod: "OUVRABLES" | "OUVRES";
  paidLeaveWorkingDays: boolean[] | null;
  ijssSubrogation: boolean;
  workedSolidarityDay: boolean;
  mealVoucherFaceValue: string;
  mealVoucherEmployerShare: string;
  transportEmployerShare: string;
  prevoyance: Record<"cadre" | "nonCadre", Record<"employeeT1" | "employerT1" | "employeeT2" | "employerT2", string>>;
};

function RateInput({ name, defaultValue, label }: { name: string; defaultValue: string; label: string }) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <Input name={name} type="number" min="0" max="20" step="0.001" inputMode="decimal" defaultValue={defaultValue} placeholder="0" className="mt-1" />
    </label>
  );
}

export function PayrollSettingsFields({ values }: { values: PayrollSettingsValues }) {
  return (
    <Card className="mt-4">
      <h2 className="text-sm font-semibold text-ink">Paramètres de paie</h2>
      <p className="mt-1 text-sm text-ink-soft">Ils déterminent les seuils de cotisations, le décompte des congés et les éléments calculés sur chaque bulletin.</p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="payrollHeadcount">Effectif pour les seuils de cotisations</Label>
          <p className="mt-1 text-sm text-ink">Calculé automatiquement : {values.automaticHeadcount} salarié{values.automaticHeadcount === "0" || values.automaticHeadcount === "1" ? "" : "s"} ce mois-ci</p>
          <Input id="payrollHeadcount" name="payrollHeadcount" type="number" min="0" step="0.01" defaultValue={values.payrollHeadcount} placeholder="Laisser vide" className="mt-2" />
          <FieldHint>RH Pilot compte chaque mois vos salariés, hors apprentis et contrats de professionnalisation, temps partiels au prorata. Ne saisissez un effectif que si l&apos;Urssaf en retient un autre, par exemple si vous avez franchi le seuil de 11 ou de 50 salariés depuis moins de 5 ans (règle de la loi Pacte).</FieldHint>
        </div>
        <div>
          <Label htmlFor="mobilityRate">Versement mobilité</Label>
          <p className="mt-1 text-sm text-ink">
            {values.mobilityRate
              ? <>Taux saisi par vous : {values.mobilityRate.replace(".", ",")} %</>
              : values.mobilityAutomatic
                ? <>Automatique : {values.mobilityAutomatic.rate} %</>
                : values.mobilityCommuneKnown
                  ? <>Automatique, vérifié à chaque calcul de paie</>
                  : <>Automatique dès que la commune de l&apos;établissement est connue</>}
          </p>
          {!values.mobilityRate && values.mobilityAutomatic?.detail ? <p className="mt-0.5 text-xs text-ink-faint">{values.mobilityAutomatic.detail}{values.mobilityAutomatic.checkedAt ? ` Vérifié le ${values.mobilityAutomatic.checkedAt}.` : ""}</p> : null}
          <Input id="mobilityRate" name="mobilityRate" type="number" min="0" max="3.2" step="0.001" defaultValue={values.mobilityRate} placeholder="Laisser vide" className="mt-2" />
          <FieldHint>Le taux vient du barème officiel de l&apos;Urssaf pour la commune de l&apos;établissement et n&apos;est dû qu&apos;à partir de 11 salariés. Videz ce champ pour revenir au barème si vous aviez saisi un taux.</FieldHint>
        </div>
        <div>
          <Label htmlFor="paidLeaveMethod">Décompte des congés payés</Label>
          <Select id="paidLeaveMethod" name="paidLeaveMethod" defaultValue={values.paidLeaveMethod}>
            <option value="OUVRABLES">Jours ouvrables (30 jours par an)</option>
            <option value="OUVRES">Jours ouvrés (25 jours par an)</option>
          </Select>
          <p className="mt-3 text-xs font-medium text-ink-soft">Calendrier des congés en jours ouvrés</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((label, day) => <label key={label} className="flex items-center gap-1.5 text-xs text-ink-soft"><input type="checkbox" name={`paidLeaveWorkingDays.${day}`} value="1" defaultChecked={values.paidLeaveWorkingDays?.[day] === true} />{label}</label>)}
          </div>
          <FieldHint>Avec 25 jours ouvrés, cochez les cinq jours du calendrier de congés de l&apos;entreprise. Il s&apos;applique aussi aux temps partiels et diffère de leurs jours de présence. Il n&apos;est pas utilisé pour les 30 jours ouvrables.</FieldHint>
        </div>
        <div>
          <Label htmlFor="ijssSubrogation">Subrogation des indemnités journalières</Label>
          <Select id="ijssSubrogation" name="ijssSubrogation" defaultValue={values.ijssSubrogation ? "1" : "0"}>
            <option value="1">Oui, l&apos;entreprise perçoit les IJSS et les reverse sur le bulletin</option>
            <option value="0">Non, la CPAM verse les IJSS au salarié</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="workedSolidarityDay">Lundi de Pentecôte</Label>
          <Select id="workedSolidarityDay" name="workedSolidarityDay" defaultValue={values.workedSolidarityDay ? "1" : "0"}>
            <option value="0">Chômé comme les autres jours fériés</option>
            <option value="1">Travaillé au titre de la journée de solidarité</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="transportEmployerShare">Prise en charge du transport public (%)</Label>
          <Input id="transportEmployerShare" name="transportEmployerShare" type="number" min="50" max="100" step="0.01" defaultValue={values.transportEmployerShare} placeholder="50" />
          <FieldHint>Au moins 50 % du prix de l&apos;abonnement ; exonérée jusqu&apos;à 75 %.</FieldHint>
        </div>
        <div>
          <Label htmlFor="mealVoucherFaceValue">Valeur d&apos;un titre-restaurant (€)</Label>
          <Input id="mealVoucherFaceValue" name="mealVoucherFaceValue" type="number" min="0.01" step="0.01" defaultValue={values.mealVoucherFaceValue} placeholder="Ex. 10" />
        </div>
        <div>
          <Label htmlFor="mealVoucherEmployerShare">Part patronale du titre-restaurant (%)</Label>
          <Input id="mealVoucherEmployerShare" name="mealVoucherEmployerShare" type="number" min="50" max="60" step="0.01" defaultValue={values.mealVoucherEmployerShare} placeholder="Ex. 50" />
          <FieldHint>Entre 50 % et 60 % de la valeur du titre pour bénéficier de l&apos;exonération.</FieldHint>
        </div>
      </div>

      <MaintenanceSettingsFields kind="sickPayRule" rule={values.sickPayRule} />
      <MaintenanceSettingsFields kind="workAccidentPayRule" rule={values.workAccidentPayRule} />

      <div className="mt-6 border-t border-surface-border pt-5">
        <h3 className="text-sm font-semibold text-ink">Prévoyance (taux en %)</h3>
        <p className="mt-1 text-xs leading-5 text-ink-faint">Taux du contrat de prévoyance sur la tranche 1 (jusqu&apos;au plafond) et la tranche 2. Pour les cadres, la part patronale sur la tranche 1 est d&apos;au moins 1,50 % ; ce minimum est appliqué si le taux saisi est inférieur.</p>
        {(["cadre", "nonCadre"] as const).map((population) => (
          <div key={population} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{population === "cadre" ? "Cadres" : "Non-cadres"}</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RateInput name={`prevoyance.${population}.employeeT1`} label="Salarié T1" defaultValue={values.prevoyance[population].employeeT1} />
              <RateInput name={`prevoyance.${population}.employerT1`} label="Employeur T1" defaultValue={values.prevoyance[population].employerT1} />
              <RateInput name={`prevoyance.${population}.employeeT2`} label="Salarié T2" defaultValue={values.prevoyance[population].employeeT2} />
              <RateInput name={`prevoyance.${population}.employerT2`} label="Employeur T2" defaultValue={values.prevoyance[population].employerT2} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
