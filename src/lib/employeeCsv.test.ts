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

  it("rejette une ligne quand une valeur contractuelle renseignée est inconnue", () => {
    const csv = `${HEADER}\nJulie,Martin,MADEMOISELLE,,2026-01-15,FREELANCE,,,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/civilité invalide/i);
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

  it("rejette une ligne dont la durée de période d'essai n'est pas un entier valide", () => {
    const csv = `${HEADER}\nJulie,Martin,,,2026-01-15,,trois,MONTHS,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/durée de période d'essai invalide/i);
  });

  it("rejette une durée de période d'essai hors limites", () => {
    const csv = `${HEADER}\nJulie,Martin,,,2026-01-15,,999,MONTHS,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("importe le temps de travail détaillé et le salaire du format enrichi", () => {
    const header = "prenom,nom,categorie_professionnelle,date_embauche,type_contrat,date_fin_contrat,heures_hebdomadaires,lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche,salaire_brut_mensuel";
    const csv = `${header}\nJulie,Martin,EMPLOYE,2026-01-15,CDI,,39,7.8,7.8,7.8,7.8,7.8,0,0,2600`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      professionalCategory: "EMPLOYE",
      contractType: "CDI",
      weeklyHours: 39,
      weeklySchedule: [7.8, 7.8, 7.8, 7.8, 7.8, 0, 0],
      baseSalaryCents: 260000,
    });
  });

  it("dérive un planning lundi-vendredi quand seules les heures hebdomadaires sont fournies", () => {
    const csv = "prenom,nom,date_embauche,heures_hebdomadaires\nJulie,Martin,2026-01-15,24";
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows[0].weeklyHours).toBe(24);
    expect(rows[0].weeklySchedule).toEqual([4.8, 4.8, 4.8, 4.8, 4.8, 0, 0]);
  });

  it("conserve la compatibilité avec un ancien CSV sans temps de travail", () => {
    const csv = `${HEADER}\nJulie,Martin,MME,Développeuse,2026-01-15,CDI,3,MONTHS,`;
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows[0].weeklyHours).toBeNull();
    expect(rows[0].weeklySchedule).toBeNull();
    expect(rows[0].baseSalaryCents).toBeNull();
  });

  it("rejette une répartition quotidienne qui ne correspond pas au volume hebdomadaire", () => {
    const csv = "prenom,nom,date_embauche,heures_hebdomadaires,lundi,mardi,mercredi,jeudi,vendredi\nJulie,Martin,2026-01-15,35,8,8,8,8,8";
    const { rows, errors } = parseEmployeeCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/totalise/i);
  });

  it("retourne une erreur explicite pour un contenu vide", () => {
    const { rows, errors } = parseEmployeeCsv("");
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/aucun contenu/i);
  });
});
