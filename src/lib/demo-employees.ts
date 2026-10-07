/**
 * Salariés fictifs de l'entreprise de démonstration. Partagés entre le générateur
 * (onglet Salariés), la paie de démonstration et ses tests de bout en bout.
 */
type DemoContract = "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION";
type DurationUnit = "DAYS" | "WEEKS" | "MONTHS";

export type DemoEmployeeTemplate = {
  firstName: string;
  lastName: string;
  civility: "M" | "MME" | "AUTRE";
  position: string;
  /** Embauche relative à la date de génération, en jours. */
  hireOffset: number;
  contractType: DemoContract | null;
  probationDuration: number | null;
  probationDurationUnit: DurationUnit | null;
  nextMedicalVisitOffset: number | null;
  hasManager: boolean;
};

export const DEMO_EMPLOYEES: readonly DemoEmployeeTemplate[] = [
  { firstName: "Antoine", lastName: "Perrot", civility: "M", position: "Technicien de maintenance", hireOffset: -5, contractType: "CDI", probationDuration: 2, probationDurationUnit: "MONTHS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Emma", lastName: "Roussel", civility: "MME", position: "Responsable marketing", hireOffset: -900, contractType: "CDI", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: false },
  { firstName: "Manon", lastName: "Dubreuil", civility: "MME", position: "Responsable RH", hireOffset: -700, contractType: "CDI", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: false },
  { firstName: "Karim", lastName: "Belhaj", civility: "M", position: "Apprenti technicien", hireOffset: -20, contractType: "APPRENTISSAGE", probationDuration: 45, probationDurationUnit: "DAYS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Nicolas", lastName: "Fabre", civility: "M", position: "Analyste financier", hireOffset: -80, contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Julien", lastName: "Marchand", civility: "M", position: "Développeur", hireOffset: -25, contractType: null, probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: false },
  { firstName: "Léa", lastName: "Fontaine", civility: "MME", position: "Secrétaire médicale", hireOffset: -400, contractType: "CDI", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: false },
  { firstName: "Sarah", lastName: "Benali", civility: "AUTRE", position: "Comptable", hireOffset: -1000, contractType: "CDI", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Sophie", lastName: "Lemoine", civility: "MME", position: "Assistante comptable", hireOffset: -60, contractType: "CDD", probationDuration: 4, probationDurationUnit: "MONTHS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Thomas", lastName: "Girard", civility: "M", position: "Chargé de projet", hireOffset: -60, contractType: "PROFESSIONNALISATION", probationDuration: 4, probationDurationUnit: "MONTHS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Hugo", lastName: "Lacroix", civility: "M", position: "Commercial", hireOffset: -200, contractType: "CDD", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Chloé", lastName: "Bertin", civility: "MME", position: "Apprentie assistante RH", hireOffset: -5, contractType: "APPRENTISSAGE", probationDuration: 45, probationDurationUnit: "DAYS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Inès", lastName: "Chevalier", civility: "MME", position: "Chargée de recrutement", hireOffset: -300, contractType: "CDI", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Maxime", lastName: "Renard", civility: "M", position: "Magasinier", hireOffset: -45, contractType: "CDD", probationDuration: 3, probationDurationUnit: "MONTHS", nextMedicalVisitOffset: null, hasManager: true },
  { firstName: "Camille", lastName: "Vidal", civility: "AUTRE", position: "Chargée de clientèle", hireOffset: -540, contractType: "CDI", probationDuration: null, probationDurationUnit: null, nextMedicalVisitOffset: 45, hasManager: true },
];

export const DEMO_EMPLOYEE_NAMES = new Set(DEMO_EMPLOYEES.map((employee) => employee.firstName));
