import { describe, expect, it } from "vitest";
import { cellDisabledReason, cellValues, entryTabOf, formatCellValue, importColumnFor, optionalColumns, parseCellInput, parseDelimitedTable, parsePastedBlock, planImport, spreadPaste, visibleColumns } from "./entry-grid";

describe("tableau de saisie de la paie", () => {
  it("affiche les colonnes par défaut, les colonnes utilisées et les heures complémentaires s'il y a un temps partiel", () => {
    expect(visibleColumns("heures").map((column) => column.code)).toEqual(["OVERTIME_25", "OVERTIME_50"]);
    expect(visibleColumns("heures", { hasPartTime: true }).map((column) => column.code)).toEqual(["OVERTIME_25", "OVERTIME_50", "COMPLEMENTARY_10", "COMPLEMENTARY_25"]);
    expect(visibleColumns("heures", { hasPartTime: true, hasFullTime: false }).map((column) => column.code)).toEqual(["COMPLEMENTARY_10", "COMPLEMENTARY_25"]);
    const variables = visibleColumns("variables", { usedCodes: ["BENEFIT_VEHICLE", "OVERTIME_25"], chosenCodes: ["SALARY_ADVANCE"] });
    expect(variables.map((column) => column.code)).toEqual(["ACTIVITY_BONUS", "BENEFIT_VEHICLE", "PUBLIC_TRANSPORT", "MEAL_VOUCHERS", "SALARY_ADVANCE"]);
    expect(optionalColumns("variables", variables).some((column) => column.code === "IJSS_GROSS")).toBe(false);
    expect(entryTabOf("NIGHT_WORK")).toBe("heures");
    expect(entryTabOf("IJSS_GROSS")).toBeNull();
  });

  it("additionne les saisies d'un même élément et ignore les IJSS rattachées à un arrêt", () => {
    const values = cellValues([
      { employeeId: "a", code: "ACTIVITY_BONUS", amount: 100 },
      { employeeId: "a", code: "ACTIVITY_BONUS", amount: 50.5 },
      { employeeId: "a", code: "IJSS_GROSS", amount: 300, reference: "abs-1" },
    ]);
    expect(values.get("a:ACTIVITY_BONUS")).toBe(150.5);
    expect(values.has("a:IJSS_GROSS")).toBe(false);
  });

  it("lit les saisies à la française et refuse les valeurs invalides", () => {
    expect(parseCellInput(" 7,5 h", "HOURS")).toEqual({ value: 7.5 });
    expect(parseCellInput("1 250,00 €", "EUR")).toEqual({ value: 1250 });
    expect(parseCellInput("", "EUR")).toEqual({ value: null });
    expect(parseCellInput("0", "EUR")).toEqual({ value: null });
    expect(parseCellInput("abc", "EUR")).toEqual({ error: "« abc » n'est pas un nombre." });
    expect(parseCellInput("18,5", "UNITS")).toHaveProperty("error");
    expect(parseCellInput("-3", "HOURS")).toHaveProperty("error");
    expect(parseCellInput("250", "HOURS")).toHaveProperty("error");
    expect(formatCellValue(7.5)).toBe("7,5");
    expect(formatCellValue(12)).toBe("12");
    expect(formatCellValue(12.25)).toBe("12,25");
  });

  it("répartit un bloc collé depuis un tableur à partir de la cellule active", () => {
    const block = parsePastedBlock("4\t2\r\n6,5\t\r\n1\t1\t9\n\n");
    expect(block).toEqual([["4", "2"], ["6,5", ""], ["1", "1", "9"]]);
    const columns = visibleColumns("heures");
    const cells = spreadPaste(block, { row: 1, col: 0 }, ["e1", "e2", "e3"], columns);
    expect(cells).toEqual([
      { employeeId: "e2", code: "OVERTIME_25", raw: "4" },
      { employeeId: "e2", code: "OVERTIME_50", raw: "2" },
      { employeeId: "e3", code: "OVERTIME_25", raw: "6,5" },
      { employeeId: "e3", code: "OVERTIME_50", raw: "" },
    ]);
  });

  it("interdit les heures supplémentaires d'un temps partiel et les complémentaires d'un temps plein", () => {
    const [overtime] = visibleColumns("heures");
    const complementary = visibleColumns("heures", { hasPartTime: true })[2];
    expect(cellDisabledReason(overtime, true)).toMatch(/complémentaires/);
    expect(cellDisabledReason(overtime, false)).toBeNull();
    expect(cellDisabledReason(complementary, false)).toMatch(/supplémentaires/);
  });

  it("lit un CSV d'Excel français (point-virgule, guillemets, BOM) comme un bloc collé", () => {
    expect(parseDelimitedTable("\uFEFFSalarié;Prime (€)\r\n\"Martin; Léa\";150,50\r\n\r\n")).toEqual([["Salarié", "Prime (€)"], ["Martin; Léa", "150,50"]]);
    expect(parseDelimitedTable("Nom\tHS 25\nLéa Martin\t4\n")).toEqual([["Nom", "HS 25"], ["Léa Martin", "4"]]);
    expect(importColumnFor("Heures sup. 25 %")?.code).toBe("OVERTIME_25");
    expect(importColumnFor("HS 50 %")?.code).toBe("OVERTIME_50");
    expect(importColumnFor("Tickets restaurant")?.code).toBe("MEAL_VOUCHERS");
    expect(importColumnFor("Prime (€)")?.code).toBe("ACTIVITY_BONUS");
    expect(importColumnFor("Commentaire")).toBeNull();
  });

  it("importe un tableau avec en-têtes en reconnaissant les salariés par leur nom", () => {
    const employees = [
      { id: "lea", name: "Léa Martin", partTime: false },
      { id: "tom", name: "Tom Durand", partTime: true },
      { id: "k1", name: "Karim Benali", partTime: false },
      { id: "k2", name: "Karim Benali", partTime: false },
    ];
    const plan = planImport(parseDelimitedTable([
      "Nom;Heures sup. 25 %;Heures compl. 10 %;Titres-restaurant;Commentaire",
      "MARTIN Lea;4;;19;ok",
      "Tom Durand;3;2;12;",
      "Karim Benali;1;;;",
      "Inconnu Paul;2;;;",
      ";;;;",
    ].join("\n")), employees);
    expect(plan.error).toBeUndefined();
    expect(plan.cells).toEqual([
      { employeeId: "lea", code: "OVERTIME_25", raw: "4" },
      { employeeId: "lea", code: "MEAL_VOUCHERS", raw: "19" },
      { employeeId: "tom", code: "COMPLEMENTARY_10", raw: "2" },
      { employeeId: "tom", code: "MEAL_VOUCHERS", raw: "12" },
    ]);
    expect(plan.skipped).toBe(1);
    expect(plan.employeeCount).toBe(2);
    expect(plan.unknownHeaders).toEqual(["Commentaire"]);
    expect(plan.unknownRows).toEqual(["Karim Benali", "Inconnu Paul"]);
    expect(plan.columns.map((column) => column.code)).toEqual(["OVERTIME_25", "COMPLEMENTARY_10", "MEAL_VOUCHERS"]);

    const split = planImport([["Prénom", "Nom", "Prime"], ["Léa", "Martin", "80"]], employees);
    expect(split.cells).toEqual([{ employeeId: "lea", code: "ACTIVITY_BONUS", raw: "80" }]);
    expect(planImport([["Nom", "Commentaire"], ["Léa Martin", "x"]], employees).error).toMatch(/Aucune colonne/);
  });
});
