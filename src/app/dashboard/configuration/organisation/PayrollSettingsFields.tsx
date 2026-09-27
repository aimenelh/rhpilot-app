import { Card } from "@/components/ui/Card";
import { FieldHint, Input, Label, Select } from "@/components/ui/Field";

export type PayrollSettingsValues = {
  payrollHeadcount: string;
  mobilityRate: string;
  paidLeaveMethod: "OUVRABLES" | "OUVRES";
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
          <Label htmlFor="payrollHeadcount">Effectif moyen annuel</Label>
          <Input id="payrollHeadcount" name="payrollHeadcount" type="number" min="1" step="1" defaultValue={values.payrollHeadcount} placeholder="Ex. 14" />
          <FieldHint>Effectif de l&apos;année précédente au sens de la sécurité sociale. Il fixe le FNAL, la formation professionnelle, le versement mobilité, le forfait social et la RGDU.</FieldHint>
        </div>
        <div>
          <Label htmlFor="mobilityRate">Taux de versement mobilité (%)</Label>
          <Input id="mobilityRate" name="mobilityRate" type="number" min="0" max="3.2" step="0.001" defaultValue={values.mobilityRate} placeholder="Ex. 1,8" />
          <FieldHint>Dû à partir de 11 salariés selon la commune de l&apos;établissement. Indiquez 0 si l&apos;établissement n&apos;y est pas assujetti.</FieldHint>
        </div>
        <div>
          <Label htmlFor="paidLeaveMethod">Décompte des congés payés</Label>
          <Select id="paidLeaveMethod" name="paidLeaveMethod" defaultValue={values.paidLeaveMethod}>
            <option value="OUVRABLES">Jours ouvrables (30 jours par an)</option>
            <option value="OUVRES">Jours ouvrés (25 jours par an)</option>
          </Select>
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
