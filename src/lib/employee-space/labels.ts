/**
 * Libellés de l'espace salarié : documents, absences, mois. Module pur,
 * partagé par l'espace salarié, le tableau de bord et les e-mails.
 */

export type VaultDocumentKind = "PAYSLIP" | "WORK_CERTIFICATE" | "FINAL_SETTLEMENT" | "FRANCE_TRAVAIL" | "OTHER";

export const VAULT_DOCUMENT_KINDS: readonly VaultDocumentKind[] = ["PAYSLIP", "WORK_CERTIFICATE", "FINAL_SETTLEMENT", "FRANCE_TRAVAIL", "OTHER"];

export const DOCUMENT_KIND_LABELS: Record<VaultDocumentKind, string> = {
  PAYSLIP: "Bulletin de salaire",
  WORK_CERTIFICATE: "Certificat de travail",
  FINAL_SETTLEMENT: "Reçu pour solde de tout compte",
  FRANCE_TRAVAIL: "Attestation employeur France Travail",
  OTHER: "Document",
};

/** Documents de fin de contrat : un seul exemplaire en vigueur, une correction remplace le précédent. */
export const EXIT_DOCUMENT_KINDS: readonly VaultDocumentKind[] = ["WORK_CERTIFICATE", "FINAL_SETTLEMENT", "FRANCE_TRAVAIL"];

export function isVaultDocumentKind(value: string): value is VaultDocumentKind {
  return (VAULT_DOCUMENT_KINDS as readonly string[]).includes(value);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? String(month);
}

/** « octobre 2026 » */
export function monthLabel(year: number, month: number): string {
  return `${monthName(month)} ${year}`;
}

/** « d'octobre 2026 », « de mars 2026 » */
export function ofMonthLabel(year: number, month: number): string {
  const name = monthName(month);
  return `${/^[aeiouyéèêàâîôûh]/i.test(name) ? "d'" : "de "}${name} ${year}`;
}

export function payslipTitle(year: number, month: number): string {
  return `Bulletin de salaire ${ofMonthLabel(year, month)}`;
}

export function payslipFileName(year: number, month: number): string {
  return `bulletin-${year}-${String(month).padStart(2, "0")}.pdf`;
}

/** Nom de fichier sûr pour un en-tête Content-Disposition. */
export function safeFileName(value: string, fallback = "document.pdf"): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^[-.]+|-+$/g, "")
    .slice(0, 100);
  if (!cleaned) return fallback;
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
}

/* ---------- Absences vues par le salarié ---------- */

export type EmployeeRequestType = "PAID_LEAVE" | "RTT" | "UNPAID_LEAVE" | "FAMILY_EVENT" | "SICK_LEAVE";

/** Ce qu'un salarié peut demander ou déclarer depuis son espace. */
export const EMPLOYEE_REQUEST_TYPES: ReadonlyArray<{ value: EmployeeRequestType; label: string; hint: string; justification: "none" | "optional" | "required" }> = [
  { value: "PAID_LEAVE", label: "Congés payés", hint: "Votre demande part en validation auprès de votre employeur.", justification: "none" },
  { value: "RTT", label: "RTT", hint: "Votre demande part en validation auprès de votre employeur.", justification: "none" },
  { value: "UNPAID_LEAVE", label: "Congé sans solde", hint: "Il n'est pas rémunéré : votre employeur doit l'accepter.", justification: "none" },
  { value: "FAMILY_EVENT", label: "Événement familial", hint: "Mariage, naissance, décès… Joignez un justificatif si vous l'avez.", justification: "optional" },
  { value: "SICK_LEAVE", label: "Arrêt maladie", hint: "Déclarez votre arrêt et joignez l'avis d'arrêt de travail destiné à l'employeur.", justification: "required" },
];

export function isEmployeeRequestType(value: string): value is EmployeeRequestType {
  return EMPLOYEE_REQUEST_TYPES.some((entry) => entry.value === value);
}

export const ABSENCE_TYPE_LABELS: Record<string, string> = {
  PAID_LEAVE: "Congés payés",
  RTT: "RTT",
  SICK_LEAVE: "Arrêt maladie",
  WORK_ACCIDENT: "Accident du travail",
  UNPAID_LEAVE: "Congé sans solde",
  FAMILY_EVENT: "Événement familial",
  MATERNITY: "Congé maternité",
  PATERNITY: "Congé paternité",
  OTHER: "Autre absence",
};

export const ABSENCE_STATUS_LABELS: Record<string, string> = {
  TO_VALIDATE: "En attente de validation",
  TO_PROVIDE_JUSTIFICATION: "Justificatif attendu",
  TO_REVIEW_JUSTIFICATION: "Justificatif en cours de vérification",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

/** Une demande encore en attente peut être annulée par le salarié. */
export function canEmployeeCancelAbsence(absence: { status: string; payrollImpactStatus: string }): boolean {
  return ["TO_VALIDATE", "TO_PROVIDE_JUSTIFICATION", "TO_REVIEW_JUSTIFICATION"].includes(absence.status) && absence.payrollImpactStatus !== "INTEGRATED";
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function formatLongDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

/** « du 12 oct. au 16 oct. 2026 », « le 3 novembre 2026 » */
export function formatDateRange(start: Date, end: Date): string {
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  if (startIso === endIso) return `le ${DATE_FORMAT.format(start)}`;
  if (start.getUTCFullYear() === end.getUTCFullYear()) return `du ${SHORT_DATE_FORMAT.format(start)} au ${DATE_FORMAT.format(end)}`;
  return `du ${DATE_FORMAT.format(start)} au ${DATE_FORMAT.format(end)}`;
}

/** Nombre de jours calendaires, bornes incluses. */
export function calendarDays(start: Date, end: Date): number {
  return Math.round((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86_400_000) + 1;
}

type RequestWindow = { employeeArchivedAt: Date | null; contractEndDate: Date | null; organizationClosedAt: Date | null };

/**
 * Pourquoi le salarié ne peut plus rien demander depuis son espace (absence,
 * choix du papier) : l'employeur a fermé son espace RH, la fiche est archivée
 * ou le contrat est terminé. La consultation des documents, elle, reste ouverte.
 */
export function requestsClosedReason(account: RequestWindow, now = new Date()): "employer-closed" | "contract-ended" | null {
  if (account.organizationClosedAt) return "employer-closed";
  if (account.employeeArchivedAt) return "contract-ended";
  if (account.contractEndDate && account.contractEndDate.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)) return "contract-ended";
  return null;
}

export const REQUESTS_CLOSED_MESSAGES = {
  "employer-closed": "Votre employeur n'utilise plus RH Pilot : les demandes sont fermées. Vos documents restent consultables.",
  "contract-ended": "Votre contrat est terminé : les demandes d'absence sont fermées. Vos documents restent consultables.",
} as const;
