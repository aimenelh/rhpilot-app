export type PayslipPdfContribution = {
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  sourceRule?: string;
};

export type PayslipPdfInput = {
  employer: {
    name: string;
    address: string;
    siret: string;
    nafCode: string;
    urssafReference: string;
  };
  employee: {
    name: string;
    address: string;
    position: string;
    classification: string;
  };
  period: {
    year: number;
    month: number;
    paymentDate: string;
    hours: number;
  };
  salary: {
    baseGross: number;
    variables: Array<{ label: string; amount: number }>;
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
};

export class PayslipPdfPrerequisiteError extends Error {
  constructor(public readonly missing: string[]) {
    super("Informations obligatoires manquantes pour générer le bulletin de paie.");
    this.name = "PayslipPdfPrerequisiteError";
  }
}

function sanitizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/€/g, "EUR")
    .replace(/[^\u0000-\u00ff]/g, "?");
}

function escapePdfText(value: string): string {
  return sanitizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function money(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} EUR`;
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

  for (const [label, value] of checks) {
    if (!value.trim()) missing.push(label);
  }
  if (!Number.isFinite(input.period.hours) || input.period.hours < 0) missing.push("Volume horaire");
  if (!Number.isFinite(input.salary.netSocial) || input.salary.netSocial < 0) missing.push("Montant net social");
  if (!Number.isFinite(input.salary.netTaxable) || input.salary.netTaxable < 0) missing.push("Salaire net imposable");
  if (!Number.isFinite(input.salary.withholdingTaxRate) || input.salary.withholdingTaxRate < 0 || input.salary.withholdingTaxRate > 1) missing.push("Taux de prélèvement à la source");
  if (!Number.isFinite(input.salary.withholdingTax) || input.salary.withholdingTax < 0) missing.push("Montant du prélèvement à la source");
  return missing;
}

function addText(lines: string[], x: number, y: number, text: string, size = 9): void {
  lines.push(`BT /F1 ${size} Tf 0 g 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
}

function addRule(lines: string[], y: number): void {
  lines.push(`0.5 w 40 ${y} m 555 ${y} l S`);
}

function buildContent(input: PayslipPdfInput): string {
  const lines: string[] = [];
  let y = 800;

  addText(lines, 40, y, "BULLETIN DE PAIE", 16);
  y -= 20;
  addText(lines, 40, y, `${input.period.month.toString().padStart(2, "0")}/${input.period.year}`);
  addText(lines, 420, y, `Paiement : ${input.period.paymentDate}`);
  y -= 16;
  addRule(lines, y);
  y -= 18;

  addText(lines, 40, y, input.employer.name, 10);
  y -= 13;
  addText(lines, 40, y, input.employer.address);
  y -= 13;
  addText(lines, 40, y, `SIRET : ${input.employer.siret} | APE/NAF : ${input.employer.nafCode}`);
  if (input.employer.urssafReference.trim()) {
    y -= 13;
    addText(lines, 40, y, `Organisme social : ${input.employer.urssafReference}`);
  }
  y -= 18;

  addText(lines, 300, y + 44, input.employee.name, 10);
  addText(lines, 300, y + 31, input.employee.address);
  addText(lines, 300, y + 18, `${input.employee.position} - ${input.employee.classification}`);

  addText(lines, 40, y, `Convention collective : ${input.collectiveAgreement}`);
  y -= 24;
  addRule(lines, y);
  y -= 20;

  addText(lines, 40, y, "ELEMENTS DE REMUNERATION", 10);
  y -= 16;
  addText(lines, 40, y, "Salaire de base");
  addText(lines, 450, y, money(input.salary.baseGross));
  y -= 14;

  for (const variable of input.salary.variables) {
    addText(lines, 40, y, variable.label);
    addText(lines, 450, y, money(variable.amount));
    y -= 14;
  }

  addText(lines, 40, y, `Brut total (${input.period.hours.toFixed(2)} h)`, 10);
  addText(lines, 450, y, money(input.salary.gross), 10);
  y -= 22;
  addRule(lines, y);
  y -= 20;

  addText(lines, 40, y, "COTISATIONS ET CONTRIBUTIONS", 10);
  y -= 16;
  for (const contribution of input.contributions) {
    if (contribution.side !== "EMPLOYEE") continue;
    addText(lines, 40, y, contribution.label);
    addText(lines, 450, y, `-${money(contribution.amount)}`);
    y -= 13;
  }

  addText(lines, 40, y, "Total cotisations salariales", 10);
  addText(lines, 450, y, `-${money(input.salary.employeeContributions)}`, 10);
  y -= 18;
  addText(lines, 40, y, "Net avant impôt");
  addText(lines, 450, y, money(input.salary.netBeforeTax));
  y -= 15;
  addText(lines, 40, y, "Net imposable");
  addText(lines, 450, y, money(input.salary.netTaxable));
  y -= 15;
  addText(lines, 40, y, `Prélèvement à la source (${percentage(input.salary.withholdingTaxRate)})`);
  addText(lines, 450, y, `-${money(input.salary.withholdingTax)}`);
  y -= 15;
  addText(lines, 40, y, "Net payé", 11);
  addText(lines, 450, y, money(input.salary.netPaid), 11);
  y -= 15;
  addText(lines, 40, y, "Montant net social");
  addText(lines, 450, y, money(input.salary.netSocial));
  y -= 25;
  addRule(lines, y);
  y -= 18;

  addText(lines, 40, y, "CHARGES PATRONALES", 10);
  y -= 15;
  for (const contribution of input.contributions) {
    if (contribution.side !== "EMPLOYER") continue;
    addText(lines, 40, y, contribution.label);
    addText(lines, 450, y, money(contribution.amount));
    y -= 13;
  }
  addText(lines, 40, y, "Total cotisations patronales", 10);
  addText(lines, 450, y, money(input.salary.employerContributions), 10);
  y -= 15;
  addText(lines, 40, y, "Total versé par l'employeur", 10);
  addText(lines, 450, y, money(input.salary.totalEmployerCost), 10);
  y -= 30;
  addRule(lines, y);
  y -= 18;

  addText(lines, 40, y, "Conservez ce bulletin sans limitation de duree.", 8);
  y -= 13;
  addText(lines, 40, y, "Pour plus d'informations, consultez la rubrique bulletin de paie sur service-public.fr.", 8);
  y -= 16;
  addText(lines, 40, y, `Referentiel de calcul : ${input.source}`, 7);

  return lines.join("\n");
}

function buildPdf(content: string): Buffer {
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const stream = `q\n${content}\nQ`;
  objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export function generatePayslipPdf(input: PayslipPdfInput): Buffer {
  const missing = requiredMissing(input);
  if (missing.length > 0) throw new PayslipPdfPrerequisiteError(missing);
  return buildPdf(buildContent(input));
}
