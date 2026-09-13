import PDFDocument from "pdfkit";

export type PayslipPdfContribution = {
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount?: number | null;
  rate?: number | null;
  sourceRule?: string;
};

export type PayslipPdfInput = {
  employer: { name: string; address: string; siret: string; nafCode: string; urssafReference: string };
  employee: { name: string; address: string; position: string; classification: string };
  period: { year: number; month: number; paymentDate: string; hours: number };
  salary: { baseGross: number; variables: Array<{ label: string; amount: number }>; gross: number; employeeContributions: number; employerContributions: number; netBeforeTax: number; netTaxable: number; withholdingTaxRate: number; withholdingTax: number; netPaid: number; netSocial: number; totalEmployerCost: number };
  contributions: PayslipPdfContribution[];
  collectiveAgreement: string;
  source: string;
};

export class PayslipPdfPrerequisiteError extends Error {
  constructor(public readonly missing: string[]) {
    super("Informations obligatoires manquantes pour générer le bulletin de paie.");
    this.name = "PayslipPdfPrerequisiteError";
  }
}

function money(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

function percentage(value: number): string {
  return `${(value * 100).toFixed(2).replace(".", ",")} %`;
}

function requiredMissing(input: PayslipPdfInput): string[] {
  const missing: string[] = [];
  const checks: Array<[string, string]> = [
    ["Nom employeur", input.employer.name],
    ["Adresse employeur", input.employer.address],
    ["SIRET employeur", input.employer.siret],
    ["Code APE/NAF", input.employer.nafCode],
    ["Nom salarié", input.employee.name],
    ["Emploi salarié", input.employee.position],
    ["Classification salarié", input.employee.classification],
    ["Date de paiement", input.period.paymentDate],
    ["Convention ou référence Code du travail", input.collectiveAgreement],
    ["Source du référentiel", input.source],
  ];
  for (const [label, value] of checks) if (!value.trim()) missing.push(label);
  if (!Number.isFinite(input.period.hours) || input.period.hours < 0) missing.push("Volume horaire");
  if (!Number.isFinite(input.salary.gross) || input.salary.gross < 0) missing.push("Salaire brut");
  if (!Number.isFinite(input.salary.employeeContributions) || input.salary.employeeContributions < 0) missing.push("Cotisations salariales");
  if (!Number.isFinite(input.salary.employerContributions) || input.salary.employerContributions < 0) missing.push("Cotisations patronales");
  if (!Number.isFinite(input.salary.netBeforeTax) || input.salary.netBeforeTax < 0) missing.push("Net avant impôt");
  if (!Number.isFinite(input.salary.netSocial) || input.salary.netSocial < 0) missing.push("Montant net social");
  if (!Number.isFinite(input.salary.netTaxable) || input.salary.netTaxable < 0) missing.push("Salaire net imposable");
  if (!Number.isFinite(input.salary.withholdingTaxRate) || input.salary.withholdingTaxRate < 0 || input.salary.withholdingTaxRate > 1) missing.push("Taux de prélèvement à la source");
  if (!Number.isFinite(input.salary.withholdingTax) || input.salary.withholdingTax < 0) missing.push("Montant du prélèvement à la source");
  if (!Number.isFinite(input.salary.netPaid) || input.salary.netPaid < 0) missing.push("Net payé");
  for (const contribution of input.contributions) {
    if (contribution.rate === undefined || contribution.baseAmount === undefined) missing.push(`Assiette/taux cotisation : ${contribution.label}`);
    if (!Number.isFinite(contribution.amount) || contribution.amount < 0) missing.push(`Montant cotisation : ${contribution.label}`);
    if (contribution.rate !== null && contribution.rate !== undefined && (!Number.isFinite(contribution.rate) || contribution.rate < 0 || contribution.rate > 1)) missing.push(`Taux cotisation : ${contribution.label}`);
    if (contribution.baseAmount !== null && contribution.baseAmount !== undefined && (!Number.isFinite(contribution.baseAmount) || contribution.baseAmount < 0)) missing.push(`Assiette cotisation : ${contribution.label}`);
  }
  return missing;
}

type GroupedContribution = {
  label: string;
  employee: PayslipPdfContribution | null;
  employer: PayslipPdfContribution | null;
};

function groupContributions(contributions: PayslipPdfContribution[]): GroupedContribution[] {
  const order: string[] = [];
  const byLabel = new Map<string, GroupedContribution>();
  for (const contribution of contributions) {
    if (!byLabel.has(contribution.label)) {
      byLabel.set(contribution.label, { label: contribution.label, employee: null, employer: null });
      order.push(contribution.label);
    }
    const entry = byLabel.get(contribution.label)!;
    if (contribution.side === "EMPLOYEE") entry.employee = contribution;
    else entry.employer = contribution;
  }
  return order.map((label) => byLabel.get(label)!);
}

const PAGE_MARGIN = 32;
const CONTENT_WIDTH = 531;
const INK = "#17181C";
const INK_SOFT = "#5E6068";
const INK_FAINT = "#858891";
const BORDER = "#DDD9D4";
const PANEL = "#F7F5F2";
const ROW_ALT = "#FBFAF8";
const ACCENT = "#F28A2E";

const COLS = {
  label: { x: PAGE_MARGIN + 8, width: 210 },
  base: { x: PAGE_MARGIN + 220, width: 62 },
  employeeRate: { x: PAGE_MARGIN + 286, width: 48 },
  employeeAmount: { x: PAGE_MARGIN + 337, width: 68 },
  employerRate: { x: PAGE_MARGIN + 408, width: 48 },
  employerAmount: { x: PAGE_MARGIN + 459, width: 64 },
};

class Layout {
  y = PAGE_MARGIN;
  constructor(public doc: PDFKit.PDFDocument) {}

  bottom(): number {
    return this.doc.page.height - PAGE_MARGIN - 22;
  }

  newPage(): void {
    this.doc.addPage();
    this.y = PAGE_MARGIN;
    drawContinuationHeader(this);
  }

  ensure(height: number): void {
    if (this.y + height <= this.bottom()) return;
    this.newPage();
  }

  rule(gray = BORDER): void {
    this.doc.moveTo(PAGE_MARGIN, this.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, this.y).lineWidth(0.6).strokeColor(gray).stroke();
  }
}

function drawContinuationHeader(l: Layout): void {
  l.doc.rect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 32).fill(INK);
  l.doc.font("Helvetica-Bold").fontSize(10).fillColor("white").text("BULLETIN DE SALAIRE", PAGE_MARGIN + 12, l.y + 10);
  l.doc.font("Helvetica-Bold").fontSize(8).fillColor(ACCENT).text("SUITE", PAGE_MARGIN, l.y + 10, { width: CONTENT_WIDTH - 12, align: "right" });
  l.y += 44;
}

function drawHeader(l: Layout, input: PayslipPdfInput): void {
  const month = input.period.month.toString().padStart(2, "0");
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 64, 5).fill(INK);
  l.doc.rect(PAGE_MARGIN, l.y, 5, 64).fill(ACCENT);
  l.doc.font("Helvetica-Bold").fontSize(17).fillColor("white").text("BULLETIN DE SALAIRE", PAGE_MARGIN + 18, l.y + 13);
  l.doc.font("Helvetica").fontSize(8.5).fillColor("#D9D7D3").text(`Période ${month}/${input.period.year}  ·  Paiement le ${input.period.paymentDate}`, PAGE_MARGIN + 18, l.y + 39);
  l.doc.font("Helvetica-Bold").fontSize(11).fillColor("white").text("RH PILOT", PAGE_MARGIN, l.y + 15, { width: CONTENT_WIDTH - 18, align: "right" });
  l.doc.font("Helvetica").fontSize(7).fillColor("#D9D7D3").text("DOCUMENT DE PAIE", PAGE_MARGIN, l.y + 34, { width: CONTENT_WIDTH - 18, align: "right" });
  l.y += 76;
}

function drawParty(l: Layout, x: number, width: number, title: string, lines: string[]): number {
  l.doc.font("Helvetica-Bold").fontSize(7).fillColor(ACCENT).text(title, x, l.y);
  let cursorY = l.y + 13;
  lines.forEach((line, index) => {
    if (!line) return;
    l.doc.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(index === 0 ? 9.2 : 7.5).fillColor(index === 0 ? INK : INK_SOFT);
    const h = l.doc.heightOfString(line, { width });
    l.doc.text(line, x, cursorY, { width });
    cursorY += h + 3;
  });
  return cursorY;
}

function drawIdentity(l: Layout, input: PayslipPdfInput): void {
  const leftX = PAGE_MARGIN + 14;
  const rightX = PAGE_MARGIN + 281;
  const colWidth = 245;
  const boxTop = l.y;
  const employerLines = [input.employer.name, input.employer.address, `SIRET ${input.employer.siret}  ·  APE/NAF ${input.employer.nafCode}`];
  if (input.employer.urssafReference.trim()) employerLines.push(`Référence organisme social : ${input.employer.urssafReference}`);
  const employeeLines = [input.employee.name, input.employee.address, `Emploi : ${input.employee.position}`, `Classification : ${input.employee.classification}`];

  l.y = boxTop + 12;
  const leftBottom = drawParty(l, leftX, colWidth, "EMPLOYEUR", employerLines);
  l.y = boxTop + 12;
  const rightBottom = drawParty(l, rightX, colWidth, "SALARIÉ", employeeLines);
  const boxBottom = Math.max(leftBottom, rightBottom) + 10;
  l.doc.roundedRect(PAGE_MARGIN, boxTop, CONTENT_WIDTH, boxBottom - boxTop, 5).lineWidth(0.7).strokeColor(BORDER).stroke();
  l.y = boxBottom + 11;
}

function drawContext(l: Layout, input: PayslipPdfInput): void {
  const labelWidth = 82;
  const hoursWidth = 108;
  const agreementWidth = CONTENT_WIDTH - labelWidth - hoursWidth - 8;
  l.ensure(36);
  l.doc.font("Helvetica-Bold").fontSize(7).fillColor(INK_FAINT).text("CADRE DE PAIE", PAGE_MARGIN, l.y + 2);
  l.doc.font("Helvetica").fontSize(8).fillColor(INK).text(input.collectiveAgreement, PAGE_MARGIN + labelWidth, l.y, { width: agreementWidth, lineBreak: false, ellipsis: true });
  l.doc.font("Helvetica-Bold").fontSize(8).fillColor(INK).text(`Horaire ${input.period.hours.toFixed(2)} h`, PAGE_MARGIN, l.y, { width: CONTENT_WIDTH, align: "right" });
  l.y += 20;
  l.rule();
  l.y += 12;
}

function drawSectionTitle(l: Layout, text: string): void {
  l.ensure(24);
  l.doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(text, PAGE_MARGIN, l.y);
  l.doc.rect(PAGE_MARGIN + 108, l.y + 4, 4, 4).fill(ACCENT);
  l.y += 15;
}

function drawTableHeader(l: Layout, columns: Array<{ x: number; width: number; text: string; align?: "left" | "right" }>): void {
  l.ensure(23);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 18, 2).fill(INK);
  l.doc.font("Helvetica-Bold").fontSize(6.8);
  for (const column of columns) {
    l.doc.fillColor("white").text(column.text, column.x, l.y + 5.5, { width: column.width, align: column.align ?? "left", lineBreak: false });
  }
  l.y += 22;
}

function drawTotalRow(l: Layout, label: string, value: string, tone: "subtotal" | "total" = "subtotal"): void {
  const height = tone === "total" ? 26 : 21;
  l.ensure(height + 4);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, height, 3).fill(tone === "total" ? "#EEE7E1" : PANEL);
  const fontSize = tone === "total" ? 10 : 8;
  l.doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(INK).text(label, PAGE_MARGIN + 9, l.y + (height - fontSize) / 2 - 1);
  l.doc.text(value, PAGE_MARGIN, l.y + (height - fontSize) / 2 - 1, { width: CONTENT_WIDTH - 9, align: "right" });
  l.y += height + 7;
}

function drawRemuneration(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "1. RÉMUNÉRATION");
  drawTableHeader(l, [
    { x: COLS.label.x, width: 360, text: "ÉLÉMENT" },
    { x: PAGE_MARGIN, width: CONTENT_WIDTH - 9, text: "MONTANT", align: "right" },
  ]);

  const rows = [{ label: "Salaire de base", amount: input.salary.baseGross }, ...input.salary.variables];
  rows.forEach((row, index) => {
    const rowHeight = Math.max(14, l.doc.heightOfString(row.label, { width: 360 }) + 4);
    l.ensure(rowHeight + 2);
    if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 2, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);
    l.doc.font("Helvetica").fontSize(8).fillColor(INK).text(row.label, COLS.label.x, l.y, { width: 360 });
    l.doc.text(money(row.amount), PAGE_MARGIN, l.y, { width: CONTENT_WIDTH - 9, align: "right" });
    l.y += rowHeight;
  });
  drawTotalRow(l, "Salaire brut total", money(input.salary.gross));
}

function contributionBase(group: GroupedContribution): string {
  const reference = group.employee ?? group.employer;
  if (!reference) return "—";
  if (reference.baseAmount != null) return money(reference.baseAmount);
  if (reference.rate === null) return "Forfait";
  return "—";
}

function drawContributionRow(l: Layout, group: GroupedContribution, index: number): void {
  const rowHeight = Math.max(14, l.doc.heightOfString(group.label, { width: COLS.label.width }) + 4);
  l.ensure(rowHeight + 2);
  if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 2, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);

  const employeeRate = group.employee?.rate != null ? percentage(group.employee.rate) : "";
  const employerRate = group.employer?.rate != null ? percentage(group.employer.rate) : "";
  l.doc.font("Helvetica").fontSize(7.1).fillColor(INK).text(group.label, COLS.label.x, l.y, { width: COLS.label.width });
  l.doc.fillColor(INK_SOFT).text(contributionBase(group), COLS.base.x, l.y, { width: COLS.base.width, align: "right" });
  l.doc.fillColor(INK_SOFT).text(employeeRate, COLS.employeeRate.x, l.y, { width: COLS.employeeRate.width, align: "right" });
  l.doc.fillColor(INK).text(group.employee ? `-${money(group.employee.amount)}` : "", COLS.employeeAmount.x, l.y, { width: COLS.employeeAmount.width, align: "right" });
  l.doc.fillColor(INK_SOFT).text(employerRate, COLS.employerRate.x, l.y, { width: COLS.employerRate.width, align: "right" });
  l.doc.fillColor(INK).text(group.employer ? money(group.employer.amount) : "", COLS.employerAmount.x, l.y, { width: COLS.employerAmount.width, align: "right" });
  l.y += rowHeight;
}

function drawContributionTableHeader(l: Layout): void {
  drawTableHeader(l, [
    { x: COLS.label.x, width: COLS.label.width, text: "LIBELLÉ" },
    { x: COLS.base.x, width: COLS.base.width, text: "BASE", align: "right" },
    { x: COLS.employeeRate.x, width: COLS.employeeRate.width, text: "TAUX SAL.", align: "right" },
    { x: COLS.employeeAmount.x, width: COLS.employeeAmount.width, text: "PART SAL.", align: "right" },
    { x: COLS.employerRate.x, width: COLS.employerRate.width, text: "TAUX PAT.", align: "right" },
    { x: COLS.employerAmount.x, width: COLS.employerAmount.width, text: "PART PAT.", align: "right" },
  ]);
}

function drawContributions(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "2. COTISATIONS ET CONTRIBUTIONS");
  drawContributionTableHeader(l);
  groupContributions(input.contributions).forEach((group, index) => {
    const rowHeight = Math.max(14, l.doc.heightOfString(group.label, { width: COLS.label.width }) + 4);
    if (l.y + rowHeight + 2 > l.bottom()) {
      l.newPage();
      l.doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text("2. COTISATIONS ET CONTRIBUTIONS — SUITE", PAGE_MARGIN, l.y);
      l.y += 15;
      drawContributionTableHeader(l);
    }
    drawContributionRow(l, group, index);
  });
  drawTotalRow(l, "Total cotisations salariales", `-${money(input.salary.employeeContributions)}`);
}

function drawNetSummary(l: Layout, input: PayslipPdfInput): void {
  const boxHeight = 91;
  l.ensure(boxHeight + 10);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, boxHeight, 5).fill(PANEL);
  l.doc.rect(PAGE_MARGIN, l.y, 4, boxHeight).fill(ACCENT);
  l.doc.font("Helvetica-Bold").fontSize(7).fillColor(INK_FAINT).text("NET ET PRÉLÈVEMENT À LA SOURCE", PAGE_MARGIN + 14, l.y + 11);

  const rows: Array<[string, string, boolean]> = [
    ["Net avant impôt", money(input.salary.netBeforeTax), false],
    ["Net imposable / base PAS", money(input.salary.netTaxable), false],
    [`Prélèvement à la source (${percentage(input.salary.withholdingTaxRate)})`, `-${money(input.salary.withholdingTax)}`, false],
    ["NET À PAYER", money(input.salary.netPaid), true],
  ];
  let rowY = l.y + 28;
  for (const [label, value, emphasis] of rows) {
    l.doc.font(emphasis ? "Helvetica-Bold" : "Helvetica").fontSize(emphasis ? 11.5 : 8).fillColor(INK);
    l.doc.text(label, PAGE_MARGIN + 14, rowY);
    l.doc.text(value, PAGE_MARGIN, rowY, { width: CONTENT_WIDTH - 14, align: "right" });
    rowY += emphasis ? 19 : 16;
  }
  l.y += boxHeight + 9;

  l.ensure(40);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 35, 4).lineWidth(0.7).strokeColor(BORDER).stroke();
  l.doc.font("Helvetica-Bold").fontSize(8).fillColor(INK).text("Montant net social", PAGE_MARGIN + 14, l.y + 8);
  l.doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(money(input.salary.netSocial), PAGE_MARGIN, l.y + 8, { width: CONTENT_WIDTH - 14, align: "right" });
  l.doc.font("Helvetica").fontSize(6.5).fillColor(INK_FAINT).text("À distinguer du net à payer et du net imposable.", PAGE_MARGIN + 14, l.y + 21);
  l.y += 43;
}

function drawEmployerCost(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "3. CHARGES PATRONALES");
  drawTotalRow(l, "Total cotisations patronales", money(input.salary.employerContributions));
  drawTotalRow(l, "COÛT TOTAL EMPLOYEUR", money(input.salary.totalEmployerCost), "total");
}

function drawFooter(doc: PDFKit.PDFDocument, input: PayslipPdfInput): void {
  const range = doc.bufferedPageRange();
  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(range.start + pageIndex);
    const footerY = doc.page.height - 25;
    doc.moveTo(PAGE_MARGIN, footerY - 7).lineTo(PAGE_MARGIN + CONTENT_WIDTH, footerY - 7).lineWidth(0.5).strokeColor(BORDER).stroke();
    doc.font("Helvetica").fontSize(6.2).fillColor(INK_FAINT).text(`RH Pilot · ${input.source}`, PAGE_MARGIN, footerY, { width: CONTENT_WIDTH - 55, ellipsis: true });
    doc.text(`Page ${pageIndex + 1}/${range.count}`, PAGE_MARGIN, footerY, { width: CONTENT_WIDTH, align: "right" });
  }
}

function drawPayslip(doc: PDFKit.PDFDocument, input: PayslipPdfInput): void {
  const l = new Layout(doc);
  drawHeader(l, input);
  drawIdentity(l, input);
  drawContext(l, input);
  drawRemuneration(l, input);
  l.y += 5;
  drawContributions(l, input);
  drawNetSummary(l, input);
  drawEmployerCost(l, input);
  drawFooter(doc, input);
}

export function generatePayslipPdf(input: PayslipPdfInput): Promise<Buffer> {
  const missing = requiredMissing(input);
  if (missing.length > 0) throw new PayslipPdfPrerequisiteError(missing);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true, info: { Title: "Bulletin de salaire", Author: "RH Pilot" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      drawPayslip(doc, input);
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
