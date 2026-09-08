export type PayrollMoment = { heading: string; body: string };

export type PayrollCapability = {
  key: string;
  eyebrow: string;
  title: string;
  intro: string;
  summary: string;
  variant: "agreement" | "health" | "contributions" | "netSocial" | "payslip" | "traceability" | "profile" | "employer";
  moments: PayrollMoment[];
  sources?: { name: string; detail: string; href: string }[];
};

const SOURCES = [
  { name: "URSSAF / Mon-entreprise", detail: "Modèle social Publicodes utilisé pour le calcul social.", href: "https://mon-entreprise.urssaf.fr/" },
  { name: "BOSS", detail: "Bulletin officiel de la sécurité sociale.", href: "https://boss.gouv.fr/" },
  { name: "DGFiP", detail: "Prélèvement à la source et obligations fiscales.", href: "https://www.impots.gouv.fr/" },
  { name: "Légifrance", detail: "Textes législatifs et réglementaires.", href: "https://www.legifrance.gouv.fr/" },
  { name: "Service-Public.fr", detail: "Informations administratives officielles.", href: "https://www.service-public.fr/" },
];

export const PAYROLL_CAPABILITIES: Record<string, PayrollCapability> = {
  agreement: {
    key: "agreement",
    eyebrow: "Référentiel conventionnel",
    title: "La convention collective fait partie du dossier de paie.",
    intro: "RH Pilot associe une convention collective au profil du salarié ou à l’organisation et conserve des versions datées du référentiel.",
    summary: "Pour les traitements conventionnels actuellement pris en charge, la version validée applicable à la période est recherchée avant utilisation.",
    variant: "agreement",
    moments: [
      { heading: "La convention du profil d’abord", body: "Quand un salarié a une convention collective renseignée sur son profil, **c’est elle qui est retenue en priorité** pour le traitement de paie, avant toute convention par défaut de l’organisation." },
      { heading: "Une version, pas juste un nom", body: "Une convention n’est pas figée dans le temps : RH Pilot conserve **plusieurs versions datées** du référentiel et sélectionne celle dont la période de validité correspond à la période de paie traitée. Les règles conventionnelles suivent la même logique, avec leur propre période de validité et leur propre statut de validation." },
      { heading: "Ce que ça change concrètement", body: "Cette sélection intervient notamment dans **le traitement des absences couvertes par la convention**, où la règle appliquée dépend directement de la version retenue." },
    ],
    sources: SOURCES,
  },
  health: {
    key: "health",
    eyebrow: "Complémentaire santé",
    title: "La complémentaire santé entre dans le contexte de paie.",
    intro: "RH Pilot enregistre le montant mensuel de la complémentaire santé et la part prise en charge par l’employeur, puis transmet ces paramètres au calcul social.",
    summary: "Le montant de santé et le taux employeur sont contrôlés avant le calcul : la part employeur doit être comprise entre 50 % et 100 %.",
    variant: "health",
    moments: [
      { heading: "Deux montants à renseigner", body: "Le contexte de paie retient **le montant mensuel de la complémentaire santé** et **la part prise en charge par l’employeur**, exprimée en pourcentage." },
      { heading: "Un contrôle avant calcul", body: "Ce taux employeur est vérifié avant tout calcul : il doit être compris **entre 50 % et 100 %**, conformément aux règles applicables." },
      { heading: "Dans le résultat final", body: "Ces deux montants sont transmis au modèle Publicodes avec les autres données du salarié, et la part employeur réapparaît ensuite **dans le détail des cotisations calculées**." },
    ],
    sources: SOURCES,
  },
  contributions: {
    key: "contributions",
    eyebrow: "Cotisations sociales",
    title: "Les cotisations sont calculées et détaillées séparément.",
    intro: "Le moteur social de RH Pilot produit les montants salarié et employeur et expose le détail des principales cotisations utilisées pour le calcul.",
    summary: "Le détail conserve pour chaque ligne son intitulé, sa source Publicodes, son côté salarié ou employeur et son montant.",
    variant: "contributions",
    moments: [
      { heading: "Deux montants distincts", body: "Le moteur social calcule séparément **les cotisations à la charge du salarié**, qui réduisent le net avant impôt, et **les cotisations employeur**, qui s’ajoutent au coût du poste." },
      { heading: "Le détail, poste par poste", body: "Chaque ligne calculée est exposée avec son intitulé : maladie, vieillesse, retraite complémentaire, chômage, CSG/CRDS, prévoyance et les autres postes présents sur la période." },
      { heading: "Une source pour chaque ligne", body: "Chaque ligne de détail conserve **la règle Publicodes** qui a produit le montant, ce qui permet de remonter jusqu’à la règle réellement appliquée." },
    ],
    sources: SOURCES,
  },
  netSocial: {
    key: "net-social",
    eyebrow: "Montant net social",
    title: "Le montant net social vient directement du calcul social.",
    intro: "RH Pilot utilise la règle Publicodes dédiée au montant net social et conserve cette valeur dans le résultat de paie.",
    summary: "Le montant net social est distinct du net avant impôt et du prélèvement à la source dans le résultat enregistré.",
    variant: "netSocial",
    moments: [
      { heading: "Le point de départ", body: "Le calcul part **du salaire brut et des éléments variables** de la période, avant application des cotisations." },
      { heading: "Les cotisations font le lien", body: "Les cotisations issues du modèle social interviennent ensuite dans les différents montants de rémunération de la période." },
      { heading: "Deux résultats distincts", body: "RH Pilot conserve **le net avant impôt**, avant application du prélèvement à la source, et **le montant net social**, évalué séparément à partir de la règle Publicodes dédiée." },
    ],
    sources: SOURCES,
  },
  payslip: {
    key: "payslip",
    eyebrow: "Bulletin de paie",
    title: "Le bulletin est préparé à partir d’une période verrouillée.",
    intro: "RH Pilot vérifie les prérequis avant de produire un bulletin : période verrouillée, salariés actifs, calculs complets, snapshots et identification employeur et salarié.",
    summary: "Une information obligatoire manque ? La génération est bloquée plutôt que de produire un document incomplet.",
    variant: "payslip",
    moments: [
      { heading: "Une période verrouillée d’abord", body: "Le bulletin ne peut être généré que si **le calcul de la période est terminé et la période verrouillée**." },
      { heading: "Un calcul par salarié", body: "Chaque salarié actif doit disposer **d’un calcul enregistré et d’un snapshot** associé à la période." },
      { heading: "Les identifiants obligatoires", body: "**Le SIRET de l’employeur** doit être renseigné, tout comme l’intitulé ou la classification du salarié et la convention applicable." },
    ],
    sources: SOURCES,
  },
  traceability: {
    key: "traceability",
    eyebrow: "Traçabilité du calcul",
    title: "Le résultat de paie conserve le contexte qui l’a produit.",
    intro: "Chaque calcul enregistre le modèle social utilisé, les règles sélectionnées, les variables, les absences, les paramètres du salarié et la source du référentiel.",
    summary: "Le snapshot permet de retrouver les données et versions associées à une période sans reconstruire le calcul à partir d’informations modifiées après coup.",
    variant: "traceability",
    moments: [
      { heading: "Ce qui est conservé", body: "Chaque calcul enregistre **la version du modèle Publicodes** utilisée, ainsi que la version de la règle de paie appliquée et sa source." },
      { heading: "Le contexte complet", body: "Le profil du salarié, les variables de la période, les absences et leurs impacts, ainsi que les paramètres utilisés sont conservés dans le snapshot du calcul." },
      { heading: "Le résultat, pas seulement le calcul", body: "**Les totaux sociaux et le montant net social** font eux aussi partie de ce qui est conservé avec le calcul." },
    ],
    sources: SOURCES,
  },
  profile: {
    key: "profile",
    eyebrow: "Profil de paie",
    title: "Les informations du salarié structurent le calcul.",
    intro: "Le profil paie regroupe le salaire de base, la durée mensuelle de référence et les informations qui permettent de contextualiser la période.",
    summary: "Contrat, catégorie professionnelle, statut cadre, convention collective et éléments de classification sont conservés autour du profil de paie.",
    variant: "profile",
    moments: [
      { heading: "La base du calcul", body: "Le profil de paie retient **le salaire brut mensuel de référence**, qui constitue le point de départ du brut de chaque période." },
      { heading: "Le contexte du contrat", body: "**La durée mensuelle de référence**, le type de contrat et la date d’embauche font partie des données prises en compte lors de la préparation de la paie." },
      { heading: "Le détail conventionnel", body: "Catégorie professionnelle, niveau, coefficient et éléments de classification peuvent également être conservés au profil, lorsqu’ils sont applicables." },
    ],
    sources: SOURCES,
  },
  employer: {
    key: "employer",
    eyebrow: "Contexte employeur",
    title: "Le calcul tient compte du contexte de l’entreprise.",
    intro: "La catégorie juridique, la date de création, le lieu de paie et le taux AT/MP font partie des paramètres transmis au calcul social.",
    summary: "Ces données sont contrôlées et intégrées au contexte du moteur social, au même titre que les informations du salarié.",
    variant: "employer",
    moments: [
      { heading: "Le cadre juridique", body: "**La catégorie juridique de l’organisation** est une donnée obligatoire pour le calcul social." },
      { heading: "Un taux propre à l’activité", body: "**Le taux accidents du travail et maladies professionnelles**, spécifique à l’établissement, est transmis au modèle social." },
      { heading: "Localisation et ancienneté", body: "La commune et le département de paie sont associés au contexte de l’établissement, tout comme **la date de création de l’entreprise**, également fournie au calcul." },
    ],
    sources: SOURCES,
  },
};
