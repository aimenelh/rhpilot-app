import { Resend } from "resend";

// Point d'extension volontaire : toute la logique métier (qui doit
// être notifié, de quoi) passe par cette seule fonction. Le jour où
// Slack/Teams arrive, on ajoute une branche ici (ou une nouvelle
// fonction sendSlackMessage suivant la même forme), sans toucher au
// code qui décide du contenu des notifications. C'est le sens de
// "préparer l'architecture" sans ajouter de colonnes inutilisées en
// base de données pour des canaux qui n'existent pas encore.

type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    const message =
      "RESEND_API_KEY ou RESEND_FROM_EMAIL manquant dans .env — email non envoyé.";
    console.error(message);
    return { ok: false, error: message };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("Échec d'envoi Resend :", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'envoi inconnue";
    console.error("Échec d'envoi email :", message);
    return { ok: false, error: message };
  }
}

/** Gabarit HTML simple, sobre, cohérent avec la charte RH Pilot. */
export function renderNotificationEmail({
  greeting,
  intro,
  summary,
  sections,
  moreCount,
  moreUrl,
  ctaLabel,
  ctaUrl,
}: {
  greeting: string;
  intro: string;
  summary?: { overdueCount: number; todayCount: number; thisWeekCount: number };
  sections: { title: string; items: { label: string; meta: string; url: string }[] }[];
  moreCount?: number;
  moreUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const sectionsHtml = sections
    .filter((section) => section.items.length > 0)
    .map((section) => {
      const rows = section.items
        .map(
          (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E4E7EE;">
            <a href="${item.url}" style="color: #0F1B3D; font-weight: 600; text-decoration: none; font-size: 14px;">${item.label}</a>
            <div style="color: #8A93AB; font-size: 12px; margin-top: 2px;">${item.meta}</div>
          </td>
        </tr>`
        )
        .join("");

      return `
      <div style="margin-top: 18px;">
        <p style="color: #3D4A6B; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">${section.title}</p>
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
      </div>`;
    })
    .join("");

  const moreHtml =
    moreCount && moreCount > 0 && moreUrl
      ? `<p style="margin-top: 16px; font-size: 13px;"><a href="${moreUrl}" style="color: #2F6FED; text-decoration: none;">+ ${moreCount} autre${moreCount > 1 ? "s" : ""} action${moreCount > 1 ? "s" : ""} dans RH Pilot →</a></p>`
      : "";

  const summaryHtml = summary
    ? `<div style="display: flex; gap: 8px; margin-top: 14px;">
        <span style="background: #FEE2E2; color: #E11D48; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">${summary.overdueCount} en retard</span>
        <span style="background: #FEF3C7; color: #D97706; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">${summary.todayCount} aujourd'hui</span>
        <span style="background: #F1F5F9; color: #3D4A6B; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">${summary.thisWeekCount} cette semaine</span>
      </div>`
    : "";

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p style="color: #0F1B3D; font-size: 15px;">${greeting}</p>
    <p style="color: #3D4A6B; font-size: 14px;">${intro}</p>
    ${summaryHtml}
    ${sectionsHtml}
    ${moreHtml}
    ${
      ctaLabel && ctaUrl
        ? `<a href="${ctaUrl}" style="display: inline-block; margin-top: 24px; background: linear-gradient(135deg, #2F6FED, #7C5CFC); color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">${ctaLabel}</a>`
        : ""
    }
    <p style="color: #8A93AB; font-size: 12px; margin-top: 32px;">RH Pilot — votre copilote d'organisation RH</p>
  </div>`;
}
