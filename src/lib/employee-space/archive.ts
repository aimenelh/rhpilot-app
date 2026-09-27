/**
 * Récupération de tous les documents en une fois (C. trav. art. D3243-8 :
 * « sans manipulation complexe ou répétitive, dans un format électronique
 * structuré et couramment utilisé ») : une archive ZIP de PDF.
 *
 * Les réponses des fonctions serveur sont plafonnées (4,5 Mo chez Vercel) :
 * au-delà, l'archive est découpée en parties chronologiques. Avec des
 * bulletins de quelques kilo-octets, une carrière entière tient en une partie.
 */
import { zipSync, type Zippable } from "fflate";
import { safeFileName } from "./labels";

export const ARCHIVE_PART_MAX_BYTES = 4_000_000;

export type ArchivableDocument = {
  id: string;
  kind: string;
  title: string;
  periodYear: number | null;
  periodMonth: number | null;
  publishedAt: Date;
  sizeBytes: number;
  replacedAt: Date | null;
};

export type ArchivePart = { index: number; ids: string[]; bytes: number; fromYear: number; toYear: number };

const sortKey = (document: ArchivableDocument) =>
  document.periodYear && document.periodMonth
    ? `${document.periodYear}-${String(document.periodMonth).padStart(2, "0")}-00`
    : document.publishedAt.toISOString().slice(0, 10);

const yearOf = (document: ArchivableDocument) => document.periodYear ?? document.publishedAt.getUTCFullYear();

/** Parties successives, dans l'ordre chronologique, chacune sous le plafond (un document trop gros forme sa propre partie). */
export function planArchiveParts(documents: readonly ArchivableDocument[], maxBytes = ARCHIVE_PART_MAX_BYTES): ArchivePart[] {
  const sorted = [...documents].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.publishedAt.getTime() - b.publishedAt.getTime());
  const parts: ArchivePart[] = [];
  let current: ArchivePart | null = null;
  for (const document of sorted) {
    if (!current || (current.ids.length > 0 && current.bytes + document.sizeBytes > maxBytes)) {
      current = { index: parts.length + 1, ids: [], bytes: 0, fromYear: yearOf(document), toYear: yearOf(document) };
      parts.push(current);
    }
    current.ids.push(document.id);
    current.bytes += document.sizeBytes;
    current.toYear = Math.max(current.toYear, yearOf(document));
    current.fromYear = Math.min(current.fromYear, yearOf(document));
  }
  return parts;
}

export function archivePartLabel(part: ArchivePart): string {
  return part.fromYear === part.toYear ? String(part.fromYear) : `${part.fromYear} à ${part.toYear}`;
}

/** Chemin lisible et unique dans l'archive. */
export function archiveEntryName(document: ArchivableDocument, taken: Set<string>): string {
  const folder = document.replacedAt ? "anciennes-versions" : document.kind === "PAYSLIP" ? "bulletins" : "documents";
  const prefix = document.periodYear && document.periodMonth
    ? `${document.periodYear}-${String(document.periodMonth).padStart(2, "0")}`
    : document.publishedAt.toISOString().slice(0, 10);
  const base = safeFileName(`${prefix}-${document.title}`).replace(/\.pdf$/i, "");
  let name = `${folder}/${base}.pdf`;
  for (let counter = 2; taken.has(name); counter += 1) name = `${folder}/${base}-${counter}.pdf`;
  taken.add(name);
  return name;
}

/** Archive ZIP (sans recompression : les PDF le sont déjà). */
export function buildZip(entries: ReadonlyArray<{ document: ArchivableDocument; pdf: Buffer }>): Buffer {
  const taken = new Set<string>();
  const files: Zippable = {};
  for (const { document, pdf } of entries) {
    files[archiveEntryName(document, taken)] = [new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength), { level: 0, mtime: document.publishedAt }];
  }
  return Buffer.from(zipSync(files));
}
