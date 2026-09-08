# RH Pilot — Matrice de couverture paie

> Document de cadrage avant tests réels. Une capacité n’est considérée comme « couverte » que si son traitement est déterminable, versionné, traçable et bloquant en cas d’information insuffisante. Aucun taux ou seuil légal n’est à coder ici sans source officielle et date de validité.

## Légende

- ✅ COUVERT : flux métier + calcul/régime suffisamment défini.
- 🟠 PARTIEL : infrastructure présente mais cas métier incomplets ou dépendance à compléter.
- ❌ MANQUANT : aucun traitement métier fiable.
- ⛔ BLOQUANT : doit être traité avant mise en production paie pour ce scénario.

## 1. Rémunération et temps de travail

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Salaire de base mensualisé | 🟠 | P0 | Profil paie présent ; vérifier orchestration Publicodes et mois incomplet |
| Temps partiel / proratisation | 🟠 | P0 | Dépend des règles de temps de travail et entrées/sorties |
| Entrée en cours de mois | 🟠 | P0 | À tester avec calendrier réel |
| Sortie en cours de mois | 🟠 | P0 | À intégrer au calcul et au solde de tout compte |
| Heures supplémentaires | 🟠 | P0 | Publicodes couvre le domaine, dépendances conventionnelles à alimenter |
| Heures complémentaires | 🟠 | P0 | Même logique ; ne pas supposer la majoration |
| Majorations nuit/dimanche/jours fériés | ❌ | P1 | Doit dépendre de la convention/règle validée |
| Astreintes | ❌ | P1 | Traitement rémunération + social/fiscal à documenter |
| Forfait jours/heures | ❌ | P1 | À modéliser distinctement du temps partiel |
| Aménagement/modulation du temps de travail | ❌ | P2 | À traiter après socle P0/P1 |

## 2. Primes et éléments variables

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Prime d’activité / variable générique | 🟠 | P0 | Structure de variables existe ; régime à déterminer par type |
| Prime 13e mois | 🟠 | P1 | Publicodes connaît le domaine ; convention/contrat à prendre en compte |
| Prime ancienneté | ❌ | P1 | Souvent conventionnelle |
| Prime objectif/bonus | 🟠 | P1 | Besoin d’un type de variable + régime explicite |
| Prime vacances/bilan/autres | ❌ | P2 | Ne pas créer de régime générique sans source |
| Indemnités de rupture | ❌ | P1 | Traiter séparément du salaire mensuel |
| Indemnité compensatrice de congés payés | 🟠 | P1 | Les méthodes légales doivent être modélisées |
| Indemnité de préavis / licenciement | ❌ | P1 | Solde de tout compte |

## 3. Absences, maintien et revenus de remplacement

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Congés payés | 🟠 | P0 | Validation d’absence présente ; impact paie incomplet |
| RTT | 🟠 | P0 | Même pipeline |
| Maladie | 🟠 | P0 | Le pipeline bloque tant que traitement validé absent |
| Accident du travail / maladie pro | 🟠 | P1 | IJSS/maintien/subrogation à distinguer |
| Maternité | ❌ | P1 | Revenus de remplacement + maintien selon contexte |
| Paternité/adoption | ❌ | P1 | Idem |
| Absence sans solde | 🟠 | P0 | Impact générique possible mais traitement à sécuriser |
| IJSS | ❌ | P1 | Besoin d’un modèle séparé |
| Subrogation | ❌ | P1 | Doit affecter flux employeur et bulletin |
| Activité partielle | ❌ | P1 | Publicodes couvre le domaine ; orchestration RH Pilot à construire |

## 4. Avantages en nature

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Avantages en nature — agrégat | ❌ | P0 | Publicodes expose la règle et ses sous-domaines |
| Nourriture | ❌ | P0 | Forfait/repas/contexte à alimenter |
| Logement | ❌ | P0 | À modéliser, valeur réelle/forfait selon les règles officielles |
| Véhicule | ❌ | P0 | Cas historique et règles d’évaluation à versionner |
| NTIC | ❌ | P1 | Publicodes expose coût appareils/abonnements ; flux d’entrée à construire |
| Autres avantages | ❌ | P2 | Type et traitement explicites |
| Participation du salarié | ❌ | P1 | Doit réduire correctement l’avantage lorsque prévu |
| Déduction de l’avantage du net à payer | ❌ | P0 | Élément non-cash à représenter au bulletin |

## 5. Frais professionnels et mobilité

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Frais réels sur justificatifs | ❌ | P0 | Reimbursement hors salaire, régime à contrôler |
| Allocations forfaitaires | ❌ | P0 | Plafonds/date/contextes à versionner |
| Repas en déplacement | ❌ | P0 | Distinguer avantage en nature et frais pro |
| Grand déplacement / hébergement | ❌ | P1 | Métropole/étranger et conditions particulières |
| Frais kilométriques | ❌ | P0 | Barèmes externes à versionner, pas de taux codé en dur |
| Transport public domicile-travail | ❌ | P0 | Publicodes expose montant abonnement et part employeur |
| Forfait mobilités durables | ❌ | P0 | Publicodes expose le domaine ; cas d’exonération à alimenter |
| Prime transport | ❌ | P1 | Dépend du mode de transport et des conditions |
| Véhicule électrique / hybride / hydrogène | ❌ | P1 | Cas particulier du transport à modéliser |
| DFS | ❌ | P1 | Seulement professions éligibles + frais effectivement supportés |

## 6. Titres-restaurant

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Nombre de titres | ❌ | P0 | Variable mensuelle |
| Valeur faciale | ❌ | P0 | Saisie salarié/organisation |
| Part employeur | ❌ | P0 | Calcul + contrôle du régime |
| Part salarié | ❌ | P0 | Retenue nette |
| Plafond de part déductible | ❌ | P0 | Règle datée et versionnée ; ne pas hardcoder |
| Absences impactant le nombre de titres | ❌ | P1 | Congés/absence à relier au calendrier |

## 7. Protection sociale

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Mutuelle obligatoire | 🟠 | P0 | Montant + taux employeur existent |
| Dispenses mutuelle | ❌ | P1 | Conditions justificatives à intégrer |
| Prévoyance | 🟠 | P1 | Publicodes couvre certains régimes ; données de contrat à structurer |
| Cadre / non-cadre | ✅ | P0 | Paramètre déjà présent |
| Régime local Alsace-Moselle | ❌ | P1 | Cas social explicite |

## 8. Cotisations, exonérations et cas particuliers

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Cotisations salarié | ✅ | P0 | Source Publicodes |
| Cotisations employeur | ✅ | P0 | Source Publicodes |
| Détail des cotisations | 🟠 | P0 | Liste de règles présentes, à fiabiliser par modèle |
| RGDU / allègements | 🟠 | P0 | Le modèle social les connaît ; vérifier dépendances et contexte |
| Apprentissage | 🟠 | P0 | Contrat déjà distingué ; exonérations à valider |
| Professionnalisation | 🟠 | P1 | Même principe |
| Effectif / seuils | 🟠 | P0 | Situation par défaut actuelle à remplacer par données réelles |
| ATMP / taux employeur | 🟠 | P0 | Le taux doit venir de l’organisation/référentiel validé |
| JEI | 🟠 | P1 | Situation par défaut actuelle ne suffit pas pour une entreprise réelle |
| Association non lucrative | 🟠 | P2 | Catégorie et traitement dédiés |
| Résidence fiscale hors France | ❌ | P2 | Cas fiscal spécifique |

## 9. Fiscalité et sorties

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Net avant impôt | ✅ | P0 | Publicodes |
| Montant net social | ✅ | P0 | Publicodes |
| Net imposable | 🟠 | P0 | À exposer distinctement dans snapshot/bulletin |
| PAS | 🟠 | P0 | Taux réel DGFiP ou statut explicite `RATE_NOT_PROVIDED`, jamais  inventé |
| Net à payer | 🟠 | P0 | Doit intégrer non-cash, remboursements/retenues |
| Compteurs annuels | ❌ | P1 | Cumuls nécessaires |
| Régularisations | ❌ | P1 | Recalculs et écarts de périodes précédentes |

## 10. Bulletin et cycle de paie

| Domaine | État initial | Priorité | Notes |
|---|---|---:|---|
| Brouillon → calculé → revue → validé → verrouillé | ✅ | P0 | Cycle métier présent |
| Préparation bulletin | 🟠 | P0 | Pré-requis présents ; couverture métier à compléter |
| Mentions obligatoires | 🟠 | P0 | Audit à faire sur le rendu final |
| Éléments non-cash | ❌ | P0 | Avantages en nature doivent apparaître correctement |
| Frais remboursés | ❌ | P0 | Séparer du brut et du net |
| Cumuls | ❌ | P1 | À prévoir sur bulletin |
| Solde de tout compte | ❌ | P1 | Sorties et ruptures |

## Priorités d’implémentation

### P0 — indispensable avant premier test réel complet
1. Modèle d’éléments variables avec régime social/fiscal explicite.
2. Avantages en nature : agrégat + nourriture + logement + véhicule + NTIC.
3. Frais professionnels : repas, remboursements, transport domicile-travail, FMD, titres-restaurant.
4. Absences : congés, maladie et absence sans solde avec traitement validé ; ne pas calculer une absence dont le régime n’est pas déterminé.
5. Heures supplémentaires/complémentaires.
6. Net imposable/net à payer et représentation des éléments non-cash.
7. Données sociales réelles de l’organisation (effectif, ATMP, mutuelle, statut, régime local le cas échéant).
8. Tests de cohérence du bulletin et de chaque assiette.

### P1 — avant ouverture commerciale sérieuse
IJSS/subrogation, maternité/paternité/adoption, AT/MP, activité partielle, primes conventionnelles, rupture, DFS, prévoyance avancée, compteurs et régularisations.

### P2 — extensions
Cas rares et régimes particuliers après sécurisation du socle.

## Règles d’architecture

- Toute règle dépendante d’une date doit être versionnée avec `valid_from` / `valid_to` ou équivalent.
- Toute règle conventionnelle doit être rattachée à une convention collective et une version source.
- Les règles sociales couvertes par `modele-social` ne doivent pas être recopiées en taux dans RH Pilot.
- Un élément dont le régime ne peut pas être déterminé ne doit pas être calculé silencieusement : le moteur doit retourner un blocage explicite.
- Les données saisies par l’utilisateur et les résultats calculés doivent rester distincts.
- Chaque résultat affiché à l’utilisateur doit pouvoir remonter à sa règle source, son modèle/version et son contexte.

## Sources réglementaires de référence

- Mon-entreprise / Urssaf — rémunération, cotisations, avantages en nature, frais professionnels et activité partielle.
- BOSS — doctrine opposable lorsque pertinente pour les assiettes/exonérations.
- Légifrance — Code du travail, Code de la sécurité sociale et textes réglementaires.
- DGFiP — prélèvement à la source et doctrine fiscale applicable.
- Service-Public — synthèse destinée à la vérification fonctionnelle, sans remplacer la source juridique primaire.
