/**
 * Catalogue des variables de paie saisissables pour le moteur de bulletin.
 * Module sans dépendance : il est aussi chargé par l'écran de saisie.
 */
// ---------------------------------------------------------------------------
// Catalogue des variables saisissables
// ---------------------------------------------------------------------------

export type BulletinVariableKind =
  | "OVERTIME_FIRST"
  | "OVERTIME_SECOND"
  | "COMPLEMENTARY_TENTH"
  | "COMPLEMENTARY_BEYOND"
  | "BONUS"
  | "BONUS_ANNUAL"
  | "BENEFIT"
  | "EXPENSE"
  | "PUBLIC_TRANSPORT"
  | "MEAL_VOUCHERS"
  | "IJSS_GROSS"
  | "NET_DEDUCTION";

export type BulletinVariableUnit = "EUR" | "HOURS" | "UNITS";

export type BulletinVariableDefinition = {
  code: string;
  label: string;
  unit: BulletinVariableUnit;
  kind: BulletinVariableKind;
  group: "Temps de travail" | "Primes" | "Avantages en nature" | "Frais et transport" | "Absences" | "Retenues sur net";
  help: string;
};

export const BULLETIN_VARIABLES: readonly BulletinVariableDefinition[] = [
  { code: "OVERTIME_25", label: "Heures supplémentaires à 25 %", unit: "HOURS", kind: "OVERTIME_FIRST", group: "Temps de travail", help: "Nombre d'heures au-delà de 35 h, de la 36e à la 43e heure de la semaine." },
  { code: "OVERTIME_50", label: "Heures supplémentaires à 50 %", unit: "HOURS", kind: "OVERTIME_SECOND", group: "Temps de travail", help: "Nombre d'heures à partir de la 44e heure de la semaine." },
  { code: "COMPLEMENTARY_10", label: "Heures complémentaires à 10 %", unit: "HOURS", kind: "COMPLEMENTARY_TENTH", group: "Temps de travail", help: "Temps partiel : heures dans la limite du dixième de l'horaire contractuel." },
  { code: "COMPLEMENTARY_25", label: "Heures complémentaires à 25 %", unit: "HOURS", kind: "COMPLEMENTARY_BEYOND", group: "Temps de travail", help: "Temps partiel : heures au-delà du dixième, dans la limite du tiers." },
  { code: "NIGHT_WORK", label: "Majoration pour travail de nuit", unit: "EUR", kind: "BONUS", group: "Temps de travail", help: "Montant brut de la majoration." },
  { code: "SUNDAY_WORK", label: "Majoration pour travail du dimanche", unit: "EUR", kind: "BONUS", group: "Temps de travail", help: "Montant brut de la majoration." },
  { code: "PUBLIC_HOLIDAY_WORK", label: "Majoration pour jour férié travaillé", unit: "EUR", kind: "BONUS", group: "Temps de travail", help: "Montant brut de la majoration." },
  { code: "ON_CALL", label: "Indemnité d'astreinte", unit: "EUR", kind: "BONUS", group: "Temps de travail", help: "Montant brut." },
  { code: "BASE_SALARY_ADJUSTMENT", label: "Rappel de salaire", unit: "EUR", kind: "BONUS", group: "Primes", help: "Régularisation de salaire d'un mois antérieur." },
  { code: "ACTIVITY_BONUS", label: "Prime d'activité", unit: "EUR", kind: "BONUS", group: "Primes", help: "Prime mensuelle liée à l'activité." },
  { code: "SENIORITY_BONUS", label: "Prime d'ancienneté", unit: "EUR", kind: "BONUS", group: "Primes", help: "Montant mensuel conventionnel ou contractuel." },
  { code: "OBJECTIVE_BONUS", label: "Prime sur objectifs", unit: "EUR", kind: "BONUS", group: "Primes", help: "Part variable liée au travail effectif." },
  { code: "SUJETION_BONUS", label: "Prime de sujétion", unit: "EUR", kind: "BONUS", group: "Primes", help: "Montant brut." },
  { code: "YEAR_END_BONUS", label: "Prime de fin d'année / 13e mois", unit: "EUR", kind: "BONUS_ANNUAL", group: "Primes", help: "Prime annuelle, exclue de l'assiette du dixième des congés payés." },
  { code: "VACATION_BONUS", label: "Prime de vacances", unit: "EUR", kind: "BONUS_ANNUAL", group: "Primes", help: "Prime annuelle, exclue de l'assiette du dixième des congés payés." },
  { code: "EXCEPTIONAL_BONUS", label: "Prime exceptionnelle", unit: "EUR", kind: "BONUS_ANNUAL", group: "Primes", help: "Prime ponctuelle soumise à cotisations, exclue de l'assiette du dixième." },
  { code: "BENEFIT_MEAL", label: "Avantage en nature nourriture", unit: "EUR", kind: "BENEFIT", group: "Avantages en nature", help: "Valeur de l'avantage selon le barème Urssaf." },
  { code: "BENEFIT_HOUSING", label: "Avantage en nature logement", unit: "EUR", kind: "BENEFIT", group: "Avantages en nature", help: "Valeur forfaitaire ou réelle." },
  { code: "BENEFIT_VEHICLE", label: "Avantage en nature véhicule", unit: "EUR", kind: "BENEFIT", group: "Avantages en nature", help: "Valeur forfaitaire ou réelle de l'usage privé." },
  { code: "BENEFIT_TECHNOLOGY", label: "Avantage en nature NTIC", unit: "EUR", kind: "BENEFIT", group: "Avantages en nature", help: "Usage privé des outils numériques." },
  { code: "BENEFIT_OTHER", label: "Autre avantage en nature", unit: "EUR", kind: "BENEFIT", group: "Avantages en nature", help: "Valeur de l'avantage." },
  { code: "EXPENSE_REAL", label: "Frais professionnels sur justificatifs", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Remboursement de dépenses justifiées, non soumis." },
  { code: "EXPENSE_MEAL", label: "Indemnités de repas", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Dans les limites d'exonération Urssaf." },
  { code: "EXPENSE_KILOMETRIC", label: "Indemnités kilométriques", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Selon le barème fiscal." },
  { code: "EXPENSE_TRAVEL", label: "Frais de grand déplacement", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Dans les limites d'exonération Urssaf." },
  { code: "EXPENSE_HOTEL", label: "Hébergement professionnel", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Sur justificatifs." },
  { code: "SUSTAINABLE_MOBILITY", label: "Forfait mobilités durables", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Exonéré dans la limite du plafond annuel." },
  { code: "TRANSPORT_ALLOWANCE", label: "Prime de transport", unit: "EUR", kind: "EXPENSE", group: "Frais et transport", help: "Exonérée dans la limite du plafond annuel." },
  { code: "PUBLIC_TRANSPORT", label: "Abonnement de transport public (prix mensuel)", unit: "EUR", kind: "PUBLIC_TRANSPORT", group: "Frais et transport", help: "Prix de l'abonnement : la prise en charge employeur est calculée avec le taux de l'entreprise." },
  { code: "MEAL_VOUCHERS", label: "Titres-restaurant attribués", unit: "UNITS", kind: "MEAL_VOUCHERS", group: "Frais et transport", help: "Nombre de titres du mois : valeur et part patronale viennent des paramètres de l'entreprise." },
  { code: "IJSS_GROSS", label: "IJSS brutes (attestation de la CPAM)", unit: "EUR", kind: "IJSS_GROSS", group: "Absences", help: "Montant brut des indemnités journalières du mois pour l'arrêt concerné." },
  { code: "SALARY_ADVANCE", label: "Acompte déjà versé", unit: "EUR", kind: "NET_DEDUCTION", group: "Retenues sur net", help: "Acompte ou avance sur salaire à déduire du net." },
  { code: "OTHER_NET_DEDUCTION", label: "Autre retenue sur net", unit: "EUR", kind: "NET_DEDUCTION", group: "Retenues sur net", help: "Saisie sur salaire, remboursement de prêt…" },
];

const DEFINITIONS = new Map(BULLETIN_VARIABLES.map((definition) => [definition.code, definition]));

/** Anciennes variables que le moteur calcule désormais lui-même. */
export const ENGINE_COMPUTED_VARIABLES: Readonly<Record<string, string>> = {
  INCOMPLETE_MONTH: "l'entrée ou la sortie en cours de mois est calculée par le moteur à partir des dates de contrat",
  PAID_LEAVE_INDEMNITY: "l'indemnité de congés payés est calculée à partir des absences validées",
  PAID_LEAVE_ABSENCE: "les congés payés viennent des absences validées",
  SICK_PAY_MAINTENANCE: "le maintien de salaire maladie est calculé à partir de l'arrêt validé",
  IJSS_SUBROGATED: "saisissez les IJSS brutes de l'attestation (IJSS_GROSS) : le net est calculé",
  OVERTIME_HOURS: "saisissez le nombre d'heures supplémentaires à 25 % ou 50 %",
  ADDITIONAL_HOURS: "saisissez le nombre d'heures complémentaires à 10 % ou 25 %",
  MEAL_VOUCHER_EMPLOYEE: "saisissez le nombre de titres-restaurant (MEAL_VOUCHERS)",
  MEAL_VOUCHER_EMPLOYER: "saisissez le nombre de titres-restaurant (MEAL_VOUCHERS)",
  CDD_END_ALLOWANCE: "l'indemnité de fin de contrat se règle dans la fiche de sortie du salarié",
  PAID_LEAVE_COMPENSATION: "l'indemnité compensatrice de congés payés se règle dans la fiche de sortie du salarié",
  NOTICE_COMPENSATION: "l'indemnité compensatrice de préavis se saisit dans la fiche de sortie du salarié",
  SEVERANCE_PAY: "l'indemnité de rupture se saisit dans la fiche de sortie du salarié",
};

export function getBulletinVariable(code: string): BulletinVariableDefinition | null {
  return DEFINITIONS.get(code.trim().toUpperCase()) ?? null;
}

