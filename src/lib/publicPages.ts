// Toutes les pages publiques indexables, partagées par le sitemap et ses tests.

export const MAIN_PAGES = ["", "/services", "/a-propos", "/tarifs", "/questions", "/tutoriels", "/espace-salarie", "/securite", "/contact"];

export const PAYROLL_PAGES = [
  "/gestion-paie",
  "/gestion-paie/arrets-travail",
  "/gestion-paie/bulletin-de-paie",
  "/gestion-paie/conges-absences",
  "/gestion-paie/cotisations-sociales",
  "/gestion-paie/production",
  "/gestion-paie/referentiel-conventionnel",
  "/gestion-paie/variables",
];

export const RESOURCE_PAGES = [
  "/ressources",
  "/ressources/visite-medicale-embauche-delai",
  "/ressources/rupture-conventionnelle-chomage-2026",
  "/ressources/ia-recrutement-cnil-2026",
  "/ressources/reforme-arrets-travail-2026",
  "/ressources/delai-prevenance-periode-essai",
];

export const LEGAL_PAGES = ["/mentions-legales", "/cgu", "/cgv", "/dpa", "/confidentialite", "/cookies"];

export const SITEMAP_PATHS = [...MAIN_PAGES, ...PAYROLL_PAGES, ...RESOURCE_PAGES, ...LEGAL_PAGES];
