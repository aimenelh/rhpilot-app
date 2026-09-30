import { describe, expect, it } from "vitest";
import { assertDsnValReportAccepted } from "./dsn-val-report";

function report(state: string, count: string, declaration = "OK") {
  return `<gipmds:rapport xmlns:gipmds="http://www.gip-mds.fr/"><envoi><envoi_identification><version_norme>P26V01</version_norme><essai_reel>01</essai_reel></envoi_identification><envoi_bilan><envoi_etat>${state}</envoi_etat><envoi_compteurs><envoi_categorie>total</envoi_categorie><nombre>${count}</nombre></envoi_compteurs></envoi_bilan></envoi><declaration><declaration_bilan><etat>${declaration}</etat></declaration_bilan></declaration></gipmds:rapport>`;
}
describe("lecture du bilan Dsn-Val", () => {
  it("refuse un bilan KO même si le processus a retourné zéro", () => {
    expect(() => assertDsnValReportAccepted(report("KO", "2"))).toThrow(/refusé/);
    expect(() => assertDsnValReportAccepted(report("OK", "0", "KO"))).toThrow(/déclaration/);
  });
  it("exige la norme, le mode test et un compteur total explicite", () => {
    expect(() => assertDsnValReportAccepted(report("OK", "0"))).not.toThrow();
    expect(() => assertDsnValReportAccepted(report("OK", "0").replace("P26V01", "P25V01"))).toThrow(/P26V01/);
    expect(() => assertDsnValReportAccepted(report("OK", "0").replace("<nombre>0</nombre>", ""))).toThrow(/compteur/);
  });
});
