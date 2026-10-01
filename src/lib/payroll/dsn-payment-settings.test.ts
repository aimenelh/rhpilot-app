import { describe, expect, it } from "vitest";
import { dsnOpsSiret, dsnPaymentBic, dsnPaymentIban } from "./dsn-payment-settings";
describe("coordonnées de paiement déclaratives", () => {
  it("valide et normalise les coordonnées françaises", () => {
    expect(dsnPaymentIban("FR76 3000 6000 0112 3456 7890 189")).toBe("FR7630006000011234567890189");
    expect(dsnPaymentBic("agrifrppxxx")).toBe("AGRIFRPPXXX");
    expect(dsnOpsSiret("44832375800038", "Retraite")).toBe("44832375800038");
  });
  it("refuse les clés invalides et un code groupe en guise de SIRET payeur", () => {
    expect(() => dsnPaymentIban("FR7730006000011234567890189")).toThrow(/clé/);
    expect(() => dsnPaymentBic("INVALID")).toThrow(/BIC/);
    expect(() => dsnOpsSiret("G015", "Retraite")).toThrow(/Retraite/);
  });
});
