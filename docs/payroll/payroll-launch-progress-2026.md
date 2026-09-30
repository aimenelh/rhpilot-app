# Préparation à l'ouverture commerciale — 30 septembre 2026

## Corrections de ce lot

- Moteur `rhpilot-bulletin-2026.3` : exonération fiscale **annuelle** des salaires d'apprentissage, cumul du net fiscal avant exonération hors IJSS, franchissement du seuil et reprise explicite des données historiques. Seuils datés : 21 876 € à compter de janvier, 22 184 € à compter de juin, selon les publications Net-entreprises.
- DSN : reprise de l'assiette et du taux du bulletin verrouillé ; distinction RNF / part non imposable des apprentis / montant soumis au PAS. La rubrique .50.012 n'est pas utilisée pour l'abattement des CDD courts. Les CDD courts et les absences restent bloqués par les contrôles de périmètre existants : ce lot ne les ouvre pas au dépôt.
- Continuité des cumuls : un mois absent ou calculé par l'ancien moteur exige un bulletin détaillé ou une reprise des cumuls avant calcul. Un planning enregistré avec des valeurs invalides ne devient plus un planning lundi-vendredi implicite.
- Générateur de cotisations : contrôle des rubriques CTP et de leur correspondance aux cotisations individuelles sur un sous-ensemble DIDA officiel, rapprochement du journal signé avec le bordereau et du bordereau avec le paiement Urssaf, refus des doublons et des rubriques sans provenance.
- Correction du format du taux agrégé .23.003 (deux décimales), distinct du taux individuel .81.007 (trois décimales). Les fixtures normatives comprennent désormais le CTP de réduction correspondant à la cotisation individuelle 018.

## Sources et reproduction

Table officielle : https://open.urssaf.fr/explore/dataset/equivalence-dida/export/ . Les correspondances embarquées conservent la date de récupération et l'empreinte SHA-256 de la réponse JSON originale. DIDA fournit des correspondances et des contraintes de présence, **pas un barème de taux**. La dernière version est retenue par tuple CTP / base / code individuel / qualifiant, pas par CTP seul (cela supprimerait des correspondances encore utiles).

Apprentis : https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2985/ . Seuil 2026 revalorisé : https://www.net-entreprises.fr/information-revalorisation-du-smic-au-1er-juin-2026/ . Norme : https://www.net-entreprises.fr/media/documentation/dsn-cahier-technique-2026.1.pdf .

Tests ciblés : `npm test -- src/lib/payroll/dsn-locked-pas.test.ts src/lib/payroll/dsn-p26v01-complete.test.ts src/lib/payroll/bulletin/compute.test.ts src/lib/payroll/bulletin/prior-coverage.test.ts`.

Contrôle officiel : `DSN_VAL_DIR=/chemin/vers/dsn-val npm run test:dsn-val`. Les fichiers sont synthétiques et servent à vérifier la norme ; leurs montants ne constituent pas des bulletins de référence.

## L'ouverture complète reste à démontrer

Ce lot corrige des erreurs identifiées ; il ne constitue ni une homologation ni l'achèvement du module DSN. Le générateur complet n'est toujours pas le générateur utilisé par l'export des périodes réelles : le raccordement exhaustif des cotisations, les affiliations retraite et organismes complémentaires, leurs contrats et les modalités de paiement restent à intégrer.

Restent également les événements (absences, entrées/sorties, fins de contrat), régularisations déclaratives, retours métier et recette financière indépendante. La continuité annuelle doit être vérifiée sur les changements de plafond, d'horaire, de seuil et d'exonération, y compris une éventuelle correction fiscale des périodes antérieures lors d'une revalorisation du seuil des apprentis. Le décompte des congés à temps partiel en jours ouvrés et les changements contractuels en cours de mois doivent être corrigés avant ouverture générale.

La préparation de janvier 2027 nécessite la norme et les paramètres 2027 vérifiés. Les bornes 2026 restent actives : les taux 2026 ne doivent pas se prolonger silencieusement.

La recette de dépôt demande un compte éditeur de test Net-entreprises autorisé, des affiliations exactes et des cas de paie de référence. Un contrôle Dsn-Val sans anomalie ne remplace pas les comptes rendus des organismes. Aucun dépôt réel n'est autorisé par cette livraison.
