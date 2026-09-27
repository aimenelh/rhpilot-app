/**
 * Lecture et validation du formulaire « Paramètres de paie » de l'organisation.
 * Les pourcentages saisis sont stockés en fraction (1,5 % → 0,015).
 */
export type PayrollSettingsInput = {
  payrollHeadcount: number | null;
  mobilityRate: number | null;
  paidLeaveMethod: "OUVRABLES" | "OUVRES";
  ijssSubrogation: boolean;
  workedSolidarityDay: boolean;
  mealVoucherFaceValue: number | null;
  mealVoucherEmployerShare: number | null;
  transportEmployerShare: number;
  prevoyanceRates: { cadre: Record<string, number>; nonCadre: Record<string, number> } | null;
};

type Getter = (name: string) => FormDataEntryValue | null;

function number(get: Getter, name: string): number | null {
  const raw = String(get(name) ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`La valeur « ${raw} » n'est pas un nombre valide.`);
  return value;
}

export function parsePayrollSettingsForm(get: Getter): PayrollSettingsInput {
  const headcount = number(get, "payrollHeadcount");
  if (headcount !== null && (!Number.isInteger(headcount) || headcount < 1 || headcount > 100000)) throw new Error("L'effectif moyen annuel doit être un nombre entier d'au moins 1.");
  const mobilityRate = number(get, "mobilityRate");
  if (mobilityRate !== null && (mobilityRate < 0 || mobilityRate > 3.2)) throw new Error("Le taux de versement mobilité doit être compris entre 0 et 3,2 %.");
  const faceValue = number(get, "mealVoucherFaceValue");
  if (faceValue !== null && (faceValue <= 0 || faceValue > 100)) throw new Error("La valeur du titre-restaurant est invalide.");
  const voucherShare = number(get, "mealVoucherEmployerShare");
  if (voucherShare !== null && (voucherShare < 50 || voucherShare > 60)) throw new Error("La part patronale du titre-restaurant doit être comprise entre 50 % et 60 %.");
  if ((faceValue === null) !== (voucherShare === null)) throw new Error("Renseignez à la fois la valeur du titre-restaurant et sa part patronale, ou aucune des deux.");
  const transportShare = number(get, "transportEmployerShare") ?? 50;
  if (transportShare < 50 || transportShare > 100) throw new Error("La prise en charge du transport public doit être comprise entre 50 % et 100 %.");

  const keys = ["employeeT1", "employerT1", "employeeT2", "employerT2"] as const;
  let anyRate = false;
  const population = (name: "cadre" | "nonCadre") => {
    const rates: Record<string, number> = {};
    for (const key of keys) {
      const value = number(get, `prevoyance.${name}.${key}`);
      if (value === null) continue;
      if (value < 0 || value > 20) throw new Error("Les taux de prévoyance doivent être compris entre 0 et 20 %.");
      rates[key] = Math.round((value / 100) * 1e7) / 1e7;
      anyRate = true;
    }
    return rates;
  };
  const cadre = population("cadre");
  const nonCadre = population("nonCadre");

  return {
    payrollHeadcount: headcount,
    mobilityRate,
    paidLeaveMethod: get("paidLeaveMethod") === "OUVRES" ? "OUVRES" : "OUVRABLES",
    ijssSubrogation: get("ijssSubrogation") !== "0",
    workedSolidarityDay: get("workedSolidarityDay") === "1",
    mealVoucherFaceValue: faceValue,
    mealVoucherEmployerShare: voucherShare === null ? null : Math.round((voucherShare / 100) * 10000) / 10000,
    transportEmployerShare: Math.round((transportShare / 100) * 10000) / 10000,
    prevoyanceRates: anyRate ? { cadre, nonCadre } : null,
  };
}
