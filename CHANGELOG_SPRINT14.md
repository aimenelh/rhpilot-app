# RH Pilot — Changelog Sprint 14

**Changement de schéma ce sprint — migration nécessaire.** Aucune
nouvelle variable `.env`.

## Objectif du sprint

Rendre la bêta réellement testable sur un échantillon de plusieurs
salariés, sans obliger à tout taper à la main — tri fait avec vous et
ChatGPT entre ce qui est indispensable avant mardi et ce qui peut
attendre.

## Nouveautés fonctionnelles

- **Civilité** sur la fiche salarié (Mme / M. / Autre / non renseigné).
- **Deux nouveaux types de contrat** : apprentissage et
  professionnalisation, en plus de CDI/CDD.
- **Durée de période d'essai flexible** (jours, semaines ou mois) —
  permet par exemple les 45 jours effectifs d'un contrat
  d'apprentissage, sans coder aucune règle légale en dur : RH Pilot
  continue de proposer, jamais d'imposer.
- **Générateur d'entreprise de démonstration** : un clic depuis l'écran
  "Aucun salarié" génère 15 salariés fictifs variés (contrats,
  managers, dates d'embauche), avec trois vrais parcours déclenchés
  via le moteur existant — dont un avec des tâches naturellement en
  retard et un déjà entièrement terminé. Servira aussi pour vos futures
  démonstrations et captures d'écran, pas seulement pour la bêta.
- **Import CSV** (`/dashboard/employees/import`) : coller le contenu
  d'un fichier au format RH Pilot plutôt que créer chaque fiche une
  par une. Une ligne individuellement invalide est ignorée avec un
  message précis, sans bloquer l'import du reste.

## Décision de cadrage, avec vous

Import limité à un format CSV propre à RH Pilot — pas d'import
PayFit/Lucca/Silae, qui exporteraient chacun différemment et
représenteraient un vrai chantier à part. Cette version simplifiée
(coller du texte plutôt qu'un vrai fichier `.xlsx`) réduit
volontairement la surface de risque avant une échéance serrée.

## Nouveautés techniques

- `probationDurationMonths` renommé/étendu en `probationDuration` +
  `probationDurationUnit` — toutes les références mises à jour
  (formulaire, actions, détecteurs d'anomalies, export RGPD,
  pré-remplissage intelligent du déclenchement d'événement).
- Un risque réel de blocage du build a été corrigé en cours de route :
  la validation par `.includes()` ne suffisait pas à satisfaire
  TypeScript pour les enums Prisma (`ContractType`, `Civility`,
  `DurationUnit`) — imports de types et conversions explicites
  ajoutés.
- `src/lib/employeeCsv.ts` : logique d'analyse CSV isolée et testée
  indépendamment de l'action qui l'utilise.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 65 fichiers `.ts`/`.tsx`, y compris
  `prisma/seed.ts` (vérifié sans référence résiduelle à l'ancien
  champ) : 100 % valides.
- Compilation réelle de Tailwind CSS.
- **Test réel du parseur CSV**, à deux niveaux : d'abord avec des cas
  construits à la main (ligne valide, prénom manquant, date invalide)
  — comportement confirmé correct sur chaque cas ; puis avec le
  fichier de 50 salariés réellement généré ci-dessous, relu tel quel
  par le parseur : 50 lignes valides, 0 erreur.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- Sur l'écran "Aucun salarié", tester le bouton "Générer une
  entreprise de démonstration" — vérifier les 15 salariés, les
  suggestions qui apparaissent, et le parcours d'Antoine avec des
  tâches en retard.
- Importer le fichier CSV de 50 salariés fourni ci-dessous.
- Créer un salarié en contrat d'apprentissage, vérifier que 45 jours
  peut être saisi directement (sans passer par un calcul en mois).

## Procédure de migration pour ce sprint

Comme toujours, copiez le dossier `prisma/migrations` de votre ancien
projet vers le nouveau **avant** de lancer la migration.

```
npx prisma generate
npx prisma migrate dev --name add_civility_extended_contracts_flexible_probation
```

## Fichier de test fourni

`rhpilot-test-import-50-salaries.csv` — 50 salariés fictifs, avec des
lignes volontairement variées (certaines sans durée de période
d'essai, certaines avec une visite médicale passée ou à venir) pour
bien tester l'import dans des conditions réalistes.
