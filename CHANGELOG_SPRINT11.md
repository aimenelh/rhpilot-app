# RH Pilot — Changelog Sprint 11

**Changement de schéma ce sprint — migration nécessaire.** Aucune
nouvelle variable `.env`.

## Objectif du sprint

Deux sujets de fiabilité et de confiance des données, groupés comme
convenu avec vous et ChatGPT : SIRET facultatif à la création
d'organisation, et export RGPD.

## Nouveautés fonctionnelles

- **SIRET facultatif à la création d'organisation** : jamais
  bloquant. Un champ SIRET (14 chiffres) avec un bouton "Rechercher"
  interroge l'API publique gratuite de l'État
  (`recherche-entreprises.api.gouv.fr`, aucune clé requise) et
  pré-remplit le nom, avec l'adresse, la ville et le code APE affichés
  à titre indicatif ("Ces informations proviennent de la base publique
  de l'État"). Le nom reste toujours modifiable, et créer une
  organisation sans SIRET (test, entreprise fictive, démonstration
  avant validation interne) reste pleinement possible.
- **Export RGPD**, dans Paramètres :
  - **CSV des salariés** — tableau exploitable dans Excel/Sheets.
  - **JSON complet de l'organisation** — toutes les données rattachées
    (salariés, parcours, tâches, notifications, journal d'audit),
    répondant au droit à la portabilité.

## Décision de conception

Seul le SIRET est conservé en base sur `Organization` (utile pour la
facturation future). L'adresse, la ville et le code APE ne sont
**pas** stockés — seulement affichés au moment de la recherche.
Cohérent avec la discipline appliquée depuis le début du projet : ne
jamais ajouter de champ dont l'usage n'est pas encore réel.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh, ni à l'API publique)

- Contrôle syntaxique (esbuild) des 55 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS.
- Icône `lucide-react` (`Download`) confirmée existante.
- **Test réel de la fonction d'échappement CSV** (pas seulement
  relue) : confirmé qu'un nom contenant une virgule ou des guillemets
  est correctement échappé, sans casser le fichier.
- **Tentative d'appel réel à l'API SIRET** : bloquée par mon
  environnement (`recherche-entreprises.api.gouv.fr` non autorisé dans
  mon bac à sable) — le code suit le format documenté de l'API
  publique, mais **n'a pas pu être testé en conditions réelles ici**.

## Non vérifié ici, à tester en local en priorité

- **L'appel réel à l'API SIRET** : sur `/dashboard` (écran de création
  d'organisation), tapez un vrai SIRET à 14 chiffres (le vôtre, une
  fois obtenu, ou celui d'une entreprise connue), cliquez
  "Rechercher", vérifiez que le nom se pré-remplit correctement. Si ça
  échoue, copiez-moi le message d'erreur exact.
- Créer une organisation **sans** SIRET, vérifier que ça fonctionne
  toujours normalement.
- Sur Paramètres, télécharger les deux exports, ouvrir le CSV dans
  Excel (vérifier que les accents s'affichent correctement) et le
  JSON dans un éditeur de texte.
- `npx tsc --noEmit`, `npm run build`

## Procédure de migration pour ce sprint

Comme toujours, copiez le dossier `prisma/migrations` de votre ancien
projet vers le nouveau **avant** de lancer la migration.

```
npx prisma generate
npx prisma migrate dev --name add_organization_siret
```

## Prochain sprint

À déterminer avec vous et ChatGPT — probablement la Phase 2 évoquée
(déploiement Vercel, domaine, environnement de bêta séparé).
