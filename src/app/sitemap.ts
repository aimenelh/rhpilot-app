import type { MetadataRoute } from "next";
const pages = ["", "/services", "/pourquoi", "/tarifs", "/questions", "/tutoriels", "/espace-salarie", "/gestion-paie", "/securite", "/ressources", "/mentions-legales", "/cgu", "/cgv", "/dpa", "/confidentialite", "/cookies", "/contact", "/feuille-de-route", "/ressources/visite-medicale-embauche-delai", "/ressources/rupture-conventionnelle-chomage-2026", "/ressources/ia-recrutement-cnil-2026", "/ressources/reforme-arrets-travail-2026", "/ressources/delai-prevenance-periode-essai"];
export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(path => ({ url: `https://rhpilot.fr${path}`, changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.6 }));
}
