import { describe, it, expect } from "vitest";
import { parseEmployeeCsv } from "./employeeCsv";

const HEADER = "prenom,nom,civilite,poste,date_embauche,type_contrat,duree_periode_essai,unite_duree,prochaine_visite_medicale";

describe("parseEmployeeCsv", () => {
  it("analyse une ligne valide complète", () => {
    const csv = `${HEADER}\nJulie,Martin,MME,Développeuse,2026-01-15,CDI,3,MONTHS,2026-04-15`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      firstName: "Julie",
      lastName: "Martin",
      civility: "MME",
      position: "Développeuse",
      contractType: "CDI",
      probationDuration: 3,
      probationDurationUnit: "MONTHS",
    });
    expect(rows[0].hireDate.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(rows[0].nextMedicalVisitDate?.toISOString().slice(0, 10)).toBe("2026-04-15");
  });

  it("rejette tout le fichier si les en-têtes obligatoires manquent", () => {
    const csv = "prenom,nom\nJulie,Martin";
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/en-têtes manquants/i);
  });

  it("ignore une ligne sans prénom ou nom, sans bloquer les autres", () => {
    const csv = `${HEADER}\n,Martin,,,2026-01-15,,,,\nJulie,Martin,,,2026-01-15,,,,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].firstName).toBe("Julie");
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
  });

  it("ignore une ligne avec une date d'embauche invalide", () => {
    const csv = `${HEADER}\nJulie,Martin,,,pas-une-date,,,,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/date d'embauche invalide/i);
  });

  it("met civilité et type de contrat à null s'ils ne correspondent à aucune valeur connue (pas une erreur bloquante)", () => {
    const csv = `${HEADER}\nJulie,Martin,MADEMOISELLE,,2026-01-15,FREELANCE,,,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].civility).toBeNull();
    expect(rows[0].contractType).toBeNull();
  });

  it("importe la ligne même sans date de visite médicale renseignée", () => {
    const csv = `${HEADER}\nJulie,Martin,,,2026-01-15,,,,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows[0].nextMedicalVisitDate).toBeNull();
  });

  it("signale une date de visite médicale invalide sans rejeter la ligne", () => {
    const csv = `${HEADER}\nJulie,Martin,,,2026-01-15,,,,pas-une-date`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].nextMedicalVisitDate).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/visite médicale invalide/i);
  });

  it("gère les champs entre guillemets contenant une virgule", () => {
    const csv = `${HEADER}\nJulie,Martin,,"Développeuse, senior",2026-01-15,,,,`;
    const { rows } = parseEmployeeCsv(csv);

    expect(rows[0].position).toBe("Développeuse, senior");
  });

  // Comportement actuel documenté tel quel, PAS corrigé ici — c'est le
  // point déjà identifié dans l'audit (validation CSV insuffisante,
  // Number(durationRaw) sans contrôle). Ce test sert de filet pour
  // détecter le jour où ce comportement change, sans se prononcer sur
  // s'il est souhaitable. À corriger dans une phase dédiée.
  it("[comportement connu à corriger plus tard] une durée de période d'essai non numérique devient NaN plutôt qu'une erreur", () => {
    const csv = `${HEADER}\nJulie,Martin,,,2026-01-15,,trois,MONTHS,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows[0].probationDuration).toBeNaN();
  });

  it("retourne une erreur explicite pour un contenu vide", () => {
    const { rows, errors } = parseEmployeeCsv("");
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/aucun contenu/i);
  });
});
