import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { archiveEntryName, archivePartLabel, buildZip, planArchiveParts, type ArchivableDocument } from "./archive";

const doc = (id: string, kind: string, title: string, year: number | null, month: number | null, sizeBytes: number, replaced = false): ArchivableDocument => ({
  id, kind, title, periodYear: year, periodMonth: month, sizeBytes,
  publishedAt: new Date(Date.UTC(year ?? 2026, (month ?? 10) - 1, 28)), replacedAt: replaced ? new Date() : null,
});

describe("archive des documents salarié", () => {
  it("tient une carrière entière en une partie et découpe au-delà du plafond, dans l'ordre chronologique", () => {
    const career = Array.from({ length: 600 }, (_, index) => doc(`p${index}`, "PAYSLIP", "Bulletin", 2000 + Math.floor(index / 12), (index % 12) + 1, 6_000));
    const single = planArchiveParts(career);
    expect(single).toHaveLength(1);
    expect(archivePartLabel(single[0])).toBe("2000 à 2049");

    const heavy = [doc("b", "PAYSLIP", "Bulletin", 2026, 2, 1_500_000), doc("a", "PAYSLIP", "Bulletin", 2026, 1, 1_500_000), doc("c", "FRANCE_TRAVAIL", "Attestation", null, null, 3_900_000), doc("d", "PAYSLIP", "Bulletin", 2027, 1, 5_000_000)];
    const parts = planArchiveParts(heavy);
    expect(parts.map((part) => part.ids)).toEqual([["a", "b"], ["c"], ["d"]]);
  });

  it("nomme les fichiers de façon lisible et unique, anciennes versions à part, et produit un ZIP valide", () => {
    const taken = new Set<string>();
    expect(archiveEntryName(doc("1", "PAYSLIP", "Bulletin de salaire d'octobre 2026", 2026, 10, 1), taken)).toBe("bulletins/2026-10-Bulletin-de-salaire-d-octobre-2026.pdf");
    expect(archiveEntryName(doc("2", "PAYSLIP", "Bulletin de salaire d'octobre 2026", 2026, 10, 1, true), taken)).toBe("anciennes-versions/2026-10-Bulletin-de-salaire-d-octobre-2026.pdf");
    expect(archiveEntryName(doc("3", "OTHER", "Avenant", null, null, 1), taken)).toBe("documents/2026-10-28-Avenant.pdf");
    expect(archiveEntryName(doc("4", "OTHER", "Avenant", null, null, 1), taken)).toBe("documents/2026-10-28-Avenant-2.pdf");

    const pdf = Buffer.from("%PDF-1.3\n%fake\n");
    const zip = buildZip([{ document: doc("1", "PAYSLIP", "Bulletin", 2026, 9, pdf.length), pdf }, { document: doc("2", "WORK_CERTIFICATE", "Certificat de travail", null, null, pdf.length), pdf }]);
    const files = unzipSync(new Uint8Array(zip));
    expect(Object.keys(files).sort()).toEqual(["bulletins/2026-09-Bulletin.pdf", "documents/2026-10-28-Certificat-de-travail.pdf"]);
    expect(Buffer.from(files["bulletins/2026-09-Bulletin.pdf"]).toString()).toBe(pdf.toString());
  });
});
