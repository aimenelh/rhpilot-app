import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPayslipDocument } from "@/lib/payroll/payslip-storage";

function extractPages(pdf: Buffer): string[] {
  const source = pdf.toString("latin1");
  const objects = new Map<number, string>();
  const objectPattern = /(\d+) 0 obj\r?\n([\s\S]*?)\r?\nendobj/g;
  for (const match of source.matchAll(objectPattern)) objects.set(Number(match[1]), match[2]);

  const pages: string[] = [];
  for (const body of objects.values()) {
    if (!/\/Type \/Page\b/.test(body)) continue;
    const contentRef = body.match(/\/Contents\s+(\d+)\s+0\s+R/);
    if (!contentRef) throw new Error("Structure PDF invalide : contenu de page introuvable.");
    const contentObject = objects.get(Number(contentRef[1]));
    if (!contentObject) throw new Error("Structure PDF invalide : objet de contenu introuvable.");
    const stream = contentObject.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!stream) throw new Error("Structure PDF invalide : flux de page introuvable.");
    pages.push(stream[1]);
  }
  return pages;
}

function buildPdf(pageStreams: string[]): Buffer {
  if (pageStreams.length === 0) throw new Error("Aucune page PDF à assembler.");
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const firstPageObject = 3;
  const fontObject = firstPageObject + pageStreams.length * 2;
  const kids = pageStreams.map((_, index) => `${firstPageObject + index * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageStreams.length} >>`);

  for (let index = 0; index < pageStreams.length; index += 1) {
    const pageObjectNumber = firstPageObject + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const stream = pageStreams[index];
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export async function GET(_request: Request, { params }: { params: { periodId: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });

  const period = await prisma.payrollPeriod.findFirst({ where: { id: params.periodId, organizationId: membership.organizationId }, select: { id: true, year: true, month: true, status: true } });
  if (!period) return NextResponse.json({ error: "Période de paie introuvable." }, { status: 404 });
  if (period.status !== "LOCKED") return NextResponse.json({ error: "Les bulletins groupés sont disponibles après verrouillage de la période." }, { status: 409 });

  const payslips = await prisma.payslip.findMany({
    where: { organizationId: membership.organizationId, payrollPeriodId: period.id, documentStatus: { in: ["GENERATED", "PUBLISHED"] }, storageKey: { not: null } },
    select: { id: true, employeeId: true, storageKey: true },
    orderBy: { employeeId: "asc" },
  });
  const employees = await prisma.employee.count({ where: { organizationId: membership.organizationId, deletedAt: null } });
  if (payslips.length !== employees || employees === 0) return NextResponse.json({ error: `Les bulletins ne sont pas encore tous générés (${payslips.length}/${employees}). Générez d'abord les bulletins de la période.` }, { status: 409 });

  try {
    const pdfs = payslips.map((payslip) => readPayslipDocument(payslip.storageKey!));
    const pages = pdfs.flatMap((pdf) => extractPages(pdf));
    const merged = buildPdf(pages);
    const month = String(period.month).padStart(2, "0");
    return new NextResponse(merged as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bulletins-${month}-${period.year}.pdf"`,
        "Content-Length": String(merged.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible d'assembler les bulletins PDF." }, { status: 500 });
  }
}
