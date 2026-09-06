# Design system RH Pilot

Référence pour toute nouvelle interface — les écrans existants seront
progressivement harmonisés dessus, écran par écran (voir la feuille de
route Phase 3.5). Ce document ne redéfinit pas l'identité RH Pilot, il
la formalise à partir de ce qui existe déjà et fonctionne.

## Principes

- Sobre, beaucoup d'espace blanc, jamais de dégradé décoratif, jamais
  de glassmorphism, jamais d'icône dans un cercle coloré par défaut.
- Une seule couleur d'accent (le corail) — jamais une palette
  multicolore façon tableau de bord générique.
- La mascotte et les illustrations apparaissent quand l'interface a
  besoin d'un peu d'humanité (état vide, chargement long, succès
  important) — jamais en décoration systématique.

## Langage produit

Le design system RH Pilot ne couvre pas que le visuel. Un nettoyage
visuel parfait avec des textes "SaaS générique" en dessous ne change
rien à l'impression d'ensemble — c'est même souvent ce qui se voit en
premier. Cette section s'applique partout : titres, boutons, messages
d'erreur, états vides, notifications, Copilote, confirmations,
onboarding.

**Principe central : l'IA est une fonctionnalité de RH Pilot, pas son
identité.** Le cœur visuel et verbal du produit reste le domaine RH
(salariés, événements, parcours, tâches, échéances) — le Copilote
intervient comme une capacité parmi d'autres, jamais comme la vitrine
du produit. Concrètement : pas de badge "IA", pas d'étoile scintillante
pour signaler artificiellement qu'une fonctionnalité est intelligente.
Quand l'IA fait réellement quelque chose (ex. "Résumer mon mois", qui
appelle un vrai LLM), un marqueur discret et non généralisé reste
honnête — la limite est l'usage décoratif répété, pas l'IA elle-même.

**Concret plutôt qu'abstrait.** Une phrase qui pourrait être copiée
telle quelle sur n'importe quel autre SaaS RH est probablement à
revoir, même si elle ne contient aucun mot suspect ("IA",
"intelligent", "nouvelle génération"). Le test : est-ce que cette
phrase dit quelque chose de vrai sur ce que fait *concrètement* RH
Pilot, ou est-ce qu'elle pourrait appartenir à n'importe quel produit ?

**Vocabulaire et structures à éviter :**
- Adjectifs creux utilisés comme remplissage : "intelligent(e)",
  "puissant", "magique", "innovant".
- Formules de réassurance génériques : "sans engagement", "en
  quelques minutes", "simplifiez votre quotidien", "gagnez du temps
  grâce à".
- CTA promotionnels plutôt que factuels : "Découvrez...", "Donnez vie
  à...", "Passez à la vitesse supérieure" — préférer un verbe d'action
  concret ("Ajouter un salarié", pas "Donnez vie à vos processus RH").
- Étiquette de section (eyebrow) + titre vague côte à côte, sans
  qu'aucun des deux ne dise rien de spécifique à RH Pilot (ex. "Ce qui
  change vraiment" / "Pourquoi les RH choisissent RH Pilot" — corrigé
  en "Comment RH Pilot se comporte au quotidien", sans étiquette).
  Une étiquette n'est légitime que si elle nomme vraiment le contenu
  qui suit (ex. "Les fondamentaux", "Notre infrastructure" sur la page
  Sécurité — conservées, elles sont informatives).
- Numérotation décorative ("01", "02", "03") qui n'ajoute aucune
  information au-delà de l'esthétique éditoriale.

**Exemples corrigés pendant l'audit, comme référence :**

| Générique | RH Pilot |
|---|---|
| "Créez votre espace en quelques minutes, sans engagement." | "Ajoutez votre premier salarié et commencez à suivre vos échéances RH." |
| "Votre espace RH Pilot est prêt à vous accompagner. Commencez par..." | "Ajoutez votre premier salarié pour commencer à suivre ses échéances RH." |
| ✨ "Copilote IA" | "Copilote" / "Que souhaitez-vous faire ?" |
| ✨ "Notifications intelligentes" | "Vos notifications" / "Les informations qui nécessitent votre attention." |
| "RH Pilot vous conseille" | "À faire ensuite" |

**Ce qu'on ne fait pas non plus :** supprimer une animation, une
illustration ou toute référence à l'IA uniquement parce qu'elle
*pourrait* évoquer un SaaS générique. La mascotte, les animations de
chargement et le Copilote lui-même restent — c'est la manière de les
présenter (décoration systématique vs. apparition qui a un rôle) qui
fait la différence.

## Couleurs (`tailwind.config.ts`)

| Rôle | Token | Valeur |
|---|---|---|
| Texte principal | `ink` | `#14151A` |
| Texte secondaire | `ink-soft` | `#4A4A4D` |
| Texte discret | `ink-faint` | `#8C8C90` |
| Fond de page | `surface-subtle` | `#F7F8FA` |
| Fond de carte/contrôle | `surface` (DEFAULT) | `#FFFFFF` |
| Bordure | `surface-border` | `#E4E7EE` |
| Accent principal | `brand-primary` | `#E8432E` |
| Accent principal, variante sombre | `brand-primary-dark` | `#B8321F` |
| Succès | `accent-teal` | `#14B8A6` |
| Avertissement | `accent-amber` | `#D97706` |
| Critique/erreur | `accent-rose` | `#E11D48` |

Pas de token dédié "info" séparé — `brand-primary` à faible opacité
(`/10`) sert déjà cet usage (voir `Badge` tone `brand`).

## Typographie

- **Titres** (`h1`, `h2`, `h3` HTML) : Space Grotesk, réglé une seule
  fois dans `globals.css`, jamais à répéter par page.
- **Corps de texte** : Inter (police système par défaut).
- Hiérarchie à respecter pour tout nouvel écran :

| Niveau | Usage | Classes |
|---|---|---|
| H1 | Titre de page | `text-2xl font-semibold text-ink` |
| H2 | Titre de section | `text-base font-semibold text-ink` |
| H3 | Sous-section / titre de carte | `text-sm font-semibold text-ink` |
| Étiquette de section (eyebrow) | Au-dessus d'un titre, jamais à sa place | `text-xs font-semibold uppercase tracking-wide text-ink-faint` |

**Dérive constatée à corriger progressivement, pas maintenant** :
`CreateOrganizationForm.tsx` utilise `text-lg` pour son H1 (à
harmoniser sur `text-2xl` ou à confirmer comme exception volontaire
vu son contexte de carte centrée) ; plusieurs H2 dans le dashboard
utilisent encore `text-sm` là où `text-base` est la référence.

## Rayons

Deux paliers, selon la taille de l'élément — pas un choix arbitraire
par composant :

| Rôle | Classe | Valeur |
|---|---|---|
| Conteneurs (Card, dialogue, état vide, panneaux flottants) | `rounded-xl` | `0.875rem` |
| Contrôles interactifs (bouton, champ, toast) | `rounded-lg` | `0.5rem` (défaut Tailwind) |
| Pastilles (badge, barre de progression) | `rounded-full` | — |

## Ombres (`tailwind.config.ts`)

Deux paliers nommés, plus l'absence d'ombre — jamais les paliers
génériques `shadow-md/lg/xl/2xl` de Tailwind dans l'application
elle-même (ils restent acceptables sur les pages marketing/landing,
qui suivent des règles différentes et ne sont pas couvertes par ce
document) :

| Palier | Token | Usage |
|---|---|---|
| Aucune | — | Éléments à plat dans le flux normal |
| Repos | `shadow-card` | Card, toast, éléments non superposés |
| Élevé | `shadow-elevated` | Tout ce qui flotte au-dessus du contenu : Copilote, Assistant, visite guidée, invite d'installation, toasts d'actualité, modales |

`shadow-elevated` vient d'être introduite (remplace un mélange de
`shadow-lg`/`shadow-xl`/`shadow-2xl` selon les fichiers pour ce même
rôle) et appliquée à : `Assistant.tsx`, `AppCopilote.tsx`,
`TourGuide.tsx`, `OnboardingGuide.tsx`, `IosInstallHint.tsx`,
`RhNewsToast.tsx`, `ConfirmDialog.tsx`.

## États interactifs

- **Focus** : `:focus-visible` géré une seule fois globalement
  (`globals.css`), anneau corail — ne jamais le supprimer ni le
  redéfinir localement.
- **Hover** : assombrissement léger ou `bg-surface-subtle` pour les
  éléments neutres ; jamais de changement de couleur brutal.
- **Disabled** : `opacity-50` + `cursor-not-allowed`, cohérent sur
  tous les variants de `Button`.
- **Active** (clic) : `active:scale-[0.97]` sur les boutons — un
  retour tactile discret, pas un changement de couleur.
- **Reduced motion** : chaque animation CSS personnalisée a sa
  contrepartie `@media (prefers-reduced-motion: reduce)`. Point
  ouvert à vérifier : `welcome-pulse-dot` (page de bienvenue) est
  combiné à la classe utilitaire `animate-ping` de Tailwind, non
  couverte par la règle `prefers-reduced-motion` existante — un
  utilisateur ayant activé la réduction de mouvement voit quand même
  cette pulsation. Non corrigé volontairement à cette étape (touche à
  un écran, pas seulement à l'infrastructure) — à traiter lors du
  Sprint 5 (accessibilité).

## Composants partagés (`src/components/ui/`)

`Badge`, `Button` (variants : primary/secondary/ghost/danger), `Card`
(props `compact`, `interactive`), `ConfirmDialog`, `EmptyState`,
`Field` (`Label`/`Input`/`Select`/`FieldHint`), `FlashToast`,
`ProgressBar`.

Pas encore de composant partagé pour : tableau, menu déroulant,
onglets. Chaque écran qui en a besoin aujourd'hui construit sa propre
version — à surveiller lors des passes écran par écran : si le même
motif revient sur plusieurs pages, il devient un composant partagé
plutôt que d'être dupliqué une troisième fois.
