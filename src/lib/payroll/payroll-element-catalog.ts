/**
 * Référentiel fonctionnel des éléments de paie.
 *
 * IMPORTANT : ce catalogue décrit la nature métier d'un élément ; il ne porte
 * aucun taux légal, plafond ou formule réglementaire. Les traitements sociaux
 * et fiscaux doivent rester fournis par une règle versionnée et sourcée.
 */

export const PAYROLL_ELEMENT_KINDS = [
  "ADD_TO_GROSS",
  "DEDUCT_FROM_GROSS",
  "DEDUCT_FROM_NET",
  "REIMBURSEMENT",
  "NON_CASH",
  "INFORMATIONAL",
] as const;

export type PayrollElementKind = (typeof PAYROLL_ELEMENT_KINDS)[number];

export const PAYROLL_ELEMENT_CATEGORIES = [
  "BASE_PAY",
  "WORKING_TIME",
  "BONUS_AND_ALLOWANCES",
  "PAID_LEAVE_AND_ABSENCE",
  "SOCIAL_PROTECTION",
  "BENEFITS_IN_KIND",
  "PROFESSIONAL_EXPENSES",
  "MEAL_VOUCHERS",
  "COMMUTING",
  "PARTIAL_ACTIVITY",
  "TERMINATION",
  "TAX_AND_WITHHOLDING",
] as const;

export type PayrollElementCategory = (typeof PAYROLL_ELEMENT_CATEGORIES)[number];

export type PayrollElementDefinition = {
  code: string;
  label: string;
  category: PayrollElementCategory;
  allowedKinds: readonly PayrollElementKind[];
  supportedUnits: readonly ["EUR"] | readonly ["EUR", "HOURS"] | readonly ["EUR", "DAYS"];
  requiresValidatedRule: true;
  requiresSourceTraceability: true;
  description: string;
};

const EUR: readonly ["EUR"] = ["EUR"];
const EUR_HOURS: readonly ["EUR", "HOURS"] = ["EUR", "HOURS"];
const EUR_DAYS: readonly ["EUR", "DAYS"] = ["EUR", "DAYS"];

export const PAYROLL_ELEMENT_CATALOG: readonly PayrollElementDefinition[] = [
  // Rémunération de base
  { code: "BASE_SALARY_ADJUSTMENT", label: "Ajustement du salaire de base", category: "BASE_PAY", allowedKinds: ["ADD_TO_GROSS", "DEDUCT_FROM_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Correction ponctuelle ou régularisation du salaire de base." },
  { code: "PART_TIME_ADJUSTMENT", label: "Ajustement lié au temps partiel", category: "BASE_PAY", allowedKinds: ["ADD_TO_GROSS", "DEDUCT_FROM_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Variation liée à la quotité ou à un changement de durée du travail." },
  { code: "INCOMPLETE_MONTH", label: "Prorata mois incomplet", category: "BASE_PAY", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Proratisation d'entrée, sortie ou autre mois incomplet." },

  // Temps de travail
  { code: "OVERTIME_HOURS", label: "Heures supplémentaires", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Heures supplémentaires avec base et majoration déterminées par une règle applicable." },
  { code: "ADDITIONAL_HOURS", label: "Heures complémentaires", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Heures complémentaires des salariés à temps partiel." },
  { code: "NIGHT_WORK", label: "Travail de nuit", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Indemnité ou majoration liée au travail de nuit." },
  { code: "SUNDAY_WORK", label: "Travail du dimanche", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Majoration ou indemnité de dimanche selon le régime applicable." },
  { code: "PUBLIC_HOLIDAY_WORK", label: "Travail un jour férié", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Traitement du travail effectué un jour férié." },
  { code: "ON_CALL", label: "Astreinte", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Indemnité ou compensation d'astreinte." },
  { code: "COMPENSATORY_REST", label: "Repos compensateur", category: "WORKING_TIME", allowedKinds: ["ADD_TO_GROSS", "DEDUCT_FROM_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Valorisation ou régularisation d'un repos compensateur lorsque nécessaire." },

  // Primes et indemnités
  { code: "ACTIVITY_BONUS", label: "Prime d'activité", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prime liée à l'activité ou à la performance." },
  { code: "SENIORITY_BONUS", label: "Prime d'ancienneté", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prime résultant notamment d'une règle conventionnelle ou contractuelle." },
  { code: "YEAR_END_BONUS", label: "Prime de fin d'année / 13e mois", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prime périodique de fin d'année ou treizième mois." },
  { code: "OBJECTIVE_BONUS", label: "Prime sur objectifs", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Part variable ou prime conditionnée à des objectifs." },
  { code: "EXCEPTIONAL_BONUS", label: "Prime exceptionnelle", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prime ponctuelle dont le régime doit être déterminé selon sa nature." },
  { code: "VACATION_BONUS", label: "Prime de vacances", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prime de vacances lorsqu'elle résulte d'une règle applicable." },
  { code: "PROFIT_SHARING", label: "Intéressement / partage de la valeur", category: "BONUS_AND_ALLOWANCES", allowedKinds: ["ADD_TO_GROSS", "INFORMATIONAL"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Éléments de partage de la valeur à distinguer de la rémunération classique." },

  // Congés et absences
  { code: "PAID_LEAVE_ABSENCE", label: "Congés payés", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["ADD_TO_GROSS", "DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Impact des congés payés selon la méthode applicable." },
  { code: "RTT_ABSENCE", label: "RTT", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["ADD_TO_GROSS", "DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Impact d'un jour ou d'une période de RTT." },
  { code: "SICK_LEAVE", label: "Maladie non professionnelle", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Absence pour maladie avec traitement employeur/IJSS/subrogation à déterminer séparément." },
  { code: "WORK_ACCIDENT_ABSENCE", label: "Accident du travail / maladie professionnelle", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Absence AT/MP et traitements associés." },
  { code: "UNPAID_LEAVE", label: "Congé ou absence sans solde", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Retenue liée à une absence non rémunérée." },
  { code: "MATERNITY_LEAVE", label: "Congé maternité", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Traitement du congé maternité, IJSS et éventuel maintien selon règles applicables." },
  { code: "PATERNITY_LEAVE", label: "Congé paternité / accueil de l'enfant", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Traitement du congé paternité et d'accueil de l'enfant." },
  { code: "ADOPTION_LEAVE", label: "Congé d'adoption", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Traitement du congé d'adoption." },
  { code: "FAMILY_EVENT_LEAVE", label: "Congé pour événement familial", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["ADD_TO_GROSS", "DEDUCT_FROM_GROSS"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Absence pour événement familial selon la règle légale ou conventionnelle applicable." },
  { code: "SICK_PAY_MAINTENANCE", label: "Maintien employeur maladie", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Complément employeur à distinguer des IJSS et de leur subrogation." },
  { code: "IJSS_SUBROGATED", label: "IJSS subrogées", category: "PAID_LEAVE_AND_ABSENCE", allowedKinds: ["INFORMATIONAL", "DEDUCT_FROM_NET"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Flux IJSS liés à une subrogation ; ne doit pas être confondu avec un salaire brut." },

  // Protection sociale
  { code: "HEALTH_PLAN_EMPLOYEE", label: "Mutuelle — part salarié", category: "SOCIAL_PROTECTION", allowedKinds: ["DEDUCT_FROM_NET"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Part salariale de complémentaire santé." },
  { code: "HEALTH_PLAN_EMPLOYER", label: "Mutuelle — part employeur", category: "SOCIAL_PROTECTION", allowedKinds: ["NON_CASH", "INFORMATIONAL"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Part employeur de complémentaire santé et son régime social/fiscal." },
  { code: "DISABILITY_DEATH_EMPLOYEE", label: "Prévoyance — part salarié", category: "SOCIAL_PROTECTION", allowedKinds: ["DEDUCT_FROM_NET"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prévoyance incapacité, invalidité, décès — part salarié." },
  { code: "DISABILITY_DEATH_EMPLOYER", label: "Prévoyance — part employeur", category: "SOCIAL_PROTECTION", allowedKinds: ["NON_CASH", "INFORMATIONAL"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prévoyance employeur et régime associé." },

  // Avantages en nature
  { code: "BENEFIT_MEAL", label: "Avantage en nature nourriture", category: "BENEFITS_IN_KIND", allowedKinds: ["NON_CASH"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Évaluation de l'avantage en nature nourriture selon le régime applicable." },
  { code: "BENEFIT_HOUSING", label: "Avantage en nature logement", category: "BENEFITS_IN_KIND", allowedKinds: ["NON_CASH"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Évaluation de l'avantage en nature logement selon la méthode applicable." },
  { code: "BENEFIT_VEHICLE", label: "Avantage en nature véhicule", category: "BENEFITS_IN_KIND", allowedKinds: ["NON_CASH"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Évaluation de l'avantage en nature véhicule selon le régime applicable." },
  { code: "BENEFIT_TECHNOLOGY", label: "Avantage en nature NTIC", category: "BENEFITS_IN_KIND", allowedKinds: ["NON_CASH"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Avantage lié aux outils de communication et équipements numériques à usage privé." },
  { code: "BENEFIT_OTHER", label: "Autre avantage en nature", category: "BENEFITS_IN_KIND", allowedKinds: ["NON_CASH"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Avantage en nature non couvert par les catégories spécifiques." },

  // Frais professionnels
  { code: "EXPENSE_MEAL", label: "Frais de repas", category: "PROFESSIONAL_EXPENSES", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Remboursement de repas au réel ou selon allocation forfaitaire applicable." },
  { code: "EXPENSE_KILOMETRIC", label: "Indemnités kilométriques", category: "PROFESSIONAL_EXPENSES", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Remboursement lié aux déplacements professionnels avec véhicule personnel." },
  { code: "EXPENSE_TRAVEL", label: "Grand déplacement", category: "PROFESSIONAL_EXPENSES", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR_DAYS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Frais de grand déplacement, repas et logement selon les paramètres du déplacement." },
  { code: "EXPENSE_HOTEL", label: "Hébergement professionnel", category: "PROFESSIONAL_EXPENSES", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Remboursement d'hébergement professionnel." },
  { code: "EXPENSE_REAL", label: "Frais réels sur justificatifs", category: "PROFESSIONAL_EXPENSES", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Remboursement sur dépenses réellement engagées et justifiées." },
  { code: "SPECIFIC_DEDUCTION", label: "Déduction forfaitaire spécifique", category: "PROFESSIONAL_EXPENSES", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Dispositif réservé aux professions et situations éligibles." },

  // Titres-restaurant
  { code: "MEAL_VOUCHER_EMPLOYER", label: "Titres-restaurant — part employeur", category: "MEAL_VOUCHERS", allowedKinds: ["REIMBURSEMENT", "NON_CASH"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Part employeur des titres-restaurant et traitement social associé." },
  { code: "MEAL_VOUCHER_EMPLOYEE", label: "Titres-restaurant — part salarié", category: "MEAL_VOUCHERS", allowedKinds: ["DEDUCT_FROM_NET"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Participation du salarié aux titres-restaurant." },

  // Transport domicile-travail
  { code: "PUBLIC_TRANSPORT", label: "Transport public domicile-travail", category: "COMMUTING", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prise en charge d'un abonnement de transport public." },
  { code: "SUSTAINABLE_MOBILITY", label: "Forfait mobilités durables", category: "COMMUTING", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prise en charge des mobilités éligibles selon le régime applicable." },
  { code: "TRANSPORT_ALLOWANCE", label: "Prime de transport", category: "COMMUTING", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Prime ou prise en charge de transport dans les situations éligibles." },
  { code: "HOME_TO_WORK_OTHER", label: "Autre trajet domicile-travail", category: "COMMUTING", allowedKinds: ["REIMBURSEMENT"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Autre mécanisme de prise en charge domicile-travail à qualifier." },

  // Activité partielle
  { code: "PARTIAL_ACTIVITY_HOURS", label: "Heures chômées — activité partielle", category: "PARTIAL_ACTIVITY", allowedKinds: ["DEDUCT_FROM_GROSS"], supportedUnits: EUR_HOURS, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Impact des heures non travaillées placées en activité partielle." },
  { code: "PARTIAL_ACTIVITY_INDEMNITY", label: "Indemnité d'activité partielle", category: "PARTIAL_ACTIVITY", allowedKinds: ["ADD_TO_GROSS", "INFORMATIONAL"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Indemnité d'activité partielle et régime social/fiscal associé." },

  // Fin de contrat / rupture
  { code: "CDD_END_ALLOWANCE", label: "Indemnité de fin de CDD", category: "TERMINATION", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Indemnité de fin de CDD lorsque due." },
  { code: "PAID_LEAVE_COMPENSATION", label: "Indemnité compensatrice de congés payés", category: "TERMINATION", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Paiement des congés acquis non pris en fin de contrat." },
  { code: "NOTICE_COMPENSATION", label: "Indemnité compensatrice de préavis", category: "TERMINATION", allowedKinds: ["ADD_TO_GROSS"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Indemnité liée au préavis lorsqu'elle est due." },
  { code: "SEVERANCE_PAY", label: "Indemnité de rupture", category: "TERMINATION", allowedKinds: ["ADD_TO_GROSS", "INFORMATIONAL"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Indemnité de licenciement, rupture conventionnelle ou autre rupture selon le cas." },

  // Fiscalité / retenues
  { code: "WITHHOLDING_TAX", label: "Prélèvement à la source", category: "TAX_AND_WITHHOLDING", allowedKinds: ["DEDUCT_FROM_NET"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Retenue calculée à partir du taux réellement fourni par la DGFiP." },
  { code: "OTHER_NET_DEDUCTION", label: "Autre retenue sur net", category: "TAX_AND_WITHHOLDING", allowedKinds: ["DEDUCT_FROM_NET"], supportedUnits: EUR, requiresValidatedRule: true, requiresSourceTraceability: true, description: "Retenue nette dont la base juridique et le montant doivent être identifiés." },
] as const;

const CATALOG_BY_CODE = new Map(PAYROLL_ELEMENT_CATALOG.map((element) => [element.code, element]));

export function getPayrollElementDefinition(code: string): PayrollElementDefinition | null {
  return CATALOG_BY_CODE.get(code.trim()) ?? null;
}

export function assertPayrollElementDefinition(code: string): PayrollElementDefinition {
  const definition = getPayrollElementDefinition(code);
  if (!definition) {
    throw new Error(`L'élément de paie ${code} n'est pas référencé dans le catalogue métier RH Pilot.`);
  }
  return definition;
}

export function assertPayrollElementInput(input: {
  code: string;
  amount: number;
  unit: string;
  kind: PayrollElementKind;
}): PayrollElementDefinition {
  const definition = assertPayrollElementDefinition(input.code);
  if (!Number.isFinite(input.amount)) throw new Error(`Le montant de l'élément ${input.code} est invalide.`);
  if (input.amount < 0) throw new Error(`Le montant de l'élément ${input.code} ne peut pas être négatif.`);
  if (!definition.allowedKinds.includes(input.kind)) {
    throw new Error(`Le type de traitement ${input.kind} n'est pas autorisé pour l'élément ${input.code}.`);
  }
  if (!(definition.supportedUnits as readonly string[]).includes(input.unit)) {
    throw new Error(`L'unité ${input.unit} n'est pas autorisée pour l'élément ${input.code}.`);
  }
  return definition;
}
