# RH Pilot — Changelog Sprint 7

**Aucune nouvelle variable `.env`. Aucune migration nécessaire** (uniquement
du code, pas de changement de schéma).

## Objectif du sprint

Bascule stratégique actée avec vous et ChatGPT : après six sprints
centrés sur le moteur, ce sprint travaille la valeur perçue —
essentielle à l'approche de la bêta (Sprint 10-11).

## Nouveautés fonctionnelles

- **Page d'accueil publique** (`/`, visible avant connexion) : Hero
  avec la promesse centrale ("Votre équipe RH n'oublie plus rien"),
  miniature illustrative du produit construite avec les vrais
  composants de l'application (pas une image générique), mécanisme en
  3 étapes, bénéfices, appel à l'action. Un visiteur connecté est
  toujours redirigé directement vers son tableau de bord — cette page
  n'existe que pour les visiteurs non connectés.
- **Deux détecteurs d'anomalies supplémentaires** :
  - Salarié sans manager direct renseigné.
  - Salarié sans type de contrat ou durée de période d'essai —
    explique directement pourquoi la suggestion de fin de période
    d'essai ne peut pas se calculer pour cette personne.
- **Centre d'aide** (`/dashboard/help`), organisé par catégorie
  (Salariés, Parcours RH, Notifications), répondant aux questions
  listées par vous.

## Décision produit actée avec vous

Pas de bouton "Assistant RH Pilot" dans la navigation pour l'instant —
un bouton visible qui n'ouvre rien de fonctionnel abîme justement la
première impression que ce sprint cherche à soigner. La vraie
préparation d'architecture est ailleurs : le contenu de la FAQ est
structuré (catégorie/question/réponse, `src/lib/faq.ts`) pour pouvoir
nourrir un futur assistant IA sans rien reconstruire le jour venu.

## Nouveautés techniques

- `src/lib/anomalies.ts` : le type `Anomaly` accepte désormais un
  `link` en plus du déclenchement d'événement — pour les anomalies qui
  se résolvent en complétant une information plutôt qu'en générant un
  parcours. Le registre compte maintenant 4 détecteurs.
- Palette et composants de la page d'accueil entièrement réutilisés
  depuis l'application (`Card`, `Badge`, `ProgressBar`, `Logomark`,
  `Wordmark`) — aucune nouvelle charte graphique parallèle.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 48 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- **Test fonctionnel** :
  1. Déconnectez-vous, allez sur `http://localhost:3000` — vous devez
     voir la nouvelle page d'accueil, pas directement l'écran de
     connexion.
  2. Reconnectez-vous, vérifiez que `/` vous redirige bien
     immédiatement vers le tableau de bord.
  3. Sur un salarié sans manager ou sans type de contrat renseigné,
     vérifiez qu'une suggestion apparaît avec un bouton menant
     directement à sa fiche.
  4. Ouvrez "Aide" dans le menu, vérifiez l'affichage de la FAQ.

## Prochain sprint

Sprint 8 — Conception des nouveaux parcours RH (visites médicales,
CNI, paie...) à partir de vos retours terrain, avec le même travail de
cadrage rigoureux qu'Embauche et Fin de période d'essai à l'origine.
