# RH Pilot

Copilote RH pour TPE/PME : transforme chaque événement RH (embauche,
période d'essai, visite médicale...) en plan d'action complet — tâches,
échéances, responsables et preuves — avec rappels automatiques et
détection proactive des oublis.

## Stack

- **Framework** : Next.js 14 (App Router), React, TypeScript
- **Base de données** : PostgreSQL via Prisma
- **Identité** : Clerk
- **Paiement** : Stripe
- **Email transactionnel** : Resend
- **IA** : Anthropic (Copilote RH Pilot)
- **Déploiement** : Vercel

## Architecture

```
src/
├── app/            # Routes Next.js (App Router), pages et Server Actions
├── components/     # Composants UI partagés
└── lib/            # Logique métier (moteur d'événements, anomalies,
                     # notifications, IA, authentification...)
prisma/
└── schema.prisma   # Modèle de données
```

### Modèle de données

`Organization` → `Membership` → `Employee` → `EmployeeEvent` → `Task`,
avec isolation stricte par organisation sur chaque ressource sensible.
Points clés :

- Chaque tâche distingue sa nature (`LEGAL_DEADLINE`,
  `ORGANIZATIONAL_DEFAULT`, `USER_DEFINED`) : une échéance n'est jamais
  présentée comme légalement obligatoire sans vérification explicite.
- Les parcours copient les paramètres du modèle au moment de leur
  création — une modification ultérieure du modèle ne modifie jamais
  rétroactivement un parcours déjà généré.

### Sécurité multi-tenant

Toute opération métier part de l'utilisateur authentifié (Clerk),
résout son `Membership` actif, puis vérifie que la ressource demandée
appartient à cette organisation. Un `organizationId` transmis par le
client n'est jamais considéré comme fiable en soi.

## Installation

```bash
npm install
cp .env.example .env   # renseigner les variables (voir ci-dessous)
npx prisma migrate dev
npm run dev
```

## Variables d'environnement

Voir `.env.example` pour la liste complète. Principales :

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Signature du webhook Clerk |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envoi d'email |
| `APP_URL` | Base des liens dans les emails |

## Webhooks

- `/api/webhooks/clerk` — synchronisation des comptes utilisateurs
  (`user.created`, `user.updated`, `user.deleted`), signature Svix
  vérifiée avant écriture.
- `/api/webhooks/stripe` — synchronisation de l'abonnement,
  signature Stripe vérifiée avant écriture.

## Tâches planifiées

- `/api/cron/reminders` (quotidien, 7h) : envoi des rappels et résumés,
  protégé par `CRON_SECRET`. Configuré dans `vercel.json`.

## Développement

```bash
npx prisma studio      # explorer la base de données
npx prisma generate    # régénérer le client après modification du schéma
npx tsc --noEmit       # vérification des types
```

## Déploiement

Déployé sur Vercel. Le build exécute `prisma generate` avant
`next build` (voir `package.json`).

## Sécurité

- Isolation stricte par organisation sur toutes les mutations et
  requêtes sensibles.
- Signatures vérifiées sur tous les webhooks externes (Clerk, Stripe).
- Suppression de compte traitée en plusieurs temps (désactivation
  immédiate, anonymisation) plutôt qu'en suppression physique
  immédiate.
