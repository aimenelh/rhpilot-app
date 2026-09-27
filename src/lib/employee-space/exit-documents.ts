/**
 * Documents de fin de contrat produits par RH Pilot : certificat de travail
 * (C. trav. art. L1234-19 et D1234-6) et reçu pour solde de tout compte
 * (art. L1234-20). L'attestation France Travail, elle, part par la DSN : son
 * exemplaire salarié est déposé tel quel dans l'espace du salarié.
 *
 * Module pur : il reçoit des données déjà chargées et rend un PDF.
 */
import PDFDocument from "pdfkit";
import type { PayslipResult } from "@/lib/payroll/bulletin/types";
import { formatLongDate, ofMonthLabel } from "./labels";

export type ExitEmployer = {
  name: string;
  siret: string;
  address: string;
  postalCode: string;
  city: string;
};

export type ExitEmployee = {
  civility: "MME" | "M" | "AUTRE" | null;
  firstName: string;
  lastName: string;
  address?: string | null;
  position: string | null;
  category?: string | null;
  hireDate: string;
  exitDate: string;
};

export type SettlementItem = { label: string; amount: number };

const TERMINATION_CODES = ["NOTICE_COMPENSATION", "CDD_END_ALLOWANCE", "PAID_LEAVE_COMPENSATION", "SEVERANCE"] as const;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Inventaire des sommes du reçu pour solde de tout compte, tiré du dernier
 * bulletin : salaire du mois, puis chaque indemnité de rupture, et le net versé.
 */
export function buildFinalSettlementItems(bulletin: PayslipResult): { items: SettlementItem[]; grossTotal: number; netPaid: number } {
  const gross = bulletin.lines.filter((line) => line.section === "GROSS");
  const byCode = new Map<string, SettlementItem>();
  for (const line of gross) {
    if (!(TERMINATION_CODES as readonly string[]).includes(line.code)) continue;
    const label = line.code === "PAID_LEAVE_COMPENSATION" ? "Indemnité compensatrice de congés payés" : line.code === "CDD_END_ALLOWANCE" ? "Indemnité de fin de contrat" : line.label;
    const current = byCode.get(line.code) ?? { label, amount: 0 };
    current.amount = round2(current.amount + (line.amount ?? 0));
    byCode.set(line.code, current);
  }
  const terminationTotal = [...byCode.values()].reduce((total, item) => total + item.amount, 0);
  const salary = round2(bulletin.totals.grossTotal - terminationTotal);
  const items: SettlementItem[] = [];
  if (salary !== 0) items.push({ label: `Salaire et accessoires ${ofMonthLabel(bulletin.period.year, bulletin.period.month)}`, amount: salary });
  for (const code of TERMINATION_CODES) {
    const item = byCode.get(code);
    if (item && item.amount !== 0) items.push(item);
  }
  return { items, grossTotal: round2(bulletin.totals.grossTotal), netPaid: round2(bulletin.totals.netPaid) };
}

const MARGIN = 64;
const INK = "#14151A";
export const SOFT = "#4A4A4D";
const FAINT = "#8C8C90";
const BORDER = "#D9D9DE";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
/** pdfkit (Helvetica, WinAnsi) n'a pas l'espace fine insécable utilisée par Intl. */
export const money = (value: number) => EUR.format(value).replace(/[  ]/g, " ");
const isoToDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
export const longDate = (iso: string) => formatLongDate(isoToDate(iso));

export function civilityName(employee: ExitEmployee): string {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  if (employee.civility === "MME") return `Madame ${name}`;
  if (employee.civility === "M") return `Monsieur ${name}`;
  return name;
}

export function agreed(employee: ExitEmployee, masculine: string, feminine: string): string {
  if (employee.civility === "MME") return feminine;
  if (employee.civility === "M") return masculine;
  return `${masculine}(e)`;
}

/** « d'assistante de gestion », « de DRH » : élision et minuscule initiale, sauf sigle. */
export function ofJob(title: string): string {
  const trimmed = title.trim();
  const text = /^[A-ZÀ-Ý][a-zà-ÿ]/.test(trimmed) ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : trimmed;
  return /^[aeiouyàâéèêëîïôûh]/i.test(text) ? `d'${text}` : `de ${text}`;
}

export function employerLine(employer: ExitEmployer): string {
  const place = [employer.address, `${employer.postalCode} ${employer.city}`.trim()].filter(Boolean).join(", ");
  return place;
}

export function render(title: string, info: { employer: ExitEmployer; employee: ExitEmployee; issuedAt: string }, draw: (doc: PDFKit.PDFDocument, width: number) => void, options: { compress?: boolean } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, compress: options.compress ?? true, info: { Title: `${title}, ${info.employee.firstName} ${info.employee.lastName}`, Author: info.employer.name, Creator: "RH Pilot", CreationDate: isoToDate(info.issuedAt) } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      const width = doc.page.width - MARGIN * 2;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(info.employer.name, MARGIN, MARGIN);
      doc.font("Helvetica").fontSize(9).fillColor(SOFT);
      const place = employerLine(info.employer);
      if (place) doc.text(place);
      if (info.employer.siret) doc.text(`SIRET ${info.employer.siret}`);
      doc.moveDown(3);
      doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(title, MARGIN, doc.y, { width, align: "center" });
      doc.moveDown(2);
      draw(doc, width);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function paragraph(doc: PDFKit.PDFDocument, text: string, width: number, options: { gap?: number; color?: string; size?: number } = {}) {
  doc.font("Helvetica").fontSize(options.size ?? 10.5).fillColor(options.color ?? INK).text(text, MARGIN, doc.y, { width, align: "justify", lineGap: 3 });
  doc.moveDown(options.gap ?? 1);
}

export function signature(doc: PDFKit.PDFDocument, width: number, left: { label: string; lines: string[] }, right?: { label: string; lines: string[] }) {
  doc.moveDown(1.5);
  const top = doc.y;
  const column = right ? width / 2 - 12 : width;
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(left.label, MARGIN, top, { width: column });
  for (const line of left.lines) doc.fillColor(FAINT).fontSize(9).text(line, { width: column });
  if (right) {
    doc.font("Helvetica").fontSize(10).fillColor(INK).text(right.label, MARGIN + width / 2 + 12, top, { width: column });
    for (const line of right.lines) doc.fillColor(FAINT).fontSize(9).text(line, { width: column });
  }
}

export type WorkCertificateInput = {
  employer: ExitEmployer;
  employee: ExitEmployee;
  issuedAt: string;
  /** Emplois successifs ; à défaut, l'emploi de la fiche sur toute la durée du contrat. */
  jobs?: ReadonlyArray<{ title: string; from: string; to: string }>;
  /** L'entreprise a une complémentaire santé ou une prévoyance : mention de la portabilité (CSS art. L911-8). */
  healthCoverage: boolean;
};

export function renderWorkCertificatePdf(input: WorkCertificateInput, options: { compress?: boolean } = {}): Promise<Buffer> {
  const { employer, employee } = input;
  if (!employee.exitDate) throw new Error("La date de fin de contrat est nécessaire pour le certificat de travail.");
  return render("Certificat de travail", input, (doc, width) => {
    const place = employerLine(employer);
    paragraph(doc, `L'employeur ${employer.name}${employer.siret ? `, SIRET ${employer.siret}` : ""}${place ? `, ${place}` : ""}, certifie que ${civilityName(employee)} a été ${agreed(employee, "employé", "employée")} du ${longDate(employee.hireDate)} au ${longDate(employee.exitDate)}.`, width);
    const jobs = input.jobs && input.jobs.length > 0 ? input.jobs : [{ title: employee.position || "emploi non précisé", from: employee.hireDate, to: employee.exitDate }];
    if (jobs.length === 1) {
      const pronoun = employee.civility === "MME" ? "Elle" : employee.civility === "M" ? "Il" : "Cette personne";
      paragraph(doc, `${pronoun} y a occupé l'emploi ${ofJob(jobs[0].title)}${employee.category ? ` (${employee.category.toLowerCase()})` : ""}.`, width);
    } else {
      paragraph(doc, "Emplois successivement occupés :", width, { gap: 0.4 });
      for (const job of jobs) paragraph(doc, `${job.title}, du ${longDate(job.from)} au ${longDate(job.to)}`, width, { gap: 0.3 });
      doc.moveDown(0.7);
    }
    if (input.healthCoverage) {
      paragraph(doc, `Conformément à l'article L911-8 du Code de la sécurité sociale, ${civilityName(employee)} peut bénéficier, ${agreed(employee, "s'il est pris", "si elle est prise")} en charge par l'assurance chômage, du maintien à titre gratuit des garanties de frais de santé et de prévoyance en vigueur chez l'employeur, pendant sa période d'indemnisation, dans la limite de la durée de son dernier contrat de travail (ou de ses derniers contrats consécutifs chez le même employeur), arrondie au mois supérieur, et au plus douze mois.`, width);
    }
    paragraph(doc, "Le présent certificat est délivré pour servir et valoir ce que de droit.", width);
    signature(doc, width, { label: `Fait à ${employer.city || "…"}, le ${longDate(input.issuedAt)}`, lines: [`Pour ${employer.name}`, "Nom, qualité et signature"] });
  }, options);
}

export type FinalSettlementInput = {
  employer: ExitEmployer;
  employee: ExitEmployee;
  issuedAt: string;
  items: readonly SettlementItem[];
  grossTotal: number;
  netPaid: number;
  paymentDate?: string | null;
};

export function renderFinalSettlementPdf(input: FinalSettlementInput, options: { compress?: boolean } = {}): Promise<Buffer> {
  const { employer, employee } = input;
  return render("Reçu pour solde de tout compte", input, (doc, width) => {
    const address = employee.address?.trim();
    paragraph(doc, `Je ${agreed(employee, "soussigné", "soussignée")}, ${civilityName(employee)}${address ? `, demeurant ${address.replace(/\s*\n\s*/g, ", ")}` : ""}, reconnais avoir reçu de mon employeur, ${employer.name}, pour solde de tout compte, la somme nette de ${money(input.netPaid)}${input.paymentDate ? `, versée le ${longDate(input.paymentDate)}` : ""}, en paiement des salaires, accessoires du salaire et indemnités dus au titre de l'exécution et de la cessation de mon contrat de travail, qui a pris fin le ${longDate(employee.exitDate)}.`, width);
    paragraph(doc, "Cette somme se décompose comme suit (montants bruts) :", width, { gap: 0.6 });

    const amountWidth = 110;
    const drawRow = (label: string, amount: string, bold = false) => {
      const y = doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(INK);
      doc.text(label, MARGIN + 8, y, { width: width - amountWidth - 16 });
      const bottom = doc.y;
      doc.text(amount, MARGIN + width - amountWidth, y, { width: amountWidth - 8, align: "right" });
      doc.y = Math.max(bottom, doc.y) + 5;
      doc.moveTo(MARGIN, doc.y - 2).lineTo(MARGIN + width, doc.y - 2).lineWidth(0.5).strokeColor(BORDER).stroke();
      doc.y += 4;
    };
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + width, doc.y).lineWidth(0.5).strokeColor(BORDER).stroke();
    doc.y += 6;
    for (const item of input.items) drawRow(item.label, money(item.amount));
    drawRow("Total brut", money(input.grossTotal), true);
    drawRow("Net versé, après cotisations et prélèvement à la source", money(input.netPaid), true);
    doc.moveDown(1);

    paragraph(doc, "Ce reçu, établi en deux exemplaires dont l'un m'a été remis, peut être dénoncé dans les six mois qui suivent sa signature. Passé ce délai, il devient libératoire pour l'employeur pour les sommes qui y sont mentionnées (article L1234-20 du Code du travail).", width, { color: SOFT, size: 9.5 });
    signature(
      doc,
      width,
      { label: "Fait à ………………………, le …………………", lines: ["Signature du salarié"] },
      { label: `Pour ${employer.name}`, lines: ["Nom, qualité et signature"] },
    );
  }, options);
}
