import Stripe from "stripe";

// Une seule instance partagée, pas une nouvelle à chaque appel.
// Pas de apiVersion figée volontairement : laisse le SDK utiliser la
// version par défaut de ton compte plutôt que risquer un décalage
// avec une date codée en dur ici.
//
// Instanciée au premier usage seulement : sans clé, importer ce module ne doit
// pas faire tomber les routes qui ne facturent rien (webhook Clerk, cron).
let instance: Stripe | null = null;

function getStripe(): Stripe {
  if (!instance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY n'est pas configurée : la facturation est indisponible.");
    instance = new Stripe(key);
  }
  return instance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const client = getStripe();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Les deux composantes du palier Pro : un forfait fixe (quantité
// toujours 1) et un tarif par salarié (quantité = nombre de salariés
// actifs de l'organisation). Stripe additionne les deux sur une seule
// facture mensuelle.
export const STRIPE_PRICE_BASE = process.env.STRIPE_PRICE_ID_BASE!;
export const STRIPE_PRICE_PER_EMPLOYEE = process.env.STRIPE_PRICE_ID_PER_EMPLOYEE!;
