type PdfObject = {
  body: string;
  streamPrefix?: string;
  streamData?: string;
};

function parseObjects(pdf: Buffer): Map<number, PdfObject> {
  const source = pdf.toString("latin1");
  const objects = new Map<number, PdfObject>();
  const objectPattern = /(\d+) 0 obj\r?\n([\s\S]*?)\r?\nendobj/g;
  for (const match of source.matchAll(objectPattern)) {
    const number = Number(match[1]);
    const body = match[2];
    const streamMatch = body.match(/^([\s\S]*?\r?\n)stream\r?\n([\s\S]*?)\r?\nendstream$/);
    if (streamMatch) objects.set(number, { body, streamPrefix: streamMatch[1], streamData: streamMatch[2] });
    else objects.set(number, { body });
  }
  return objects;
}

function pageObjectNumbers(objects: Map<number, PdfObject>): number[] {
  return [...objects.entries()]
    .filter(([, object]) => /\/Type\s*\/Page\b/.test(object.body) && !/\/Type\s*\/Pages\b/.test(object.body))
    .map(([number]) => number);
}

function referencedObjects(body: string): number[] {
  return [...body.matchAll(/(\d+)\s+0\s+R/g)].map((match) => Number(match[1]));
}

function parentReference(body: string): number | null {
  const match = body.match(/\/Parent\s+(\d+)\s+0\s+R/);
  return match ? Number(match[1]) : null;
}

function rewriteReferences(body: string, mapping: Map<number, number>): string {
  return body.replace(/(\d+)\s+0\s+R/g, (full, rawNumber: string) => {
    const mapped = mapping.get(Number(rawNumber));
    return mapped ? `${mapped} 0 R` : full;
  });
}

function rewriteObject(object: PdfObject, mapping: Map<number, number>, pagesObjectNumber: number, isPage: boolean): string {
  const rewriteDictionary = (dictionary: string) => {
    const referencesRewritten = rewriteReferences(dictionary, mapping);
    if (!isPage) return referencesRewritten;
    if (/\/Parent\s+\d+\s+0\s+R/.test(referencesRewritten)) {
      return referencesRewritten.replace(/\/Parent\s+\d+\s+0\s+R/, `/Parent ${pagesObjectNumber} 0 R`);
    }
    return referencesRewritten.replace(/>>\s*$/, `/Parent ${pagesObjectNumber} 0 R >>`);
  };

  if (object.streamPrefix !== undefined && object.streamData !== undefined) {
    return `${rewriteDictionary(object.streamPrefix)}stream\n${object.streamData}\nendstream`;
  }
  return rewriteDictionary(object.body);
}

function copyPageGraph(
  sourceObjects: Map<number, PdfObject>,
  pageObjectNumber: number,
  targetObjects: Map<number, string>,
  nextObjectNumber: { value: number },
  pagesObjectNumber: number,
): number {
  const mapping = new Map<number, number>();
  const queue = [pageObjectNumber];
  const sourceParent = parentReference(sourceObjects.get(pageObjectNumber)?.body ?? "");

  while (queue.length > 0) {
    const sourceNumber = queue.shift()!;
    if (mapping.has(sourceNumber)) continue;
    const sourceObject = sourceObjects.get(sourceNumber);
    if (!sourceObject) throw new Error(`Structure PDF invalide : objet ${sourceNumber} introuvable.`);
    const targetNumber = nextObjectNumber.value++;
    mapping.set(sourceNumber, targetNumber);

    const references = referencedObjects(sourceObject.streamPrefix ?? sourceObject.body);
    for (const reference of references) {
      if (sourceNumber === pageObjectNumber && sourceParent !== null && reference === sourceParent) continue;
      if (!mapping.has(reference)) queue.push(reference);
    }
  }

  for (const [sourceNumber, targetNumber] of mapping) {
    const sourceObject = sourceObjects.get(sourceNumber)!;
    targetObjects.set(targetNumber, rewriteObject(sourceObject, mapping, pagesObjectNumber, sourceNumber === pageObjectNumber));
  }
  return mapping.get(pageObjectNumber)!;
}

function buildMergedPdf(pdfs: readonly Buffer[]): Buffer {
  const targetObjects = new Map<number, string>();
  const catalogObjectNumber = 1;
  const pagesObjectNumber = 2;
  const nextObjectNumber = { value: 3 };
  const pagesOut: number[] = [];

  for (const pdf of pdfs) {
    const sourceObjects = parseObjects(pdf);
    const pages = pageObjectNumbers(sourceObjects);
    if (pages.length === 0) throw new Error("Structure PDF invalide : aucune page trouvée.");
    for (const page of pages) pagesOut.push(copyPageGraph(sourceObjects, page, targetObjects, nextObjectNumber, pagesObjectNumber));
  }

  targetObjects.set(catalogObjectNumber, `<< /Type /Catalog /Pages ${pagesObjectNumber} 0 R >>`);
  targetObjects.set(pagesObjectNumber, `<< /Type /Pages /Kids [${pagesOut.map((number) => `${number} 0 R`).join(" ")}] /Count ${pagesOut.length} >>`);

  let pdf = "%PDF-1.7\n%âãÏÓ\n";
  const offsets: number[] = [0];
  const objectNumbers = [...targetObjects.keys()].sort((a, b) => a - b);
  const maxObjectNumber = Math.max(...objectNumbers);
  for (const objectNumber of objectNumbers) {
    offsets[objectNumber] = Buffer.byteLength(pdf, "latin1");
    pdf += `${objectNumber} 0 obj\n${targetObjects.get(objectNumber)}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${maxObjectNumber + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= maxObjectNumber; index += 1) {
    pdf += `${(offsets[index] ?? 0).toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectNumber + 1} /Root ${catalogObjectNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export function mergePayslipPdfs(pdfs: readonly Buffer[]): Buffer {
  if (pdfs.length === 0) throw new Error("Aucun bulletin PDF à assembler.");
  // Évite toute réécriture inutile : un bulletin individuel valide reste byte-for-byte identique.
  if (pdfs.length === 1) return pdfs[0];
  return buildMergedPdf(pdfs);
}

export function countPdfPages(pdf: Buffer): number {
  return pageObjectNumbers(parseObjects(pdf)).length;
}
