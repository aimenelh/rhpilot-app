# Audit RH Pilot, lots 5 et 6

Base : branche Claude, commit 8eb46e84f7b36bdf7bc4ed20313b6739bff57f93.
Les lots 1 à 4 étaient READY en prévisualisation Vercel. La production main
était encore au commit 5942d876c6d09705d24bcb89645a7a05a34c0c6c.

## Lot 5

- Pro ne donne pas automatiquement accès au calcul de paie. Le calcul est
  présenté comme un accès anticipé sur invitation ; aucune DSN n'est déposée.
- CGV et contrat de sous-traitance ajoutés ; CGU alignées sur les mentions
  légales. Acceptation exigée côté serveur avant Checkout, version et date
  enregistrées dans Stripe et audit_logs.
- Confidentialité : Stripe, bases légales, conservation, export structuré
  séparé des documents, transferts et chiffrement réel explicités.
- Cookies : textes harmonisés avec Vercel Analytics, chargé seulement après
  accord ; gestion des préférences accessible dans le footer.
- Sitemap, image Open Graph, Twitter et données structurées ; modèle de titre,
  mot-clé RH dans le h1 et signature éditoriale des ressources.
- Optimisation Next Image activée, intro bloquante retirée, image Vecteezy
  remplacée par une illustration CSS, 24 Mo de SVG inutilisés retirés.
- Contact/démo et feuille de route, sorties du parcours mobile.

## Lot 6

- Dépôt de bulletins PDF externes via la fiche salarié, mois requis, maximum
  4 Mo, PDF lisible et non protégé. Aucun calcul ni écriture dans les tables de
  paie. Publication dans le coffre existant et notification habituelle.
- Choix papier et information préalable respectés. Confirmation exigée avant
  remplacement ; l'ancienne version reste conservée et journalisée.
- Membres : rôles d'accès et fonctions RH/dirigeant, retrait d'accès avec
  libération des responsabilités actives. Propriétaire et son propre accès
  protégés ; un administrateur ne peut pas gérer les autres administrateurs.
- Permissions revérifiées dans la transaction et changements journalisés.
- Premiers pas cliquables et démonstration proposée dans le dashboard vide.
- Suggestions NAF : candidats déclarés dans un échantillon de 25 entreprises
  du même code APE, via l'API officielle Recherche d'entreprises ; codes
  techniques exclus, aucune affectation automatique. Le NAF est un indice,
  pas une détermination juridique. Le SIRET reste la meilleure source quand
  les conventions déclarées de l'entreprise sont connues.

## Vérification

PostgreSQL 16 local, base isolée, migrations rejouées. Aucun écart Prisma.
TypeScript et ESLint exécutés ; avertissements historiques ESLint présents.
499 tests passent, dont sept scénarios d'intégration ajoutés.
Build Next.js réussi (82 pages prérendues).
HTTP : nouvelles pages, robots, sitemap et image Open Graph répondent 200 ;
une adresse publique inconnue répond 404.

## Configuration à compléter avant publication du juridique

- RH_PILOT_CONTACT_PHONE : téléphone de l'éditeur, affiché dans les mentions.
- RH_PILOT_HOST_PHONE : téléphone de Vercel, uniquement après vérification
  auprès de l'hébergeur ; aucun numéro inventé n'a été ajouté.
- Confirmer que contact@rhpilot.fr reçoit les messages.
- DOCUMENT_ENCRYPTION_KEY (lot 3) doit être configurée pour chiffrer les nouveaux
  documents. Cette reprise n'a ni consulté ni modifié les secrets Vercel.
  Les documents antérieurs restent lisibles ; pas de rechiffrement automatique.
- Les durées, contrats des prestataires et mécanismes de transfert doivent
  correspondre aux engagements réellement souscrits par l'éditeur.

Pas de migration ni de changement de variables en production dans ces lots.
Le SEPA, l'export comptable, les forfaits jours, les stagiaires et la DSN réelle
restent des développements distincts, affichés comme à l'étude sur la feuille
 de route ; ils ne sont pas annoncés comme disponibles.

## Sources vérifiées le 29 septembre 2026

- https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4
- https://www.cnil.fr/fr/clauses-contractuelles-types-entre-responsable-de-traitement-et-sous-traitant
- https://code.travail.gouv.fr/fiche-service-public/convention-collective
- https://github.com/SocialGouv/recherche-entreprises
- https://recherche-entreprises.api.gouv.fr/
- https://vercel.com/legal/privacy-notice (adresse actuelle de l'hébergeur)

## État de livraison

Le code est commité localement sur `codex/audit-lots-5-6`.
La publication GitHub a été refusée par la revue automatique, qui exige un
accord explicite de l'utilisateur pour envoyer le code à ce dépôt. Aucun
nouveau déploiement Vercel ni changement de production n'a été effectué.
Le contrôle visuel local reste non concluant : problèmes de certificat puis
session navigateur revenue à about:blank. Les contrôles HTTP et le build
ont abouti ; le rendu desktop/mobile doit être revérifié sur la preview.
