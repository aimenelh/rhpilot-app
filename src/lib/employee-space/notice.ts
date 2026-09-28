/**
 * Bulletin de paie électronique : information préalable du salarié.
 *
 * C. trav. art. D3243-7 : l'employeur informe le salarié, par tout moyen
 * conférant date certaine, un mois avant le premier bulletin électronique ou
 * au moment de l'embauche, de son droit de s'y opposer. D3243-8 : bulletins
 * disponibles cinquante ans (ou jusqu'à 76 ans), récupérables en une fois,
 * fermeture du service annoncée trois mois à l'avance.
 *
 * Note PDF à faire signer (serveur uniquement). Les règles sans PDF sont
 * dans notice-rules.ts, importable côté client.
 */
import { civilityName, employerLine, longDate, paragraph, render, signature, SOFT, type ExitEmployer } from "./exit-documents";

export * from "./notice-rules";

function heading(doc: PDFKit.PDFDocument, text: string, width: number) {
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#14151A").text(text, 64, doc.y, { width });
  doc.moveDown(0.35);
}

export type NoticeInput = {
  employer: ExitEmployer;
  employee: { civility: "MME" | "M" | "AUTRE" | null; firstName: string; lastName: string };
  issuedAt: string;
};

/** Note d'information à remettre contre signature (ou à envoyer en recommandé). */
export function renderElectronicPayslipNoticePdf(input: NoticeInput, options: { compress?: boolean } = {}): Promise<Buffer> {
  const employee = { ...input.employee, position: null, hireDate: input.issuedAt, exitDate: input.issuedAt };
  const { employer } = input;
  return render("Bulletin de paie électronique", { employer, employee, issuedAt: input.issuedAt }, (doc, width) => {
    const place = employerLine(employer);
    paragraph(doc, `Destinataire : ${civilityName(employee)}`, width, { gap: 1.2 });
    paragraph(doc, `${employer.name}${place ? `, ${place}` : ""}, vous informe que vos bulletins de paie vous seront désormais remis sous forme électronique, dans votre espace salarié RH Pilot, accessible depuis un téléphone ou un ordinateur. Le premier bulletin électronique vous sera remis au plus tôt un mois après la remise de la présente note, sauf si elle vous est remise à votre embauche.`, width);
    heading(doc, "Votre droit de refuser le format électronique", width);
    paragraph(doc, "Vous pouvez vous opposer à tout moment, avant ou après le premier bulletin électronique, à la remise de vos bulletins de paie sous forme électronique (articles L3243-2 et D3243-7 du Code du travail). Pour cela, choisissez « Recevoir mes bulletins sur papier » dans votre espace salarié, ou notifiez votre opposition à votre employeur par tout moyen donnant date certaine, par exemple une lettre remise contre récépissé ou une lettre recommandée. Votre demande prend effet dans les meilleurs délais, et au plus tard trois mois après sa notification.", width);
    heading(doc, "Conservation et récupération de vos bulletins", width);
    paragraph(doc, "Vos bulletins de paie électroniques restent disponibles pendant cinquante ans à compter de leur émission (article D3243-8 du Code du travail). Vous pouvez à tout moment les télécharger tous en une seule fois, au format PDF, depuis votre espace salarié. Si le service de mise à disposition devait fermer, un préavis d'au moins trois mois vous serait donné pour récupérer vos bulletins.", width);
    paragraph(doc, "Conservez vos bulletins de paie sans limitation de durée : ils servent notamment à faire valoir vos droits à la retraite.", width, { color: SOFT, size: 9.5 });
    signature(
      doc,
      width,
      { label: "Note reçue le ……………………", lines: ["Signature du salarié"] },
      { label: `Fait le ${longDate(input.issuedAt)}`, lines: [`Pour ${employer.name}`, "Nom, qualité et signature"] },
    );
  }, options);
}
