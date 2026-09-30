import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { classificationOptionFromRule, sortClassificationOptions } from "./collective-classifications";

describe("classifications de la grille conventionnelle", () => {
  it("reprend le code attendu par le contrôle des minima et un libellé lisible", () => {
    const option = classificationOptionFromRule({
      code: "MINIMUM_SALARY_ETAM_1.1",
      parameters: { ruleType: "MINIMUM_GROSS_MONTHLY", classificationCode: "ETAM_1.1", monthlyMinimumCents: 181500, sourceReference: "Annexe, position 1.1, coefficient 240" },
      sourceReference: "Annexe ETAM 1.1 / coefficient 240",
    });
    expect(option?.code).toBe("ETAM_1.1");
    expect(option?.coefficient).toBe("240");
    expect(option?.label).toMatch(/^ETAM 1\.1 · coefficient 240 · minimum 1\s815\s€$/);
  });

  it("ignore les autres règles et la classification par défaut", () => {
    expect(classificationOptionFromRule({ code: "SICK_PAY", parameters: {}, sourceReference: null })).toBeNull();
    expect(classificationOptionFromRule({ code: "MINIMUM_SALARY_NON_CLASSE", parameters: {}, sourceReference: null })).toBeNull();
  });

  it("trie les classifications dans l'ordre naturel", () => {
    const codes = sortClassificationOptions(["ETAM_2.1", "ETAM_1.10", "ETAM_1.2"].map((code) => ({ code, label: code, coefficient: null, monthlyMinimumCents: null }))).map((option) => option.code);
    expect(codes).toEqual(["ETAM_1.2", "ETAM_1.10", "ETAM_2.1"]);
  });
});
