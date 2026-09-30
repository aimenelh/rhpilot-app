# Cotisations DSN depuis les bulletins verrouillés — P26V01

Le préparateur lit les lignes et entrées du bulletin verrouillé, vérifie les totaux au centime, puis ventile les dettes Urssaf, retraite, organismes complémentaires et DGFiP. Il ne recalcule pas une paie depuis les paramètres vivants.

Mapping versionné P26V01-RG-2026.1 :
- Maladie et allocations familiales : compléments 635/907 et 430/102 en 2026.
- Retraite, CEG et CET : 131/132, contrôles patronaux 142/146, sans double paiement.
- RGDU : ventilation des cumuls Urssaf/retraite avant différence mensuelle, bulletin antérieur obligatoire pour les cumuls repris.
- Solde de taxe d'apprentissage : charge différée ; déclaration annuelle non encore raccordée.
- Santé forfaitaire (composant 20) et prévoyance sur tranches A/2 unifiée (11/24) : affiliations et adhésions issues de la fiche de paramétrage saisie par l'administrateur, bases 31, cotisations 059 et paiements 55. Aucun organisme ou code population n'est deviné.
- Paiements mensuels SEPA : coordonnées chiffrées au repos, mandats confirmés par l'entreprise. Cette confirmation n'enregistre aucun mandat auprès d'un organisme.

La présence d'une affiliation et la saisie de sa référence ne remplacent pas la vérification de la fiche de paramétrage. Les autres composants, périodicités et changements d'affiliation en cours de mois restent bloqués.

Le dépôt réel reste désactivé. Les événements, régularisations historiques, contributions annuelles, archives immuables de déclaration et retours métier ne sont pas encore entièrement raccordés. Les primes, absences, heures supplémentaires/complémentaires, apprentis et régimes spécifiques non traduits sont bloqués explicitement avant export.

## Vérification
La CI exécute migrations PostgreSQL, validation du schéma, TypeScript, lint, tests et build. Le job Dsn-Val vérifie des fichiers synthétiques, dont des bulletins réellement calculés et une double affiliation santé/prévoyance ; un témoin invalide doit être refusé. Un résultat Dsn-Val accepté établit la conformité structurelle de ces exemples, pas l'acceptation métier de toutes les paies d'une entreprise.

Références : cahier technique DSN 2026.1.2, consignes 2556 et 2537, documentation Urssaf maladie/allocations familiales 2026 et RGDU, fiches de paramétrage des organismes.
