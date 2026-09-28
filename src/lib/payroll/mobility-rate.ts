/**
 * Taux de versement mobilité d'un établissement, lu dans le barème officiel
 * publié par l'Urssaf (jeu de données open data « table_taux_vmrr » : taux
 * par commune et par période, versement mobilité, additionnel et régional).
 *
 * Le taux dû est la somme des trois composantes en vigueur à la date de la
 * paie. Une commune absente du barème, ou dont toutes les périodes sont
 * closes, n'est pas assujettie : le taux est 0.
 *
 * Les fonctions de lecture sont pures ; fetchMobilityRate interroge l'API.
 */
import { parentCommuneCode } from "@/lib/company-registry";

export const URSSAF_MOBILITY_DATASET_URL = "https://open.urssaf.fr/api/explore/v2.1/catalog/datasets/table_taux_vmrr/records";
export const URSSAF_MOBILITY_PAGE_URL = "https://open.urssaf.fr/explore/dataset/table_taux_vmrr/";

export type MobilityRateRecord = {
  communeCode: string;
  communeName: string | null;
  /** AAAA-MM-JJ */
  from: string;
  /** AAAA-MM-JJ, null si la période est ouverte */
  until: string | null;
  vm: number;
  vma: number;
  vmr: number;
};

export type MobilityRateSelection = {
  ratePercent: number;
  communeCode: string;
  communeName: string | null;
  validFrom: string | null;
  validUntil: string | null;
  components: { vm: number; vma: number; vmr: number };
  /** false : la commune n'est pas (ou plus) dans le périmètre d'une autorité organisatrice de la mobilité. */
  applicable: boolean;
};

export type MobilityRateResolution =
  | ({ status: "RESOLVED" } & MobilityRateSelection)
  | { status: "UNAVAILABLE"; message: string };

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function rate(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const number = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/** « 20251101 », « 2025-11-01 » ou « 2025-11-01T00:00:00+00:00 » vers « 2025-11-01 ». */
export function normalizeUrssafDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (french) return `${french[3]}-${french[2]}-${french[1]}`;
  return null;
}

/** Lecture tolérante d'une réponse de l'API Explore v2.1 (results) ou v2.0 (records[].record.fields). */
export function parseUrssafMobilityRecords(payload: unknown): MobilityRateRecord[] {
  const body = asObject(payload);
  const rows: unknown[] = Array.isArray(body?.results)
    ? body.results
    : Array.isArray(body?.records)
      ? body.records.map((entry) => asObject(asObject(asObject(entry)?.record)?.fields) ?? asObject(asObject(entry)?.fields) ?? entry)
      : Array.isArray(payload) ? payload : [];
  const records: MobilityRateRecord[] = [];
  for (const raw of rows) {
    const row = asObject(raw);
    if (!row) continue;
    const communeCode = text(row.code_commune)?.padStart(5, "0") ?? null;
    const from = normalizeUrssafDate(row.date_debut ?? row.date_effet);
    if (!communeCode || !from) continue;
    const until = normalizeUrssafDate(row.date_fin);
    records.push({
      communeCode,
      communeName: text(row.nom_commune) ?? text(row.libelle_commune),
      from,
      until: until && until < "9000-01-01" ? until : null,
      vm: rate(row.taux_vm),
      vma: rate(row.taux_vma),
      vmr: rate(row.taux_vmr ?? row.taux_vmrr),
    });
  }
  return records;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Taux en vigueur le jour donné (AAAA-MM-JJ) pour la commune. Si plusieurs
 * lignes couvrent ce jour, la plus récente l'emporte.
 */
export function selectMobilityRate(records: MobilityRateRecord[], communeCode: string, day: string): MobilityRateSelection {
  const forCommune = records.filter((record) => record.communeCode === communeCode);
  const covering = forCommune
    .filter((record) => record.from <= day && (record.until === null || record.until >= day))
    .sort((a, b) => b.from.localeCompare(a.from));
  const current = covering[0];
  const communeName = current?.communeName ?? forCommune[0]?.communeName ?? null;
  if (!current) {
    return { ratePercent: 0, communeCode, communeName, validFrom: null, validUntil: null, components: { vm: 0, vma: 0, vmr: 0 }, applicable: false };
  }
  const components = { vm: round3(current.vm), vma: round3(current.vma), vmr: round3(current.vmr) };
  const ratePercent = round3(components.vm + components.vma + components.vmr);
  return { ratePercent, communeCode, communeName, validFrom: current.from, validUntil: current.until, components, applicable: ratePercent > 0 };
}

const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Libellé court de la provenance du taux, affiché dans les paramètres et conservé en base. */
export function describeMobilityRate(selection: MobilityRateSelection): string {
  const place = selection.communeName ? `${selection.communeName} (${selection.communeCode})` : `commune ${selection.communeCode}`;
  if (!selection.applicable) return `Barème Urssaf : ${place} n'est pas assujettie au versement mobilité.`;
  const parts = [`${selection.components.vm} % VM`];
  if (selection.components.vma > 0) parts.push(`${selection.components.vma} % additionnel`);
  if (selection.components.vmr > 0) parts.push(`${selection.components.vmr} % régional`);
  const since = selection.validFrom ? `, en vigueur depuis le ${frDate(selection.validFrom)}` : "";
  return `Barème Urssaf : ${place}, ${parts.join(" + ")}${since}.`;
}

type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal; cache?: RequestCache }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

async function fetchRecords(fetchImpl: FetchLike, communeCode: string, timeoutMs: number): Promise<MobilityRateRecord[] | null> {
  const exact = `${URSSAF_MOBILITY_DATASET_URL}?where=${encodeURIComponent(`code_commune="${communeCode}"`)}&order_by=${encodeURIComponent("date_debut desc")}&limit=100`;
  // Repli : recherche plein texte (celle qui fonctionne sans connaître le type exact du champ), filtrée ensuite.
  const fullText = `${URSSAF_MOBILITY_DATASET_URL}?where=${encodeURIComponent(`"${communeCode}"`)}&limit=100`;
  const load = async (url: string): Promise<MobilityRateRecord[] | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
      if (!response.ok) return null;
      return parseUrssafMobilityRecords(await response.json()).filter((record) => record.communeCode === communeCode);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  const first = await load(exact);
  if (first && first.length > 0) return first;
  // Aucune ligne ou erreur : on confirme par la recherche plein texte. Sans cette confirmation,
  // on ne conclut jamais à une commune non assujettie (taux 0) : c'est « indisponible ».
  return load(fullText);
}

export async function fetchMobilityRate(communeCode: string, day: string, options: { fetchImpl?: FetchLike; timeoutMs?: number } = {}): Promise<MobilityRateResolution> {
  const code = communeCode.trim().toUpperCase();
  if (!/^(\d{5}|2[AB]\d{3})$/.test(code)) return { status: "UNAVAILABLE", message: "Le code commune Insee de l'établissement est absent ou invalide." };
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const timeoutMs = options.timeoutMs ?? 6000;

  const records = await fetchRecords(fetchImpl, code, timeoutMs);
  if (records === null) return { status: "UNAVAILABLE", message: "Le barème du versement mobilité de l'Urssaf ne répond pas pour le moment." };
  if (records.length === 0) {
    const parent = parentCommuneCode(code);
    if (parent) {
      const parentRecords = await fetchRecords(fetchImpl, parent, timeoutMs);
      if (parentRecords === null) return { status: "UNAVAILABLE", message: "Le barème du versement mobilité de l'Urssaf ne répond pas pour le moment." };
      if (parentRecords.length > 0) return { status: "RESOLVED", ...selectMobilityRate(parentRecords, parent, day) };
    }
  }
  return { status: "RESOLVED", ...selectMobilityRate(records, code, day) };
}
