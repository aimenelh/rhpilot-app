# RH Pilot — Changelog Sprint 4

## Objectif du sprint

Faire passer RH Pilot de "gestionnaire de données" à "assistant qui dit
quoi faire" — décision issue de la revue conjointe du Sprint 3 avec le
CEO. Pièce centrale : la carte "Votre attention est requise" sur le
tableau de bord.

## Nouveautés fonctionnelles

- **"Votre attention est requise"** en haut du tableau de bord : les
  tâches qui méritent une action, triées par priorité réelle — en
  retard d'abord, puis non assignées (personne ne peut agir tant que ce
  n'est pas le cas), puis échéance dans les 7 jours. Chacune avec un
  lien direct vers son plan d'action.
- **Tableau de bord recentré sur l'action** plutôt que sur les données
  brutes : 🔴 en retard / 🟠 cette semaine / ✅ terminées en évidence,
  salariés et parcours RH relégués en second plan (liens rapides plutôt
  que gros chiffres).
- **Type de contrat (CDI/CDD) et durée de période d'essai** sur la fiche
  salarié.
- **Pré-remplissage intelligent de la date d'événement** : "Embauche"
  se pré-remplit avec la date d'embauche du salarié ; "Fin de période
  d'essai" se pré-remplit avec date d'embauche + durée renseignée — une
  suggestion modifiable, jamais un calcul imposé (cohérent avec la
  décision prise au moment des seeds : pas de moteur juridique au MVP).
- **Barre de progression** partout où un plan d'action est résumé
  (fiche salarié, liste des parcours, vue détaillée) — remplace le texte
  "x/y tâches faites".
- **Code couleur par type de parcours** (point vert pour Embauche,
  orange pour Fin de période d'essai), extensible sans risque à de
  futurs gabarits (repli neutre automatique).
- **Bouton de déclenchement mis en avant** : carte teintée, icône,
  formulation plus engageante.
- **Lisibilité des tâches** : icônes de statut (fait / en retard / en
  cours) et d'information (échéance, responsable) sur la vue détaillée
  d'un parcours.
- **Vocabulaire retravaillé** : "Événements RH" → "Parcours RH" dans la
  navigation et les écrans concernés — aucun changement de base de
  données, uniquement les textes affichés.

## Décision produit : priorité des tâches reportée

Sujet débattu avec le CEO : ajouter un champ "Priorité" (critique/
importante/normale) sur les tâches. Reporté volontairement — combiner
deux dimensions (priorité et urgence de date) sans données d'usage
réelles aurait ajouté une couche de décision arbitraire (une tâche
"Normale" en retard de 10 jours passe-t-elle avant une "Critique" dans
5 jours ?). À réévaluer après les premiers retours utilisateurs.

## Nouveautés techniques

- `src/lib/urgency.ts` : calcul centralisé du retard/de l'échéance
  proche, réutilisé par le tableau de bord et la vue détaillée d'un
  parcours — une seule source de vérité pour "qu'est-ce qui est
  urgent".
- `src/lib/eventTemplateStyle.ts` : mappage couleur par clé de gabarit.
- `lucide-react` ajouté comme dépendance pour les icônes (vérifié que
  chaque icône utilisée existe réellement dans la version installée,
  voir section vérifications).

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- `npm install` : réussi, `lucide-react` résolu correctement.
- Contrôle syntaxique (esbuild) des 38 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS avec les nouvelles classes
  (dégradés, couleurs d'accent).
- **Vérification supplémentaire propre à ce sprint** : chaque icône
  `lucide-react` utilisée dans le code (`Rocket`, `CalendarDays`,
  `User`, `CircleCheck`, `CircleDashed`, `TriangleAlert`, `Clock`,
  `UserRoundX`) a été confirmée comme existant réellement dans le
  paquet installé — ce type d'erreur (icône mal nommée) ne se voit
  normalement qu'au chargement de la page, pas à la compilation.

## Non vérifié ici, à faire en local

- `npx prisma generate`, `npx prisma migrate dev --name add_employee_contract_fields`
  — **changement de schéma ce sprint, migration nécessaire** (voir
  procédure ci-dessous).
- `npx tsc --noEmit`, `npm run build`
- **Test fonctionnel** :
  1. Ouvrez la fiche d'un salarié existant, renseignez son type de
     contrat et une durée de période d'essai (ex. 2 mois), enregistrez.
  2. Déclenchez un événement "Fin de période d'essai" : la date doit se
     pré-remplir automatiquement à date d'embauche + 2 mois.
  3. Créez volontairement une tâche en retard : dans Prisma Studio,
     modifiez manuellement le `dueDate` d'une tâche non terminée pour
     une date passée, puis rechargez le tableau de bord — elle doit
     apparaître en tête de "Votre attention est requise" avec l'icône
     rouge.
  4. Vérifiez que les compteurs 🔴/🟠/✅ correspondent à la réalité.

## Procédure de migration pour ce sprint

Comme d'habitude, pensez à copier le dossier `prisma/migrations` de
votre ancien projet vers le nouveau **avant** de lancer la migration,
sinon Prisma proposera une réinitialisation complète de la base (déjà
rencontré au Sprint 2).

```
npx prisma generate
npx prisma migrate dev --name add_employee_contract_fields
```

## Prochain sprint

Sprint 5 — Notifications. Le calcul "qu'est-ce qui est urgent" existe
déjà (`src/lib/urgency.ts`) ; il s'agira principalement de l'envoyer par
email plutôt que de le laisser uniquement visible à l'écran.

---

# Révision suite aux retours de test à deux salariés

## Tableau de bord : deux vues complémentaires

La carte "Votre attention est requise" propose désormais un bouton pour
basculer entre :
- **Par salarié** (par défaut) : une ligne par personne concernée,
  avec le détail (en retard / à assigner / cette semaine) et un lien
  vers sa fiche — reste lisible même avec beaucoup de salariés.
- **Toutes les tâches** : la liste plate telle qu'elle existait déjà.

## Statistiques mises en avant

Les compteurs 🔴/🟠/✅ sont passés de petites pastilles à de vraies
cartes avec un chiffre large, dans l'esprit Linear/Stripe demandé.

## Cartes de tâches plus compactes

Le composant `Card` accepte désormais une prop `compact` (padding
réduit), appliquée à la vue détaillée d'un parcours pour afficher plus
d'informations à l'écran sans scroller.

## Non vérifié ici, à tester en local

- Aucune migration nécessaire pour cette révision (uniquement de
  l'affichage).
- Vérifier que le basculement entre les deux vues fonctionne bien et
  que le regroupement par salarié est correct avec vos deux salariés de
  test.
