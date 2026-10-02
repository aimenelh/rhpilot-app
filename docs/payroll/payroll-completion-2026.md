# Clôture du socle PAIE — suivi du 2 octobre 2026

**Statut : en cours. Le module ne peut pas encore être présenté comme un logiciel de paie et de déclaration entièrement terminé.**

## Périmètre de travail

Paies mensuelles 2026 du régime général en France métropolitaine : CDI, CDD et alternance, cycle de calcul et contrôle, bulletin PDF, congés et cumuls, préparation déclarative. Les règles conventionnelles doivent être identifiées et paramétrées, sans déduction automatique depuis un libellé. Les cas non couverts sont décrits dans `payroll-coverage-matrix.md`.

## Corrections de cette livraison

- Maintien maladie et AT/MP : saisie des taux, carence, ancienneté et durées par palier dans Configuration > Organisation, stockage PostgreSQL, lecture au calcul, présence dans les entrées du snapshot du bulletin. Source obligatoire. Les taux, durées, carence et ancienneté ne peuvent être moins favorables que le minimum national. Ce paramétrage couvre les règles de maintien brut à deux taux communes à toute l'entreprise ; les garanties en net et règles distinctes par population restent à traiter.
- Les libellés du bulletin affichent les taux de maintien effectivement appliqués, y compris 100 %, et le message « maintien légal appliqué » n'est plus affiché lorsqu'une règle conventionnelle est utilisée.
- Effectif : la saisie et le stockage conservent deux décimales. Le calcul ne transforme plus un prorata en entier, et accepte zéro lorsque les seuls salariés sont exclus de l'effectif social. La migration convertit la colonne en `DECIMAL(10,2)`.
- DSN P26V01 : adresse de l'entreprise, retraite complémentaire RUAA pour le périmètre régime général, ancienneté et base vieillesse plafonnée verrouillée. Cotisations individuelles placées sous leur véritable base assujettie, avant l'ancienneté. Composant SMIC obligatoire pour la réduction générale. Taux au format normatif, contrôles des salariés inconnus et des caractères du fichier.
- DSN des variables courantes : 39 h/HS/HC, réductions associées et primes mensuelles ordinaires sont raccordées.
- DSN mensuelle des absences : congé sans solde, RTT, événements familiaux rémunérés, maladie/AT/maternité/paternité avec et sans subrogation sont raccordés depuis les métadonnées figées. Congés payés : bloc 52 type 046, comparaison maintien/dixième obligatoire. Les entrées en cours de mois sont raccordées, avec périodes d'emploi et salaire rétabli contrôlés.
- Signalements 04 et 05 : génération en mode test depuis les absences validées, regroupement des prolongations, archives chiffrées et immuables, téléchargement par entreprise. La reprise prévue n'est pas un signalement anticipé. Le dépôt et les retours organismes restent à réaliser.
- CDD : motif de recours obligatoire pour un CDD privé ordinaire, sans motif automatique ; PAS non personnalisé avec RNF et assiette distinctes, contrôle des deux mois de date à date et du montant daté de l'abattement. Les renouvellements et termes imprécis sans durée minimale explicite restent hors périmètre.
- Le SIRET doit passer le contrôle de clé. Le code risque AT/MP est vérifié dans la table officielle RAT P26V01, y compris sa validité au mois déclaré. Le faux exemple `602MD` du formulaire est supprimé ; aucun code réel n'est choisi à la place de celui de la notification de l'employeur.

## Contrôle officiel reproductible

Références : [cahier technique DSN 2026](https://www.net-entreprises.fr/media/documentation/dsn-cahier-technique-2026.1.pdf), [nomenclatures P26V01](https://www.net-entreprises.fr/nomenclatures-dsn-p26v01/), [Dsn-Val](https://www.net-entreprises.fr/declaration/outils-de-controle-dsn-val/), [maintien légal](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018537772/).

Dsn-Val Linux 64 bits **2026.1.0.17**, téléchargement officiel et empreinte SHA-256 figés dans la CI. La table RAT JSON conserve l'empreinte du CSV officiel embarqué dans cette version. Lors d'un changement de norme ou de nomenclature, mettre à jour ces références ensemble et refaire les contrôles.

```sh
DSN_VAL_DIR=/chemin/vers/dsn-val npm run test:dsn-val
```

Le script contrôle 37 fichiers synthétiques : 27 déclarations mensuelles et 10 signalements d'arrêt/reprise. Les cas calculés couvrent salaire ordinaire, hauts salaires, temps partiel, 39 h, HS/HC, absences, AT, subrogation, congés payés, entrée et CDD court au PAS non personnalisé, en plus des affiliations complémentaires et cotisations employeur. Il exige un bilan XML **P26V01 / test / OK / zéro anomalie**, puis vérifie qu'un fichier privé d'un bloc obligatoire est refusé. Tous les fichiers sont traités localement, sans dépôt sur net-entreprises.

Les exemples testent la structure et le raccordement des montants verrouillés ; ils ne constituent pas une recette financière indépendante ni une acceptation par les organismes.

## Conditions de clôture restantes

| Condition | État et travail restant |
|---|---|
| DSN des paies calculées par l'application | Générateur intégré à `prepareDsnP26V01`, mapping `P26V01-RG-2026.5`, rapprochement des dettes au centime. OPS configurés par entreprise ; santé/prévoyance mensuelles limitées aux composants 20/11/24. Les autres périmètres restent bloqués. |
| DSN des mois avec événements | Variables courantes, absences, subrogation, AT, CP et entrées raccordés ; signalements 04/05 préparables en test. Restent sorties/FCTU, contributions annuelles, changements de contrat, régularisations, primes à période spécifique, apprentis et revenus nécessitant d'autres blocs. |
| Vérification financière indépendante | Comparer des bulletins de référence pour les cas retenus : temps partiel, entrée/sortie, maladie traversant deux mois, HS, congés, cadre, apprenti, fin de CDD, rupture et régularisations annuelles. L'oracle Urssaf couvre déjà les mois simples, mais ne remplace pas cette recette. |
| Prévoyance au-delà des limites | Réintégrations sociales/fiscales annuelles à implémenter avec cumuls et reprise. Blocage maintenu. |
| Conventions collectives | Vérifier les références applicables et les règles non représentables par les deux taux de maintien. |
| Parcours connecté | Vérifier avec un compte autorisé : paramètres → calcul → contrôle → validation → verrouillage → PDF → export. Un écran de connexion ne valide pas ce parcours. |
| Dépôt et retours déclaratifs | Dépôt de test autorisé, compte net-entreprises et affiliations exactes nécessaires pour la recette métier et le traitement des retours. Un bilan Dsn-Val OK ne vaut pas acceptation par les organismes. |

Les pré-contrôles sont archivés chiffrés et immuables, avec version, empreinte et téléchargement des octets conservés. La DSN réelle et l'ouverture générale restent désactivées tant que les conditions ci-dessus ne sont pas satisfaites. Les anciennes paies validées/verrouillées ne sont pas recalculées. Le moteur des nouveaux calculs est versionné `rhpilot-bulletin-2026.6`. Le détail de cette livraison et ses sources figurent dans `../paie-dsn-2026-10-02.md` ; ce suivi décrit le code intégré, sans valoir confirmation du déploiement Vercel.
