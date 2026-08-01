# RH Pilot — Changelog Sprint 8

**Changement de schéma ce sprint — migration nécessaire** (voir procédure
ci-dessous). Aucune nouvelle variable `.env`.

## Objectif du sprint

Le premier grand parcours métier issu des retours terrain : **Visite
médicale**, conçu avec la même rigueur qu'Embauche et Fin de période
d'essai — tableau métier validé avant tout code.

## Nouveautés fonctionnelles

- **Parcours "Visite médicale"**, déclenchable à tout moment sur
  n'importe quel salarié (pas seulement à l'embauche) : identifier le
  type de suivi requis, prendre rendez-vous, informer le salarié,
  confirmer la réalisation, mettre à jour la fiche avec la prochaine
  échéance. Cinq tâches, toutes `ORGANIZATIONAL_DEFAULT` — aucun calcul
  de périodicité légale, cohérent avec les deux premiers parcours.
- **`Employee.nextMedicalVisitDate`** : nouveau champ sur la fiche
  salarié, dans la continuité de `contractType`/`probationDurationMonths`
  — la fiche salarié comme source de vérité que les parcours viennent
  enrichir, les détecteurs viennent lire.
- **Deux nouveaux détecteurs**, rendus possibles par ce champ :
  - Aucune visite médicale jamais programmée pour un salarié embauché
    depuis plus d'un an.
  - Prochaine visite médicale déjà renseignée mais dépassée.

## Décision de conception actée avec vous

Les deux tâches de visite médicale déjà présentes dans le parcours
Embauche (`embauche_visite_medicale_demande`/`suivi`) restent
inchangées — elles répondent à un besoin différent (l'intégration),
pas remplacées par ce nouveau parcours indépendant (le suivi de
carrière).

## Nouveautés techniques

- `src/lib/anomalies.ts` : le registre compte désormais 6 détecteurs.
- Aucun changement au moteur de génération de plan d'action
  (`eventEngine.ts`) — le nouveau parcours fonctionne avec le mécanisme
  gabarit → instance déjà en place, confirmant que l'architecture tient
  la charge d'un nouveau cas métier sans modification.

## Vérifié réellement, ici (sandbox sans accès à binaries.prisma.sh)

- Contrôle syntaxique (esbuild) des 49 fichiers `.ts`/`.tsx`, y compris
  `prisma/seed.ts` : 100 % valides.
- Compilation réelle de Tailwind CSS.
- Vérification structurelle du schéma (accolades équilibrées, 11
  modèles présents).

## Non vérifié ici, à faire en local

- `npx prisma generate`, `npx prisma migrate dev --name add_medical_visit_tracking`
- `npx prisma db seed` (pour charger le nouveau parcours en base)
- `npx tsc --noEmit`, `npm run build`
- **Test fonctionnel** :
  1. Sur un salarié, déclenchez un événement "Visite médicale" —
     vérifiez les 5 tâches générées avec leurs échéances.
  2. Sur sa fiche, renseignez "Prochaine visite médicale" avec une date
     passée, enregistrez — la suggestion "dépassée" doit apparaître sur
     le tableau de bord.
  3. Sur un salarié embauché il y a plus d'un an sans visite jamais
     programmée, vérifiez que l'autre suggestion apparaît.

## Procédure de migration pour ce sprint

Comme toujours, copiez le dossier `prisma/migrations` de votre ancien
projet vers le nouveau **avant** de lancer la migration.

```
npx prisma generate
npx prisma migrate dev --name add_medical_visit_tracking
npx prisma db seed
```

## Prochain sprint

À déterminer avec vous et ChatGPT — un nouveau parcours (documents
expirants, paie...), ou une passe sur les détails UX identifiés
(animations, transitions, états vides).
