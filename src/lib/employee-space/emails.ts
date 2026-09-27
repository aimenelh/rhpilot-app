/**
 * E-mails de l'espace salarié. Aucun document n'est joint : le message
 * prévient, le salarié télécharge depuis son espace, et le téléchargement
 * est journalisé.
 */
import { escapeHtml } from "@/lib/email";

function layout(body: string, cta?: { label: string; url: string }, footnote?: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #14151A;">
    ${body}
    ${cta ? `<a href="${cta.url}" style="display: inline-block; margin-top: 20px; background: #E8432E; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">${escapeHtml(cta.label)}</a>` : ""}
    ${footnote ? `<p style="color: #8C8C90; font-size: 12px; line-height: 18px; margin-top: 24px;">${footnote}</p>` : ""}
    <p style="color: #8C8C90; font-size: 12px; margin-top: 24px;">Envoyé par RH Pilot pour le compte de votre employeur.</p>
  </div>`;
}

const p = (text: string) => `<p style="color: #4A4A4D; font-size: 14px; line-height: 21px; margin: 12px 0 0;">${text}</p>`;

export function employeeInvitationEmail(input: { firstName: string; organizationName: string; joinUrl: string; validDays: number }) {
  const org = escapeHtml(input.organizationName);
  return {
    subject: `${input.organizationName} vous ouvre votre espace salarié`,
    html: layout(
      `<p style="font-size: 15px; margin: 0;">Bonjour ${escapeHtml(input.firstName)},</p>
       ${p(`<strong>${org}</strong> vous ouvre un espace personnel sur RH Pilot. Vous y retrouverez vos bulletins de salaire, vos compteurs de congés, vos demandes d'absence et vos documents.`)}
       ${p("Créez votre accès avec cette adresse e-mail, depuis votre téléphone comme depuis un ordinateur. Cela prend une minute.")}
       ${p(`Vos bulletins de paie vous seront remis sous forme électronique dans cet espace. Vous pouvez vous y opposer à tout moment et les recevoir sur papier, depuis votre espace ou en le demandant à ${org} (article L3243-2 du Code du travail).`)}`,
      { label: "Créer mon accès", url: input.joinUrl },
      `Ce lien est personnel et valable ${input.validDays} jours. Si vous ne travaillez pas chez ${org}, ignorez ce message.`,
    ),
  };
}

export function documentAvailableEmail(input: { firstName: string; organizationName: string; documentLabel: string; corrected: boolean; spaceUrl: string }) {
  const label = escapeHtml(input.documentLabel);
  return {
    subject: input.corrected ? `Document corrigé : ${input.documentLabel}` : `${input.documentLabel} disponible`,
    html: layout(
      `<p style="font-size: 15px; margin: 0;">Bonjour ${escapeHtml(input.firstName)},</p>
       ${p(input.corrected
         ? `${escapeHtml(input.organizationName)} a publié une version corrigée de votre document : <strong>${label}</strong>. Elle remplace la précédente dans votre espace salarié.`
         : `Votre document <strong>${label}</strong> est disponible dans votre espace salarié ${escapeHtml(input.organizationName)}.`)}
       ${p("Pour protéger vos données, il n'est pas joint à ce message : connectez-vous pour le consulter et le télécharger.")}`,
      { label: "Ouvrir mon espace", url: input.spaceUrl },
    ),
  };
}

export function absenceRequestEmail(input: { employeeName: string; typeLabel: string; dates: string; url: string; withJustification: boolean }) {
  return {
    subject: `Nouvelle demande : ${input.typeLabel.toLowerCase()} de ${input.employeeName}`,
    html: layout(
      `<p style="font-size: 15px; margin: 0;">Bonjour,</p>
       ${p(`<strong>${escapeHtml(input.employeeName)}</strong> a fait une demande depuis son espace salarié : ${escapeHtml(input.typeLabel.toLowerCase())}, ${escapeHtml(input.dates)}.`)}
       ${input.withJustification ? p("Un justificatif est joint à la demande, dans RH Pilot.") : ""}`,
      { label: "Voir la demande", url: input.url },
    ),
  };
}
