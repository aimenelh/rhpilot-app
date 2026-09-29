import { CircleCheck, Lock } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/format";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import { UpgradeToProButton } from "./UpgradeToProButton";
import { billableEmployeeWhere } from "@/lib/billingEmployeeScope";
import { isStripeConfigured, stripe } from "@/lib/stripe";

type InvoiceRow = { id: string; date: Date; amount: number; status: string | null; url: string | null };

const INVOICE_STATUS: Record<string, string> = { paid: "Payée", open: "À régler", void: "Annulée", uncollectible: "Impayée", draft: "Brouillon" };
const euros = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

// Factures Stripe du client : jamais bloquant, la page reste affichée si Stripe ne répond pas.
async function loadInvoices(customerId: string | null | undefined): Promise<InvoiceRow[] | null> {
  if (!customerId || !isStripeConfigured()) return [];
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 12 });
    return invoices.data
      .filter((invoice) => invoice.status !== "draft")
      .map((invoice) => ({ id: invoice.id ?? invoice.number ?? String(invoice.created), date: new Date(invoice.created * 1000), amount: (invoice.total ?? 0) / 100, status: invoice.status ?? null, url: invoice.invoice_pdf ?? invoice.hosted_invoice_url ?? null }));
  } catch (error) {
    console.error("Factures Stripe indisponibles :", error);
    return null;
  }
}
import {
  estimatedProMonthlyPrice,
  FREE_TIER_LIMIT,
  hasOpenStripeSubscription,
  hasProAccess,
} from "@/lib/billingPolicy";

export const metadata = { title: "Abonnement" };

// Ce que RH Pilot inclut réellement, identique sur les deux paliers —
// seul le nombre de salariés distingue Gratuit de Pro. Jamais de
// fonctionnalité présentée comme incluse si elle ne l'est pas.
const INCLUDED_FEATURES = [
  "Parcours RH automatisés (embauche, période d'essai, visite médicale...)",
  "Détection proactive des anomalies et échéances",
  "Rappels automatiques par e-mail",
  "Assistant RH intégré",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");
  if (!isOrganizationAdmin(membership)) redirect("/dashboard");

  const [organization, employeeCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: membership.organizationId } }),
    prisma.employee.count({ where: billableEmployeeWhere(membership.organizationId) }),
  ]);

  const isPro = hasProAccess(organization?.subscriptionStatus);
  const hasSubscription = hasOpenStripeSubscription(
    organization?.stripeSubscriptionId,
    organization?.subscriptionStatus
  );
  const canManageBilling = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const monthlyEstimate = isPro ? euros(estimatedProMonthlyPrice(employeeCount)) : null;
  const invoices = await loadInvoices(organization?.stripeCustomerId);
  const usageRatio = Math.min(employeeCount / FREE_TIER_LIMIT, 1);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Votre abonnement</h1>

      {searchParams.success && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-accent-teal/30 bg-accent-teal/5 px-3.5 py-2.5 text-sm text-accent-teal">
          <CircleCheck size={15} className="shrink-0" />
          Abonnement activé, merci !
        </p>
      )}
      {searchParams.canceled && (
        <p className="mt-4 rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-soft">
          Paiement annulé, aucune modification n&apos;a été effectuée.
        </p>
      )}

      {/* Bloc principal : éditorial, pas une carte de tarification —
          l'utilisateur est déjà client, on ne cherche pas à le
          convaincre. */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Palier actuel</p>
        <div className="mt-2 flex items-baseline gap-2.5">
          <h2 className="text-3xl font-semibold text-ink">{hasSubscription ? "Pro" : "Gratuit"}</h2>
          {hasSubscription && (
            <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
              {organization?.subscriptionStatus === "trialing"
                ? "Essai"
                : organization?.subscriptionStatus === "past_due"
                  ? "Paiement à régulariser"
                  : organization?.subscriptionStatus === "unpaid"
                    ? "Paiement requis"
                    : organization?.subscriptionStatus === "paused"
                      ? "En pause"
                      : organization?.subscriptionStatus === "incomplete"
                        ? "Activation incomplète"
                        : "Actif"}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {isPro
            ? `${employeeCount} salarié${employeeCount > 1 ? "s" : ""} facturable${employeeCount > 1 ? "s" : ""} · ${monthlyEstimate} HT estimés ce mois-ci`
            : hasSubscription
              ? "Votre abonnement nécessite une action. Ouvrez sa gestion pour régulariser la situation."
              : `Jusqu'à ${FREE_TIER_LIMIT} salariés inclus, sans engagement`}
        </p>
        {isPro && organization?.currentPeriodEnd && (
          <p className="mt-1 text-sm text-ink-faint">
            Prochain renouvellement le {formatDate(organization.currentPeriodEnd)}.
          </p>
        )}
        <div className="mt-5">
          {canManageBilling ? (
            hasSubscription ? <ManageSubscriptionButton /> : <UpgradeToProButton />
          ) : (
            <p className="text-sm text-ink-faint">
              Seuls les propriétaires et administrateurs peuvent modifier l&apos;abonnement.
            </p>
          )}
        </div>
      </div>

      {/* Utilisation — seulement pertinent sur Gratuit, où la limite
          existe réellement. Une ligne + une barre, pas une carte à
          part entière. */}
      {!isPro && (
        <div className="mt-6 border-t border-surface-border pt-5">
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span>
              {employeeCount} / {FREE_TIER_LIMIT} salariés réels utilisés
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${usageRatio * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Les salariés fictifs générés par la démonstration ne comptent jamais dans cette limite ni dans la facturation.
          </p>
        </div>
      )}

      {/* Ce qui est inclus */}
      <div className="mt-8 border-t border-surface-border pt-6">
        <h2 className="text-sm font-semibold text-ink">Ce qui est inclus</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {INCLUDED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm text-ink-soft">
              <CircleCheck size={15} className="shrink-0 text-accent-teal" />
              {feature}
            </li>
          ))}
          <li className={`flex items-center gap-2.5 text-sm ${isPro ? "text-ink-soft" : "text-ink-faint"}`}>
            {isPro ? (
              <CircleCheck size={15} className="shrink-0 text-accent-teal" />
            ) : (
              <Lock size={13} className="shrink-0" />
            )}
            Salariés illimités{!isPro && " (Pro)"}
          </li>
        </ul>
      </div>

      {/* Factures — volontairement discret, pas une grosse carte
          "Historique de facturation". */}
      <div className="mt-8 border-t border-surface-border pt-6">
        <h2 className="text-sm font-semibold text-ink">Factures</h2>
        {invoices === null ? (
          <p className="mt-2 text-sm text-ink-faint">Vos factures sont momentanément indisponibles. Retrouvez-les dans l&apos;espace de gestion de l&apos;abonnement.</p>
        ) : invoices.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">Aucune facture pour le moment.</p>
        ) : (
          <ul className="mt-3 divide-y divide-surface-border text-sm">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-ink">{formatDate(invoice.date)}</span>
                <span className="tabular-nums text-ink">{euros(invoice.amount)}</span>
                <span className="text-ink-faint">{invoice.status ? INVOICE_STATUS[invoice.status] ?? invoice.status : ""}</span>
                {invoice.url ? <a href={invoice.url} target="_blank" rel="noreferrer" className="font-medium text-brand-primary-dark hover:underline">PDF</a> : <span />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
