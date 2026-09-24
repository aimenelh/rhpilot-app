import PDFDocument from "pdfkit";

export type PayslipPdfContribution = {
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount?: number | null;
  rate?: number | null;
  sourceRule?: string;
};

export type PayslipPdfPaidLeave = {
  leaveDates?: string;
  daysTaken?: number;
  indemnity?: number;
  acquired?: number;
  taken?: number;
  remaining?: number;
};

export type PayslipPdfAnnualCumuls = {
  gross: number;
  netTaxable: number;
  netSocial: number;
  withholdingTax: number;
  netPaid: number;
};

export type PayslipPdfNetAdjustment = {
  label: string;
  amount: number;
};

export type PayslipPdfInput = {
  employer: { name: string; address: string; siret: string; nafCode: string; urssafReference: string };
  employee: {
    name: string;
    address: string;
    position: string;
    classification: string;
    employeeNumber?: string;
    coefficient?: string;
    hireDate?: string;
    seniority?: string;
  };
  period: { year: number; month: number; paymentDate: string; hours: number };
  salary: {
    baseGross: number;
    variables: Array<{ label: string; amount: number }>;
    netAdjustments?: PayslipPdfNetAdjustment[];
    gross: number;
    employeeContributions: number;
    employerContributions: number;
    netBeforeTax: number;
    netTaxable: number;
    withholdingTaxRate: number;
    withholdingTax: number;
    netPaid: number;
    netSocial: number;
    totalEmployerCost: number;
  };
  contributions: PayslipPdfContribution[];
  collectiveAgreement: string;
  source: string;
  paidLeave?: PayslipPdfPaidLeave;
  annualCumuls?: PayslipPdfAnnualCumuls;
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

function signedMoney(value: number): string {
  return value > 0 ? `+${money(value)}` : money(value);
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
    ["Adresse salarié", input.employee.address],
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
  for (const adjustment of input.salary.netAdjustments ?? []) {
    if (!adjustment.label.trim()) missing.push("Libellé ajustement net");
    if (!Number.isFinite(adjustment.amount)) missing.push(`Montant ajustement net : ${adjustment.label || "sans libellé"}`);
  }
  for (const contribution of input.contributions) {
    if (contribution.rate === undefined || contribution.baseAmount === undefined) missing.push(`Assiette/taux cotisation : ${contribution.label}`);
    // Seule une réduction patronale (RGDU) peut être négative ; une retenue salariale jamais.
    if (!Number.isFinite(contribution.amount) || (contribution.amount < 0 && contribution.side !== "EMPLOYER")) missing.push(`Montant cotisation : ${contribution.label}`);
    if (contribution.rate !== null && contribution.rate !== undefined && (!Number.isFinite(contribution.rate) || contribution.rate < 0 || contribution.rate > 1)) missing.push(`Taux cotisation : ${contribution.label}`);
    if (contribution.baseAmount !== null && contribution.baseAmount !== undefined && (!Number.isFinite(contribution.baseAmount) || contribution.baseAmount < 0)) missing.push(`Assiette cotisation : ${contribution.label}`);
  }
  if (input.annualCumuls) {
    for (const [label, value] of Object.entries(input.annualCumuls)) if (!Number.isFinite(value) || value < 0) missing.push(`Cumul annuel ${label}`);
  }
  return [...new Set(missing)];
}

type GroupedContribution = { label: string; employee: PayslipPdfContribution | null; employer: PayslipPdfContribution | null };

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

const PAGE_MARGIN = 26;
const CONTENT_WIDTH = 543;
const INK = "#17181C";
const INK_SOFT = "#5E6068";
const INK_FAINT = "#858891";
const BORDER = "#DDD9D4";
const PANEL = "#F7F5F2";
const ROW_ALT = "#FBFAF8";
const ACCENT = "#F28A2E";
const COLS = {
  label: { x: PAGE_MARGIN + 7, width: 252 },
  base: { x: PAGE_MARGIN + 262, width: 62 },
  employeeRate: { x: PAGE_MARGIN + 328, width: 48 },
  employeeAmount: { x: PAGE_MARGIN + 379, width: 67 },
  employerRate: { x: PAGE_MARGIN + 449, width: 44 },
  employerAmount: { x: PAGE_MARGIN + 496, width: 47 },
};

class Layout {
  y = PAGE_MARGIN;
  constructor(public doc: PDFKit.PDFDocument) {}
  bottom(): number { return this.doc.page.height - PAGE_MARGIN - 26; }
  rule(): void { this.doc.moveTo(PAGE_MARGIN, this.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, this.y).lineWidth(0.5).strokeColor(BORDER).stroke(); }
}

function ensureSpace(l: Layout, height: number): boolean {
  if (l.y + height <= l.bottom()) return false;
  l.doc.addPage();
  l.y = PAGE_MARGIN;
  return true;
}

function drawHeader(l: Layout, input: PayslipPdfInput): void {
  const month = input.period.month.toString().padStart(2, "0");
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 54, 5).fill(INK);
  l.doc.rect(PAGE_MARGIN, l.y, 5, 54).fill(ACCENT);
  l.doc.font("Helvetica-Bold").fontSize(15.5).fillColor("white").text("BULLETIN DE SALAIRE", PAGE_MARGIN + 15, l.y + 10);
  l.doc.font("Helvetica").fontSize(7.4).fillColor("#D9D7D3").text(`Période ${month}/${input.period.year}  ·  Paiement le ${input.period.paymentDate}`, PAGE_MARGIN + 15, l.y + 35);
  l.doc.font("Helvetica-Bold").fontSize(10).fillColor("white").text(input.employer.name, PAGE_MARGIN, l.y + 11, { width: CONTENT_WIDTH - 15, align: "right" });
  l.doc.font("Helvetica").fontSize(6.5).fillColor("#D9D7D3").text("DOCUMENT DE PAIE", PAGE_MARGIN, l.y + 30, { width: CONTENT_WIDTH - 15, align: "right" });
  l.y += 62;
}

function drawIdentity(l: Layout, input: PayslipPdfInput): void {
  const top = l.y;
  const leftX = PAGE_MARGIN + 12;
  const rightX = PAGE_MARGIN + 286;
  l.doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ACCENT).text("EMPLOYEUR", leftX, top + 8);
  l.doc.font("Helvetica-Bold").fontSize(8.2).fillColor(INK).text(input.employer.name, leftX, top + 19);
  l.doc.font("Helvetica").fontSize(6.8).fillColor(INK_SOFT).text(input.employer.address, leftX, top + 31, { width: 255, lineBreak: false, ellipsis: true });
  l.doc.text(`SIRET ${input.employer.siret} · APE/NAF ${input.employer.nafCode}`, leftX, top + 42, { width: 255, lineBreak: false, ellipsis: true });
  if (input.employer.urssafReference.trim()) l.doc.text(`Réf. Urssaf : ${input.employer.urssafReference}`, leftX, top + 53, { width: 255, lineBreak: false, ellipsis: true });

  l.doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ACCENT).text("SALARIÉ", rightX, top + 8);
  l.doc.font("Helvetica-Bold").fontSize(8.2).fillColor(INK).text(input.employee.name, rightX, top + 19);
  l.doc.font("Helvetica").fontSize(6.8).fillColor(INK_SOFT).text(input.employee.address, rightX, top + 30, { width: 245, lineBreak: false, ellipsis: true });
  l.doc.text(`Emploi : ${input.employee.position}`, rightX, top + 41, { width: 245, lineBreak: false, ellipsis: true });
  const classification = [input.employee.classification, input.employee.coefficient ? `coef. ${input.employee.coefficient}` : ""].filter(Boolean).join(" · ");
  l.doc.text(`Classification : ${classification}`, rightX, top + 52, { width: 245, lineBreak: false, ellipsis: true });
  const employeeMeta = [input.employee.employeeNumber ? `Matricule ${input.employee.employeeNumber}` : "", input.employee.hireDate ? `Entrée ${input.employee.hireDate}` : "", input.employee.seniority ? `Ancienneté ${input.employee.seniority}` : ""].filter(Boolean).join(" · ");
  if (employeeMeta) l.doc.text(employeeMeta, rightX, top + 63, { width: 245, lineBreak: false, ellipsis: true });
  l.doc.roundedRect(PAGE_MARGIN, top, CONTENT_WIDTH, 78, 4).lineWidth(0.6).strokeColor(BORDER).stroke();
  l.y = top + 86;
}

function drawContext(l: Layout, input: PayslipPdfInput): void {
  l.doc.font("Helvetica-Bold").fontSize(6.5).fillColor(INK_FAINT).text("CADRE DE PAIE", PAGE_MARGIN, l.y);
  l.doc.font("Helvetica").fontSize(7).fillColor(INK).text(input.collectiveAgreement, PAGE_MARGIN + 76, l.y, { width: 355, lineBreak: false, ellipsis: true });
  l.doc.font("Helvetica-Bold").fontSize(7).fillColor(INK).text(`Horaire ${input.period.hours.toFixed(2)} h`, PAGE_MARGIN, l.y, { width: CONTENT_WIDTH, align: "right" });
  l.y += 13;
  l.rule();
  l.y += 7;
}

function drawSectionTitle(l: Layout, text: string): void {
  l.doc.font("Helvetica-Bold").fontSize(8.3).fillColor(INK).text(text, PAGE_MARGIN, l.y);
  l.doc.rect(PAGE_MARGIN + 105, l.y + 3, 3.5, 3.5).fill(ACCENT);
  l.y += 12;
}

function drawTableHeader(l: Layout, columns: Array<{ x: number; width: number; text: string; align?: "left" | "right" }>): void {
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 16, 2).fill(INK);
  l.doc.font("Helvetica-Bold").fontSize(5.9);
  for (const column of columns) l.doc.fillColor("white").text(column.text, column.x, l.y + 4.7, { width: column.width, align: column.align ?? "left", lineBreak: false });
  l.y += 19;
}

const REMUNERATION_COLUMNS = [{ x: COLS.label.x, width: 380, text: "ÉLÉMENT" }, { x: PAGE_MARGIN, width: CONTENT_WIDTH - 8, text: "MONTANT", align: "right" as const }];

function drawRemuneration(l: Layout, input: PayslipPdfInput): void {
  drawSectionTitle(l, "1. RÉMUNÉRATION");
  drawTableHeader(l, REMUNERATION_COLUMNS);
  const rows = [{ label: "Salaire de base", amount: input.salary.baseGross }, ...input.salary.variables];
  rows.forEach((row, index) => {
    const rowHeight = 12;
    if (ensureSpace(l, rowHeight + 22)) {
      drawSectionTitle(l, "1. RÉMUNÉRATION — SUITE");
      drawTableHeader(l, REMUNERATION_COLUMNS);
    }
    if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 1, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);
    l.doc.font("Helvetica").fontSize(6.7).fillColor(INK).text(row.label, COLS.label.x, l.y + 1, { width: 380, lineBreak: false, ellipsis: true });
    l.doc.text(money(row.amount), PAGE_MARGIN, l.y + 1, { width: CONTENT_WIDTH - 8, align: "right", lineBreak: false });
    l.y += rowHeight;
  });
  ensureSpace(l, 26);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 19, 3).fill(PANEL);
  l.doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK).text("Salaire brut total", PAGE_MARGIN + 8, l.y + 5);
  l.doc.text(money(input.salary.gross), PAGE_MARGIN, l.y + 5, { width: CONTENT_WIDTH - 8, align: "right" });
  l.y += 25;
}

function contributionBase(group: GroupedContribution): string {
  const reference = group.employee ?? group.employer;
  if (!reference) return "—";
  if (reference.baseAmount != null) return money(reference.baseAmount);
  if (reference.rate === null) return "Forfait";
  return "—";
}

function drawContributionRow(l: Layout, group: GroupedContribution, index: number): void {
  const rowHeight = 11.3;
  if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 1, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);
  const employeeRate = group.employee?.rate != null ? percentage(group.employee.rate) : "";
  const employerRate = group.employer?.rate != null ? percentage(group.employer.rate) : "";
  l.doc.font("Helvetica").fontSize(5.9).fillColor(INK).text(group.label, COLS.label.x, l.y + 1, { width: COLS.label.width, lineBreak: false, ellipsis: true });
  l.doc.fillColor(INK_SOFT).text(contributionBase(group), COLS.base.x, l.y + 1, { width: COLS.base.width, align: "right", lineBreak: false });
  l.doc.fillColor(INK_SOFT).text(employeeRate, COLS.employeeRate.x, l.y + 1, { width: COLS.employeeRate.width, align: "right", lineBreak: false });
  l.doc.fillColor(INK).text(group.employee ? `-${money(group.employee.amount)}` : "", COLS.employeeAmount.x, l.y + 1, { width: COLS.employeeAmount.width, align: "right", lineBreak: false });
  l.doc.fillColor(INK_SOFT).text(employerRate, COLS.employerRate.x, l.y + 1, { width: COLS.employerRate.width, align: "right", lineBreak: false });
  l.doc.fillColor(INK).text(group.employer ? money(group.employer.amount) : "", COLS.employerAmount.x, l.y + 1, { width: COLS.employerAmount.width, align: "right", lineBreak: false });
  l.y += rowHeight;
}

const CONTRIBUTION_COLUMNS = [
  { x: COLS.label.x, width: COLS.label.width, text: "LIBELLÉ" },
  { x: COLS.base.x, width: COLS.base.width, text: "BASE", align: "right" as const },
  { x: COLS.employeeRate.x, width: COLS.employeeRate.width, text: "TAUX SAL.", align: "right" as const },
  { x: COLS.employeeAmount.x, width: COLS.employeeAmount.width, text: "PART SAL.", align: "right" as const },
  { x: COLS.employerRate.x, width: COLS.employerRate.width, text: "TAUX PAT.", align: "right" as const },
  { x: COLS.employerAmount.x, width: COLS.employerAmount.width, text: "PART PAT.", align: "right" as const },
];

function drawContributions(l: Layout, input: PayslipPdfInput): void {
  if (ensureSpace(l, 50)) drawSectionTitle(l, "2. COTISATIONS ET CONTRIBUTIONS");
  else drawSectionTitle(l, "2. COTISATIONS ET CONTRIBUTIONS");
  drawTableHeader(l, CONTRIBUTION_COLUMNS);
  groupContributions(input.contributions).forEach((group, index) => {
    if (ensureSpace(l, 36)) {
      drawSectionTitle(l, "2. COTISATIONS ET CONTRIBUTIONS — SUITE");
      drawTableHeader(l, CONTRIBUTION_COLUMNS);
    }
    drawContributionRow(l, group, index);
  });
  ensureSpace(l, 25);
  l.doc.roundedRect(PAGE_MARGIN, l.y + 1, CONTENT_WIDTH, 18, 3).fill(PANEL);
  l.doc.font("Helvetica-Bold").fontSize(7).fillColor(INK).text("Total cotisations salariales", PAGE_MARGIN + 8, l.y + 6);
  l.doc.text(`-${money(input.salary.employeeContributions)}`, PAGE_MARGIN, l.y + 6, { width: CONTENT_WIDTH - 8, align: "right" });
  l.y += 25;
}

function drawNetAdjustments(l: Layout, input: PayslipPdfInput): void {
  const rows = (input.salary.netAdjustments ?? []).filter((row) => Math.abs(row.amount) >= 0.005);
  if (rows.length === 0) return;

  ensureSpace(l, 45);
  drawSectionTitle(l, "AJUSTEMENTS DU NET");
  drawTableHeader(l, REMUNERATION_COLUMNS);
  rows.forEach((row, index) => {
    const rowHeight = 12;
    if (ensureSpace(l, rowHeight + 22)) {
      drawSectionTitle(l, "AJUSTEMENTS DU NET — SUITE");
      drawTableHeader(l, REMUNERATION_COLUMNS);
    }
    if (index % 2 === 1) l.doc.rect(PAGE_MARGIN, l.y - 1, CONTENT_WIDTH, rowHeight).fill(ROW_ALT);
    l.doc.font("Helvetica").fontSize(6.7).fillColor(INK).text(row.label, COLS.label.x, l.y + 1, { width: 380, lineBreak: false, ellipsis: true });
    l.doc.text(signedMoney(row.amount), PAGE_MARGIN, l.y + 1, { width: CONTENT_WIDTH - 8, align: "right", lineBreak: false });
    l.y += rowHeight;
  });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  ensureSpace(l, 26);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 19, 3).fill(PANEL);
  l.doc.font("Helvetica-Bold").fontSize(7.2).fillColor(INK).text("Impact total sur le net avant impôt", PAGE_MARGIN + 8, l.y + 5);
  l.doc.text(signedMoney(total), PAGE_MARGIN, l.y + 5, { width: CONTENT_WIDTH - 8, align: "right" });
  l.y += 25;
}

function drawNetAndEmployer(l: Layout, input: PayslipPdfInput): void {
  ensureSpace(l, 95);
  const left = PAGE_MARGIN;
  const right = PAGE_MARGIN + 278;
  const width = 265;
  l.doc.roundedRect(left, l.y, width, 84, 4).fill(PANEL);
  l.doc.rect(left, l.y, 4, 84).fill(ACCENT);
  l.doc.font("Helvetica-Bold").fontSize(6.5).fillColor(INK_FAINT).text("NET ET PRÉLÈVEMENT À LA SOURCE", left + 11, l.y + 9);
  const rows: Array<[string, string, boolean]> = [
    ["Net avant impôt", money(input.salary.netBeforeTax), false],
    ["Net imposable / base PAS", money(input.salary.netTaxable), false],
    [`PAS (${percentage(input.salary.withholdingTaxRate)})`, `-${money(input.salary.withholdingTax)}`, false],
    ["NET À PAYER", money(input.salary.netPaid), true],
  ];
  let rowY = l.y + 24;
  for (const [label, value, emphasis] of rows) {
    l.doc.font(emphasis ? "Helvetica-Bold" : "Helvetica").fontSize(emphasis ? 9.5 : 6.7).fillColor(INK);
    l.doc.text(label, left + 11, rowY);
    l.doc.text(value, left, rowY, { width: width - 11, align: "right" });
    rowY += emphasis ? 17 : 13;
  }

  l.doc.roundedRect(right, l.y, width, 84, 4).fill("#EEE7E1");
  l.doc.font("Helvetica-Bold").fontSize(6.5).fillColor(INK_FAINT).text("CHARGES ET COÛT EMPLOYEUR", right + 11, l.y + 9);
  l.doc.font("Helvetica").fontSize(6.8).fillColor(INK).text("Cotisations patronales", right + 11, l.y + 27);
  l.doc.font("Helvetica-Bold").fontSize(7.2).text(money(input.salary.employerContributions), right, l.y + 27, { width: width - 11, align: "right" });
  l.doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text("COÛT TOTAL EMPLOYEUR", right + 11, l.y + 48);
  l.doc.text(money(input.salary.totalEmployerCost), right, l.y + 48, { width: width - 11, align: "right" });
  l.doc.font("Helvetica").fontSize(6.2).fillColor(INK_SOFT).text("Montant net social", right + 11, l.y + 68);
  l.doc.font("Helvetica-Bold").fontSize(6.8).fillColor(INK).text(money(input.salary.netSocial), right + 11, l.y + 68, { width: width - 22, align: "right" });
  l.y += 91;
}

function drawPaidLeave(l: Layout, paidLeave: PayslipPdfPaidLeave | undefined): void {
  if (!paidLeave) return;
  const hasValue = [paidLeave.leaveDates, paidLeave.daysTaken, paidLeave.indemnity, paidLeave.acquired, paidLeave.taken, paidLeave.remaining].some((value) => value !== undefined);
  if (!hasValue) return;
  ensureSpace(l, 45);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 34, 4).lineWidth(0.6).strokeColor(BORDER).stroke();
  l.doc.font("Helvetica-Bold").fontSize(6.4).fillColor(INK).text("CONGÉS PAYÉS", PAGE_MARGIN + 9, l.y + 7);
  const detail = [
    paidLeave.leaveDates ? `Dates : ${paidLeave.leaveDates}` : "",
    paidLeave.daysTaken != null ? `Pris : ${paidLeave.daysTaken.toFixed(2)} j` : "",
    paidLeave.indemnity != null ? `Indemnité : ${money(paidLeave.indemnity)}` : "",
    paidLeave.acquired != null ? `Acquis : ${paidLeave.acquired.toFixed(2)} j` : "",
    paidLeave.taken != null ? `Cumul pris : ${paidLeave.taken.toFixed(2)} j` : "",
    paidLeave.remaining != null ? `Solde : ${paidLeave.remaining.toFixed(2)} j` : "",
  ].filter(Boolean).join("  ·  ");
  l.doc.font("Helvetica").fontSize(6.2).fillColor(INK_SOFT).text(detail, PAGE_MARGIN + 9, l.y + 19, { width: CONTENT_WIDTH - 18, lineBreak: false, ellipsis: true });
  l.y += 41;
}

function drawAnnualCumuls(l: Layout, cumuls: PayslipPdfAnnualCumuls | undefined, year: number): void {
  if (!cumuls) return;
  ensureSpace(l, 50);
  l.doc.roundedRect(PAGE_MARGIN, l.y, CONTENT_WIDTH, 39, 4).lineWidth(0.6).strokeColor(BORDER).stroke();
  l.doc.font("Helvetica-Bold").fontSize(6.4).fillColor(INK).text(`CUMULS ANNUELS ${year}`, PAGE_MARGIN + 9, l.y + 7);
  const labels = [
    ["Brut", cumuls.gross],
    ["Net imposable", cumuls.netTaxable],
    ["Net social", cumuls.netSocial],
    ["PAS", cumuls.withholdingTax],
    ["Net payé", cumuls.netPaid],
  ] as const;
  const cellWidth = (CONTENT_WIDTH - 18) / labels.length;
  labels.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + 9 + index * cellWidth;
    l.doc.font("Helvetica").fontSize(5.6).fillColor(INK_FAINT).text(label, x, l.y + 19, { width: cellWidth - 4, lineBreak: false });
    l.doc.font("Helvetica-Bold").fontSize(6.5).fillColor(INK).text(money(value), x, l.y + 28, { width: cellWidth - 4, lineBreak: false });
  });
  l.y += 46;
}

function drawLegalFooter(doc: PDFKit.PDFDocument, pageNumber: number, pageCount: number): void {
  const y = doc.page.height - 34;
  doc.moveTo(PAGE_MARGIN, y - 5).lineTo(PAGE_MARGIN + CONTENT_WIDTH, y - 5).lineWidth(0.5).strokeColor(BORDER).stroke();
  doc.font("Helvetica").fontSize(5.3).fillColor(INK_FAINT).text("Conservez ce bulletin de paie sans limitation de durée. Retrouvez la rubrique dédiée au bulletin de paie sur service-public.fr.", PAGE_MARGIN, y, { width: CONTENT_WIDTH - 70, lineBreak: false, ellipsis: true });
  doc.text(`Page ${pageNumber}/${pageCount}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
}

function drawPayslip(doc: PDFKit.PDFDocument, input: PayslipPdfInput): void {
  const l = new Layout(doc);
  drawHeader(l, input);
  drawIdentity(l, input);
  drawContext(l, input);
  drawRemuneration(l, input);
  drawContributions(l, input);
  drawNetAdjustments(l, input);
  drawNetAndEmployer(l, input);
  drawPaidLeave(l, input.paidLeave);
  drawAnnualCumuls(l, input.annualCumuls, input.period.year);
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
      const range = doc.bufferedPageRange();
      for (let index = 0; index < range.count; index += 1) {
        doc.switchToPage(range.start + index);
        drawLegalFooter(doc, index + 1, range.count);
      }
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
