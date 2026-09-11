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

function sanitizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—]/g, "-").replace(/€/g, "EUR").replace(/[^\u0000-\u00ff]/g, "?");
}
function escapePdfText(value: string): string { return sanitizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function money(value: number): string { return `${value.toFixed(2).replace(".", ",")} EUR`; }
function percentage(value: number): string { return `${(value * 100).toFixed(2).replace(".", ",")} %`; }
function contributionBasis(contribution: PayslipPdfContribution): string { if (contribution.rate === null) return "Forfait"; if (contribution.rate === undefined || contribution.baseAmount === undefined) return "Données manquantes"; if (contribution.baseAmount === null) return "Base indisponible"; return `${money(contribution.baseAmount)} | ${percentage(contribution.rate)}`; }

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

class PdfPageWriter {
  private pages: string[][] = [[]];
  private y = 800;
  get current(): string[] { return this.pages[this.pages.length - 1]; }
  get allPages(): string[][] { return this.pages; }
  get currentY(): number { return this.y; }
  setY(value: number): void { this.y = value; }
  text(x: number, y: number, text: string, size = 9, gray = 0): void { this.current.push(`BT /F1 ${size} Tf ${gray} g 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`); }
  rect(x: number, y: number, width: number, height: number, gray = 0.97, stroke = 0.88): void { this.current.push(`${stroke} G ${gray} g ${x} ${y} ${width} ${height} re B`); }
  fillRect(x: number, y: number, width: number, height: number, gray = 0.12): void { this.current.push(`${gray} g ${x} ${y} ${width} ${height} re f`); }
  rule(y = this.y, gray = 0.82): void { this.current.push(`0.5 w ${gray} G 40 ${y} m 555 ${y} l S`); }
  tableHeader(y: number, labels: Array<{ text: string; x: number; width: number }>): void { this.fillRect(40, y - 18, 515, 20, 0.16); for (const label of labels) this.text(label.x, y - 12, label.text, 7.5, 1); }
  line(text: string, amount?: string, size = 8.5, gap = 13, gray = 0): void { this.ensure(28); this.text(40, this.y, text, size, gray); if (amount !== undefined) this.text(445, this.y, amount, size, gray); this.y -= gap; }
  ensure(required: number): void { if (this.y - required >= 55) return; this.newPage(); }
  newPage(): void { this.pages.push([]); this.y = 800; this.text(40, this.y, "BULLETIN DE SALAIRE - SUITE", 12, 0.15); this.y -= 18; this.rule(this.y, 0.8); this.y -= 20; }
}

function buildPages(input: PayslipPdfInput): string[][] {
  const page = new PdfPageWriter();
  const month = input.period.month.toString().padStart(2, "0");

  page.fillRect(40, 770, 515, 52, 0.12);
  page.text(56, 800, "BULLETIN DE SALAIRE", 17, 1);
  page.text(56, 784, `${month}/${input.period.year}  |  Paiement : ${input.period.paymentDate}`, 8.5, 0.92);
  page.text(430, 800, "RH PILOT", 10, 1);
  page.text(430, 784, "Document de paie", 7.5, 0.82);
  page.setY(748);

  page.rect(40, 655, 515, 82, 0.98, 0.86);
  page.text(54, 718, "EMPLOYEUR", 7.5, 0.42);
  page.text(54, 702, input.employer.name, 10, 0.12);
  page.text(54, 688, input.employer.address, 8.5, 0.25);
  page.text(54, 674, `SIRET : ${input.employer.siret}`, 7.5, 0.32);
  page.text(190, 674, `APE/NAF : ${input.employer.nafCode}`, 7.5, 0.32);
  if (input.employer.urssafReference.trim()) page.text(54, 661, `Référence organisme social : ${input.employer.urssafReference}`, 7.5, 0.32);
  page.text(305, 718, "SALARIÉ", 7.5, 0.42);
  page.text(305, 702, input.employee.name, 10, 0.12);
  page.text(305, 688, input.employee.address, 8.5, 0.25);
  page.text(305, 674, `Emploi : ${input.employee.position}`, 7.5, 0.32);
  page.text(305, 661, `Classification : ${input.employee.classification}`, 7.5, 0.32);
  page.setY(637);

  page.text(40, page.currentY, "Cadre de paie", 8, 0.42);
  page.text(122, page.currentY, input.collectiveAgreement, 8.5, 0.14);
  page.text(420, page.currentY, `Horaire : ${input.period.hours.toFixed(2)} h`, 7.5, 0.32);
  page.setY(page.currentY - 18);
  page.rule(page.currentY, 0.82);
  page.setY(page.currentY - 22);

  page.text(40, page.currentY, "1. RÉMUNÉRATION", 9.5, 0.12);
  page.setY(page.currentY - 17);
  page.tableHeader(page.currentY, [{ text: "Élément", x: 50, width: 300 }, { text: "Montant", x: 455, width: 80 }]);
  page.setY(page.currentY - 30);
  page.line("Salaire de base", money(input.salary.baseGross), 8.5, 14);
  for (const variable of input.salary.variables) page.line(variable.label, money(variable.amount), 8.5, 14);
  page.rect(40, page.currentY - 3, 515, 22, 0.95, 0.88);
  page.text(50, page.currentY + 5, "Salaire brut total", 9.5, 0.12);
  page.text(445, page.currentY + 5, money(input.salary.gross), 9.5, 0.12);
  page.setY(page.currentY - 30);

  page.text(40, page.currentY, "2. COTISATIONS ET CONTRIBUTIONS", 9.5, 0.12);
  page.setY(page.currentY - 17);
  page.tableHeader(page.currentY, [{ text: "Libellé", x: 50, width: 245 }, { text: "Assiette / taux", x: 305, width: 135 }, { text: "Part salarié", x: 460, width: 80 }]);
  page.setY(page.currentY - 30);
  const employeeContributions = input.contributions.filter((contribution) => contribution.side === "EMPLOYEE");
  for (const contribution of employeeContributions) {
    page.ensure(30);
    page.text(50, page.currentY, contribution.label, 7.7, 0.14);
    page.text(305, page.currentY, contributionBasis(contribution), 7, 0.32);
    page.text(460, page.currentY, `-${money(contribution.amount)}`, 7.7, 0.14);
    page.setY(page.currentY - 13);
  }
  page.rect(40, page.currentY - 3, 515, 21, 0.95, 0.88);
  page.text(50, page.currentY + 5, "Total cotisations salariales", 8.5, 0.12);
  page.text(460, page.currentY + 5, `-${money(input.salary.employeeContributions)}`, 8.5, 0.12);
  page.setY(page.currentY - 29);

  page.rect(40, page.currentY - 88, 515, 88, 0.96, 0.84);
  page.text(54, page.currentY - 17, "NET ET PRÉLÈVEMENT À LA SOURCE", 8, 0.42);
  page.text(54, page.currentY - 39, "Net avant impôt", 8.5, 0.25);
  page.text(445, page.currentY - 39, money(input.salary.netBeforeTax), 8.5, 0.12);
  page.text(54, page.currentY - 55, "Net imposable / base PAS", 8.5, 0.25);
  page.text(445, page.currentY - 55, money(input.salary.netTaxable), 8.5, 0.12);
  page.text(54, page.currentY - 71, `Prélèvement à la source (${percentage(input.salary.withholdingTaxRate)})`, 8, 0.25);
  page.text(445, page.currentY - 71, `-${money(input.salary.withholdingTax)}`, 8, 0.12);
  page.text(54, page.currentY - 83, "NET PAYÉ", 11, 0.12);
  page.text(445, page.currentY - 83, money(input.salary.netPaid), 11, 0.12);
  page.setY(page.currentY - 108);

  page.rect(40, page.currentY - 34, 515, 34, 0.985, 0.9);
  page.text(54, page.currentY - 15, "Montant net social", 8.5, 0.25);
  page.text(445, page.currentY - 15, money(input.salary.netSocial), 9, 0.12);
  page.text(54, page.currentY - 29, "Montant utilisé comme référence pour certaines démarches sociales.", 6.8, 0.42);
  page.setY(page.currentY - 52);

  page.ensure(90);
  page.text(40, page.currentY, "3. CHARGES PATRONALES", 9.5, 0.12);
  page.setY(page.currentY - 17);
  page.tableHeader(page.currentY, [{ text: "Libellé", x: 50, width: 245 }, { text: "Assiette / taux", x: 305, width: 135 }, { text: "Part employeur", x: 455, width: 85 }]);
  page.setY(page.currentY - 30);
  const employerContributions = input.contributions.filter((contribution) => contribution.side === "EMPLOYER");
  for (const contribution of employerContributions) {
    page.ensure(30);
    page.text(50, page.currentY, contribution.label, 7.7, 0.14);
    page.text(305, page.currentY, contributionBasis(contribution), 7, 0.32);
    page.text(455, page.currentY, money(contribution.amount), 7.7, 0.14);
    page.setY(page.currentY - 13);
  }
  page.rect(40, page.currentY - 3, 515, 21, 0.95, 0.88);
  page.text(50, page.currentY + 5, "Total cotisations patronales", 8.5, 0.12);
  page.text(455, page.currentY + 5, money(input.salary.employerContributions), 8.5, 0.12);
  page.setY(page.currentY - 31);
  page.rect(40, page.currentY - 29, 515, 29, 0.92, 0.84);
  page.text(54, page.currentY - 18, "Coût total employeur", 9.5, 0.12);
  page.text(445, page.currentY - 18, money(input.salary.totalEmployerCost), 9.5, 0.12);
  page.setY(page.currentY - 48);

  page.rule(page.currentY, 0.82);
  page.setY(page.currentY - 17);
  page.text(40, page.currentY, `Référentiel de calcul : ${input.source}`, 7, 0.35);
  page.setY(page.currentY - 11);
  page.text(40, page.currentY, "Conservez ce bulletin de salaire. Les données détaillées du calcul sont conservées dans le dossier de paie RH Pilot.", 6.8, 0.38);
  page.setY(page.currentY - 10);
  page.text(40, page.currentY, "Document généré à partir des données de paie verrouillées de la période.", 6.8, 0.45);

  return page.allPages;
}

function buildPdf(pages: string[][]): Buffer {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const pageCount = pages.length;
  const firstPageObject = 3;
  const fontObject = firstPageObject + pageCount * 2;
  const kids = pages.map((_, index) => `${firstPageObject + index * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);
  for (let index = 0; index < pageCount; index += 1) {
    const pageObjectNumber = firstPageObject + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const stream = `q\n${pages[index].join("\n")}\nQ`;
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, "latin1"); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export function generatePayslipPdf(input: PayslipPdfInput): Buffer {
  const missing = requiredMissing(input);
  if (missing.length > 0) throw new PayslipPdfPrerequisiteError(missing);
  return buildPdf(buildPages(input));
}
