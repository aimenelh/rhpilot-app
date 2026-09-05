# RH Pilot — Changelog Sprint 6

**Aucune nouvelle variable `.env`. Aucune migration nécessaire** (uniquement
du code, pas de changement de schéma).

## Objectif du sprint

Le tournant identifié avec vous et ChatGPT : après cinq sprints à
construire le moteur, celui-ci commence à construire l'intelligence.
RH Pilot ne se contente plus de calculer et d'afficher — il détecte des
situations qui méritent une décision, et propose l'action en un clic.

## Nouveautés fonctionnelles

- **Section "Suggestions"** en tête du tableau de bord (au-dessus de
  "Votre attention est requise" — les suggestions appellent une
  décision, les tâches une exécution, ce sont deux catégories
  distinctes).
- **Deux détecteurs construits** :
  - Un salarié dont la fin de période d'essai calculée approche (30
    jours) ou est dépassée, sans qu'aucun événement correspondant
    n'ait été déclenché.
  - Un salarié embauché depuis plus de 7 jours sans qu'aucun événement
    "Embauche" n'ait jamais été déclenché.
- **Action en un clic** : chaque suggestion propose directement
  "Générer le parcours" — la date et le type d'événement sont déjà
  calculés par le détecteur, aucun formulaire à remplir.
- **Résumé chiffré en tête des emails** (retour du Sprint 5 v2) : 🔴
  en retard / 🟠 aujourd'hui / cercle gris cette semaine, avant la
  liste détaillée par section.

## Décision d'architecture : bibliothèque d'anomalies extensible

Conformément à la demande explicite de ne pas empiler des règles
codées en dur sprint après sprint : `src/lib/anomalies.ts` définit un
**registre** de détecteurs. Chaque règle future ("salarié sans
manager", "visite médicale jamais programmée", "CDD arrivant à
échéance"...) s'ajoutera comme une nouvelle fonction dans ce registre,
sans toucher à la façon dont les suggestions sont affichées ou
déclenchées sur le tableau de bord — exactement la mécanique que vous
décriviez.

## Décision produit actée avec vous

Les nouveaux parcours RH issus des retours terrain (visite médicale,
échéances de paie, expiration CNI, suivi post-recrutement) restent
reportés à un sprint dédié, avec le même travail de conception
rigoureux que pour Embauche et Fin de période d'essai — tableaux
métier, classification `deadlineType`, validation avant le code.
Prioriser ces retours reste bien noté pour la suite.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 44 fichiers `.ts`/`.tsx` : 100 %
  valides.
- Compilation réelle de Tailwind CSS.
- Icône `lucide-react` (`Sparkles`) confirmée existante dans le paquet
  installé.

## Non vérifié ici, à tester en local

- `npx tsc --noEmit`, `npm run build`
- **Test fonctionnel** :
  1. Sur un salarié ayant un type de contrat et une durée de période
     d'essai renseignés (Nora, par exemple), vérifiez la date de fin
     calculée dans Prisma Studio.
  2. Si cette date est à moins de 30 jours (ou déjà passée) et
     qu'aucun événement "Fin de période d'essai" n'existe pour ce
     salarié, la suggestion doit apparaître sur le tableau de bord.
  3. Cliquez sur "Générer le parcours" — vérifiez que le plan d'action
     se crée directement, sans passer par la fiche du salarié.
  4. Pour tester la seconde suggestion : créez un nouveau salarié avec
     une date d'embauche il y a plus de 7 jours, ne déclenchez aucun
     événement — la suggestion "sans parcours d'embauche" doit
     apparaître.

## Prochain sprint

Sprint 7 — Pièces justificatives (le modèle `Attachment` existe dans
le schéma depuis la conception initiale, jamais encore utilisé dans
l'interface), ou sprint dédié à la conception des nouveaux parcours RH
issus des retours terrain — à trancher ensemble selon votre priorité.

---

# Révision suite aux retours de test (avec ChatGPT)

**Aucune nouvelle variable `.env`. Aucune migration nécessaire.**

## Correctif : suggestions déjà traitées pouvant sembler persister

Le détecteur excluait déjà correctement un salarié dès qu'un événement
existait pour lui — la logique de détection n'était pas en cause. Le
symptôme observé s'explique plutôt par la mise en cache navigateur de
Next.js (une page déjà visitée peut être resservie telle quelle
pendant ~30 secondes lors d'une navigation). Le tableau de bord, la
liste des parcours, la vue détaillée d'un parcours et la fiche salarié
sont désormais marqués pour ne jamais être mis en cache — toujours des
données fraîches, à chaque visite.
