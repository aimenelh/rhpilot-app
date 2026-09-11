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
  const checks: Array<[string, string]> = [["Nom employeur", input.employer.name], ["Adresse employeur", input.employer.address], ["SIRET employeur", input.employer.siret], ["Code APE/NAF", input.employer.nafCode], ["Nom salarié", input.employee.name], ["Adresse salarié", input.employee.address], ["Emploi salarié", input.employee.position], ["Classification salarié", input.employee.classification], ["Date de paiement", input.period.paymentDate], ["Convention ou référence Code du travail", input.collectiveAgreement], ["Source du référentiel", input.source]];
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

// Une ligne de cotisation "employé" et une ligne "employeur" partagent
// le même libellé (ex. "Assurance vieillesse plafonnée") -- on les
// regroupe sur une seule ligne de tableau, comme sur un vrai bulletin,
// plutôt que deux tableaux séparés.
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

const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 515;
const INK = "#14151A";
const INK_SOFT = "#5B5D66";
const INK_FAINT = "#8A8C94";
const BORDER = "#E4E1DD";
const ROW_ALT = "#FAF8F6";

// Colonnes du tableau des cotisations : libellé large, puis base/taux/
// montant côté salarial et côté patronal.
const COLS = {
  label: { x: PAGE_MARGIN + 4, width: 150 },
  base: { x: PAGE_MARGIN + 158, width: 62 },
  employeeRate: { x: PAGE_MARGIN + 224, width: 38 },
  employeeAmount: { x: PAGE_MARGIN + 266, width: 68 },
  employerRate: { x: PAGE_MARGIN + 338, width: 38 },
  employerAmount: { x: PAGE_MARGIN + 380, width: 90 },
};

class Layout {
  y = PAGE_MARGIN;
  constructor(public doc: PDFKit.PDFDocument) {}

  ensure(height: number): void {
    if (this.y + height <= this.doc.page.height - PAGE_MARGIN) return;
    this.doc.addPage();
    this.y = PAGE_MARGIN;
    this.doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("BULLETIN DE SALAIRE — suite", PAGE_MARGIN, this.y);
    this.y += 24;
  }

  rule(gray = BORDER): void {
    this.doc.moveTo(PAGE_MARGIN, this.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, this.y).lineWidth(0.75).strokeColor(gray).stroke();
  }
}

function drawHeader(l: Layout, input: PayslipPdfInput): void {
  const month = input.period.month.toString().padStart(2, "0");
  l.doc.rect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 52).fill(INK);
  l.doc.fillColor("white").font("Helvetica-Bold").fontSize(16).text("BULLETIN DE SALAIRE", PAGE_MARGIN + 16, l.y + 14);
  l.doc.font("Helvetica").fontSize(8.5).fillColor("#D8D5D1").text(`${month}/${input.period.year}  ·  Paiement : ${input.period.paymentDate}`, PAGE_MARGIN + 16, l.y + 34);
  l.doc.font("Helvetica-Bold").fontSize(10).fillColor("white").text("RH PILOT", PAGE_MARGIN, l.y + 14, { width: CONTENT_WIDTH - 16, align: "right" });
  l.doc.font("Helvetica").fontSize(7.5).fillColor("#D8D5D1").text("Document de paie", PAGE_MARGIN, l.y + 29, { width: CONTENT_WIDTH - 16, align: "right" });
  l.y += 52 + 16;
}

function drawParty(l: Layout, x: number, width: number, title: string, lines: string[]): number {
  l.doc.font("Helvetica").fontSize(7).fillColor(INK_FAINT).text(title, x, l.y);
  let cursorY = l.y + 12;
  lines.forEach((line, index) => {
    if (!line) return;
    l.doc.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(index === 0 ? 10 : 8).fillColor(index === 0 ? INK : INK_SOFT);
    const h = l.doc.heightOfString(line, { width });
    l.doc.text(line, x, cursorY, { width });
    cursorY += h + 4;
  });
  return cursorY;
}

function drawIdentity(l: Layout, input: PayslipPdfInput): void {
  const leftX = PAGE_MARGIN + 14;
  const rightX = PAGE_MARGIN + 265;
  const colWidth = 236;
  const boxTop = l.y + 10;

  const employerLines = [input.employer.name, input.employer.address, `SIRET : ${input.employer.siret}    APE/NAF : ${input.employer.nafCode}`];
  if (input.employer.urssafReference.trim()) employerLines.push(`Référence organisme social : ${input.employer.urssafReference}`);
  const employeeLines = [input.employee.name, input.employee.address, `Emploi : ${input.employee.position}`, `Classification : ${input.employee.classification}`];

  l.y = boxTop;
  const leftBottom = drawParty(l, leftX, colWidth, "EMPLOYEUR", employerLines);
  l.y = boxTop;
  const rightBottom = drawParty(l, rightX, colWidth, "SALARIÉ", employeeLines);

  const boxBottom = Math.max(leftBottom, rightBottom) + 10;
  l.doc.roundedRect(PAGE_MARGIN, boxTop - 10, CONTENT_WIDTH, boxBottom - (boxTop - 10), 4).lineWidth(0.75).strokeColor(BORDER).stroke();
  l.y = boxBottom + 14;
}

function drawContext(l: Layout, input: PayslipPdfInput): void {
  const labelWidth = 78;
  const horaireText = `Horaire : ${input.period.hours.toFixed(2)} h`;
  const agreementWidth = CONTENT_WIDTH - labelWidth - 110;

  l.doc.font("Helvetica").fontSize(7.5).fillColor(INK_FAINT).text("Cadre de paie", PAGE_MARGIN, l.y);
  l.doc.font("Helvetica").fontSize(8.5).fillColor(INK).text(input.collectiveAgreement, PAGE_MARGIN + labelWidth, l.y, { width: agreementWidth });
  l.doc.font("Helvetica").fontSize(7.5).fillColor(INK_FAINT).text(horaireText, PAGE_MARGIN, l.y, { width: CONTENT_WIDTH, align: "right" });

  const agreementHeight = l.doc.heightOfString(input.collectiveAgreement, { width: agreementWidth });
  l.y += Math.max(agreementHeight, 11) + 12;
  l.rule();
  l.y += 16;
}

function drawSectionTitle(l: Layout, text: string): void {
  l.ensure(30);
  l.doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(text, PAGE_MARGIN, l.y);
  l.y += 16;
}

function drawTableHeader(l: Layout, columns: Array<{ x: number; width: number; text: string; align?: "left" | "right" }>): void {
  l.ensure(24);
  l.doc.rect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 18).fill(INK);
  l.doc.font("Helvetica-Bold").fontSize(7);
  for (const column of columns) {
    l.doc.fillColor("white").text(column.text, column.x, l.y + 5.5, { width: column.width, align: column.align ?? "left" });
  }
  l.y += 18 + 6;
}

function drawTotalRow(l: Layout, label: string, value: string, tone: "subtotal" | "total" = "subtotal"): void {
  const height = tone === "total" ? 24 : 20;
  l.ensure(height + 4);
  l.doc.rect(PAGE_MARGIN, l.y, CONTENT_WIDTH, height).fill(tone === "total" ? "#F2ECE9" : ROW_ALT);
  const fontSize = tone === "total" ? 10 : 8.5;
  l.doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(INK);
  l.doc.text(label, PAGE_MARGIN + 8, l.y + (height - fontSize) / 2 - 1);
  l.doc.text(value, PAGE_MARGIN, l.y + (height - fontSize) / 2 - 1, { width: CONTENT_WIDTH - 8, align: "right" });
  l.y += height + 10;
}

function drawRemuneration(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "1. RÉMUNÉRATION");
  drawTableHeader(l, [
    { x: COLS.label.x, width: 350, text: "ÉLÉMENT" },
    { x: PAGE_MARGIN, width: CONTENT_WIDTH - 8, text: "MONTANT", align: "right" },
  ]);

  const rows = [{ label: "Salaire de base", amount: input.salary.baseGross }, ...input.salary.variables];
  rows.forEach((row, index) => {
    const rowHeight = Math.max(14, l.doc.heightOfString(row.label, { width: 350 }) + 4);
    l.ensure(rowHeight + 2);
    if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 2, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);
    l.doc.font("Helvetica").fontSize(8.5).fillColor(INK);
    l.doc.text(row.label, COLS.label.x, l.y, { width: 350 });
    l.doc.text(money(row.amount), PAGE_MARGIN, l.y, { width: CONTENT_WIDTH - 8, align: "right" });
    l.y += rowHeight;
  });

  drawTotalRow(l, "Salaire brut total", money(input.salary.gross));
}

function drawContributionRow(l: Layout, group: GroupedContribution, index: number): void {
  const reference = group.employee ?? group.employer;
  const baseText = reference?.baseAmount != null ? money(reference.baseAmount) : reference?.rate === null ? "Forfait" : "—";
  const employeeRate = group.employee?.rate != null ? percentage(group.employee.rate) : "";
  const employeeAmount = group.employee ? `-${money(group.employee.amount)}` : "";
  const employerRate = group.employer?.rate != null ? percentage(group.employer.rate) : "";
  const employerAmount = group.employer ? money(group.employer.amount) : "";

  const rowHeight = Math.max(14, l.doc.heightOfString(group.label, { width: COLS.label.width }) + 4);
  l.ensure(rowHeight + 2);
  if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 2, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);

  l.doc.font("Helvetica").fontSize(7.6).fillColor(INK);
  l.doc.text(group.label, COLS.label.x, l.y, { width: COLS.label.width });
  l.doc.fillColor(INK_SOFT).text(baseText, COLS.base.x, l.y, { width: COLS.base.width, align: "right" });
  l.doc.fillColor(INK_SOFT).text(employeeRate, COLS.employeeRate.x, l.y, { width: COLS.employeeRate.width, align: "right" });
  l.doc.fillColor(INK).text(employeeAmount, COLS.employeeAmount.x, l.y, { width: COLS.employeeAmount.width, align: "right" });
  l.doc.fillColor(INK_SOFT).text(employerRate, COLS.employerRate.x, l.y, { width: COLS.employerRate.width, align: "right" });
  l.doc.fillColor(INK).text(employerAmount, COLS.employerAmount.x, l.y, { width: COLS.employerAmount.width, align: "right" });
  l.y += rowHeight;
}

function drawContributions(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "2. COTISATIONS ET CONTRIBUTIONS");
  drawTableHeader(l, [
    { x: COLS.label.x, width: COLS.label.width, text: "LIBELLÉ" },
    { x: COLS.base.x, width: COLS.base.width, text: "BASE", align: "right" },
    { x: COLS.employeeRate.x, width: COLS.employeeRate.width, text: "TAUX", align: "right" },
    { x: COLS.employeeAmount.x, width: COLS.employeeAmount.width, text: "SALARIALE", align: "right" },
    { x: COLS.employerRate.x, width: COLS.employerRate.width, text: "TAUX", align: "right" },
    { x: COLS.employerAmount.x, width: COLS.employerAmount.width, text: "PATRONALE", align: "right" },
  ]);

  groupContributions(input.contributions).forEach((group, index) => drawContributionRow(l, group, index));

  drawTotalRow(l, "Total cotisations salariales", `-${money(input.salary.employeeContributions)}`);
}

function drawNetSummary(l: Layout, input: PayslipPdfInput): void {
  const boxHeight = 100;
  l.ensure(boxHeight + 10);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, boxHeight, 4).fill("#FAF7F5");
  l.doc.font("Helvetica").fontSize(7.5).fillColor(INK_FAINT).text("NET ET PRÉLÈVEMENT À LA SOURCE", PAGE_MARGIN + 14, l.y + 12);

  const rows: Array<[string, string, boolean]> = [
    ["Net avant impôt", money(input.salary.netBeforeTax), false],
    ["Net imposable / base PAS", money(input.salary.netTaxable), false],
    [`Prélèvement à la source (${percentage(input.salary.withholdingTaxRate)})`, `-${money(input.salary.withholdingTax)}`, false],
    ["NET PAYÉ", money(input.salary.netPaid), true],
  ];
  let rowY = l.y + 30;
  for (const [label, value, emphasis] of rows) {
    l.doc.font(emphasis ? "Helvetica-Bold" : "Helvetica").fontSize(emphasis ? 12 : 8.5).fillColor(INK);
    l.doc.text(label, PAGE_MARGIN + 14, rowY);
    l.doc.text(value, PAGE_MARGIN, rowY, { width: CONTENT_WIDTH - 14, align: "right" });
    rowY += emphasis ? 20 : 17;
  }
  l.y += boxHeight + 14;

  l.ensure(46);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 36, 4).lineWidth(0.75).strokeColor(BORDER).stroke();
  l.doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT).text("Montant net social", PAGE_MARGIN + 14, l.y + 10);
  l.doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(money(input.salary.netSocial), PAGE_MARGIN, l.y + 9, { width: CONTENT_WIDTH - 14, align: "right" });
  l.doc.font("Helvetica").fontSize(6.8).fillColor(INK_FAINT).text("Montant utilisé comme référence pour certaines démarches sociales.", PAGE_MARGIN + 14, l.y + 23);
  l.y += 36 + 16;
}

function drawEmployerCost(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "3. CHARGES PATRONALES");
  drawTotalRow(l, "Total cotisations patronales", money(input.salary.employerContributions));
  drawTotalRow(l, "Coût total employeur", money(input.salary.totalEmployerCost), "total");
}

function drawFooter(l: Layout, input: PayslipPdfInput): void {
  l.ensure(50);
  l.rule();
  l.y += 12;
  l.doc.font("Helvetica").fontSize(7).fillColor(INK_FAINT);
  l.doc.text(`Référentiel de calcul : ${input.source}`, PAGE_MARGIN, l.y);
  l.y += 11;
  l.doc.text("Conservez ce bulletin de salaire. Les données détaillées du calcul sont conservées dans le dossier de paie RH Pilot.", PAGE_MARGIN, l.y);
  l.y += 10;
  l.doc.text("Document généré à partir des données de paie verrouillées de la période.", PAGE_MARGIN, l.y);
}

function drawPayslip(doc: PDFKit.PDFDocument, input: PayslipPdfInput): void {
  const l = new Layout(doc);
  drawHeader(l, input);
  drawIdentity(l, input);
  drawContext(l, input);
  drawRemuneration(l, input);
  l.y += 8;
  drawContributions(l, input);
  drawNetSummary(l, input);
  drawEmployerCost(l, input);
  drawFooter(l, input);
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
