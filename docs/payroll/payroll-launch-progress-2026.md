# Préparation à l'ouverture commerciale — 1er octobre 2026

## Avancement DSN et archives

L'export des périodes verrouillées utilise désormais le générateur de cotisations complet. Il rapproche les lignes du bulletin, les dettes Urssaf/retraite/complémentaires et les paiements au centime, avec une ventilation cumulative de la RGDU. Le taux AT/MP et les assiettes d'activité et de chômage viennent du bulletin verrouillé.

Les administrateurs configurent les organismes, les coordonnées SEPA chiffrées et les affiliations santé/prévoyance depuis leurs fiches de paramétrage. Le périmètre complémentaire raccordé est limité aux paiements mensuels, à la santé forfaitaire (20) et à la prévoyance sur tranches A/2 unifiée (11/24). Les autres composants et changements en cours de mois restent bloqués.

Chaque export de pré-contrôle possède une version conservée chiffrée, une empreinte SHA-256 et un historique. PostgreSQL empêche les mises à jour et suppressions de ces archives. Le téléchargement vérifie l'identité entreprise/période/archive et restitue les octets Latin-1 conservés.

Les lots DSN fusionnés jusqu'au congé sans solde ont porté la suite à 650 tests réussis, en plus des migrations PostgreSQL, du schéma, des types, du lint et du build. Le contrôle local étendu vérifie neuf fichiers synthétiques P26V01 avec Dsn-Val 2026.1.0.17, dont six calculés par le moteur : la double affiliation santé/prévoyance, le forfait social avec VM/VMA/VMR, le cadre/APEC et le FNAL déplafonné sont couverts. Le témoin invalide doit être rejeté. La CI complète reste la condition de fusion de ce lot.

## Corrections de ce lot

- Mapping `P26V01-RG-2026.3` : forfait social à 8 % et ventilation des versements mobilité VM/VMA/VMR depuis la provenance Urssaf conservée dans le bulletin ; arrondissement de travail conservé pour Paris/Lyon/Marseille.
- Contrats : refus des sorties au dernier jour, rappels après sortie et changements de contrat/statut non déclarés. Le code retraite est rapproché du statut cadre/non-cadre réellement utilisé par le moteur ; les extensions cadre restent hors périmètre.

- Moteur `rhpilot-bulletin-2026.3` : exonération fiscale **annuelle** des salaires d'apprentissage, cumul du net fiscal avant exonération hors IJSS, franchissement du seuil et reprise explicite des données historiques. Seuils datés : 21 876 € à compter de janvier, 22 184 € à compter de juin, selon les publications Net-entreprises.
- DSN : reprise de l'assiette et du taux du bulletin verrouillé ; distinction RNF / part non imposable des apprentis / montant soumis au PAS. La rubrique .50.012 n'est pas utilisée pour l'abattement des CDD courts.
- Lots déclaratifs suivants : 39 h en 018, HS/HC aléatoires en 017, net fiscal exonéré en 58/01, réductions 114/021, primes mensuelles ordinaires dans les rémunérations courantes, congé sans solde en activité 02 + suspension 501. RTT et événements familiaux normalement rémunérés restent dans l'activité 01.
- Continuité des cumuls : un mois absent ou calculé par l'ancien moteur exige un bulletin détaillé ou une reprise des cumuls avant calcul. Un planning enregistré avec des valeurs invalides ne devient plus un planning lundi-vendredi implicite.
- Générateur de cotisations : contrôle des rubriques CTP et de leur correspondance aux cotisations individuelles sur un sous-ensemble DIDA officiel, rapprochement du journal signé avec le bordereau et du bordereau avec le paiement Urssaf, refus des doublons et des rubriques sans provenance.
- Correction du format du taux agrégé .23.003 (deux décimales), distinct du taux individuel .81.007 (trois décimales). Les fixtures normatives comprennent désormais le CTP de réduction correspondant à la cotisation individuelle 018.

## Sources et reproduction

Table officielle : https://open.urssaf.fr/explore/dataset/equivalence-dida/export/ . Les correspondances embarquées conservent la date de récupération et l'empreinte SHA-256 de la réponse JSON originale. DIDA fournit des correspondances et des contraintes de présence, **pas un barème de taux**. La dernière version est retenue par tuple CTP / base / code individuel / qualifiant, pas par CTP seul (cela supprimerait des correspondances encore utiles).

Apprentis : https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2985/ . Seuil 2026 revalorisé : https://www.net-entreprises.fr/information-revalorisation-du-smic-au-1er-juin-2026/ . Norme : https://www.net-entreprises.fr/media/documentation/dsn-cahier-technique-2026.1.pdf .

Tests ciblés : `npm test -- src/lib/payroll/dsn-locked-pas.test.ts src/lib/payroll/dsn-p26v01-complete.test.ts src/lib/payroll/bulletin/compute.test.ts src/lib/payroll/bulletin/prior-coverage.test.ts`.

Contrôle officiel : `DSN_VAL_DIR=/chemin/vers/dsn-val npm run test:dsn-val`. Les fichiers sont synthétiques et servent à vérifier la norme ; leurs montants ne constituent pas des bulletins de référence.

## L'ouverture complète reste à démontrer

Ce lot corrige des erreurs identifiées ; il ne constitue ni une homologation ni l'achèvement du module DSN. Le générateur complet est raccordé à l'export de pré-contrôle. L'ouverture du dépôt réel exige encore de couvrir les éléments ci-dessous et de valider les retours des organismes.

Restent notamment les arrêts maladie/AT-MP/maternité/paternité avec leur signalement événementiel, les congés payés nécessitant le type 046, les primes annuelles ou exceptionnelles à période de rattachement spécifique, les entrées/sorties et fins de contrat, les apprentis/régimes spécifiques, les régularisations déclaratives (dont la CET rétroactive), les contributions annuelles, les autres assiettes de forfait social et régularisations mobilité, les retours métier et la recette financière indépendante. La continuité annuelle doit être vérifiée sur les changements de plafond, d'horaire, de seuil et d'exonération, y compris une éventuelle correction fiscale des périodes antérieures lors d'une revalorisation du seuil des apprentis. Le décompte des congés à temps partiel et les reports entre deux mois ont été corrigés par le moteur 2026.4 ; les changements contractuels en cours de mois restent bloqués et exigent un calcul segmenté.

Le contrôle des événements ne doit pas dépendre du seul montant d'une ligne de prorata : une sortie le dernier jour du mois et une transformation de contrat peuvent nécessiter des blocs déclaratifs avec un salaire mensuel entier. Ces cas restent bloqués jusqu'au raccordement des blocs de fin/changement.

La préparation de janvier 2027 nécessite la norme et les paramètres 2027 vérifiés. Les bornes 2026 restent actives : les taux 2026 ne doivent pas se prolonger silencieusement.

La recette de dépôt demande un compte éditeur de test Net-entreprises autorisé, des affiliations exactes et des cas de paie de référence. Un contrôle Dsn-Val sans anomalie ne remplace pas les comptes rendus des organismes. Aucun dépôt réel n'est autorisé par cette livraison.
