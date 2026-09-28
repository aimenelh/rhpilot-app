import { describe, expect, it, vi } from "vitest";
import {
  departmentFromCommune,
  legalCategoryFromNatureCode,
  lookupCompanyBySiret,
  mergeConventions,
  normalizeNafCode,
  parentCommuneCode,
  parseFabriqueConventions,
  parseRechercheEntreprises,
  streetLineFromAddress,
  usableIdccs,
} from "./company-registry";

// Extrait réel de l'API Recherche d'entreprises (recherche par SIRET).
const GOOGLE_FRANCE = {
  results: [
    {
      siren: "443061841",
      nom_complet: "GOOGLE FRANCE",
      nature_juridique: "5499",
      date_creation: "2002-05-16",
      activite_principale: "62.02A",
      tranche_effectif_salarie: "42",
      etat_administratif: "A",
      complements: { liste_idcc: ["1486"] },
      siege: {
        activite_principale: "62.02A",
        adresse: "8 RUE DE LONDRES 75009 PARIS",
        code_postal: "75009",
        commune: "75109",
        complement_adresse: null,
        departement: "75",
        est_siege: true,
        etat_administratif: "A",
        indice_repetition: null,
        libelle_commune: "PARIS",
        libelle_voie: "DE LONDRES",
        liste_idcc: ["1486"],
        numero_voie: "8",
        siret: "44306184100047",
        tranche_effectif_salarie: "42",
        type_voie: "RUE",
      },
      matching_etablissements: [
        { activite_principale: "62.02A", adresse: "8 RUE DE LONDRES 75009 PARIS", code_postal: "75009", commune: "75109", est_siege: true, etat_administratif: "A", libelle_commune: "PARIS", liste_idcc: ["1486"], siret: "44306184100047" },
      ],
    },
  ],
  total_results: 1,
};

const FABRIQUE_GOOGLE = {
  entreprises: [
    {
      siren: "443061841",
      conventions: [
        { idcc: 1486, etat: "VIGUEUR_ETEN", shortTitle: "Bureaux d'études techniques, cabinets d'ingénieurs-conseils et sociétés de conseils", title: "Convention collective nationale des bureaux d'études techniques..." },
      ],
    },
  ],
};

describe("legalCategoryFromNatureCode", () => {
  it("rattache les catégories juridiques Insee aux formes du moteur social", () => {
    expect(legalCategoryFromNatureCode("1000")).toBe("EI");
    expect(legalCategoryFromNatureCode("5499")).toBe("SARL");
    expect(legalCategoryFromNatureCode("5498")).toBe("SARL");
    expect(legalCategoryFromNatureCode("5485")).toBe("SELARL");
    expect(legalCategoryFromNatureCode("5710")).toBe("SAS");
    expect(legalCategoryFromNatureCode("5720")).toBe("SAS");
    expect(legalCategoryFromNatureCode("5785")).toBe("SELAS");
    expect(legalCategoryFromNatureCode("9220")).toBe("association");
    expect(legalCategoryFromNatureCode("5599")).toBe("autre");
    expect(legalCategoryFromNatureCode("")).toBeNull();
    expect(legalCategoryFromNatureCode("54")).toBeNull();
  });
});

describe("petites conversions", () => {
  it("normalise le code APE au format DSN", () => {
    expect(normalizeNafCode("62.02A")).toBe("6202A");
    expect(normalizeNafCode("6201z")).toBe("6201Z");
    expect(normalizeNafCode("62.02")).toBeNull();
  });

  it("déduit le département du code commune, y compris Corse et outre-mer", () => {
    expect(departmentFromCommune("34172")).toBe("34");
    expect(departmentFromCommune("2A004")).toBe("2A");
    expect(departmentFromCommune("97411")).toBe("974");
    expect(departmentFromCommune(null, "20200")).toBe("2B");
    expect(departmentFromCommune(null, "97300")).toBe("973");
  });

  it("remonte des arrondissements de Paris, Lyon et Marseille à la commune", () => {
    expect(parentCommuneCode("75109")).toBe("75056");
    expect(parentCommuneCode("69383")).toBe("69123");
    expect(parentCommuneCode("13208")).toBe("13055");
    expect(parentCommuneCode("34172")).toBeNull();
  });

  it("écarte les IDCC techniques et complète à 4 chiffres", () => {
    expect(usableIdccs(["1486", 573, "9999", "9998", "abc", "1486"])).toEqual(["1486", "0573"]);
    expect(usableIdccs(null)).toEqual([]);
  });

  it("isole la ligne de voie de l'adresse complète", () => {
    expect(streetLineFromAddress("8 RUE DE LONDRES 75009 PARIS", "75009", "PARIS")).toBe("8 RUE DE LONDRES");
    expect(streetLineFromAddress("ZA DU MOULIN NIMES", null, "NIMES")).toBe("ZA DU MOULIN");
  });
});

describe("parseRechercheEntreprises", () => {
  it("reprend l'identité de l'établissement demandé", () => {
    const record = parseRechercheEntreprises(GOOGLE_FRANCE, "44306184100047");
    expect(record).toMatchObject({
      siren: "443061841",
      name: "GOOGLE FRANCE",
      legalNatureCode: "5499",
      legalCategory: "SARL",
      creationDate: "2002-05-16",
      nafCode: "6202A",
      address: "8 RUE DE LONDRES",
      postalCode: "75009",
      city: "PARIS",
      communeCode: "75109",
      department: "75",
      conventions: [{ idcc: "1486", title: null }],
      establishmentMatched: true,
      active: true,
    });
  });

  it("refuse une autre entreprise renvoyée par la recherche plein texte", () => {
    expect(parseRechercheEntreprises(GOOGLE_FRANCE, "13002526500013")).toBeNull();
  });

  it("se replie sur le siège quand l'établissement n'est pas dans la réponse", () => {
    const record = parseRechercheEntreprises(GOOGLE_FRANCE, "44306184100062");
    expect(record?.establishmentMatched).toBe(false);
    expect(record?.city).toBe("PARIS");
  });
});

describe("conventions", () => {
  it("lit les intitulés de la Fabrique et les rattache aux IDCC Sirene", () => {
    const fabrique = parseFabriqueConventions(FABRIQUE_GOOGLE, "44306184100047");
    expect(fabrique).toEqual([{ idcc: "1486", title: "Bureaux d'études techniques, cabinets d'ingénieurs-conseils et sociétés de conseils" }]);
    expect(mergeConventions([{ idcc: "1486", title: null }], fabrique)[0].title).toContain("Bureaux d'études");
    expect(mergeConventions([], fabrique)).toEqual(fabrique);
  });
});

describe("lookupCompanyBySiret", () => {
  const response = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body });

  it("combine Sirene et la Fabrique", async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.includes("fabrique") ? response(FABRIQUE_GOOGLE) : response(GOOGLE_FRANCE)));
    const result = await lookupCompanyBySiret("44306184100047", { fetchImpl });
    expect(result.status).toBe("FOUND");
    if (result.status === "FOUND") expect(result.record.conventions[0].title).toContain("Bureaux d'études");
  });

  it("signale l'indisponibilité du service sans inventer de données", async () => {
    const fetchImpl = vi.fn(async () => response({}, false));
    await expect(lookupCompanyBySiret("44306184100047", { fetchImpl })).resolves.toMatchObject({ status: "UNAVAILABLE" });
  });

  it("distingue un SIRET inconnu", async () => {
    const fetchImpl = vi.fn(async () => response({ results: [] }));
    await expect(lookupCompanyBySiret("44306184100047", { fetchImpl })).resolves.toMatchObject({ status: "NOT_FOUND" });
  });
});

describe("pickCommuneCode", () => {
  it("retrouve la commune saisie parmi celles du code postal", async () => {
    const { pickCommuneCode } = await import("./company-registry");
    const communes = [{ code: "34172", nom: "Montpellier" }, { code: "34270", nom: "Saint-Jean-de-Védas" }];
    expect(pickCommuneCode(communes, "MONTPELLIER")).toBe("34172");
    expect(pickCommuneCode(communes, "St Jean de Vedas")).toBe("34270");
    expect(pickCommuneCode([{ code: "75056", nom: "Paris" }], "Paris 9e arrondissement")).toBe("75056");
    expect(pickCommuneCode([{ code: "75056", nom: "Paris" }], "PARIS 9E")).toBe("75056");
    // Un code postal resté d'une ancienne adresse ne doit pas donner une autre commune.
    expect(pickCommuneCode([{ code: "75056", nom: "Paris" }], "Nîmes")).toBeNull();
  });
});

describe("samePlace", () => {
  it("compare les communes sans accents, casse ni arrondissement", async () => {
    const { samePlace } = await import("./company-registry");
    expect(samePlace("NIMES", "Nîmes")).toBe(true);
    expect(samePlace("Paris 9e", "PARIS")).toBe(true);
    expect(samePlace("Saint-Étienne", "ST ETIENNE")).toBe(true);
    expect(samePlace("Nîmes", "Paris")).toBe(false);
  });
});
