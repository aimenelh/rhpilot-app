/**
 * Fin de contrat en DSN mensuelle (P26V01) : motif S21.G00.62.002, dates de la rupture,
 * préavis S21.G00.63 et indemnités S21.G00.52.
 *
 * Les règles reprennent les contrôles bloquants de Dsn-Val 2026.1 (S21.G00.62.003/CCH-12,
 * .004/CCH-11, .005/CCH-12, .006/CCH-12 et 15, S21.G00.63.001/CCH-11 et 12,
 * .002/CCH-11, 13 et 14, .003/CCH-13 et 14). Le périmètre est volontairement restreint aux
 * ruptures courantes d'une TPE ; les autres motifs restent bloqués plutôt qu'approximés.
 */
import type { TerminationReason } from "./bulletin/types";

export type DsnEndReasonCode =
  | "059" | "031" | "081" | "084" | "036" | "037" | "034" | "035"
  | "020" | "087" | "088" | "091" | "043" | "038" | "039" | "058" | "066";

export type DsnNoticeTypeCode = "01" | "02" | "03" | "60" | "90";

/** Motifs ouverts, avec les motifs de solde de tout compte du moteur qui leur correspondent. */
export const DSN_END_REASONS: ReadonlyArray<{ code: DsnEndReasonCode; label: string; reasons: readonly TerminationReason[] }> = [
  { code: "059", label: "Démission", reasons: ["DEMISSION"] },
  { code: "031", label: "Fin de CDD", reasons: ["FIN_CDD"] },
  { code: "081", label: "Fin de contrat d'apprentissage", reasons: ["FIN_CDD"] },
  { code: "084", label: "Rupture d'un commun accord du CDD ou du contrat d'apprentissage", reasons: ["FIN_CDD", "AUTRE"] },
  { code: "036", label: "Rupture anticipée d'un CDD à l'initiative de l'employeur", reasons: ["FIN_CDD", "LICENCIEMENT"] },
  { code: "037", label: "Rupture anticipée d'un CDD à l'initiative du salarié", reasons: ["FIN_CDD", "DEMISSION"] },
  { code: "034", label: "Fin de période d'essai à l'initiative de l'employeur", reasons: ["FIN_PERIODE_ESSAI"] },
  { code: "035", label: "Fin de période d'essai à l'initiative du salarié", reasons: ["FIN_PERIODE_ESSAI"] },
  { code: "020", label: "Licenciement pour motif personnel (hors faute grave ou lourde)", reasons: ["LICENCIEMENT"] },
  { code: "087", label: "Licenciement pour faute grave", reasons: ["LICENCIEMENT"] },
  { code: "088", label: "Licenciement pour faute lourde", reasons: ["LICENCIEMENT"] },
  { code: "091", label: "Licenciement pour inaptitude d'origine non professionnelle", reasons: ["LICENCIEMENT"] },
  { code: "043", label: "Rupture conventionnelle", reasons: ["RUPTURE_CONVENTIONNELLE"] },
  { code: "038", label: "Mise à la retraite par l'employeur", reasons: ["MISE_A_LA_RETRAITE"] },
  { code: "039", label: "Départ volontaire à la retraite", reasons: ["DEPART_RETRAITE"] },
  { code: "058", label: "Prise d'acte de la rupture", reasons: ["AUTRE"] },
  { code: "066", label: "Décès du salarié", reasons: ["AUTRE"] },
];

export const DSN_NOTICE_TYPES: ReadonlyArray<{ code: DsnNoticeTypeCode; label: string }> = [
  { code: "01", label: "Préavis effectué et payé" },
  { code: "02", label: "Préavis non effectué, payé (indemnité compensatrice)" },
  { code: "03", label: "Préavis non effectué, non payé" },
  { code: "60", label: "Délai de prévenance (période d'essai)" },
  { code: "90", label: "Pas de préavis applicable" },
];

/** Données déclaratives de la fiche de sortie, saisies explicitement et figées au calcul. */
export type TerminationDsnData = {
  endReasonCode: DsnEndReasonCode;
  notificationDate: string | null;
  conventionSignatureDate: string | null;
  dismissalProcedureDate: string | null;
  lastWorkedPaidDate: string | null;
  noticeTypeCode: DsnNoticeTypeCode;
  noticeStartDate: string | null;
  noticeEndDate: string | null;
  transactionPending: boolean;
  /** Part légale d'une indemnité de licenciement ou de retraite ; le surplus est déclaré à part. */
  legalSeveranceAmount: number | null;
};

const NOTIFICATION_REQUIRED = new Set<DsnEndReasonCode>(["020", "034", "035", "036", "037", "058", "059", "087", "088"]);
const PROCEDURE_REQUIRED = new Set<DsnEndReasonCode>(["020", "087", "088", "091"]);
const NOTICE_WITH_DATES = new Set<DsnNoticeTypeCode>(["01", "02", "03", "60"]);
const NOT_WORKED_NOTICES = new Set<DsnNoticeTypeCode>(["02", "03"]);
const SEVERANCE_REASONS = new Set<DsnEndReasonCode>(["020", "091", "043", "038", "039"]);

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Vérifie la cohérence déclarative d'une fin de contrat. Renvoie la première anomalie en
 * français, ou null. Les dates sont au format AAAA-MM-JJ.
 */
export function terminationDsnIssue(data: TerminationDsnData, context: {
  reason: TerminationReason; contractStart: string; contractEnd: string;
  noticeCompensation: number | null; severanceAmount: number | null;
}): string | null {
  const definition = DSN_END_REASONS.find((item) => item.code === data.endReasonCode);
  if (!definition) return "Choisissez le motif de fin de contrat à déclarer en DSN.";
  if (!definition.reasons.includes(context.reason)) return `Le motif DSN « ${definition.label} » ne correspond pas au type de sortie choisi.`;
  for (const value of [data.notificationDate, data.conventionSignatureDate, data.dismissalProcedureDate, data.lastWorkedPaidDate, data.noticeStartDate, data.noticeEndDate]) {
    if (value !== null && !ISO.test(value)) return "Une date de la fiche de sortie est invalide.";
  }
  const { contractStart, contractEnd } = context;
  if (NOTIFICATION_REQUIRED.has(data.endReasonCode) && !data.notificationDate) return "Indiquez la date de notification de la rupture (lettre remise ou présentée, ou démission reçue).";
  if (data.notificationDate && (data.notificationDate < contractStart || data.notificationDate > contractEnd)) return "La date de notification doit être comprise entre le début et la fin du contrat.";
  if (data.endReasonCode === "043" && !data.conventionSignatureDate) return "Indiquez la date de signature de la convention de rupture.";
  if (data.conventionSignatureDate && data.conventionSignatureDate >= contractEnd) return "La convention de rupture doit être signée avant la fin du contrat.";
  if (PROCEDURE_REQUIRED.has(data.endReasonCode) && !data.dismissalProcedureDate) return "Indiquez la date d'engagement de la procédure de licenciement (convocation à l'entretien préalable).";
  if (data.dismissalProcedureDate && data.dismissalProcedureDate > contractEnd) return "La procédure de licenciement ne peut pas être engagée après la fin du contrat.";

  const definitionNotice = DSN_NOTICE_TYPES.find((item) => item.code === data.noticeTypeCode);
  if (!definitionNotice) return "Choisissez la situation du préavis.";
  if ((data.endReasonCode === "034" || data.endReasonCode === "035") && !["60", "90"].includes(data.noticeTypeCode)) return "Une fin de période d'essai relève d'un délai de prévenance ou d'aucun préavis.";
  if (data.endReasonCode === "043" && data.noticeTypeCode !== "90") return "Une rupture conventionnelle ne comporte pas de préavis.";
  const notice = context.noticeCompensation ?? 0;
  if (notice > 0 && data.noticeTypeCode !== "02") return "Une indemnité compensatrice de préavis est saisie : le préavis doit être « non effectué, payé ».";
  if (data.noticeTypeCode === "02" && notice <= 0) return "Préavis non effectué mais payé : saisissez le montant de l'indemnité compensatrice de préavis.";
  if (NOTICE_WITH_DATES.has(data.noticeTypeCode)) {
    if (!data.noticeStartDate || !data.noticeEndDate) return "Indiquez les dates de début et de fin du préavis.";
    if (data.noticeEndDate < data.noticeStartDate) return "Le préavis se termine avant de commencer.";
    if (data.noticeStartDate < contractStart) return "Le préavis ne peut pas commencer avant le contrat.";
    if (data.notificationDate && data.noticeStartDate < data.notificationDate) return "Le préavis ne peut pas commencer avant la notification de la rupture.";
    if (data.dismissalProcedureDate && data.noticeStartDate <= data.dismissalProcedureDate) return "Le préavis commence après l'engagement de la procédure de licenciement.";
  } else if (data.noticeStartDate || data.noticeEndDate) {
    return "Sans préavis applicable, ne renseignez pas de dates de préavis.";
  }
  if (data.lastWorkedPaidDate) {
    if (data.lastWorkedPaidDate < contractStart || data.lastWorkedPaidDate > contractEnd) return "Le dernier jour travaillé et payé doit être compris dans le contrat.";
    if (NOT_WORKED_NOTICES.has(data.noticeTypeCode) && data.noticeStartDate && data.lastWorkedPaidDate >= data.noticeStartDate) return "Le préavis n'étant pas effectué, le dernier jour travaillé précède son début.";
  }

  const severance = context.severanceAmount ?? 0;
  if (severance > 0) {
    if (!SEVERANCE_REASONS.has(data.endReasonCode)) return "Une indemnité de rupture n'est déclarable que pour un licenciement (hors faute grave ou lourde), une rupture conventionnelle ou un départ en retraite.";
    if (data.endReasonCode !== "043") {
      if (data.legalSeveranceAmount === null) return "Indiquez la part légale de l'indemnité : le surplus conventionnel ou contractuel est déclaré séparément.";
      if (data.legalSeveranceAmount < 0 || data.legalSeveranceAmount > severance + 0.005) return "La part légale ne peut pas dépasser l'indemnité versée.";
    }
  }
  return null;
}

/**
 * Contrôle minimal exigé au calcul et pour la DSN mensuelle : motif cohérent et ventilation
 * de l'indemnité. Les dates et le préavis, contrôlés à la saisie, servent au signalement FCTU.
 */
export function terminationMonthlyIssue(data: Pick<TerminationDsnData, "endReasonCode" | "legalSeveranceAmount">, context: { reason: TerminationReason; severanceAmount: number | null }): string | null {
  const definition = DSN_END_REASONS.find((item) => item.code === data.endReasonCode);
  if (!definition) return "Choisissez le motif de fin de contrat à déclarer en DSN.";
  if (!definition.reasons.includes(context.reason)) return `Le motif DSN « ${definition.label} » ne correspond pas au type de sortie choisi.`;
  const severance = context.severanceAmount ?? 0;
  if (severance > 0) {
    if (!SEVERANCE_REASONS.has(data.endReasonCode)) return "Une indemnité de rupture n'est déclarable que pour un licenciement (hors faute grave ou lourde), une rupture conventionnelle ou un départ en retraite.";
    if (data.endReasonCode !== "043" && (data.legalSeveranceAmount === null || data.legalSeveranceAmount < 0 || data.legalSeveranceAmount > severance + 0.005)) return "Indiquez la part légale de l'indemnité, sans dépasser l'indemnité versée.";
  }
  return null;
}

type IndemnityLine = { code: string; amount?: number };

/**
 * Indemnités S21.G00.52 d'une fin de contrat, à partir des lignes figées du bulletin.
 * Types P26V01 : 011 fin de CDD, 020 compensatrice de congés payés, 023 compensatrice de
 * préavis, 001 rupture conventionnelle, 003/004 mise à la retraite, 005/006 départ en
 * retraite, 007 licenciement légal, 021 surplus conventionnel.
 */
export function terminationIndemnities(lines: readonly IndemnityLine[], data: TerminationDsnData): Array<{ type: string; amount: number }> {
  const sum = (code: string) => Math.round(lines.filter((line) => line.code === code).reduce((total, line) => total + (line.amount ?? 0), 0) * 100) / 100;
  const out: Array<{ type: string; amount: number }> = [];
  const push = (type: string, amount: number) => { if (amount > 0) out.push({ type, amount: Math.round(amount * 100) / 100 }); };
  push("011", sum("CDD_END_ALLOWANCE"));
  push("020", sum("PAID_LEAVE_COMPENSATION"));
  push("023", sum("NOTICE_COMPENSATION"));
  const severance = sum("SEVERANCE");
  if (severance > 0) {
    if (!SEVERANCE_REASONS.has(data.endReasonCode)) throw new Error("DSN bloquée : une indemnité de rupture est versée pour un motif qui n'en prévoit pas dans le périmètre actuel.");
    if (data.endReasonCode === "043") push("001", severance);
    else {
      const legal = data.legalSeveranceAmount;
      if (legal === null || legal < 0 || legal > severance + 0.005) throw new Error("DSN bloquée : la part légale de l'indemnité de rupture est absente ou incohérente.");
      const [legalType, extraType] = data.endReasonCode === "038" ? ["003", "004"] : data.endReasonCode === "039" ? ["005", "006"] : ["007", "021"];
      push(legalType, legal);
      push(extraType, severance - legal);
    }
  }
  return out;
}

/** Montants du bulletin relatifs à la rupture, exclus du salaire servant aux droits chômage (51 type 002). */
export const TERMINATION_INDEMNITY_CODES: ReadonlySet<string> = new Set(["CDD_END_ALLOWANCE", "PAID_LEAVE_COMPENSATION", "NOTICE_COMPENSATION", "SEVERANCE"]);

const day = (value: string | null): Date | null => (value ? new Date(`${value}T00:00:00.000Z`) : null);

/** Bloc fin de contrat du générateur à partir des données figées. */
export function dsnContractEnd(end: { date: string; data: TerminationDsnData }) {
  const { data } = end;
  return {
    endDate: new Date(`${end.date}T00:00:00.000Z`), reasonCode: data.endReasonCode,
    notificationDate: day(data.notificationDate), conventionSignatureDate: day(data.conventionSignatureDate),
    dismissalProcedureDate: day(data.dismissalProcedureDate), lastWorkedPaidDate: day(data.lastWorkedPaidDate),
    transactionPending: data.transactionPending,
    notice: { typeCode: data.noticeTypeCode, startDate: day(data.noticeStartDate), endDate: day(data.noticeEndDate) },
  };
}
