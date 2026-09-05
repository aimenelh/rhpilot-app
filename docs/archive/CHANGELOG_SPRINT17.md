# RH Pilot — Changelog Sprint 17

**Aucune migration, aucune nouvelle variable `.env`.**

## Deux corrections, suite à vos tests

### 1. Rafraîchissement manuel nécessaire après une action

Bug réel : générer une démo, importer un CSV ou archiver en masse ne
mettait pas à jour l'écran immédiatement, il fallait rafraîchir la
page à la main. Cause : ces actions plus récentes n'invalidaient pas
explicitement le cache de la page — un correctif qu'on avait déjà
appliqué ailleurs dans le projet, mais oublié sur ces actions
spécifiques. `revalidatePath` ajouté systématiquement avant chaque
redirection qui modifie des salariés.

### 2. Lisibilité de "Parcours RH" avec plusieurs salariés

Avec plusieurs parcours du même type, "Embauche" répété en gros sur
chaque carte rendait la liste difficile à parcourir. Corrigé : le nom
du salarié redevient l'information principale (en gras, en premier),
le type de parcours devient une petite étiquette à côté — cohérent
avec le point de couleur déjà présent, qui permet déjà d'identifier le
type d'un coup d'œil sans avoir à le lire en toutes lettres.

## Vérifié réellement, ici

- Contrôle syntaxique (esbuild) des 65 fichiers : 100 % valides.
- Compilation Tailwind réelle.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- Régénérer la démo, vérifier que le tableau de bord se met à jour
  sans avoir à rafraîchir la page.
- Vérifier que la liste des parcours RH est plus facile à parcourir
  avec plusieurs salariés du même type d'événement.
