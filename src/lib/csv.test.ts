import { describe, expect, it } from "vitest";
import { escapeCsvField } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("échappe les virgules et guillemets", () => {
    expect(escapeCsvField('Dupont, "Senior"')).toBe('"Dupont, ""Senior"""');
  });

  it("neutralise les cellules interprétables comme formules", () => {
    expect(escapeCsvField("=HYPERLINK(\"https://example.com\")")).toBe(
      "\"'=HYPERLINK(\"\"https://example.com\"\")\""
    );
    expect(escapeCsvField("+1+1")).toBe("'+1+1");
    expect(escapeCsvField("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
  });

  it("laisse les valeurs ordinaires intactes", () => {
    expect(escapeCsvField("Responsable RH")).toBe("Responsable RH");
  });
});
