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
  { name: "URSSAF / Mon-entreprise", detail: "Règles officielles utilisées pour les calculs sociaux.", href: "https://mon-entreprise.urssaf.fr/" },
  { name: "BOSS", detail: "Bulletin officiel de la sécurité sociale.", href: "https://boss.gouv.fr/" },
  { name: "DGFiP", detail: "Prélèvement à la source et obligations fiscales.", href: "https://www.impots.gouv.fr/" },
  { name: "Légifrance", detail: "Textes législatifs et réglementaires.", href: "https://www.legifrance.gouv.fr/" },
  { name: "Service-Public.fr", detail: "Informations administratives officielles.", href: "https://www.service-public.fr/" },
];

export const PAYROLL_CAPABILITIES: Record<string, PayrollCapability> = {
  agreement: {
    key: "agreement",
    eyebrow: "Convention collective",
    title: "La convention collective fait partie du dossier de paie.",
    intro: "RH Pilot relie la convention collective au salarié ou à l’entreprise et utilise la bonne version pour la période concernée.",
    summary: "Avant le calcul, RH Pilot vérifie quelle convention et quelles règles s’appliquent à la période de paie.",
    variant: "agreement",
    moments: [
      { heading: "La convention du salarié d’abord", body: "Quand une convention collective est renseignée sur le profil du salarié, **elle est retenue en priorité** pour préparer sa paie." },
      { heading: "La bonne version au bon moment", body: "Une convention peut évoluer. RH Pilot conserve **les différentes versions avec leurs dates** et utilise celle qui correspond à la période de paie." },
      { heading: "Un impact concret sur la paie", body: "Cette vérification peut notamment changer **la façon dont certaines absences sont traitées** selon la convention applicable." },
    ],
    sources: SOURCES,
  },
  health: {
    key: "health",
    eyebrow: "Complémentaire santé",
    title: "La complémentaire santé entre naturellement dans la paie.",
    intro: "RH Pilot enregistre le montant de la complémentaire santé et la part payée par l’employeur avant de calculer la paie.",
    summary: "Les montants sont contrôlés avant le calcul et apparaissent ensuite dans le détail de la paie.",
    variant: "health",
    moments: [
      { heading: "Deux informations simples", body: "RH Pilot prend en compte **le montant mensuel de la complémentaire santé** et **la part payée par l’employeur**." },
      { heading: "Un contrôle avant le calcul", body: "La part employeur est vérifiée avant de lancer le calcul afin d’éviter une donnée incohérente." },
      { heading: "Visible sur le résultat", body: "La participation de l’employeur apparaît ensuite **dans le détail des cotisations** de la paie." },
    ],
    sources: SOURCES,
  },
  contributions: {
    key: "contributions",
    eyebrow: "Cotisations sociales",
    title: "Les cotisations sont calculées et expliquées ligne par ligne.",
    intro: "RH Pilot calcule les montants à la charge du salarié et de l’employeur et présente les principales cotisations de la période.",
    summary: "Chaque ligne indique simplement ce qui est prélevé, pour qui, et pour quel montant.",
    variant: "contributions",
    moments: [
      { heading: "Ce qui est payé par le salarié", body: "Le calcul distingue **les cotisations payées par le salarié**, qui diminuent le montant versé, et celles payées par l’employeur." },
      { heading: "Un détail facile à relire", body: "Les principales lignes sont présentées séparément : maladie, retraite, chômage, CSG/CRDS, prévoyance et autres cotisations concernées." },
      { heading: "Des règles identifiables", body: "Chaque montant est relié à **la règle qui a servi à le calculer**, afin de pouvoir comprendre le résultat." },
    ],
    sources: SOURCES,
  },
  netSocial: {
    key: "net-social",
    eyebrow: "Montant net social",
    title: "Le montant net social est présenté clairement au salarié.",
    intro: "RH Pilot calcule le montant net social en complément du net avant impôt et le conserve dans le résultat de paie.",
    summary: "Le montant net social et le net avant impôt sont deux informations différentes du même bulletin.",
    variant: "netSocial",
    moments: [
      { heading: "On part du salaire brut", body: "Le calcul commence avec **le salaire brut et les éléments du mois**, avant de prendre en compte les cotisations." },
      { heading: "Les cotisations font évoluer le résultat", body: "Les cotisations servent ensuite à déterminer les différents montants qui apparaissent sur la paie." },
      { heading: "Deux montants à ne pas confondre", body: "RH Pilot conserve **le net avant impôt** et **le montant net social** séparément dans le résultat." },
    ],
    sources: SOURCES,
  },
  payslip: {
    key: "payslip",
    eyebrow: "Bulletin de paie",
    title: "Le bulletin est préparé à partir d’une période verrouillée.",
    intro: "RH Pilot vérifie que toutes les informations nécessaires sont présentes avant de produire le bulletin et bloque la génération en cas d’élément obligatoire manquant.",
    summary: "Un bulletin n’est généré que lorsque la période est terminée et que les informations nécessaires sont disponibles.",
    variant: "payslip",
    moments: [
      { heading: "La période doit être terminée", body: "Le bulletin peut être généré lorsque **le calcul du mois est terminé et la période est verrouillée**." },
      { heading: "Un calcul pour chaque salarié", body: "Chaque salarié actif doit disposer **d’un calcul enregistré pour la période** avant la création du bulletin." },
      { heading: "Les informations obligatoires", body: "RH Pilot vérifie notamment **l’identification de l’employeur et du salarié**, ainsi que la convention applicable." },
    ],
    sources: SOURCES,
  },
  traceability: {
    key: "traceability",
    eyebrow: "Suivi du calcul",
    title: "Retrouver facilement comment une paie a été calculée.",
    intro: "RH Pilot garde les informations importantes utilisées pour chaque calcul afin de pouvoir expliquer le résultat plus tard.",
    summary: "Les données du mois, les règles utilisées et le résultat sont conservés ensemble pour chaque période.",
    variant: "traceability",
    moments: [
      { heading: "Les règles utilisées", body: "Chaque calcul garde **les règles utilisées et leur version**, ainsi que leur source." },
      { heading: "Les informations du mois", body: "Le salarié, les variables, les absences et les autres informations utiles sont conservés avec **le calcul de la période**." },
      { heading: "Le résultat final", body: "Les principaux montants, dont **le total des cotisations et le montant net social**, sont conservés avec le reste du calcul." },
    ],
    sources: SOURCES,
  },
  profile: {
    key: "profile",
    eyebrow: "Profil de paie",
    title: "Les informations du salarié servent de base au calcul.",
    intro: "Le profil de paie réunit le salaire, le contrat et les informations utiles pour préparer la paie du mois.",
    summary: "Les données du salarié sont regroupées au même endroit avant de calculer sa paie.",
    variant: "profile",
    moments: [
      { heading: "Le salaire de base", body: "Le profil indique **le salaire brut mensuel** qui sert de base au calcul de la paie." },
      { heading: "Le contrat et la date d’embauche", body: "**Le type de contrat et la date d’embauche** font partie des informations utilisées pour préparer la période." },
      { heading: "Les informations complémentaires", body: "Le niveau, le coefficient, le statut et la convention collective peuvent être renseignés **lorsqu’ils sont nécessaires**." },
    ],
    sources: SOURCES,
  },
  employer: {
    key: "employer",
    eyebrow: "Informations de l’entreprise",
    title: "La paie tient aussi compte de l’entreprise.",
    intro: "RH Pilot prend en compte les informations de l’entreprise et de l’établissement qui peuvent modifier le calcul de la paie.",
    summary: "Les informations de l’entreprise sont vérifiées avant d’être utilisées pour calculer la paie.",
    variant: "employer",
    moments: [
      { heading: "La forme de l’entreprise", body: "**La forme juridique de l’entreprise** fait partie des informations nécessaires au calcul." },
      { heading: "Un taux lié à l’établissement", body: "**Le taux lié aux accidents du travail et aux maladies professionnelles** est pris en compte lorsqu’il s’applique à l’établissement." },
      { heading: "Le lieu et la date de création", body: "La localisation de l’établissement et **la date de création de l’entreprise** complètent les informations utilisées pour la paie." },
    ],
    sources: SOURCES,
  },
};
