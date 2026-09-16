import { PDFDocument } from "pdf-lib";

/** Preserve source page order and resources without rewriting binary PDF objects. */
export async function mergePayslipPdfs(documents: Buffer[]): Promise<Buffer> {
  if (!documents.length) throw new Error("Aucun bulletin PDF à assembler.");
  if (documents.length === 1) {
    if (!(await countPdfPages(documents[0]))) throw new Error("Bulletin PDF sans page.");
    return documents[0];
  }
  const merged = await PDFDocument.create();
  for (const bytes of documents) {
    const source = await PDFDocument.load(bytes);
    if (!source.getPageCount()) throw new Error("Bulletin PDF sans page.");
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return Buffer.from(await merged.save());
}

export async function countPdfPages(bytes: Buffer): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}
