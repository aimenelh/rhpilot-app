# RH Pilot — Changelog Sprint 9

**Aucune nouvelle variable `.env`. Aucune migration nécessaire** (uniquement
du code, pas de changement de schéma).

## Objectif du sprint

La première pierre de l'Assistant RH Pilot : une interface permanente,
conçue pour rester identique le jour où un vrai LLM remplacera le
moteur de recherche derrière — pas une "recherche" déguisée, un vrai
composant produit avec sa propre identité.

## Nouveautés fonctionnelles

- **Assistant RH Pilot** : bouton flottant permanent, visible sur tout
  le tableau de bord. Ouvre un panneau avec accueil, recherche, et
  suggestions.
- **Suggestions contextuelles** : sans rien taper, l'assistant propose
  déjà les questions les plus pertinentes selon l'écran où vous êtes
  (fiche salarié, parcours, notifications, paramètres).
- **Recherche élargie au-delà de la FAQ** : une vraie base de
  connaissances à deux types de contenu — questions/réponses et
  "actions rapides" (raccourcis directs). Chercher "embauche" propose
  à la fois l'explication et le raccourci "Ajouter un salarié".
- **FAQ enrichie** : nouvelle entrée sur le fonctionnement du parcours
  Visite médicale, et chaque question a désormais une ancre stable
  (lien direct depuis l'assistant vers la bonne réponse sur la page
  Aide).

## Finitions demandées, livrées dans ce sprint

- Couleur de "Visite médicale" fixée explicitement (bleu), au même
  titre qu'Embauche (vert/sarcelle) et Fin de période d'essai (orange).
- "Prochaine visite médicale" mise en valeur sur la fiche salarié —
  bloc dédié "Suivi médical", coloré rouge si la date est dépassée.

## Nouveautés techniques

- `src/lib/knowledgeBase.ts` : la base de connaissances générique.
  Structure pensée pour accueillir un troisième type de contenu
  (documentation de parcours, tutoriels...) sans rien changer à la
  façon dont l'assistant cherche ou affiche les résultats — et pour
  que, le jour de l'IA générative, seule la fonction `searchKnowledgeBase`
  soit remplacée par un vrai appel, l'interface restant identique.
- Recherche par mots-clés simple (pas de LLM) — testée réellement, pas
  seulement relue (voir vérifications ci-dessous).

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 50 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS.
- Icônes `lucide-react` confirmées existantes.
- **Test fonctionnel réel de la recherche**, exécuté directement (pas
  une simple relecture) : la recherche "embauche" renvoie bien la FAQ
  correspondante ET l'action rapide "Ajouter un salarié" ; les
  suggestions contextuelles sur une fiche salarié renvoient les bonnes
  entrées ; une recherche vide ou sans résultat renvoie proprement 0
  résultat sans erreur.

## Non vérifié ici, à faire en local

- `npx tsc --noEmit`, `npm run build`
- **Test dans le navigateur** : ouvrir l'assistant depuis plusieurs
  écrans différents, vérifier que les suggestions changent bien selon
  la page, taper une recherche, cliquer un résultat et vérifier
  l'arrivée au bon endroit (y compris l'ancre sur la page Aide).

## Prochain sprint

À déterminer avec vous et ChatGPT.

---

# Révision suite à vos retours (v2)

**Aucune nouvelle variable `.env`, aucune migration.**

## Architecture : moteur réellement prêt pour un LLM, pas juste en théorie

Le moteur de recherche est maintenant appelé de façon **asynchrone**
(`AssistantEngine`, `src/lib/knowledgeBase.ts`), avec anti-rebond et
état de chargement dans le composant — exactement le schéma qu'aura un
vrai appel réseau à un LLM plus tard. Remplacer `localKeywordSearch`
par un appel à OpenAI (ou autre) ne demandera aucune modification du
composant `Assistant.tsx` : seule l'implémentation change, l'interface
(y compris l'indicateur de chargement) est déjà prête à l'accueillir.

## Finitions UX demandées

- Message d'accueil personnalisé et plus explicite.
- **Exemples de questions** cliquables directement sous le champ de
  recherche (les remplir lance la recherche correspondante).
- Suggestions contextuelles conservées, inchangées.

## Vérifié réellement, ici

- Contrôle syntaxique (esbuild), icône `Loader2` confirmée existante.
- **Test réel du moteur asynchrone**, exécuté directement : confirmé
  que `localKeywordSearch` retourne bien une vraie `Promise` résolue
  avec les bons résultats, pas seulement relu.

## Non vérifié ici, à tester en local

- Ouvrir l'assistant, vérifier l'indicateur de chargement (bref, mais
  visible) pendant la recherche.
- Cliquer un exemple de question sous le champ de recherche, vérifier
  qu'il lance bien la recherche correspondante.

---

# Correctif : salariés archivés visibles sur le tableau de bord

Bug remonté par vous : un salarié archivé continuait d'apparaître dans
"Votre attention est requise" et dans "Parcours RH actifs", avec un
lien menant vers une page 404 (sa fiche n'existe plus dans les listes
actives). C'était un oubli du Sprint 2 : l'archivage retirait bien le
salarié de la liste des salariés, mais pas ses tâches et parcours des
autres écrans qui les affichent indépendamment.

**Corrigé** : le tableau de bord (attention requise, compteurs
événements/terminées) et la liste "Parcours RH actifs" excluent
désormais systématiquement les salariés archivés. La vue détaillée
d'un parcours reste volontairement accessible par lien direct même
après archivage — cohérent avec "conservé pour l'historique, jamais
supprimé".

**Non vérifié ici, à tester en local** : réarchiver "Test Sprint 6" (ou
retester avec l'archivage déjà fait), vérifier qu'il n'apparaît plus
nulle part sur le tableau de bord ni dans "Parcours RH actifs".
