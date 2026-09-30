import { XMLParser, XMLValidator } from "fast-xml-parser";

/** Dsn-Val peut terminer avec le code processus 0 malgré un bilan KO. */
export function assertDsnValReportAccepted(xml: string): void {
  if (XMLValidator.validate(xml) !== true) throw new Error("Dsn-Val : rapport XML invalide.");
  const report = new XMLParser({ removeNSPrefix: true, parseTagValue: false }).parse(xml)?.rapport;
  const identification = report?.envoi?.envoi_identification;
  const bilan = report?.envoi?.envoi_bilan;
  if (identification?.version_norme !== "P26V01" || identification?.essai_reel !== "01") throw new Error("Dsn-Val : le rapport doit concerner un envoi de test P26V01.");
  const counters = Array.isArray(bilan?.envoi_compteurs) ? bilan.envoi_compteurs : [bilan?.envoi_compteurs];
  const total = counters.find((counter: { envoi_categorie?: string } | undefined) => counter?.envoi_categorie === "total");
  if (bilan?.envoi_etat !== "OK" || total?.nombre !== "0") throw new Error(`Dsn-Val : envoi refusé ou incomplet (${total?.nombre ?? "compteur absent"} anomalie(s)).`);
  const declarations = Array.isArray(report?.declaration) ? report.declaration : [report?.declaration];
  if (!declarations.length || declarations.some((declaration: { declaration_bilan?: { etat?: string } } | undefined) => declaration?.declaration_bilan?.etat !== "OK")) throw new Error("Dsn-Val : bilan de déclaration absent ou refusé.");
}
