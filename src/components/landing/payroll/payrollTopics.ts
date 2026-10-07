// Les sujets de la paie, rangés comme on les rencontre : le mois qui se prépare,
// puis le calcul et le bulletin. Sert au menu, à la page d'ensemble
// et au bas de chaque page paie.

export type PayrollTopic = { href: string; label: string; text: string };
export type PayrollTopicGroup = { title: string; topics: PayrollTopic[] };

export const PAYROLL_TOPIC_GROUPS: PayrollTopicGroup[] = [
  {
    title: "Le mois de paie",
    topics: [
      { href: "/gestion-paie/production", label: "Production de la paie", text: "Contrôler, calculer, verrouiller une période." },
      { href: "/gestion-paie/variables", label: "Variables du mois", text: "Heures supplémentaires, primes, éléments ponctuels." },
      { href: "/gestion-paie/conges-absences", label: "Congés et absences", text: "Acquisition et indemnité de congés payés." },
      { href: "/gestion-paie/arrets-travail", label: "Arrêts de travail", text: "Carence et indemnités journalières." },
    ],
  },
  {
    title: "Le calcul et le bulletin",
    topics: [
      { href: "/gestion-paie/cotisations-sociales", label: "Cotisations sociales", text: "Chaque ligne, sa base, son taux, son montant." },
      { href: "/gestion-paie/referentiel-conventionnel", label: "Convention collective", text: "Minimum conventionnel comparé au Smic." },
      { href: "/gestion-paie/bulletin-de-paie", label: "Bulletin de paie", text: "Généré seulement quand tout est prêt." },
    ],
  },
];
