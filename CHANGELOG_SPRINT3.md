# RH Pilot — Changelog Sprint 3

## Objectif du sprint (Sprints 3+4 fusionnés, décision validée avec le CEO)

Le cœur du produit : déclencher un événement RH pour un salarié génère
immédiatement son plan d'action complet — tâches, échéances calculées,
responsables résolus automatiquement. C'est le moment où RH Pilot cesse
d'être un simple gestionnaire de fiches salariés pour devenir le
copilote RH promis depuis le premier brief.

## Nouveautés fonctionnelles

- **Déclencher un événement RH** depuis la fiche d'un salarié (Embauche
  ou Fin de période d'essai — les deux gabarits déjà en base depuis les
  seeds). Génère automatiquement toutes les tâches du parcours, avec :
  - échéances calculées à partir de la date de l'événement (`triggerDate + dueOffsetDays`) ;
  - responsable résolu automatiquement (RH/Dirigeant cherché parmi les
    membres de l'organisation ; Manager direct résolu via le salarié) ;
  - **file "À assigner"** quand la résolution échoue (aucune correspondance,
    ou plusieurs personnes ambiguës) — comportement volontaire validé à
    la conception du schéma : un vide visible plutôt qu'une mauvaise
    affectation silencieuse.
- **Vue du plan d'action** (`/dashboard/events/[id]`) : chaque tâche avec
  son étape, son échéance, son responsable habituel, la personne
  assignée (ou "À assigner"), la preuve attendue si applicable, et un
  changement de statut (À préparer / À faire / En cours / En attente
  externe / Fait / Annulée).
- **Liste de tous les événements RH** de l'organisation
  (`/dashboard/events`), avec progression (x/y tâches faites) — section
  de navigation "Événements RH" désormais active.
- **Historique des événements** visible directement sur la fiche de
  chaque salarié.
- **Tableau de bord réel** : nombre d'événements déclenchés, tâches à
  faire, et mise en évidence du nombre de tâches "à assigner" quand il y
  en a — donne une vision d'ensemble immédiate.

## Finitions promises au Sprint 2, livrées ici

- **Notifications de succès** ("Salarié créé", "Plan d'action généré",
  "Statut mis à jour"...) : composant `FlashToast` réutilisable, appliqué
  à toutes les actions existantes et nouvelles.
- **Boîte de confirmation stylée** (`ConfirmDialog`, basée sur l'élément
  HTML natif `<dialog>`) remplaçant le `window.confirm()` du Sprint 2 sur
  l'archivage — réutilisable pour toute future confirmation.

## Nouveautés techniques

- `src/lib/eventEngine.ts` : le moteur gabarit → instance. Toute la
  logique de génération de plan d'action est centralisée ici, dans une
  transaction Prisma unique (l'événement et toutes ses tâches sont créés
  ensemble ou pas du tout).
- `src/lib/format.ts` : utilitaire de date, mutualisé (était dupliqué
  entre deux fichiers au Sprint 2).
- Les actions serveur (`triggerEvent`, `updateTaskStatus`) suivent le
  même principe de sécurité que celles des salariés : l'organisation est
  toujours résolue depuis la session, jamais depuis une donnée du
  formulaire ; chaque lecture/écriture vérifie explicitement
  l'appartenance à l'organisation en plus de la protection déjà assurée
  par les clés composites du schéma.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 35 fichiers `.ts`/`.tsx` du projet :
  100 % valides.
- Compilation réelle de Tailwind CSS, y compris le variant `backdrop:`
  (Tailwind 3.4) utilisé par la nouvelle boîte de dialogue — confirmé
  par la présence de la règle `::backdrop` générée.

## Non vérifié ici, à faire en local

- `npx prisma generate`, `npx prisma validate` (aucun changement de
  schéma ce sprint — pas de nouvelle migration nécessaire)
- `npx tsc --noEmit`, `npm run build`
- **Test fonctionnel complet, le plus important de ce sprint** :
  1. Ouvrir la fiche de Nora (ou un autre salarié), déclencher un
     événement "Embauche" avec une date au choix.
  2. Vérifier l'arrivée sur la vue du plan d'action, avec les 8 tâches
     attendues (voir le seed), leurs échéances calculées, et voir si
     certaines tombent en "À assigner" (normal tant qu'aucun membre n'a
     de fonction RH/Dirigeant définie dans Clerk/Prisma Studio — vous
     pouvez définir votre propre `functionalRole` à `RH` directement
     dans Prisma Studio pour tester la résolution automatique).
  3. Changer le statut d'une tâche, vérifier que le compteur
     "x/y tâches faites" se met à jour sur la liste des événements et
     sur la fiche du salarié.
  4. Vérifier le tableau de bord : le nombre d'événements et de tâches à
     faire doit refléter ce qui vient d'être créé.

## Prochain sprint

Sprint 4 (recentré) — enrichissement de cette base : vue "parcours"
façon GPS (reprenant l'idée validée à la conception : voir le chemin
complet, pas juste une liste plate), gestion dédiée de la file "À
assigner", et améliorations d'interface identifiées à l'usage.
