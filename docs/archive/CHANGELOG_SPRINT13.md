# RH Pilot — Changelog Sprint 13 (partie 1 : identité de marque)

**Aucune nouvelle variable `.env`. Aucune migration nécessaire** (uniquement
du contenu et des pages publiques, pas de changement de schéma).

## Objectif

Avant le déploiement technique, clarifier pourquoi RH Pilot existe —
travail mené sur plusieurs échanges avec vous et ChatGPT, consolidé ici.

## Nouveautés

- **Nouvelle page publique `/pourquoi`** : le constat, la philosophie du
  produit (illustrée par des décisions déjà réellement construites,
  pas des promesses), le positionnement ("ce que RH Pilot n'est pas"),
  et l'origine du projet — accessible sans connexion, lien visible dans
  l'en-tête de toutes les pages publiques.
- **Nouvelle accroche de la page d'accueil** : "Les équipes RH ne
  manquent pas de rigueur. Elles manquent de visibilité." — recentrée
  sur le problème plutôt que sur la fonctionnalité, sans jamais
  culpabiliser le métier RH.
- **En-tête et pied de page mutualisés** (`MarketingHeader`,
  `MarketingFooter`) entre la page d'accueil et la nouvelle page —
  cohérence garantie par construction, pas par vigilance manuelle.
- **Nouvelle entrée FAQ** ("Pourquoi utiliser RH Pilot si je suis déjà
  rigoureux ?"), catégorie "Philosophie" — accessible aussi depuis
  l'Assistant RH Pilot.

## Correction apportée à la proposition de ChatGPT

Le paragraphe "preuve terrain" listait initialement les échéances de
paie parmi les besoins ayant "guidé les fonctionnalités du produit" —
or ce parcours n'a jamais été construit, seulement identifié comme
besoin futur. Corrigé pour ne citer que ce qui est réellement livré
(visite médicale, période d'essai, clarté des responsabilités), et
pour mentionner honnêtement la paie comme une prochaine étape plutôt
que comme un acquis. Cohérent avec le sujet même de cette page :
montrer un problème plutôt que de le cacher, y compris dans son
propre texte marketing.

## Décision de scope : pas de "fil rouge" dans l'Assistant

Le langage de marque n'a volontairement pas été ajouté à l'Assistant
RH Pilot ni aux emails de notification — ce sont des outils
fonctionnels, pas des espaces éditoriaux ; y ajouter du texte de
positionnement risquerait de nuire à leur utilité pour un gain
esthétique marginal.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 59 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS.
- Vérification que `/pourquoi` a bien été ajoutée aux routes publiques
  du middleware (sinon la page exigerait une connexion, à l'inverse du
  but recherché).

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- Ouvrir `/pourquoi` **déconnecté** — doit s'afficher sans redirection
  vers la connexion.
- Vérifier le lien "Pourquoi RH Pilot ?" dans l'en-tête et le pied de
  page de la page d'accueil.
- Vérifier la nouvelle accroche de la page d'accueil.
- Ouvrir l'Assistant, chercher "rigoureux", vérifier que la nouvelle
  entrée FAQ apparaît.

## Prochaine étape

Partie 2 du Sprint 13 : déploiement technique (Vercel, domaine, emails
professionnels, base de production) + gestion des erreurs + guide de
découverte en trois étapes, comme convenu avec vous et ChatGPT.

---

# Révision suite au retour croisé avec ChatGPT (v2)

**Toujours aucune migration, aucune nouvelle variable `.env`.**

## Accroche revue — plus courte, sans créer d'objection

"Les équipes RH ne manquent pas de rigueur" risquait de faire penser
"qui a dit ça ?" — un déclencheur d'objection involontaire. Remplacée
par la phrase de ChatGPT, plus humble et qui n'accuse personne :
**"La mémoire ne devrait jamais être le principal outil d'une équipe
RH."** — avec un sous-titre de trois lignes maximum, plus le long
paragraphe démonstratif d'avant.

## Page "Pourquoi RH Pilot" entièrement reconstruite

Passée d'un article à lire à une page en blocs visuels à faire
défiler, dans l'esprit demandé (Notion, Stripe, PayFit) :

1. Titre + accroche courte.
2. Le problème, en citations courtes plutôt qu'en paragraphes.
3. **Avant / Après**, avec deux miniatures construites avec les vrais
   composants de l'app — le chaos dispersé (email/Excel/post-it) à
   gauche, la carte "Votre attention est requise" à droite.
4. Les quatre principes, désormais avec une icône chacun.
5. "Pas un SIRH", en deux colonnes comparatives plutôt qu'un
   paragraphe.
6. Un bloc plus sensible, sur fond sombre, sur ce qu'un oubli coûte
   réellement.
7. **"Ce que le terrain nous a montré"**, transformé en liste
   visuelle avec un badge "Déjà construit" ou "Prochaine étape" par
   ligne — la correction d'honnêteté du tour précédent (ne pas
   surpromettre sur la paie) devient ici un vrai élément de design,
   pas juste une phrase de prudence noyée dans du texte.
8. Origine du projet, condensée.
9. Appel à l'action.

## Vérifié réellement, ici

- Contrôle syntaxique (esbuild) des 60 fichiers : 100 % valides.
- Compilation Tailwind réelle.
- Icônes `lucide-react` (`Mail`, `FileSpreadsheet`, `StickyNote`,
  `ArrowRight`, `Info`) confirmées existantes.

## Non vérifié ici, à tester en local

- Faire défiler `/pourquoi` en entier, vérifier que l'enchaînement des
  blocs donne envie de continuer plutôt que de lire un article.
- Vérifier la nouvelle accroche de la page d'accueil.
- Sur mobile, vérifier que le bloc Avant/Après reste lisible (les deux
  miniatures s'empilent verticalement).
