import Stripe from "stripe";

// Une seule instance partagée, pas une nouvelle à chaque appel.
// Pas de apiVersion figée volontairement : laisse le SDK utiliser la
// version par défaut de ton compte plutôt que risquer un décalage
// avec une date codée en dur ici.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Les deux composantes du palier Pro : un forfait fixe (quantité
// toujours 1) et un tarif par salarié (quantité = nombre de salariés
// actifs de l'organisation). Stripe additionne les deux sur une seule
// facture mensuelle.
export const STRIPE_PRICE_BASE = process.env.STRIPE_PRICE_ID_BASE!;
export const STRIPE_PRICE_PER_EMPLOYEE = process.env.STRIPE_PRICE_ID_PER_EMPLOYEE!;
