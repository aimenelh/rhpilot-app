# Reprise du compte rendu métier du 15 septembre 2026

Source : Compte_rendu_RH_Pilot(1).pdf, rapport destiné à Maxime Dekens et à RH Pilot. Les propositions du rapport ne sont pas toutes des défauts démontrés.

## Modifications de ce lot
- Identité : retrait des mentions Bêta sans suppression des limites opérationnelles du module paie ni invention de garanties contractuelles.
- Interface partagée : navigation fixe, état actif, rôle traduit, recherche mobile, menu clavier avec retour du focus, champs lisibles, tableaux et contrastes harmonisés, réduction des animations selon préférence système.
- Dashboard : accueil compact, statistiques distinctes des priorités, Copilote latéral sur grand écran, aucun taux 100 % pour une organisation sans parcours, activité sans codes techniques.
- C03 / P3 : suivi documentaire visible indépendamment du statut Fait ; un fichier associé ne vaut pas contrôle documentaire. Aucun nouveau circuit de validation ou dépôt de pièces n’est inventé.
- C06 / S1 : précontrôle des entrées/sorties partielles et des profils superposés, messages nominatifs et accès au dossier. Les blocages backend sont conservés. Après synchronisation avec 05fa545, un prorata INCOMPLETE_MONTH en euros permet le contrôle préalable des mois partiels selon le nouveau moteur ; les salariés hors période sont exclus.
- C08 / U3 : correction de la suggestion source sur les visites et du contexte Copilote ; distinction donnée absente / fait et échéance du jour / retard.
- A3 / C12 : accès à l’import CSV existant, relances inactives explicites, lien vers les informations de sécurité existantes.
- PDF : conservation de la pagination, de l’identité et des cumuls ajoutés sur main, numérotation réelle, copie des pages via pdf-lib au lieu du parseur maison ; tests de génération, stockage et regroupement.

## Vérifications
19 tests ciblés PDF / stockage / précontrôle réussis. Compilation Next.js complète réussie avec les valeurs factices Stripe prévues pour la compilation CI (aucune connexion Stripe ni migration). Cas synthétique standard : 1 page ; cas long à 80 variables : 2 pages. Ces données de test ne constituent pas des références de calcul de paie.
Vérification TypeScript : erreurs préexistantes dans les fixtures de tests paie et intégration ; aucune erreur dans les sources modifiées lors du contrôle.
Connexion sécurisée au compte non poursuivie : contrôle visuel authentifié ordinateur/mobile et téléchargement réel depuis une période verrouillée NON VALIDÉS.

## Travaux restant à traiter et démontrer
- Dépôt et contrôle effectif des pièces de tâches, dérogations motivées et audit.
- Répartition multi-RH et suppléance ; séparation RH/manager/salarié testée côté serveur sur tous les accès.
- Parcours de démonstration atomique ou reprise explicitement décrite.
- Historique des contrats successifs, changements futurs, départs et réembauches.
- Matrice conventionnelle démontrée, import et export complets avec contrôles de doublons.
- Couverture du moteur de paie : contexte social réel, variables, heures, absences, éléments non monétaires, puis cas de référence métier.
- PDF issu d’un vrai calcul verrouillé : génération, persistance, individuel, regroupement et téléchargement ; comptabilité des totaux et contenu légal à vérifier séparément.

Le retrait du badge de version ne vaut ni certification, ni validation exhaustive de l’application.
