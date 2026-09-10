"use client";

import { useState } from "react";

const FREE_TIER_LIMIT = 3;
const PRO_BASE_CENTS = 1500;
const PRO_PER_EMPLOYEE_CENTS = 300;

function formatEuros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function PricingCalculator() {
  const [headcount, setHeadcount] = useState(5);

  const isFreeEligible = headcount <= FREE_TIER_LIMIT;
  const proTotalCents = PRO_BASE_CENTS + headcount * PRO_PER_EMPLOYEE_CENTS;

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Combien ça coûte, pour vous ?
      </p>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <label htmlFor="headcount" className="text-sm text-ink-soft">
          Nombre de salariés
        </label>
        <span className="font-display text-3xl font-semibold text-ink" aria-hidden>
          {headcount}
        </span>
      </div>

      <input
        id="headcount"
        type="range"
        min={1}
        max={50}
        step={1}
        value={headcount}
        onChange={(event) => setHeadcount(Number(event.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-border accent-brand-primary"
        aria-describedby="headcount-result"
      />
      <div className="mt-1 flex justify-between text-xs text-ink-faint">
        <span>1</span>
        <span>50</span>
      </div>

      <div id="headcount-result" className="mt-6 border-t border-surface-border pt-6">
        {isFreeEligible ? (
          <>
            <p className="font-display text-3xl font-semibold text-ink">0 €<span className="text-base font-normal text-ink-soft"> / mois</span></p>
            <p className="mt-1 text-sm text-ink-soft">
              Le palier Gratuit couvre jusqu&apos;à {FREE_TIER_LIMIT} salariés — pas besoin de Pro pour l&apos;instant.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl font-semibold text-ink">
              {formatEuros(proTotalCents)} €<span className="text-base font-normal text-ink-soft"> / mois</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              15 € + {headcount} × 3 € — palier Pro, salariés illimités, résiliable à tout moment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
