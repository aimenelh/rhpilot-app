import { DSN_NORM_VERSION, dsnP26Format, type DsnLine, type DsnP26MonthlyInput } from "./dsn-p26v01";
import { assertNirFormat } from "./dsn-pii";
import { dsnPaymentBic, dsnPaymentIban } from "./dsn-payment-settings";

export type DsnWorkEventNature = "04" | "05";
type Stoppage = NonNullable<DsnP26MonthlyInput["employees"][number]["contract"]["workStoppages"]>[number];
export type DsnWorkEventInput = {
  testMode: boolean;
  nature: DsnWorkEventNature;
  declarationOrder: number;
  businessId: string;
  fileDate: Date;
  emitter: Omit<DsnP26MonthlyInput["emitter"], "enterpriseApenCode">;
  employee: Pick<DsnP26MonthlyInput["employees"][number], "nir" | "lastName" | "firstName" | "birthDate"> & {
    contractStartDate: Date;
    contractNumber: string;
    workLocationId: string;
  };
  stoppage: Stoppage & { startDate: Date };
};

const calendar = (date: Date): number => {
  dsnP26Format.dsnDate(date);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/** Contrôle les données métier avant de produire un signalement 04/05 en mode test. */
export function assertDsnWorkEvent(input: DsnWorkEventInput): void {
  if (!input.testMode) throw new Error("DSN bloquée : le dépôt réel des signalements n'est pas ouvert.");
  if (input.nature !== "04" && input.nature !== "05") throw new Error("DSN bloquée : la nature du signalement est invalide.");
  if (!Number.isSafeInteger(input.declarationOrder) || input.declarationOrder < 1 || input.declarationOrder > 999999999999999) throw new Error("DSN bloquée : le numéro d'ordre du signalement est invalide.");
  dsnP26Format.assertCode(input.businessId, "l'identifiant métier du signalement", 1, 15);
  const start = calendar(input.stoppage.startDate);
  const fileDate = calendar(input.fileDate);
  if (input.fileDate.getUTCFullYear() !== 2026 || start > fileDate) throw new Error("DSN bloquée : P26V01 couvre les signalements 2026 d'événements déjà survenus.");
  const hire = calendar(input.employee.contractStartDate);
  const lastWorked = calendar(input.stoppage.lastDayWorked);
  const end = calendar(input.stoppage.expectedEndDate);
  if (start < hire || lastWorked < hire || lastWorked > start || end < start) throw new Error("DSN bloquée : les dates de l'arrêt et du contrat sont incohérentes.");
  if (!["01", "02", "03", "06"].includes(input.stoppage.reasonCode)) throw new Error("DSN bloquée : le motif d'arrêt n'est pas pris en charge.");
  if (input.stoppage.reasonCode === "06") {
    if (!input.stoppage.accidentDate || calendar(input.stoppage.accidentDate) < hire || calendar(input.stoppage.accidentDate) > start) throw new Error("DSN bloquée : la date d'accident du travail est absente ou incohérente.");
  } else if (input.stoppage.accidentDate) throw new Error("DSN bloquée : une date d'accident accompagne un autre motif d'arrêt.");
  const recovery = input.stoppage.recoveryDate;
  const reason = input.stoppage.recoveryReasonCode;
  if (Boolean(recovery) !== Boolean(reason)) throw new Error("DSN bloquée : renseignez ensemble la date et le motif de reprise.");
  if (reason === "02") throw new Error("DSN bloquée : la reprise à temps partiel thérapeutique nécessite des données spécifiques non couvertes.");
  if (recovery && (calendar(recovery) <= start || calendar(recovery) > fileDate || (reason !== "01" && reason !== "03"))) throw new Error("DSN bloquée : la reprise de travail est incohérente ou n'est pas encore survenue.");
  if (input.nature === "05" && (!recovery || calendar(recovery) > end)) throw new Error("DSN bloquée : le signalement de reprise est réservé aux reprises anticipées. La reprise à la date prévue est déclarée dans la DSN mensuelle.");
  const sub = input.stoppage;
  if (sub.subrogationCode !== "01" && sub.subrogationCode !== "02") throw new Error("DSN bloquée : l'indicateur de subrogation est invalide.");
  if (sub.subrogationCode === "01") {
    if (!sub.subrogationStartDate || !sub.subrogationEndDate || calendar(sub.subrogationEndDate) < calendar(sub.subrogationStartDate) || calendar(sub.subrogationStartDate) > end || calendar(sub.subrogationStartDate) > fileDate || calendar(sub.subrogationEndDate) < start) throw new Error("DSN bloquée : la période de subrogation est absente ou incohérente.");
    dsnPaymentIban(sub.subrogationIban ?? "");
    dsnPaymentBic(sub.subrogationBic ?? "");
  } else if (sub.subrogationStartDate || sub.subrogationEndDate || sub.subrogationIban || sub.subrogationBic) throw new Error("DSN bloquée : des données de subrogation sont présentes sans subrogation.");
  if (calendar(input.employee.birthDate) >= hire) throw new Error("DSN bloquée : la date de naissance ne précède pas le contrat.");
  const nir = assertNirFormat(input.employee.nir);
  if (input.businessId === nir) throw new Error("DSN bloquée : l'identifiant métier du signalement doit être distinct du NIR.");
  if (nir.slice(1, 3) !== String(input.employee.birthDate.getUTCFullYear()).slice(-2)) throw new Error("DSN bloquée : l'année de naissance du NIR ne correspond pas à l'identité.");
  if (dsnP26Format.siretParts(input.employee.workLocationId).siret !== dsnP26Format.siretParts(input.emitter.siret).siret) throw new Error("DSN bloquée : le lieu de travail doit correspondre à l'établissement déclaré pour ce signalement.");
}

/** Usages P26V01 : aucune rubrique mensuelle de paie ou de cotisation dans un 04/05. */
export function buildDsnP26WorkEvent(input: DsnWorkEventInput): string {
  assertDsnWorkEvent(input);
  const { add, text, assertCode, dsnDate, siretParts, serialize } = dsnP26Format;
  const { siren, nic } = siretParts(input.emitter.siret);
  const lines: DsnLine[] = [];
  add(lines, "S10.G00.00.001", "RH Pilot");
  add(lines, "S10.G00.00.002", "RH Pilot");
  add(lines, "S10.G00.00.003", "0.1.0");
  add(lines, "S10.G00.00.005", "01");
  add(lines, "S10.G00.00.006", DSN_NORM_VERSION);
  add(lines, "S10.G00.00.007", "01");
  add(lines, "S10.G00.00.008", "01");
  add(lines, "S10.G00.01.001", siren);
  add(lines, "S10.G00.01.002", nic);
  add(lines, "S10.G00.01.003", text(input.emitter.name, "la raison sociale"));
  add(lines, "S10.G00.01.004", text(input.emitter.address, "l'adresse de l'émetteur"));
  add(lines, "S10.G00.01.005", text(input.emitter.postalCode, "le code postal"));
  add(lines, "S10.G00.01.006", text(input.emitter.city, "la ville"));
  add(lines, "S10.G00.02.002", text(input.emitter.contactName, "le contact DSN"));
  add(lines, "S10.G00.02.004", text(input.emitter.contactEmail, "l'e-mail DSN"));
  add(lines, "S10.G00.02.005", text(input.emitter.contactPhone, "le téléphone DSN"));
  add(lines, "S20.G00.05.001", input.nature);
  add(lines, "S20.G00.05.002", "01");
  add(lines, "S20.G00.05.003", "11");
  add(lines, "S20.G00.05.004", String(input.declarationOrder));
  add(lines, "S20.G00.05.007", dsnDate(input.fileDate));
  add(lines, "S20.G00.05.009", assertCode(input.businessId, "l'identifiant métier", 1, 15));
  add(lines, "S20.G00.07.001", text(input.emitter.contactName, "le contact chez le déclaré"));
  add(lines, "S20.G00.07.002", text(input.emitter.contactPhone, "le téléphone chez le déclaré"));
  add(lines, "S20.G00.07.003", text(input.emitter.contactEmail, "l'e-mail chez le déclaré"));
  add(lines, "S20.G00.07.004", assertCode(input.emitter.declaredContactType, "le type de contact", 2, 2));
  add(lines, "S21.G00.06.001", siren);
  add(lines, "S21.G00.11.001", nic);
  add(lines, "S21.G00.11.003", text(input.emitter.address, "l'adresse de l'établissement"));
  add(lines, "S21.G00.11.004", text(input.emitter.postalCode, "le code postal de l'établissement"));
  add(lines, "S21.G00.11.005", text(input.emitter.city, "la ville de l'établissement"));
  add(lines, "S21.G00.30.001", assertNirFormat(input.employee.nir));
  add(lines, "S21.G00.30.002", text(input.employee.lastName, "le nom du salarié"));
  add(lines, "S21.G00.30.004", text(input.employee.firstName, "le prénom du salarié"));
  add(lines, "S21.G00.30.006", dsnDate(input.employee.birthDate));
  add(lines, "S21.G00.40.001", dsnDate(input.employee.contractStartDate));
  add(lines, "S21.G00.40.009", assertCode(input.employee.contractNumber, "le numéro de contrat", 5, 20));
  add(lines, "S21.G00.40.019", siretParts(input.employee.workLocationId).siret);
  const stop = input.stoppage;
  add(lines, "S21.G00.60.001", stop.reasonCode);
  add(lines, "S21.G00.60.002", dsnDate(stop.lastDayWorked));
  add(lines, "S21.G00.60.003", dsnDate(stop.expectedEndDate));
  if (input.nature === "04") {
    add(lines, "S21.G00.60.004", stop.subrogationCode);
    if (stop.subrogationCode === "01") {
      add(lines, "S21.G00.60.005", dsnDate(stop.subrogationStartDate!));
      add(lines, "S21.G00.60.006", dsnDate(stop.subrogationEndDate!));
      add(lines, "S21.G00.60.007", dsnPaymentIban(stop.subrogationIban!));
      add(lines, "S21.G00.60.008", dsnPaymentBic(stop.subrogationBic!));
    }
  }
  if (stop.recoveryDate) {
    add(lines, "S21.G00.60.010", dsnDate(stop.recoveryDate));
    add(lines, "S21.G00.60.011", stop.recoveryReasonCode);
  }
  if (stop.accidentDate) add(lines, "S21.G00.60.012", dsnDate(stop.accidentDate));
  add(lines, "S90.G00.90.001", String(lines.length + 2));
  add(lines, "S90.G00.90.002", "1");
  return serialize(lines);
}
