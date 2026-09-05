# RH Pilot — Changelog Sprint 10

**Aucune nouvelle variable `.env`. Aucune migration nécessaire** (uniquement
du code, pas de changement de schéma).

## Contexte

Sprint mené sans revue croisée avec ChatGPT (abonnement expiré côté
fondateur) — décisions produit tranchées directement avec vous, avec
mon avis de CTO donné franchement plutôt qu'une simple exécution.

## Objectif du sprint

Amélioration visuelle ciblée plutôt que générale : après relecture,
l'application elle-même est déjà cohérente depuis le Sprint 2 (même
système de composants partout) — le vrai trou visuel identifié était
ailleurs.

## Nouveautés

- **Pages Clerk (connexion, inscription) habillées à la charte RH
  Pilot** : c'était le décrochage visuel le plus visible du produit —
  ces écrans gardaient l'apparence par défaut de Clerk, en rupture
  avec le reste du site juste après la page d'accueil. Couleurs,
  arrondis et police alignés sur les jetons de design existants.
- **Transition douce à l'ouverture de chaque page** du tableau de bord
  — la finition "animations discrètes" évoquée puis reportée au
  Sprint 6, livrée maintenant. Respecte la préférence système
  "mouvement réduit" (aucune animation si activée).
- **Clin d'œil fondateur** : l'exemple de salarié sur la page d'accueil
  publique est désormais Aimen El Housseini plutôt que Nora Bourouh.

## Décision de cadrage (mon avis de CTO, sans confrontation ChatGPT cette fois)

Je n'ai pas engagé de refonte visuelle générale — rien ne l'indiquait
nécessaire, et ça aurait risqué de tourner en rond sans cible précise.
Les états vides existants (Salariés, Parcours RH, Notifications) ont
été vérifiés et sont déjà corrects, pas de reprise nécessaire.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 50 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS, présence confirmée de la classe
  `page-fade-in` dans le CSS généré.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- **Test visuel** :
  1. Allez sur `/sign-in` et `/sign-up` — les boutons et couleurs
     doivent maintenant reprendre le dégradé bleu-violet de RH Pilot.
  2. Naviguez entre plusieurs pages du tableau de bord — chaque
     changement de page doit afficher une légère apparition en
     fondu, pas un affichage brutal.
  3. Sur la page d'accueil publique (déconnecté), vérifiez que la
     miniature affiche bien "Embauche — Aimen El Housseini".

## Proposition pour le Sprint 11 (à valider avec vous)

Les quatre sujets de préparation bêta évoqués (onboarding, mode
démonstration avec données fictives, états vides, indicateurs
d'usage) restent groupés dans un sprint dédié plutôt que mélangés à ce
sprint-ci — ce sont des systèmes distincts, pas de simples finitions :
- Le **mode démonstration** nécessite de concevoir un jeu de données
  fictives cohérent et un mécanisme pour l'activer/désactiver.
- L'**onboarding** nécessite de concevoir un vrai parcours de première
  connexion (pas juste un écran).
- Les **indicateurs d'usage** nécessitent de décider quoi mesurer et
  où l'afficher (nouvelle question produit, pas technique).

Je proposerai un découpage détaillé de ces trois sujets avant de
construire, comme d'habitude pour tout ce qui touche à une vraie
décision produit.

---

# Correctif : salariés archivés invisibles nulle part

Bug remonté par vous : depuis le Sprint 2, l'archivage d'un salarié le
retire bien des listes actives (rien n'est supprimé en base), mais
aucun écran ne permettait de le **voir** — la promesse "conservé pour
l'historique" était vraie en base de données, invisible dans
l'interface.

**Corrigé** : la page "Salariés" a maintenant deux onglets, Actifs et
Archivés. Depuis l'onglet Archivés, chaque salarié peut être
**réactivé** en un clic (nouvelle action `reactivateEmployee`) — sans
ça, un archivage aurait été définitif dans les faits, même si le
schéma ne le prévoyait pas ainsi.

**Non vérifié ici, à tester en local** : aller sur "Salariés", cliquer
sur l'onglet "Archivés", vérifier que "Test Sprint 6" y apparaît avec
sa date d'archivage, cliquer "Réactiver", vérifier son retour dans
l'onglet "Actifs".

---

# Refonte de l'écran de connexion (v3)

Sur votre demande : les pages Clerk recolorées au tour précédent
restaient un simple widget centré sur fond uni — pas au niveau des
standards actuels du SaaS B2B. Je m'inspire du motif "écran divisé"
qu'on retrouve largement dans le secteur aujourd'hui, sans copier un
concurrent en particulier, en gardant l'identité déjà construite.

## Ce qui change

- **`/sign-in` et `/sign-up`** utilisent désormais un écran divisé en
  deux : un panneau de marque sombre (dégradé de lueur bleu/violet,
  logo, promesse du produit, **la même miniature du produit que sur la
  page d'accueil** — cohérence visuelle plutôt qu'un nouvel élément à
  chaque écran) à gauche, le formulaire Clerk à droite.
- Le widget Clerk est "détouré" (`shadow-none border-none bg-transparent`)
  pour se fondre dans le panneau plutôt que ressembler à une carte
  flottante en double avec sa propre ombre — override appliqué
  uniquement sur `SignIn`/`SignUp`, pas sur l'apparence globale, pour
  ne pas abîmer le petit menu déroulant du profil (`UserButton`) qui,
  lui, a toujours besoin de son ombre pour se détacher visuellement.
- Sur mobile, le panneau de marque disparaît et seul le formulaire
  reste, avec le logo simple au-dessus — reste pleinement utilisable
  sur petit écran.

## Non vérifié ici, à tester en local

- Ouvrir `/sign-in` et `/sign-up` sur grand écran : le panneau de
  marque à gauche doit afficher la même miniature que la page
  d'accueil, avec un fond sombre et des lueurs de couleur.
- Réduire la fenêtre du navigateur (ou tester sur mobile) : le panneau
  doit disparaître, seul le formulaire doit rester, centré.
- Vérifier que la petite fenêtre du profil (clic sur l'avatar en haut
  à droite du tableau de bord) garde bien son ombre et son cadre —
  pour confirmer que l'ajustement n'a touché que les pages de
  connexion/inscription.

---

# Révision suite à vos retours (v4)

**Aucune nouvelle variable `.env`, aucune migration.**

## Formulaire moins resserré

J'avais supprimé tout le padding interne du widget Clerk en même temps
que son ombre — inutile, corrigé. Le conteneur est aussi passé de
`max-w-sm` à `max-w-md` pour respirer davantage.

## Deux miniatures différentes plutôt qu'une seule répétée

- **Connexion** : nouvelle miniature "Votre attention est requise"
  (`AttentionPreview`), cohérente avec le message "Bon retour."
- **Inscription** : garde la miniature "plan d'action" déjà utilisée
  sur la page d'accueil — cohérente avec la promesse faite à un
  nouveau visiteur.

Aucun témoignage client fabriqué : les deux miniatures montrent de
vraies facettes du produit (mêmes composants, mêmes icônes que
l'application réelle), pas une mise en scène inventée.

## Non vérifié ici, à tester en local

- `/sign-in` et `/sign-up` doivent maintenant afficher deux
  illustrations différentes.
- Le formulaire doit sembler moins compressé qu'avant.
