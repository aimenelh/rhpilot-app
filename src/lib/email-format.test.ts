import { describe, expect, it } from "vitest";
import { htmlToText, withEmailBranding } from "./email";

describe("mise en forme des e-mails", () => {
  it("produit une version texte lisible, liens compris", () => {
    const text = htmlToText('<p>Bonjour,</p><p>Votre <strong>bulletin</strong> est disponible : <a href="https://rhpilot.fr/espace">ouvrir mon espace</a>.</p><ul><li>Octobre</li></ul>');
    expect(text).toContain("Bonjour,");
    expect(text).toContain("ouvrir mon espace (https://rhpilot.fr/espace)");
    expect(text).toContain("- Octobre");
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("ajoute le logo une seule fois", () => {
    const once = withEmailBranding("<p>Test</p>");
    expect(once).toContain("icon-192.png");
    expect(withEmailBranding(once)).toBe(once);
  });
});
