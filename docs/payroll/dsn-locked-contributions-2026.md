# Cotisations DSN depuis les bulletins verrouillés — P26V01

Le préparateur lit les lignes et entrées du bulletin verrouillé, vérifie les totaux au centime, puis ventile les dettes Urssaf, retraite, organismes complémentaires et DGFiP. Il ne recalcule pas une paie depuis les paramètres vivants.

Mapping versionné P26V01-RG-2026.3 :
- Maladie et allocations familiales : compléments 635/907 et 430/102 en 2026.
- Retraite, CEG et CET : 131/132, contrôles patronaux 142/146, sans double paiement.
- RGDU : ventilation des cumuls Urssaf/retraite avant différence mensuelle, bulletin antérieur obligatoire pour les cumuls repris.
- Solde de taxe d'apprentissage : charge différée ; déclaration annuelle non encore raccordée.
- Santé forfaitaire (composant 20) et prévoyance sur tranches A/2 unifiée (11/24) : affiliations et adhésions issues de la fiche de paramétrage saisie par l'administrateur, bases 31, cotisations 059 et paiements 55. Aucun organisme ou code population n'est deviné.
- Paiements mensuels SEPA : coordonnées chiffrées au repos, mandats confirmés par l'entreprise. Cette confirmation n'enregistre aucun mandat auprès d'un organisme.
- Forfait social à 8 % sur les contributions patronales santé/prévoyance : base 13, cotisation 071 et CTP 479, après rapprochement de l'assiette et du taux verrouillés. Les remboursements et autres assiettes restent bloqués.
- Versement mobilité : base 57, VM 081/900, VMA 082/901 et VMR 918/820, selon le sous-ensemble DIDA officiel. Le bulletin conserve la commune de travail, la ventilation Urssaf et sa validité ; un taux manuel ou historique sans ventilation bloque l'export. Le dernier composant absorbe le centime résiduel pour conserver exactement la dette du bulletin. Pour Paris, Lyon et Marseille, le code de l'arrondissement de travail est conservé même si le barème a été trouvé sous celui de la ville parente.
- Heures : 018 pour les heures supplémentaires structurelles, 017 pour les HS/HC aléatoires, net fiscal exonéré en 58/01, cotisation individuelle 114 / CTP 003 pour la réduction salariale et 021 / CTP 004 pour la déduction patronale. Les valeurs proviennent du bulletin verrouillé.
- Variables de rémunération : les primes mensuelles ordinaires restent dans les rémunérations et assiettes courantes ; une prime annuelle ou exceptionnelle reste bloquée sans type S21.G00.52 et période de rattachement explicites.
- Absences : congé sans solde en activité 02 et suspension 501 ; RTT et événements familiaux normalement rémunérés restent dans l'activité 01. Les arrêts de travail, maternité/paternité et congés payés nécessitant des blocs dédiés restent bloqués.

La présence d'une affiliation et la saisie de sa référence ne remplacent pas la vérification de la fiche de paramétrage. Les autres composants, périodicités et changements d'affiliation en cours de mois restent bloqués.

Le dépôt réel reste désactivé. Les événements, régularisations historiques, contributions annuelles et retours métier ne sont pas encore entièrement raccordés. Les cas non traduits — notamment arrêts de travail, congés payés type 046, primes à période spécifique, sorties, apprentis et régimes spécifiques — sont bloqués explicitement avant export. Les fins de contrat au dernier jour, les rappels après sortie et les changements de contrat/statut sont également bloqués, même avec un salaire mensuel entier. Le statut retraite .40.003 doit correspondre au statut cadre/non-cadre verrouillé ; les extensions cadre nécessitent un modèle distinct.

## Vérification
La CI exécute migrations PostgreSQL, validation du schéma, TypeScript, lint, tests et build. Le job Dsn-Val vérifie des fichiers synthétiques, dont des bulletins réellement calculés et une double affiliation santé/prévoyance ; un témoin invalide doit être refusé. Un résultat Dsn-Val accepté établit la conformité structurelle de ces exemples, pas l'acceptation métier de toutes les paies d'une entreprise.

Références : cahier technique DSN 2026.1.2, consignes 2556 et 2537, documentation Urssaf maladie/allocations familiales 2026 et RGDU, fiches de paramétrage des organismes.

## Archives de pré-contrôle
La génération utilise une requête POST authentifiée, réservée aux administrateurs et vérifiée sur la même origine. Une clé de requête évite une nouvelle version lors d'un nouvel essai du même téléchargement. Chaque génération volontaire produit une version distincte.

Les octets ISO-8859-1 et CRLF sont chiffrés au repos avec les identifiants de l'entreprise, de la période et de l'archive dans l'enveloppe chiffrée. Le téléchargement vérifie cette identité, la taille et l'empreinte SHA-256. Les fichiers ne sont jamais reconstruits lors d'un téléchargement GET.

PostgreSQL interdit les mises à jour et suppressions des archives et impose une clé étrangère entreprise/période. Cette archive de pré-contrôle n'est ni une preuve de dépôt ni un accusé d'acceptation des organismes. La gestion de conservation et rotation de clé doit être définie avant l'ouverture du dépôt réel.
