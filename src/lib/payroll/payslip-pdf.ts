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

export class PayslipPdfPrerequisiteError extends Error { constructor(public readonly missing: string[]) { super("Informations obligatoires manquantes pour générer le bulletin de paie."); this.name = "PayslipPdfPrerequisiteError"; } }
function sanitizeText(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—]/g, "-").replace(/€/g, "EUR").replace(/[^\u0000-\u00ff]/g, "?"); }
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

class PdfPageWriter { private pages: string[][] = [[]]; private y = 800; get current(): string[] { return this.pages[this.pages.length - 1]; } get allPages(): string[][] { return this.pages; } get currentY(): number { return this.y; } text(x: number, y: number, text: string, size = 9): void { this.current.push(`BT /F1 ${size} Tf 0 g 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`); } rule(): void { this.current.push(`0.5 w 40 ${this.y} m 555 ${this.y} l S`); } line(text: string, amount?: string, size = 9, gap = 13): void { this.ensure(28); this.text(40, this.y, text, size); if (amount !== undefined) this.text(450, this.y, amount, size); this.y -= gap; } ensure(required: number): void { if (this.y - required >= 48) return; this.newPage(); } newPage(): void { this.pages.push([]); this.y = 800; this.text(40, this.y, "BULLETIN DE PAIE - SUITE", 12); this.y -= 22; this.current.push(`0.5 w 40 ${this.y} m 555 ${this.y} l S`); this.y -= 18; } spacer(amount: number): void { this.y -= amount; } }

function buildPages(input: PayslipPdfInput): string[][] {
  const page = new PdfPageWriter(); page.text(40, page.currentY, "BULLETIN DE PAIE", 16); page.spacer(20); page.text(40, page.currentY, `${input.period.month.toString().padStart(2, "0")}/${input.period.year}`); page.text(420, page.currentY, `Paiement : ${input.period.paymentDate}`); page.spacer(16); page.rule(); page.spacer(18); page.line(input.employer.name, undefined, 10); page.line(input.employer.address); page.line(`SIRET : ${input.employer.siret} | APE/NAF : ${input.employer.nafCode}`); if (input.employer.urssafReference.trim()) page.line(`Organisme social : ${input.employer.urssafReference}`); page.spacer(5); page.text(300, page.currentY + 49, input.employee.name, 10); page.text(300, page.currentY + 36, input.employee.address); page.text(300, page.currentY + 23, `${input.employee.position} - ${input.employee.classification}`); page.line(`Convention collective : ${input.collectiveAgreement}`, undefined, 9, 24); page.rule(); page.spacer(20);
  page.line("ELEMENTS DE REMUNERATION", undefined, 10, 16); page.line("Salaire de base", money(input.salary.baseGross), 9, 14); for (const variable of input.salary.variables) page.line(variable.label, money(variable.amount), 9, 14); page.line(`Brut total (${input.period.hours.toFixed(2)} h)`, money(input.salary.gross), 10, 22); page.rule(); page.spacer(20);
  page.line("COTISATIONS ET CONTRIBUTIONS", undefined, 10, 16); page.line("Libellé", "Assiette / taux", 8, 12); for (const contribution of input.contributions) if (contribution.side === "EMPLOYEE") page.line(`${contribution.label} [${contributionBasis(contribution)}]`, `-${money(contribution.amount)}`); page.line("Total cotisations salariales", `-${money(input.salary.employeeContributions)}`, 10, 18); page.line("Net avant impôt", money(input.salary.netBeforeTax), 9, 15); page.line("Net imposable", money(input.salary.netTaxable), 9, 15); page.line("Base PAS", money(input.salary.netTaxable), 9, 15); page.line(`Prélèvement à la source (${percentage(input.salary.withholdingTaxRate)})`, `-${money(input.salary.withholdingTax)}`, 9, 15); page.line("Net payé", money(input.salary.netPaid), 11, 15); page.line("Montant net social", money(input.salary.netSocial), 9, 25); page.rule(); page.spacer(18);
  page.line("CHARGES PATRONALES", undefined, 10, 15); page.line("Libellé", "Assiette / taux", 8, 12); for (const contribution of input.contributions) if (contribution.side === "EMPLOYER") page.line(`${contribution.label} [${contributionBasis(contribution)}]`, money(contribution.amount)); page.line("Total cotisations patronales", money(input.salary.employerContributions), 10, 15); page.line("Total versé par l'employeur", money(input.salary.totalEmployerCost), 10, 30); page.rule(); page.spacer(18); page.line("Conservez ce bulletin sans limitation de duree.", undefined, 8, 13); page.line("Pour plus d'informations, consultez la rubrique bulletin de paie sur service-public.fr.", undefined, 8, 16); page.line(`Referentiel de calcul : ${input.source}`, undefined, 7, 10); return page.allPages;
}

function buildPdf(pages: string[][]): Buffer { const objects: string[] = []; objects.push("<< /Type /Catalog /Pages 2 0 R >>"); const pageCount = pages.length; const firstPageObject = 3; const fontObject = firstPageObject + pageCount * 2; const kids = pages.map((_, index) => `${firstPageObject + index * 2} 0 R`).join(" "); objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`); for (let index = 0; index < pageCount; index += 1) { const pageObjectNumber = firstPageObject + index * 2; const contentObjectNumber = pageObjectNumber + 1; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`); const stream = `q\n${pages[index].join("\n")}\nQ`; objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`); } objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); let pdf = "%PDF-1.4\n%âãÏÓ\n"; const offsets: number[] = [0]; objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, "latin1"); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xrefOffset = Buffer.byteLength(pdf, "latin1"); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let index = 1; index <= objects.length; index += 1) pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`; pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`; return Buffer.from(pdf, "latin1"); }
export function generatePayslipPdf(input: PayslipPdfInput): Buffer { const missing = requiredMissing(input); if (missing.length > 0) throw new PayslipPdfPrerequisiteError(missing); return buildPdf(buildPages(input)); }
