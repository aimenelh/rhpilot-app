# RH Pilot — Changelog Sprint 15

**Aucune migration, aucune nouvelle variable `.env`** (uniquement du
code et des données, pas de changement de schéma).

## Objectif du sprint

Corriger le vrai problème remonté en test : le tableau de bord était
saturé, et les données de démonstration généraient du bruit répété
plutôt qu'un scénario lisible.

## Ce qui a été corrigé, et pourquoi

- **Suggestions plafonnées à 6 sur le tableau de bord**, les
  suivantes repliées dans "Afficher les N autres" — déjà triées par
  sévérité (urgentes d'abord), donc les 6 visibles sont déjà les plus
  importantes, sans reconstruire un système de priorité à trois
  niveaux pour l'instant.
- **Le vrai bug trouvé en creusant votre retour** : le détecteur
  "fiche incomplète" n'avait aucune limite dans le temps — un salarié
  ancien sans durée de période d'essai renseignée (normal, cette
  donnée n'a plus de sens des années après) déclenchait l'alerte
  indéfiniment. Corrigé : limité aux salariés embauchés depuis moins
  de 6 mois, période où cette donnée reste réellement pertinente.
- **Jeu de données de démonstration entièrement repensé** : 15
  salariés, chacun illustrant un cas précis (parcours actif en retard,
  visite médicale en cours, parcours déjà terminé, période d'essai qui
  approche, fiche incomplète, sans manager, aucune visite jamais
  programmée) — et la majorité restent volontairement "propres", sans
  aucune alerte. Un jeu de données réaliste ne fait pas sonner l'alarme
  sur tout le monde à la fois.
- **Bouton "Archiver tous les salariés"** avec confirmation, sur la
  liste des salariés — utile après un mauvais import ou pour repartir
  d'une base propre en test/démo.
- **Badge "Bêta"** ajouté directement dans le composant `Wordmark`,
  donc visible automatiquement partout où le logo apparaît (app,
  pages publiques, écrans de connexion) sans risque d'oubli.

## Décision de conception : archiver plutôt que supprimer

ChatGPT proposait une vraie suppression définitive. Je m'en écarte
volontairement : le schéma interdit techniquement de supprimer un
salarié ayant des parcours associés (`onDelete: Restrict`, décision
prise dès la conception, pour ne jamais perdre d'historique par
accident) — le construire aurait demandé de démonter parcours, tâches
et notifications dans le bon ordre, juste avant une échéance serrée.
L'archivage en masse résout le même besoin pratique (recommencer
proprement) sans ce risque, et reste réversible.

## Vérifié réellement, ici

- Contrôle syntaxique (esbuild) des 65 fichiers : 100 % valides.
- Compilation Tailwind réelle.
- **Test réel des calculs de dates du nouveau scénario** : vérifié
  que Nicolas déclenche bien une suggestion (12 jours restants) et que
  les salariés "propres" n'en déclenchent aucune. Une vraie erreur a
  été trouvée et corrigée en cours de route : Karim, censé illustrer
  "période d'essai qui approche", ne la déclenchait pas (35 jours,
  au-dessus du seuil de 30) — sa date d'embauche a été ajustée.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- Archiver tous les salariés existants, régénérer la démo, vérifier
  que le tableau de bord raconte maintenant une histoire lisible
  plutôt qu'une liste de 17 alertes.
- Vérifier le badge "Bêta" sur la page d'accueil, l'écran de connexion,
  et dans l'application.
