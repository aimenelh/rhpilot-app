# RH Pilot — Changelog Sprint 2

## Objectif du sprint

Gestion des salariés (CRUD complet) + introduction d'un système de design
cohérent, sur demande explicite du CEO (ChatGPT) : chaque écran doit
désormais ressembler à un vrai produit SaaS professionnel, construit
progressivement plutôt que refait en une fois à la fin.

## Nouveautés fonctionnelles

- **Liste des salariés** (`/dashboard/employees`) : tableau si des salariés
  existent, état vide soigné avec appel à l'action sinon.
- **Ajout d'un salarié** (`/dashboard/employees/new`) : prénom, nom, poste,
  date d'embauche, manager direct optionnel.
- **Fiche salarié** (`/dashboard/employees/[id]`) : modification de tous les
  champs, et archivage (soft delete — le salarié disparaît des listes mais
  n'est jamais supprimé physiquement, cohérent avec la stratégie de
  suppression validée au moment du schéma).
- **Tableau de bord enrichi** : nombre de salariés réel, emplacements
  réservés (Événements RH, Tâches) pour les sprints à venir.

## Nouveautés techniques

- **Tailwind CSS** introduit, avec une palette de tokens dérivée du logo
  RH Pilot (voir `tailwind.config.ts`) plutôt qu'un style générique.
- **Composants réutilisables** (`src/components/ui/`) : `Button`, `Card`,
  `EmptyState`, `Badge`, champs de formulaire (`Input`, `Select`, `Label`).
  Chaque nouvel écran doit réutiliser ces composants plutôt que du style
  ad hoc, pour garder la cohérence demandée.
- **Navigation persistante** (`AppShell`) : sidebar + en-tête, avec les
  sections à venir affichées en grisé ("Bientôt") plutôt que masquées —
  donne une vision d'ensemble du produit final sans donner accès à des
  pages qui n'existent pas encore.
- **Server Actions** (`src/app/dashboard/employees/actions.ts`) plutôt que
  des routes API pour les mutations salariés — pattern Next.js 14 plus
  direct que celui utilisé pour la création d'organisation au Sprint 1
  (route API). Les deux approches cohabitent pour l'instant ; on pourra
  uniformiser plus tard si besoin, ce n'est pas bloquant.
- `lib/auth.ts` : les fonctions de résolution de session sont désormais
  mémoïsées par requête (`React.cache`), pour éviter des requêtes base de
  données dupliquées entre le layout et la page d'un même écran.

## Corrections du Sprint 1 intégrées

- Import manquant `@clerk/localizations` : ajouté correctement au
  `package.json` cette fois (dépendance déclarée, pas seulement importée).
  L'interface de connexion Clerk est donc en français.
- `middleware.ts` déplacé dans `src/` (Next.js l'exige avec cette
  structure de projet). **Note** : cette correction n'avait été reportée
  que sur votre dossier local au Sprint 1, pas dans le projet source que
  j'utilise pour construire les archives — elle avait donc disparu dans
  la première version du ZIP Sprint 2. C'est corrigé dans cette version.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- `npm install` : réussi, dépendances toutes résolues (y compris
  `@clerk/localizations`, dont l'installation avait été oubliée au
  Sprint 1).
- Contrôle syntaxique (esbuild) des 22 fichiers `.ts`/`.tsx` du projet :
  100 % valides.
- Compilation réelle de Tailwind CSS à partir de tous les fichiers du
  projet : réussie, les classes de la palette personnalisée sont bien
  générées (donc les fichiers `.tsx` sont bien lus et compris par
  Tailwind).

## Non vérifié ici, à faire en local (comme au Sprint 1)

- `npx prisma generate`, `npx prisma validate`
- `npx tsc --noEmit` (dépend du client Prisma généré)
- `npm run build`
- Test fonctionnel réel : ajouter un salarié, lui assigner un manager,
  vérifier l'affichage dans la liste et dans Prisma Studio, archiver un
  salarié et vérifier qu'il disparaît de la liste mais reste dans
  `Prisma Studio` avec `deletedAt` renseigné.

## Limite connue, à garder en tête pour un sprint futur

Le champ "manager direct" ne peut désigner qu'une personne ayant un
compte RH Pilot dans l'organisation (limite du schéma validée
précédemment : `managerMembershipId` référence `Membership`, pas
`Employee`). En pratique, certaines PME ont des responsables d'équipe qui
n'auront jamais de compte RH Pilot (ex. un chef d'équipe terrain). Ce
n'est pas bloquant pour le MVP, mais c'est une limitation réelle à
évaluer avec vous avant que trop d'écrans en dépendent.

## Prochain sprint

Sprint 3 — Événements RH (déclencher un `EmployeeEvent` pour un salarié
à partir des gabarits Embauche / Fin de période d'essai déjà en base).

---

# Révision suite aux retours de test (avant validation officielle)

## Changement de schéma justifié

`User` reçoit deux nouveaux champs : `firstName`, `lastName` (tous deux
optionnels), remplis automatiquement depuis les données déjà envoyées par
Clerk via le webhook. Nécessaire pour afficher un nom complet plutôt
qu'un email nu — jusqu'ici, aucun nom n'était stocké nulle part.

**Action requise après remplacement des fichiers** : relancer
```
npx prisma generate
npx prisma migrate dev --name add_user_names
```

## Bug corrigé : incohérence liste / formulaire pour le manager direct

La page de modification d'un salarié excluait par erreur le manager
actuellement assigné de la liste déroulante des managers proposés. La
donnée en base n'a jamais été fausse — seule la liste déroulante était
incomplète, ce qui faisait apparaître "Non défini" au chargement du
formulaire. Corrigé dans `employees/[id]/page.tsx`.

## Manager direct : nom complet affiché

Liste des salariés : nom complet en premier, email en dessous en plus
petit et plus clair (information secondaire). Formulaires (ajout/édition) :
nom complet suivi de l'email entre parenthèses dans chaque option — un
`<select>` HTML ne permet pas une mise en forme sur deux lignes à
l'intérieur d'une option.

## Confirmation avant archivage

Une boîte de confirmation native du navigateur s'affiche désormais avant
tout archivage, avec le nom du salarié concerné.

## Validations et messages d'erreur du formulaire

Les erreurs de validation (champs obligatoires manquants, date invalide)
sont maintenant renvoyées proprement par les actions serveur et
affichées dans le formulaire, plutôt que de déclencher un écran d'erreur
générique Next.js. Utilise `useFormState`/`useFormStatus` de React —
composants formulaire déplacés en client (`EmployeeForm.tsx`,
`ConfirmArchiveButton.tsx`), pattern standard pour ce cas avec Next 14.

## Non vérifié ici, à tester en local (en plus de la liste habituelle)

- Migration Prisma avec les nouveaux champs `User.firstName`/`lastName`
- Le nom complet s'affiche bien après une nouvelle inscription (les
  comptes déjà créés avant cette révision n'auront ni prénom ni nom tant
  que Clerk n'envoie pas un nouvel événement `user.updated` — normal,
  pas un bug, le webhook ne "rejoue" pas l'historique)
- Mise à jour du compteur du dashboard après ajout/archivage (point 4)
- Isolation entre organisations (point 6) — procédure de test à suivre
  telle que décrite dans la réponse de Claude
- Messages d'erreur du formulaire (essayer de soumettre sans prénom, par
  exemple)
- Confirmation avant archivage (annuler la boîte de dialogue doit bien
  empêcher l'archivage)
