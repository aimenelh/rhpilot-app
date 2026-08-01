# RH Pilot — Sprint 1

Environnement de développement, authentification (Clerk), organisations,
dashboard minimal.

## Ce qui a été vérifié côté Claude (sandbox sans accès à binaries.prisma.sh)

- `npm install` : réussi, 0 vulnérabilité connue après correction de la
  version de Next.js (14.2.35).
- Contrôle syntaxique (esbuild) de tous les fichiers `.ts`/`.tsx` écrits :
  100 % valides.

## Ce qui N'A PAS pu être vérifié ici, à faire en local

1. **Génération du client Prisma et validation du schéma**
   ```bash
   npx prisma validate
   npx prisma format
   npx prisma generate
   ```
2. **Migration + seed** (nécessite une vraie base Postgres, ex. Neon région EU)
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
3. **Compilation TypeScript complète** (dépend du client généré à l'étape 1)
   ```bash
   npx tsc --noEmit
   ```
4. **Build Next.js**
   ```bash
   npm run build
   ```
5. **Test fonctionnel réel** avec de vraies clés Clerk (voir `.env.example`) :
   - créer un compte via `/sign-up`,
   - configurer le webhook Clerk (`user.created`, `user.updated`, `user.deleted`)
     pointant vers `/api/webhooks/clerk` avec le secret de signature dans
     `CLERK_WEBHOOK_SIGNING_SECRET`,
   - vérifier qu'un `User` apparaît en base après inscription,
   - se connecter, créer une organisation depuis `/dashboard`,
   - vérifier qu'`Organization` + `Membership` (accessRole OWNER) sont créés.

## Configuration Clerk requise avant de tester

- Créer une application sur [dashboard.clerk.com](https://dashboard.clerk.com)
- Copier les clés dans `.env` (à partir de `.env.example`)
- Configurer un endpoint webhook vers `https://<votre-domaine>/api/webhooks/clerk`
  pour les événements `user.created`, `user.updated`, `user.deleted`
- En développement local, utiliser [ngrok](https://ngrok.com) ou l'équivalent
  pour exposer localhost au webhook Clerk

## Décisions d'architecture de ce sprint

- Clerk sert uniquement d'identité (`User.authProviderId`). Les organisations
  Clerk ne sont pas utilisées — `Organization`/`Membership` restent le modèle
  métier propre à RH Pilot, pour éviter une dépendance structurelle au
  fournisseur (cf. décision prise à l'étape Authentification).
- Le webhook `user.deleted` applique le "temps 1" de la stratégie de
  suppression validée : désactivation immédiate (`deletedAt`, anonymisation
  email, `authProviderId` vidé) + désactivation des `Membership` — jamais de
  suppression physique à ce stade.
- Dashboard volontairement minimal : pas de sélecteur multi-organisations
  (utile au consultant RH externe, hors périmètre Sprint 1), pas de gestion
  des rôles depuis l'UI — uniquement la création du premier espace.

## Prochain sprint

Sprint 2 — Gestion des salariés (CRUD `Employee`, y compris
`managerMembershipId`).
