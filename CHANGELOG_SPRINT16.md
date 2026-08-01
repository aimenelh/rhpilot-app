# RH Pilot — Changelog Sprint 16

**Aucune migration, aucune nouvelle variable `.env`.**

## Objectif du sprint

Corriger un second bug de réalisme trouvé en test (des salariés de
900 jours signalés "sans parcours d'embauche"), et répondre
concrètement à la question du classement par priorité.

## Ce qui a été corrigé

- **Bug de réalisme** : seul Antoine avait un vrai parcours Embauche
  déclenché dans la démo — tous les autres salariés, y compris ceux
  embauchés il y a des années, semblaient n'avoir jamais été
  onboardés. Corrigé : chaque salarié (sauf Julien, qui illustre
  volontairement cet oubli) reçoit désormais un parcours Embauche
  historique déjà entièrement terminé.
- **Classement à trois niveaux réels** (critique / moyen / faible),
  remplaçant les deux niveaux précédents — chaque détecteur a été
  réévalué : une échéance dépassée est critique, une échéance qui
  approche est moyenne, une donnée à compléter sans urgence est
  faible.
- **Affichage revu en conséquence** : critique et moyen restent
  toujours visibles sans clic (ce sont ceux qui comptent) ; seul le
  niveau faible est replié sous "Afficher N suggestions secondaires".
  Un repère de couleur (rouge/orange/gris) précède chaque suggestion.

## Ma réponse à votre question sur le classement

Plutôt qu'un plafond arbitraire (afficher les 6 premières, peu importe
leur nature), le critère est maintenant la vraie urgence : rien de
critique ou moyen n'est jamais caché, seul le "faible" (données à
compléter, jamais un oubli qui coûte quelque chose) demande un clic
pour être vu. C'est cohérent avec la promesse du tableau de bord : "ce
qui mérite votre attention, avant le reste."

## Reporté, comme convenu

Le choix de scénario d'entreprise à la génération (PME 15/40 salariés,
cabinet RH, startup...) reste noté pour plus tard — une vraie
fonctionnalité à part entière, pas une correction à faire dans
l'urgence avant le déploiement.

## Vérifié réellement, ici

- Contrôle syntaxique (esbuild) des 65 fichiers : 100 % valides.
- Compilation Tailwind réelle.
- **Test réel de la logique de tri et de regroupement** par sévérité :
  confirmé que le tri place bien critique puis moyen puis faible, et
  que la séparation visible/repliée correspond exactement à ce qui est
  attendu.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- Archiver tous les salariés, régénérer la démo, vérifier qu'aucun
  salarié ancien n'est plus signalé "sans parcours d'embauche".
- Vérifier que le tableau de bord distingue bien visuellement critique
  (rouge), moyen (orange) et faible (gris, replié).
