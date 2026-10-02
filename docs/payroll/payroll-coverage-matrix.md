# RH Pilot : matrice de couverture paie

> Une capacité est « couverte » lorsque son calcul est déterministe, sourcé, daté, testé et bloquant en cas d'information manquante. Le moteur de bulletin (`src/lib/payroll/bulletin/`) porte ses paramètres datés et sourcés dans `params.ts` ; `modele-social` (Urssaf) sert d'oracle automatique sur les mois simples (`compute.oracle.test.ts`).

## Légende

- ✅ couvert : calcul complet, testé, intégré au cycle de paie.
- 🟠 partiel : calcul présent avec une limite documentée.
- ⛔ bloqué : le calcul s'arrête avec un message explicite plutôt que d'approximer.
- ❌ absent.

## 1. Rémunération et temps de travail

| Domaine | État | Notes |
|---|---|---|
| Salaire de base mensualisé | ✅ | Horaire contractuel, taux horaire affiché |
| Temps partiel | ✅ | Plafond proratisé, heures complémentaires 10 % / 25 %, limites du dixième et du tiers |
| Entrée et sortie en cours de mois | ✅ | Méthode de l'horaire réel sur l'horaire hebdomadaire du salarié ; plafond aux jours civils |
| Heures supplémentaires | ✅ | 25 % / 50 % (ou taux conventionnel ≥ 10 %), réduction salariale ≤ 11,31 %, déduction patronale 1,50 / 0,50 €, défiscalisation dans la limite de 7 500 € nets par an (cumul suivi). Export DSN 017 raccordé |
| Heures supplémentaires structurelles (39 h) | ✅ | Ventilation base / majoration, exonérations proratisées en cas d'absence. Export DSN 018 raccordé |
| Majorations nuit, dimanche, férié, astreinte | 🟠 | Saisies en montant brut ; pas de calcul conventionnel automatique |
| Forfait jours | 🟠 | Traité sur un horaire de référence (7 h par jour) |
| Modulation, annualisation | ❌ | |

## 2. Primes, rappels et sortie

| Domaine | État | Notes |
|---|---|---|
| Primes mensuelles | ✅ | Calcul et DSN courante raccordés dans le brut et les assiettes lorsqu'aucun bloc 52 spécifique n'est requis |
| Primes annuelles / exceptionnelles | 🟠 | Calculées par le moteur ; export DSN bloqué tant que le type S21.G00.52 et la période de rattachement ne sont pas explicitement saisis |
| Rappel de salaire | 🟠 | Saisi en montant ; pas de recalcul rétroactif des périodes antérieures |
| Indemnité compensatrice de congés payés | ✅ | Par période d'acquisition, au plus favorable du maintien et du dixième ; compteurs soldés |
| Indemnité compensatrice de préavis | ✅ | Soumise comme un salaire, intégrée au dixième |
| Indemnité de fin de CDD | ✅ | 10 % (ou 6 %) du brut total du contrat, calculée avant l'indemnité compensatrice |
| Indemnités de rupture | ✅ | Licenciement, rupture conventionnelle, mise et départ à la retraite : part exonérée d'impôt (50 %, 2 × la rémunération, plafonds 6 / 5 PASS), de cotisations (2 PASS), de CSG (minimum légal ou conventionnel), assujettissement total au-delà de 10 PASS, contribution patronale de 40 % |
| Indemnité transactionnelle, non-concurrence | ❌ | À saisir hors moteur pour l'instant |

## 3. Absences et revenus de remplacement

| Domaine | État | Notes |
|---|---|---|
| Congés payés | ✅ | Jours ouvrables ou ouvrés, maintien comparé au dixième, acquisition 2,5 j (2 j pendant la maladie), bascule au 1er juin avec report signalé |
| RTT, événements familiaux | ✅ | Absences normalement rémunérées ; restent dans l'activité DSN 01 |
| Absence sans solde | ✅ | Retenue à l'horaire réel, plafond réduit des jours civils entiers ; DSN activité 02 et suspension 501 raccordées |
| Maladie | ✅ | Bloc mensuel 60 et activité 02 raccordés avec/sans subrogation, métadonnées explicites figées ; signalement 04 en pré-contrôle. IJSS estimées ou subrogation partielle sans ventilation bloquent l'export |
| Accident du travail | ✅ | Jour de l'accident payé, sans carence, IJSS imposables à 50 % |
| Maternité, paternité | 🟠 | Retenue et IJSS ; bloc mensuel 60 et activité 02 avec/sans subrogation, signalement 04 en pré-contrôle. Maintien conventionnel à compléter |
| IJSS | ✅ | Montant de l'attestation, ou estimation signalée sur les trois mois précédant l'arrêt ; imposables sur les 60 premiers jours d'arrêt maladie |
| Subrogation | ✅ | Paramètre de l'entreprise ; IJSS nettes reversées, intégrées au net social |
| Maintien conventionnel plus favorable | 🟠 | Règle saisissable dans Configuration > Organisation et appliquée au bulletin (maladie et AT/MP, deux taux, paliers d’ancienneté). Référence obligatoire et règle moins favorable refusée. Garanties en net et règles distinctes par population à compléter |
| Activité partielle | ❌ | |

## 4. Avantages, frais, titres-restaurant, transport

| Domaine | État | Notes |
|---|---|---|
| Avantages en nature | ✅ | Ajoutés au brut puis déduits du net |
| Frais professionnels | ✅ | Remboursements hors brut (montants saisis dans les limites d'exonération) |
| Titres-restaurant | ✅ | Part patronale 50 à 60 %, exonération plafonnée par titre, excédent réintégré |
| Transport public | ✅ | Prise en charge ≥ 50 %, exonération jusqu'à 75 % |
| Forfait mobilités durables, prime transport | ✅ | Plafonds annuels et cumul avec le transport public suivis ; excédent réintégré. Export DSN encore bloqué |

## 5. Cotisations et protection sociale

| Domaine | État | Notes |
|---|---|---|
| Cotisations du régime général 2026 | ✅ | Taux datés et sourcés, validés par l'oracle Urssaf |
| Régularisation progressive des tranches | ✅ | T1, T2, 4 plafonds, CET cumulés sur l'année |
| RGDU | ✅ | Calcul annuel cumulé, Smic figé au 1er janvier 2026 |
| Apprentis | ✅ | Exonérations salariales 50 % / 79 % du Smic, CSG, impôt jusqu'au Smic |
| Effectif et seuils | ✅ | Moyenne de l’année précédente, première embauche et neutralisation Pacte ; prorata des temps partiels conservé à deux décimales. Saisie de l’effectif Urssaf possible |
| Complémentaire santé | ✅ | Proratisée à l'entrée et à la sortie ; dispense par salarié |
| Prévoyance | ✅ | Taux T1 / T2 par population, minimum cadre de 1,50 % |
| Forfait social | ✅ | 8 % sur la prévoyance à partir de 11 salariés |
| Versement mobilité | 🟠 | Barème Urssaf par commune et date, ventilation VM/VMA/VMR conservée dans le bulletin. Lieux multiples et assujettissement par zone/région à compléter. Un taux manuel sans ventilation ne permet pas l'export DSN |
| Réintégration de la prévoyance au-delà des limites | ⛔ | Calcul bloqué |
| Régime local Alsace-Moselle | 🟠 | Cotisation maladie de 1,30 %, taxe d'apprentissage à 0,44 % sans solde, Vendredi saint et 26 décembre fériés, validés par l'oracle Urssaf ; maintien de salaire du droit local (art. L1226-23) signalé, à compléter selon la durée de l'arrêt |
| Outre-mer (LODEOM) | ⛔ | Calcul bloqué |

## 6. Fiscalité, nets et cumuls

| Domaine | État | Notes |
|---|---|---|
| Net social | ✅ | Définition codifiée, IJSS subrogées nettes incluses |
| Net imposable | ✅ | Santé patronale, CSG non déductible, HS défiscalisées, IJSS, indemnités de rupture |
| Prélèvement à la source | 🟠 | Taux personnalisé ou grille datée ; CDD court : deux mois de date à date, RNF et assiette distinctes en DSN. Terme imprécis sans durée minimale et renouvellement sans terme initial conservé ne sont pas couverts |
| Cumuls annuels | ✅ | Chaînés depuis le dernier bulletin validé, ou reprise saisie |
| Reprise d'un autre logiciel | ✅ | Soldes de congés et cumuls de l'année saisissables par salarié |

## 7. Bulletin, cycle et déclarations

| Domaine | État | Notes |
|---|---|---|
| Cycle préparer, calculer, contrôler, valider, clôturer | ✅ | Calcul séquentiel : un mois précédent non validé bloque le suivant |
| Bulletin clarifié | ✅ | Rubriques par risque, allègements, net social, PAS, congés, cumuls, mentions obligatoires |
| Points d'attention du calcul | ✅ | Affichés avant validation |
| DSN | 🟠 | Mapping P26V01 versionné depuis les paies verrouillées, dettes rapprochées au centime, archives chiffrées immuables. Variables courantes, absences, AT, subrogation, CP, entrées et CDD court raccordés. Signalements 04/05 en test. Dsn-Val 2026.1.0.17 : 37 fichiers sans anomalie. Restent notamment sorties/FCTU, apprentis, avantages/frais spécifiques, régularisations, contributions annuelles et dépôt/retours métier. Dépôt réel désactivé |
