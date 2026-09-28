/**
 * Bulletin de paie électronique : règles de l'information préalable
 * (C. trav. art. D3243-7).
 *
 * Module pur, sans génération de PDF : il peut être importé par les
 * composants client sans embarquer pdfkit dans le bundle du navigateur.
 */

export type NoticeMethod = "HAND_DELIVERY" | "REGISTERED_MAIL" | "ELECTRONIC_REGISTERED_MAIL" | "AT_HIRING";

export const NOTICE_METHODS: ReadonlyArray<{ value: NoticeMethod; label: string }> = [
  { value: "HAND_DELIVERY", label: "Remise en main propre contre signature" },
  { value: "REGISTERED_MAIL", label: "Lettre recommandée avec accusé de réception" },
  { value: "ELECTRONIC_REGISTERED_MAIL", label: "Lettre recommandée électronique" },
  { value: "AT_HIRING", label: "À l'embauche (contrat ou note signée à l'arrivée)" },
];

export function isNoticeMethod(value: unknown): value is NoticeMethod {
  return typeof value === "string" && NOTICE_METHODS.some((method) => method.value === value);
}

export function noticeMethodLabel(method: string | null | undefined): string {
  return NOTICE_METHODS.find((entry) => entry.value === method)?.label ?? "Mode non précisé";
}

/** Même jour le mois suivant (dernier jour du mois s'il n'existe pas). */
export function addOneMonth(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const targetMonth = month === 12 ? 1 : month + 1;
  const targetYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export type ElectronicReadiness =
  | { ready: true }
  | { ready: false; reason: "NOT_INFORMED" }
  | { ready: false; reason: "WAITING"; availableFrom: string };

/**
 * Le bulletin peut-il être remis sous forme électronique aujourd'hui ?
 * Un salarié qui en a déjà reçu un n'est pas bloqué : l'information porte sur
 * la première émission.
 */
export function electronicPayslipReadiness(input: { noticeAt: string | null; method: string | null; alreadyReceivedElectronic: boolean; today: string }): ElectronicReadiness {
  if (input.alreadyReceivedElectronic) return { ready: true };
  if (!input.noticeAt) return { ready: false, reason: "NOT_INFORMED" };
  if (input.method === "AT_HIRING") return { ready: true };
  const availableFrom = addOneMonth(input.noticeAt);
  if (availableFrom <= input.today.slice(0, 10)) return { ready: true };
  return { ready: false, reason: "WAITING", availableFrom };
}
