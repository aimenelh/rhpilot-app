/**
 * Bulletin de paie clarifié (C. trav. art. R3243-1 et suivants ; arrêté du
 * 25 février 2016 modifié) produit à partir d'un bulletin calculé.
 *
 * Le rendu ne recalcule rien : il présente les lignes et totaux du moteur,
 * regroupés par risque comme le prévoit le modèle clarifié.
 */
import PDFDocument from "pdfkit";
import type { PayslipLine, PayslipResult } from "./types";

export type BulletinPdfInput = {
  result: PayslipResult;
  employer: { name: string; address: string; siret: string; nafCode: string; urssafReference?: string };
  employee: { name: string; address: string; position: string; classification: string; coefficient?: string; hireDate: string; seniority?: string; exitDate?: string | null; socialSecurityNumber?: string };
  collectiveAgreement: string;
  paymentDate: string;
  contractMonthlyHours: number;
};

export class BulletinPdfPrerequisiteError extends Error {
  constructor(public readonly missing: string[]) {
    super("Informations obligatoires manquantes pour éditer le bulletin de paie.");
    this.name = "BulletinPdfPrerequisiteError";
  }
}

const NBSP = " ";
const MARGIN = 28;
const WIDTH = 539;
const INK = "#17181C";
const SOFT = "#5E6068";
const FAINT = "#8A8C93";
const BORDER = "#DCD8D2";
const PANEL = "#F6F4F1";
const ACCENT = "#F28A2E";

function money(value: number, options: { signed?: boolean } = {}): string {
  const negative = value < 0;
  const [integer, decimals] = Math.abs(value).toFixed(2).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = negative ? "-" : options.signed && value > 0 ? "+" : "";
  return `${sign}${grouped},${decimals}`;
}

function rate(value: number | undefined, unit: "PERCENT" | "HOURLY" | "PER_HOUR" = "PERCENT"): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "";
  if (unit === "HOURLY") return value.toFixed(4).replace(".", ",");
  if (unit === "PER_HOUR") return `${value.toFixed(2).replace(".", ",")} €/h`;
  let text = (value * 100).toFixed(4);
  while (text.endsWith("0") && text.split(".")[1].length > 2) text = text.slice(0, -1);
  return `${text.replace(".", ",")}${NBSP}%`;
}

function quantity(line: PayslipLine): string {
  if (line.quantity === undefined) return line.base !== undefined ? money(line.base) : "";
  const value = Number.isInteger(line.quantity) ? String(line.quantity) : line.quantity.toFixed(2).replace(".", ",");
  return line.unit === "HOURS" ? `${value}${NBSP}h` : line.unit === "DAYS" ? `${value}${NBSP}j` : value;
}

function frDate(day: string): string {
  return day.slice(0, 10).split("-").reverse().join("/");
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Colonnes : libellé | base | taux salarial | montant salarié | taux patronal | montant patronal
const COL = {
  label: { x: MARGIN + 6, w: 214 },
  base: { x: MARGIN + 222, w: 66 },
  rate: { x: MARGIN + 290, w: 50 },
  amount: { x: MARGIN + 342, w: 70 },
  employerRate: { x: MARGIN + 414, w: 50 },
  employerAmount: { x: MARGIN + 466, w: 67 },
};

class Page {
  y = MARGIN;
  constructor(readonly doc: PDFKit.PDFDocument) {}
  bottom() { return this.doc.page.height - MARGIN - 30; }
  ensure(height: number, onBreak?: () => void) {
    if (this.y + height <= this.bottom()) return;
    this.doc.addPage();
    this.y = MARGIN;
    onBreak?.();
  }
  rule(color = BORDER, weight = 0.5) {
    this.doc.moveTo(MARGIN, this.y).lineTo(MARGIN + WIDTH, this.y).lineWidth(weight).strokeColor(color).stroke();
  }
}

type Row = { label: string; base?: string; rate?: string; amount?: string; employerRate?: string; employerAmount?: string; style?: "heading" | "total" | "strong" | "muted" | "normal"; indent?: boolean };

function drawTableHeader(page: Page) {
  const { doc } = page;
  doc.rect(MARGIN, page.y, WIDTH, 17).fill(INK);
  doc.font("Helvetica-Bold").fontSize(6).fillColor("white");
  const cells: Array<[string, { x: number; w: number }, "left" | "right"]> = [
    ["Rubrique", COL.label, "left"], ["Base", COL.base, "right"], ["Taux salarial", COL.rate, "right"],
    ["Montant salarié", COL.amount, "right"], ["Taux patronal", COL.employerRate, "right"], ["Part employeur", COL.employerAmount, "right"],
  ];
  for (const [text, col, align] of cells) doc.text(text, col.x, page.y + 5.5, { width: col.w, align, lineBreak: false });
  page.y += 19;
}

function drawRow(page: Page, row: Row, zebra: boolean) {
  const { doc } = page;
  const style = row.style ?? "normal";
  const height = style === "heading" ? 12 : style === "total" ? 15 : 10.8;
  page.ensure(height + 4, () => drawTableHeader(page));
  if (style === "total") doc.rect(MARGIN, page.y - 1, WIDTH, height).fill(PANEL);
  else if (zebra && style === "normal") doc.rect(MARGIN, page.y - 1, WIDTH, height).fill("#FBFAF8");
  const bold = style === "heading" || style === "total" || style === "strong";
  const size = style === "total" ? 7.2 : 6.4;
  const textY = page.y + (style === "total" ? 3.5 : 1.5);
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(style === "muted" ? SOFT : INK);
  doc.text(row.label, COL.label.x + (row.indent ? 8 : 0), textY, { width: COL.label.w - (row.indent ? 8 : 0), lineBreak: false, ellipsis: true });
  const cell = (text: string | undefined, col: { x: number; w: number }, color = INK) => { if (text) doc.fillColor(color).text(text, col.x, textY, { width: col.w, align: "right", lineBreak: false }); };
  cell(row.base, COL.base, SOFT);
  cell(row.rate, COL.rate, SOFT);
  cell(row.amount, COL.amount);
  cell(row.employerRate, COL.employerRate, SOFT);
  cell(row.employerAmount, COL.employerAmount);
  page.y += height;
}

const SECTION_TITLES: Partial<Record<PayslipLine["section"], string>> = {
  SANTE: "Santé",
  RETRAITE: "Retraite",
  CSG_CRDS: "CSG et CRDS",
};

const CLARIFIED_LABELS: Record<string, string> = {
  MALADIE: "Sécurité sociale - Maladie Maternité Invalidité Décès",
  PREVOYANCE: "Complémentaire Incapacité Invalidité Décès",
  PREVOYANCE_T2: "Complémentaire Incapacité Invalidité Décès tranche 2",
  SANTE: "Complémentaire Santé",
  ATMP: "Accidents du travail & maladies professionnelles",
  VIEILLESSE_PLAF: "Sécurité sociale plafonnée",
  VIEILLESSE_DEPLAF: "Sécurité sociale déplafonnée",
  RETRAITE_T1: "Complémentaire Tranche 1",
  RETRAITE_T2: "Complémentaire Tranche 2",
  CET: "Contribution d'équilibre technique",
  FAMILLE: "Famille",
  APEC: "Apec",
  CSG_DEDUCTIBLE: "CSG déductible de l'impôt sur le revenu",
  CSG_CRDS_NON_DEDUCTIBLE: "CSG/CRDS non déductible de l'impôt sur le revenu",
  CSG_NON_IMPOSABLE: "CSG/CRDS sur les heures supplémentaires exonérées",
  RGDU: "Exonérations de cotisations employeur (RGDU)",
  DEDUCTION_HS_PATRONALE: "Déduction patronale heures supplémentaires",
  REDUCTION_HS_SALARIALE: "Exonération de cotisations salariales heures supplémentaires",
  CSG_RUPTURE_DEDUCTIBLE: "CSG déductible sur indemnité de rupture",
  CSG_CRDS_RUPTURE_NON_DEDUCTIBLE: "CSG/CRDS non déductible sur indemnité de rupture",
  CSG_CRDS_RUPTURE_EXONEREE_IR: "CSG/CRDS sur indemnité de rupture non imposable",
  CONTRIBUTION_RUPTURE: "Contribution patronale sur indemnité de rupture",
  MALADIE_ALSACE_MOSELLE: "Maladie régime local Alsace-Moselle",
};

function contributionRow(line: PayslipLine, indent: boolean): Row {
  const perHour = line.code === "DEDUCTION_HS_PATRONALE";
  return {
    label: line.code === "RGDU" && (line.employerAmount ?? 0) > 0 ? "Régularisation de la RGDU (reprise sur les cumuls)" : CLARIFIED_LABELS[line.code] ?? line.label,
    base: perHour ? quantity(line) : line.base !== undefined ? money(line.base) : "",
    rate: line.amount ? rate(line.rate) : "",
    amount: line.amount ? money(-(line.amount ?? 0)) : "",
    employerRate: line.employerAmount ? (perHour ? rate(line.employerRate, "PER_HOUR") : rate(line.employerRate)) : "",
    employerAmount: line.employerAmount ? money(line.employerAmount) : "",
    indent,
  };
}

function missingFields(input: BulletinPdfInput): string[] {
  const missing: string[] = [];
  const checks: Array<[string, string | undefined]> = [
    ["Nom de l'employeur", input.employer.name], ["Adresse de l'employeur", input.employer.address], ["SIRET", input.employer.siret], ["Code APE", input.employer.nafCode],
    ["Nom du salarié", input.employee.name], ["Emploi du salarié", input.employee.position], ["Classification du salarié", input.employee.classification],
    ["Convention collective ou référence au Code du travail", input.collectiveAgreement], ["Date de paiement", input.paymentDate],
  ];
  for (const [label, value] of checks) if (!value || !value.trim()) missing.push(label);
  return missing;
}

function drawBulletin(doc: PDFKit.PDFDocument, input: BulletinPdfInput) {
  const { result } = input;
  const page = new Page(doc);
  const totals = result.totals;

  // En-tête
  doc.rect(MARGIN, page.y, WIDTH, 50).fill(INK);
  doc.rect(MARGIN, page.y, 4, 50).fill(ACCENT);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("white").text("BULLETIN DE PAIE", MARGIN + 14, page.y + 10);
  doc.font("Helvetica").fontSize(7.2).fillColor("#D9D7D3").text(`${MONTHS[result.period.month - 1]} ${result.period.year} : du ${frDate(result.period.first)} au ${frDate(result.period.last)}  ·  payé le ${frDate(input.paymentDate)}`, MARGIN + 14, page.y + 32);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("white").text(input.employer.name, MARGIN, page.y + 11, { width: WIDTH - 14, align: "right" });
  doc.font("Helvetica").fontSize(6.4).fillColor("#D9D7D3").text(`SIRET ${input.employer.siret}  ·  APE ${input.employer.nafCode}`, MARGIN, page.y + 27, { width: WIDTH - 14, align: "right" });
  page.y += 58;

  // Identification
  const top = page.y;
  doc.font("Helvetica-Bold").fontSize(6.2).fillColor(ACCENT).text("EMPLOYEUR", MARGIN + 10, top + 8);
  doc.font("Helvetica").fontSize(6.8).fillColor(INK).text(input.employer.address, MARGIN + 10, top + 19, { width: 240, lineBreak: false, ellipsis: true });
  if (input.employer.urssafReference?.trim()) doc.fillColor(SOFT).text(`Cotisations versées à l'Urssaf, compte ${input.employer.urssafReference}`, MARGIN + 10, top + 30, { width: 240, lineBreak: false, ellipsis: true });
  doc.fillColor(SOFT).text(`Convention : ${input.collectiveAgreement}`, MARGIN + 10, top + 41, { width: 240, lineBreak: false, ellipsis: true });
  doc.text(`Horaire contractuel : ${input.contractMonthlyHours.toFixed(2).replace(".", ",")} h par mois`, MARGIN + 10, top + 52, { width: 240, lineBreak: false });

  const right = MARGIN + 272;
  doc.font("Helvetica-Bold").fontSize(6.2).fillColor(ACCENT).text("SALARIÉ", right, top + 8);
  doc.font("Helvetica-Bold").fontSize(8.2).fillColor(INK).text(input.employee.name, right, top + 18, { width: 255, lineBreak: false, ellipsis: true });
  doc.font("Helvetica").fontSize(6.8).fillColor(SOFT).text(input.employee.address || " ", right, top + 30, { width: 255, lineBreak: false, ellipsis: true });
  const classification = [input.employee.position, input.employee.classification, input.employee.coefficient ? `coefficient ${input.employee.coefficient}` : ""].filter(Boolean).join("  ·  ");
  doc.fillColor(INK).text(classification, right, top + 41, { width: 255, lineBreak: false, ellipsis: true });
  const dates = [`Entrée le ${frDate(input.employee.hireDate)}`, input.employee.seniority ? `ancienneté ${input.employee.seniority}` : "", input.employee.exitDate ? `sortie le ${frDate(input.employee.exitDate)}` : "", input.employee.socialSecurityNumber ? `n° SS ${input.employee.socialSecurityNumber}` : ""].filter(Boolean).join("  ·  ");
  doc.fillColor(SOFT).text(dates, right, top + 52, { width: 255, lineBreak: false, ellipsis: true });
  doc.roundedRect(MARGIN, top, WIDTH, 68, 3).lineWidth(0.6).strokeColor(BORDER).stroke();
  page.y = top + 76;

  drawTableHeader(page);

  // Rémunération brute
  let zebra = false;
  const grossLines = result.lines.filter((line) => line.section === "GROSS");
  for (const line of grossLines) {
    const hourly = line.code === "BASE" || line.code.startsWith("HS_") || line.code.startsWith("HC_") || line.code === "ENTRY_EXIT" || line.code.startsWith("ABS_");
    drawRow(page, { label: line.label, base: quantity(line), rate: line.rate !== undefined ? rate(line.rate, hourly ? "HOURLY" : "PERCENT") : "", amount: money(line.amount ?? 0) }, zebra);
    zebra = !zebra;
  }
  drawRow(page, { label: "SALAIRE BRUT", amount: money(totals.grossTotal), style: "total" }, false);
  if (Math.abs(totals.grossTotal - totals.grossSubject) > 0.005) drawRow(page, { label: "dont brut soumis à cotisations", amount: money(totals.grossSubject), style: "muted" }, false);

  // Cotisations regroupées par risque
  const contributions = result.lines.filter((line) => line.section !== "GROSS" && line.section !== "NET_ITEMS");
  const bySection = new Map<PayslipLine["section"], PayslipLine[]>();
  for (const line of contributions) bySection.set(line.section, [...(bySection.get(line.section) ?? []), line]);
  zebra = false;
  const emit = (row: Row) => { drawRow(page, row, zebra); zebra = !zebra; };
  for (const section of ["SANTE", "ACCIDENTS_TRAVAIL", "RETRAITE", "FAMILLE", "CHOMAGE", "AUTRES_EMPLOYEUR", "CSG_CRDS", "EXONERATIONS"] as const) {
    const lines = bySection.get(section) ?? [];
    if (lines.length === 0) continue;
    if (section === "CHOMAGE") {
      const unemployment = lines.filter((line) => line.code === "CHOMAGE" || line.code === "AGS");
      if (unemployment.length > 0) {
        const employer = unemployment.reduce((total, line) => total + (line.employerAmount ?? 0), 0);
        const employerRate = unemployment.reduce((total, line) => total + (line.employerRate ?? 0), 0);
        emit({ label: "Assurance chômage", base: unemployment[0].base !== undefined ? money(unemployment[0].base) : "", employerRate: rate(employerRate), employerAmount: money(employer) });
      }
      const apec = lines.find((line) => line.code === "APEC");
      if (apec) {
        drawRow(page, { label: "Cotisations statutaires ou prévues par la convention collective", style: "heading" }, false);
        emit(contributionRow(apec, true));
      }
      continue;
    }
    if (section === "AUTRES_EMPLOYEUR") {
      const regular = lines.filter((line) => line.code !== "CONTRIBUTION_RUPTURE");
      const employer = regular.reduce((total, line) => total + (line.employerAmount ?? 0), 0);
      if (Math.abs(employer) >= 0.005) emit({ label: "Autres contributions dues par l'employeur", employerAmount: money(employer) });
      for (const line of lines.filter((candidate) => candidate.code === "CONTRIBUTION_RUPTURE")) emit(contributionRow(line, false));
      continue;
    }
    const title = SECTION_TITLES[section];
    if (title && lines.length > 1) {
      drawRow(page, { label: title, style: "heading" }, false);
      for (const line of lines) emit(contributionRow(line, true));
    } else {
      for (const line of lines) emit(contributionRow(line, false));
    }
  }
  drawRow(page, { label: "TOTAL DES COTISATIONS ET CONTRIBUTIONS", amount: money(-totals.employeeContributions), employerAmount: money(totals.employerContributions), style: "total" }, false);

  // Éléments hors brut
  const netItems = result.lines.filter((line) => line.section === "NET_ITEMS");
  if (netItems.length > 0) {
    zebra = false;
    for (const line of netItems) emit({ label: line.label, base: line.quantity !== undefined ? quantity(line) : "", amount: money(line.amount ?? 0) });
  }
  drawRow(page, { label: "NET À PAYER AVANT IMPÔT SUR LE REVENU", amount: money(totals.netBeforeTax), style: "total" }, false);

  // Impôt sur le revenu
  page.ensure(64);
  page.y += 4;
  const w = result.withholding;
  const pasTop = page.y;
  doc.roundedRect(MARGIN, pasTop, WIDTH, 44, 3).lineWidth(0.6).strokeColor(BORDER).stroke();
  doc.font("Helvetica-Bold").fontSize(6.4).fillColor(INK).text("Impôt sur le revenu prélevé à la source", MARGIN + 8, pasTop + 7);
  doc.font("Helvetica").fontSize(6.4).fillColor(SOFT);
  doc.text(`Montant net imposable : ${money(totals.netTaxable)} €`, MARGIN + 8, pasTop + 19);
  const rateLabel = w.mode === "PERSONALIZED" ? `Taux personnalisé${w.rateIdentifier ? ` (réf. ${w.rateIdentifier})` : ""}` : "Taux non personnalisé (grille par défaut)";
  doc.text(`${rateLabel} : ${rate(w.rate)}`, MARGIN + 8, pasTop + 30);
  const baseText = w.shortContractAllowance > 0 ? `Base ${money(w.base)} € après abattement contrat court de ${money(w.shortContractAllowance)} €` : `Base ${money(w.base)} €`;
  doc.text(baseText, MARGIN + 250, pasTop + 19, { width: 180 });
  doc.font("Helvetica-Bold").fontSize(7.2).fillColor(INK).text(`${money(-totals.withholdingTax)} €`, MARGIN, pasTop + 24, { width: WIDTH - 10, align: "right" });
  page.y = pasTop + 52;

  // Net payé
  page.ensure(40);
  doc.rect(MARGIN, page.y, WIDTH, 30).fill(INK);
  doc.rect(MARGIN, page.y, 4, 30).fill(ACCENT);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("white").text("NET PAYÉ", MARGIN + 14, page.y + 9.5);
  doc.font("Helvetica").fontSize(6.6).fillColor("#D9D7D3").text(`versé le ${frDate(input.paymentDate)}`, MARGIN + 80, page.y + 12);
  doc.font("Helvetica-Bold").fontSize(12.5).fillColor("white").text(`${money(totals.netPaid)} €`, MARGIN, page.y + 8.5, { width: WIDTH - 12, align: "right" });
  page.y += 38;

  // Informations complémentaires
  page.ensure(40);
  const infoTop = page.y;
  const reductions = -totals.employerReductions;
  const infos: Array<[string, string]> = [
    ["Montant net social", `${money(totals.netSocial)} €`],
    ["Allègements de cotisations employeur", `${money(reductions)} €`],
    ["Coût total employeur", `${money(totals.employerCost)} €`],
    ["Heures rémunérées", `${totals.hoursPaid.toFixed(2).replace(".", ",")} h`],
  ];
  const cell = WIDTH / infos.length;
  infos.forEach(([label, value], index) => {
    const x = MARGIN + index * cell;
    doc.rect(x + (index ? 2 : 0), infoTop, cell - 2, 30).fill(PANEL);
    doc.font("Helvetica").fontSize(5.8).fillColor(FAINT).text(label, x + 8, infoTop + 6, { width: cell - 14, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(7.6).fillColor(INK).text(value, x + 8, infoTop + 16, { width: cell - 14, lineBreak: false });
  });
  page.y = infoTop + 38;

  // Congés payés et cumuls, côte à côte
  page.ensure(62);
  const boxTop = page.y;
  const boxHeight = 56;
  const leftWidth = 262;
  const rightX = MARGIN + leftWidth + 8;
  const rightWidth = WIDTH - leftWidth - 8;
  const leave = result.paidLeave;
  doc.roundedRect(MARGIN, boxTop, leftWidth, boxHeight, 3).lineWidth(0.6).strokeColor(BORDER).stroke();
  doc.font("Helvetica-Bold").fontSize(6.4).fillColor(INK).text("Congés payés (jours)", MARGIN + 8, boxTop + 7);
  if (leave) {
    const b = leave.balancesAfter;
    const days = (value: number) => value.toFixed(2).replace(".", ",");
    const widths = [104, 46, 46, 46];
    const rows: string[][] = [
      ["", "Acquis", "Pris", "Solde"],
      ["Période N-1", days(b.previousAcquired), days(b.previousTaken), days(Math.max(0, b.previousAcquired - b.previousTaken))],
      ["Période N", days(b.currentAcquired), days(b.currentTaken), days(Math.max(0, b.currentAcquired - b.currentTaken))],
    ];
    rows.forEach((row, r) => {
      let x = MARGIN + 8;
      row.forEach((value, i) => {
        doc.font(r === 0 ? "Helvetica" : i ? "Helvetica-Bold" : "Helvetica").fontSize(r === 0 ? 5.8 : 6.3).fillColor(r === 0 ? FAINT : INK).text(value, x, boxTop + 17 + r * 9, { width: widths[i], align: i ? "right" : "left", lineBreak: false });
        x += widths[i];
      });
    });
    const notes = [
      leave.daysTaken > 0 ? `${days(leave.daysTaken)} j pris ce mois` : "",
      `${days(leave.acquiredThisMonth)} j acquis ce mois`,
      leave.compensatedDays ? `${days(leave.compensatedDays)} j soldés en indemnité compensatrice` : "",
    ].filter(Boolean).join("  ·  ");
    doc.font("Helvetica").fontSize(5.8).fillColor(SOFT).text(notes, MARGIN + 8, boxTop + 45, { width: leftWidth - 16, lineBreak: false, ellipsis: true });
  } else {
    doc.font("Helvetica").fontSize(6).fillColor(SOFT).text("Compteurs non suivis pour ce salarié.", MARGIN + 8, boxTop + 20);
  }

  const ytd = result.yearToDate;
  doc.roundedRect(rightX, boxTop, rightWidth, boxHeight, 3).lineWidth(0.6).strokeColor(BORDER).stroke();
  doc.font("Helvetica-Bold").fontSize(6.4).fillColor(INK).text(`Cumuls ${result.period.year}`, rightX + 8, boxTop + 7);
  const cumuls: Array<[string, string]> = [
    ["Brut", money(ytd.grossTotal)], ["Net imposable", money(ytd.netTaxable)], ["Impôt prélevé", money(ytd.withholdingTax)],
    ["Plafond SS", money(ytd.ceiling)], ["Heures payées", ytd.hoursPaid.toFixed(2).replace(".", ",")], ["Coût employeur", money(ytd.employerCost)],
  ];
  const cumulCell = (rightWidth - 16) / 3;
  cumuls.forEach(([label, value], i) => {
    const x = rightX + 8 + (i % 3) * cumulCell;
    const y = boxTop + 17 + Math.floor(i / 3) * 19;
    doc.font("Helvetica").fontSize(5.6).fillColor(FAINT).text(label, x, y, { width: cumulCell - 4, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(6.6).fillColor(INK).text(value, x, y + 7.5, { width: cumulCell - 4, lineBreak: false });
  });
  page.y = boxTop + boxHeight + 8;
}

function drawFooter(doc: PDFKit.PDFDocument, pageNumber: number, count: number, engineVersion: string) {
  // Le pied de page est écrit sous la marge basse : on la neutralise pour que pdfkit n'ajoute pas de page.
  doc.page.margins.bottom = 0;
  const y = doc.page.height - 38;
  doc.moveTo(MARGIN, y - 5).lineTo(MARGIN + WIDTH, y - 5).lineWidth(0.5).strokeColor(BORDER).stroke();
  doc.font("Helvetica").fontSize(5.4).fillColor(FAINT);
  doc.text("Dans votre intérêt et pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée. Pour en savoir plus, consultez la rubrique dédiée au bulletin de paie sur le portail www.service-public.fr.", MARGIN, y, { width: WIDTH - 60 });
  doc.text(`Page ${pageNumber}/${count}`, MARGIN, y, { width: WIDTH, align: "right", lineBreak: false });
  doc.text(`Établi avec RH Pilot (${engineVersion})`, MARGIN, y + 15, { width: WIDTH, align: "right", lineBreak: false });
}

/**
 * Date de création figée sur la date de paiement : deux rendus du même
 * bulletin donnent le même fichier (même empreinte), ce qui évite de
 * republier comme « corrigé » un bulletin identique.
 */
function documentDate(paymentDate: string): Date {
  const date = new Date(`${paymentDate.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export function renderBulletinPdf(input: BulletinPdfInput): Promise<Buffer> {
  const missing = missingFields(input);
  if (missing.length > 0) throw new BulletinPdfPrerequisiteError(missing);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true, info: { Title: `Bulletin de paie ${String(input.result.period.month).padStart(2, "0")}/${input.result.period.year}`, Author: input.employer.name, Creator: "RH Pilot", CreationDate: documentDate(input.paymentDate) } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      drawBulletin(doc, input);
      const range = doc.bufferedPageRange();
      for (let index = 0; index < range.count; index += 1) {
        doc.switchToPage(range.start + index);
        drawFooter(doc, index + 1, range.count, input.result.engineVersion);
      }
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
