/**
 * Identité d'une entreprise retrouvée à partir de son SIRET dans les
 * registres publics de l'État, pour éviter de la faire saisir aux RH.
 *
 * Sources (gratuites, sans clé) :
 * - API Recherche d'entreprises (DINUM, données Sirene de l'Insee) :
 *   forme juridique, date de création, code APE, adresse et commune de
 *   l'établissement, conventions collectives déclarées en DSN (IDCC) ;
 * - API recherche-entreprises de la Fabrique numérique des ministères
 *   sociaux (celle du Code du travail numérique) : intitulés des
 *   conventions collectives.
 *
 * Les fonctions de lecture sont pures et testées ; seule
 * lookupCompanyBySiret touche au réseau.
 */
// Import de type seulement : le moteur social (publicodes) ne doit pas entrer dans le bundle des routes.
import type { LegalCategory } from "@/lib/payroll/social-engine";

const LEGAL_CATEGORIES: readonly LegalCategory[] = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"];

export const RECHERCHE_ENTREPRISES_URL = "https://recherche-entreprises.api.gouv.fr/search";
export const FABRIQUE_SEARCH_URL = "https://api.recherche-entreprises.fabrique.social.gouv.fr/api/v1/search";
export const REGISTRY_SOURCE_LABEL = "Répertoire Sirene de l'Insee (API Recherche d'entreprises)";

export type RegistryConvention = { idcc: string; title: string | null };

export type CompanyRegistryRecord = {
  siret: string;
  siren: string;
  name: string | null;
  /** Code de catégorie juridique Insee à 4 chiffres (ex. 5499). */
  legalNatureCode: string | null;
  legalCategory: LegalCategory | null;
  /** Date de création de l'unité légale, AAAA-MM-JJ. */
  creationDate: string | null;
  /** Code APE de l'établissement au format DSN (ex. 6202A). */
  nafCode: string | null;
  /** Ligne d'adresse sans code postal ni commune. */
  address: string | null;
  postalCode: string | null;
  city: string | null;
  /** Code commune Insee de l'établissement (ex. 34172, 75109). */
  communeCode: string | null;
  department: string | null;
  /** Tranche d'effectif Insee (code), indicative uniquement. */
  headcountRange: string | null;
  /** IDCC déclarés pour l'établissement (à défaut pour l'entreprise), hors codes techniques. */
  conventions: RegistryConvention[];
  /** false si le SIRET demandé n'a pas été retrouvé et que les données viennent du siège. */
  establishmentMatched: boolean;
  active: boolean;
};

export type CompanyLookupResult =
  | { status: "FOUND"; record: CompanyRegistryRecord }
  | { status: "NOT_FOUND"; message: string }
  | { status: "UNAVAILABLE"; message: string };

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function asText(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Catégorie juridique Insee (niveau III) vers les catégories du moteur social.
 * 1000 entrepreneur individuel, 54xx SARL (dont 5498 EURL), 5485 SELARL,
 * 5710/5720 SAS et SASU, 5770 SPFPL de forme SAS, 5785 SELAS, 92xx associations.
 */
export function legalCategoryFromNatureCode(code: string | null | undefined): LegalCategory | null {
  const value = asText(code);
  if (!value || !/^\d{4}$/.test(value)) return null;
  if (value === "1000") return "EI";
  if (value === "5485") return "SELARL";
  if (value === "5785") return "SELAS";
  if (value.startsWith("54")) return "SARL";
  if (value === "5710" || value === "5720" || value === "5770") return "SAS";
  if (value.startsWith("92")) return "association";
  return "autre";
}

/** « 62.02A » ou « 6202a » vers « 6202A » (format DSN et bulletin). */
export function normalizeNafCode(code: unknown): string | null {
  const value = asText(code)?.replace(/[.\s]/g, "").toUpperCase() ?? null;
  return value && /^\d{4}[A-Z]$/.test(value) ? value : null;
}

/** Département à partir du code commune Insee, à défaut du code postal. */
export function departmentFromCommune(communeCode: unknown, postalCode?: unknown): string | null {
  const commune = asText(communeCode)?.toUpperCase() ?? null;
  if (commune && /^(\d{5}|2[AB]\d{3})$/.test(commune)) {
    if (commune.startsWith("97") || commune.startsWith("98")) return commune.slice(0, 3);
    return commune.slice(0, 2);
  }
  const postal = asText(postalCode);
  if (postal && /^\d{5}$/.test(postal)) {
    if (postal.startsWith("97") || postal.startsWith("98")) return postal.slice(0, 3);
    if (postal.startsWith("20")) return Number(postal) < 20200 ? "2A" : "2B";
    return postal.slice(0, 2);
  }
  return null;
}

/**
 * Paris, Lyon et Marseille : Sirene donne l'arrondissement (75109), certaines
 * tables officielles n'utilisent que la commune (75056). Renvoie la commune.
 */
export function parentCommuneCode(communeCode: string): string | null {
  const code = Number(communeCode);
  if (!/^\d{5}$/.test(communeCode)) return null;
  if (code >= 75101 && code <= 75120) return "75056";
  if (code >= 69381 && code <= 69389) return "69123";
  if (code >= 13201 && code <= 13216) return "13055";
  return null;
}

/** IDCC exploitables : 4 chiffres, hors 9998 (convention non encore en vigueur) et 9999 (sans convention). */
export function usableIdccs(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  for (const raw of values) {
    const text = asText(raw);
    if (!text || !/^\d{1,4}$/.test(text)) continue;
    const idcc = text.padStart(4, "0");
    if (idcc === "0000" || idcc === "9998" || idcc === "9999") continue;
    seen.add(idcc);
  }
  return [...seen];
}

/** « 8 RUE DE LONDRES 75009 PARIS » vers « 8 RUE DE LONDRES ». */
export function streetLineFromAddress(address: unknown, postalCode: string | null, city: string | null): string | null {
  let value = asText(address);
  if (!value) return null;
  if (postalCode) {
    const index = value.lastIndexOf(` ${postalCode}`);
    if (index > 0) value = value.slice(0, index);
  } else if (city && value.toUpperCase().endsWith(` ${city.toUpperCase()}`)) {
    value = value.slice(0, value.length - city.length - 1);
  }
  return value.trim() || null;
}

function streetLineFromParts(establishment: Json): string | null {
  const parts = [establishment.numero_voie, establishment.indice_repetition, establishment.type_voie, establishment.libelle_voie]
    .map(asText)
    .filter((part): part is string => Boolean(part));
  if (parts.length < 2) return null;
  const complement = asText(establishment.complement_adresse);
  return [complement, parts.join(" ")].filter(Boolean).join(", ");
}

/**
 * Lecture d'une réponse de l'API Recherche d'entreprises. Ne retient que le
 * résultat dont le SIREN correspond : la recherche est plein texte et peut
 * renvoyer une autre entreprise quand le numéro est inconnu.
 */
export function parseRechercheEntreprises(payload: unknown, siret: string): CompanyRegistryRecord | null {
  const siren = siret.slice(0, 9);
  const results = asObject(payload)?.results;
  if (!Array.isArray(results)) return null;
  const company = results.map(asObject).find((result) => result && asText(result.siren) === siren);
  if (!company) return null;

  const siege = asObject(company.siege);
  const matching = Array.isArray(company.matching_etablissements) ? company.matching_etablissements.map(asObject) : [];
  const exact = matching.find((establishment) => establishment && asText(establishment.siret) === siret)
    ?? (siege && asText(siege.siret) === siret ? siege : null);
  const establishment = exact ?? siege ?? {};

  const postalCode = asText(establishment.code_postal);
  const city = asText(establishment.libelle_commune);
  const communeCode = asText(establishment.commune);
  const complements = asObject(company.complements);
  const establishmentIdccs = usableIdccs(establishment.liste_idcc);
  const idccs = establishmentIdccs.length > 0 ? establishmentIdccs : usableIdccs(complements?.liste_idcc);
  const natureCode = asText(company.nature_juridique);
  const creationDate = asText(company.date_creation);

  return {
    siret,
    siren,
    name: asText(company.nom_complet) ?? asText(company.nom_raison_sociale),
    legalNatureCode: natureCode,
    legalCategory: legalCategoryFromNatureCode(natureCode),
    creationDate: creationDate && /^\d{4}-\d{2}-\d{2}$/.test(creationDate) ? creationDate : null,
    nafCode: normalizeNafCode(establishment.activite_principale) ?? normalizeNafCode(company.activite_principale),
    address: streetLineFromParts(establishment) ?? streetLineFromAddress(establishment.adresse, postalCode, city),
    postalCode,
    city,
    communeCode,
    department: asText(establishment.departement) ?? departmentFromCommune(communeCode, postalCode),
    headcountRange: asText(establishment.tranche_effectif_salarie) ?? asText(company.tranche_effectif_salarie),
    conventions: idccs.map((idcc) => ({ idcc, title: null })),
    establishmentMatched: Boolean(exact),
    active: asText(establishment.etat_administratif) !== "F" && asText(company.etat_administratif) !== "C",
  };
}

/** Intitulés des conventions (Fabrique numérique des ministères sociaux). */
export function parseFabriqueConventions(payload: unknown, siret: string): RegistryConvention[] {
  const companies = asObject(payload)?.entreprises;
  if (!Array.isArray(companies)) return [];
  const company = companies.map(asObject).find((entry) => entry && asText(entry.siren) === siret.slice(0, 9));
  if (!company || !Array.isArray(company.conventions)) return [];
  const conventions: RegistryConvention[] = [];
  for (const raw of company.conventions) {
    const convention = asObject(raw);
    const [idcc] = usableIdccs([convention?.idcc]);
    if (!idcc) continue;
    conventions.push({ idcc, title: asText(convention?.shortTitle) ?? asText(convention?.title) });
  }
  return conventions;
}

/** Complète les IDCC Sirene avec les intitulés de la Fabrique (et ses IDCC si Sirene n'en a pas). */
export function mergeConventions(fromSirene: RegistryConvention[], fromFabrique: RegistryConvention[]): RegistryConvention[] {
  const titles = new Map(fromFabrique.map((convention) => [convention.idcc, convention.title]));
  const base = fromSirene.length > 0 ? fromSirene : fromFabrique;
  return base.map((convention) => ({ idcc: convention.idcc, title: titles.get(convention.idcc) ?? convention.title }));
}

type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal; cache?: RequestCache }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

async function getJson(fetchImpl: FetchLike, url: string, timeoutMs: number): Promise<{ ok: true; body: unknown } | { ok: false; status: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupCompanyBySiret(siret: string, options: { fetchImpl?: FetchLike; timeoutMs?: number } = {}): Promise<CompanyLookupResult> {
  if (!/^\d{14}$/.test(siret)) return { status: "NOT_FOUND", message: "Le SIRET doit contenir exactement 14 chiffres." };
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const timeoutMs = options.timeoutMs ?? 6000;

  const [bySiret, fabrique] = await Promise.all([
    getJson(fetchImpl, `${RECHERCHE_ENTREPRISES_URL}?q=${siret}&per_page=5`, timeoutMs),
    getJson(fetchImpl, `${FABRIQUE_SEARCH_URL}?query=${siret}`, timeoutMs),
  ]);

  let record = bySiret.ok ? parseRechercheEntreprises(bySiret.body, siret) : null;
  // La recherche plein texte retrouve parfois mieux l'entreprise par son SIREN.
  if (!record || !record.establishmentMatched) {
    const bySiren = await getJson(fetchImpl, `${RECHERCHE_ENTREPRISES_URL}?q=${siret.slice(0, 9)}&per_page=5`, timeoutMs);
    const candidate = bySiren.ok ? parseRechercheEntreprises(bySiren.body, siret) : null;
    if (candidate && (!record || candidate.establishmentMatched)) record = candidate;
    if (!record && !bySiret.ok && !bySiren.ok) {
      return { status: "UNAVAILABLE", message: "Le service public de recherche d'entreprises ne répond pas pour le moment." };
    }
  }
  if (!record) return { status: "NOT_FOUND", message: "Aucune entreprise ne correspond à ce SIRET dans le répertoire Sirene." };

  const fabriqueConventions = fabrique.ok ? parseFabriqueConventions(fabrique.body, siret) : [];
  return { status: "FOUND", record: { ...record, conventions: mergeConventions(record.conventions, fabriqueConventions) } };
}

export const GEO_COMMUNES_URL = "https://geo.api.gouv.fr/communes";

const normalizePlace = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^(saint|sainte)\b/, (word) => (word === "saint" ? "st" : "ste")).replace(/[^a-z0-9]+/g, " ").trim();

/** Nom de commune comparable : sans accents ni casse, « Saint » abrégé, arrondissement retiré (« Paris 9e »). */
function comparableCity(value: string): string {
  return normalizePlace(value).replace(/ \d+(er|e|eme)?( arrondissement)?$/, "");
}

export function samePlace(a: string, b: string): boolean {
  return comparableCity(a) === comparableCity(b);
}

/** Choisit le code commune Insee correspondant au nom saisi parmi les réponses de geo.api.gouv.fr. */
export function pickCommuneCode(payload: unknown, city: string): string | null {
  if (!Array.isArray(payload)) return null;
  const communes = payload.map(asObject).filter((entry): entry is Json => Boolean(entry && asText(entry.code)));
  const exact = communes.find((commune) => samePlace(asText(commune.nom) ?? "", city));
  return exact ? asText(exact.code) : null;
}

/** Code commune Insee d'une commune saisie à la main (API Découpage administratif de l'État). */
export async function lookupCommuneCode(postalCode: string | null, city: string, options: { fetchImpl?: FetchLike; timeoutMs?: number } = {}): Promise<string | null> {
  if (!city.trim()) return null;
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const params = new URLSearchParams({ fields: "code,nom", format: "json", limit: "10" });
  if (postalCode && /^\d{5}$/.test(postalCode)) params.set("codePostal", postalCode);
  else {
    params.set("nom", city.trim());
    params.set("boost", "population");
  }
  const response = await getJson(fetchImpl, `${GEO_COMMUNES_URL}?${params.toString()}`, options.timeoutMs ?? 5000);
  return response.ok ? pickCommuneCode(response.body, city) : null;
}

export function isLegalCategory(value: unknown): value is LegalCategory {
  return typeof value === "string" && (LEGAL_CATEGORIES as readonly string[]).includes(value);
}
