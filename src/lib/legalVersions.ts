/**
 * Versions des documents contractuels. Toute modification d'un texte change sa
 * date ici : la date affichée sur la page et celle enregistrée lors de
 * l'acceptation avant paiement (Stripe et journal d'audit) restent alignées.
 */
export const LEGAL_VERSIONS = {
  cgv: { iso: "2026-09-30", label: "30 septembre 2026" },
  cgu: { iso: "2026-09-29", label: "29 septembre 2026" },
  dpa: { iso: "2026-09-29", label: "29 septembre 2026" },
  cookies: { iso: "2026-09-29", label: "29 septembre 2026" },
} as const;

/** Identifiant de l'ensemble accepté au paiement (CGV, CGU, sous-traitance). */
export const TERMS_BUNDLE_VERSION = `cgv-${LEGAL_VERSIONS.cgv.iso}_cgu-${LEGAL_VERSIONS.cgu.iso}_dpa-${LEGAL_VERSIONS.dpa.iso}`;
