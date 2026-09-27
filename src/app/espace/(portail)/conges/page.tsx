import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployeeSession } from "@/lib/employee-space/session";
import { bulletinFromSnapshot } from "@/lib/payroll/bulletin/prior-state";
import { loadOrganizationBulletinSettings } from "@/lib/payroll/bulletin/period-loader";
import { FULL_TIME_SCHEDULE, addDays, monthBounds, paidLeaveDaysForAbsence, publicHolidays, toIsoDay } from "@/lib/payroll/bulletin/calendar";
import { ABSENCE_STATUS_LABELS, formatDateRange, ofMonthLabel } from "@/lib/employee-space/labels";
import type { PaidLeaveBalances } from "@/lib/payroll/bulletin/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes congés" };

const days = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j`;
};

async function latestBalances(organizationId: string, employeeId: string): Promise<{ balances: PaidLeaveBalances; year: number; month: number } | null> {
  const rows = await prisma.$queryRaw<Array<{ calculationSnapshot: unknown; year: number; month: number }>>`
    SELECT c."calculationSnapshot", p."year", p."month"
    FROM "payroll_calculations" c
    JOIN "payroll_periods" p ON p."id" = c."payrollPeriodId"
    WHERE c."organizationId" = ${organizationId} AND c."employeeId" = ${employeeId} AND p."status" = 'LOCKED'
    ORDER BY p."year" DESC, p."month" DESC
    LIMIT 3
  `;
  for (const row of rows) {
    const balances = bulletinFromSnapshot(row.calculationSnapshot)?.paidLeave?.balancesAfter;
    if (balances) return { balances, year: Number(row.year), month: Number(row.month) };
  }
  return null;
}

export default async function EspaceLeavePage() {
  const { account } = await requireEmployeeSession();
  const [latest, settings] = await Promise.all([
    latestBalances(account.organizationId, account.employeeId),
    loadOrganizationBulletinSettings(account.organizationId).catch(() => null),
  ]);
  const method = settings?.paidLeaveMethod ?? "OUVRABLES";
  const unit = method === "OUVRES" ? "jours ouvrés" : "jours ouvrables";

  // Congés posés après le dernier bulletin : pas encore décomptés des compteurs.
  const since = latest ? addDays(monthBounds(latest.year, latest.month).last, 1) : toIsoDay(new Date());
  const upcoming = await prisma.absence.findMany({
    where: { organizationId: account.organizationId, employeeId: account.employeeId, type: "PAID_LEAVE", status: { not: "REJECTED" }, endDate: { gte: new Date(`${since}T00:00:00.000Z`) } },
    select: { id: true, startDate: true, endDate: true, status: true },
    orderBy: { startDate: "asc" },
    take: 20,
  });
  const holidays = new Map<string, string>();
  for (const absence of upcoming) {
    for (let year = absence.startDate.getUTCFullYear(); year <= absence.endDate.getUTCFullYear() + 1; year += 1) {
      for (const [day, label] of publicHolidays(year, { workedSolidarityDay: settings?.workedSolidarityDay })) holidays.set(day, label);
    }
  }
  const upcomingRows = upcoming.map((absence) => {
    const start = toIsoDay(absence.startDate);
    const end = toIsoDay(absence.endDate);
    const counted = paidLeaveDaysForAbsence({ absenceStart: start, absenceEnd: end, windowStart: start > since ? start : since, windowEnd: addDays(end, 7), method, schedule: FULL_TIME_SCHEDULE, holidays });
    return { ...absence, counted };
  });
  const validatedUpcoming = upcomingRows.filter((row) => row.status === "VALIDATED").reduce((total, row) => total + row.counted, 0);
  const pendingUpcoming = upcomingRows.filter((row) => row.status !== "VALIDATED").reduce((total, row) => total + row.counted, 0);

  const previousBalance = latest ? latest.balances.previousAcquired - latest.balances.previousTaken : 0;
  const currentBalance = latest ? latest.balances.currentAcquired - latest.balances.currentTaken : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Mes congés</h1>
        <p className="mt-1 text-sm text-ink-soft">{latest ? `Compteurs de votre bulletin ${ofMonthLabel(latest.year, latest.month)}, en ${unit}.` : `Compteurs en ${unit}.`}</p>
      </div>

      {latest ? (
        <>
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <p className="text-sm font-semibold text-ink-soft">Congés à prendre</p>
            <p className="mt-1 text-[34px] font-semibold leading-none tabular-nums text-ink">{days(previousBalance)}</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Acquis sur la période de référence close : {days(latest.balances.previousAcquired)}, dont {days(latest.balances.previousTaken)} déjà pris.</p>
            {validatedUpcoming > 0 || pendingUpcoming > 0 ? (
              <p className="mt-3 border-t border-surface-border pt-3 text-sm leading-6 text-ink-soft">
                Après vos congés à venir : <strong className="font-semibold text-ink">{days(previousBalance - validatedUpcoming)}</strong>
                {pendingUpcoming > 0 ? `, et ${days(previousBalance - validatedUpcoming - pendingUpcoming)} si vos demandes en attente sont acceptées` : ""}.
              </p>
            ) : null}
          </section>
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <p className="text-sm font-semibold text-ink-soft">En cours d&apos;acquisition</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tabular-nums text-ink">{days(currentBalance)}</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Acquis depuis le 1er juin : {days(latest.balances.currentAcquired)}{latest.balances.currentTaken > 0 ? `, dont ${days(latest.balances.currentTaken)} déjà pris` : ""}. Ils s&apos;ajoutent aux congés à prendre au 1er juin prochain.</p>
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-surface-border bg-white px-5 py-10 text-center">
          <p className="text-[15px] font-semibold text-ink">Vos compteurs arrivent avec votre premier bulletin</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-soft">Ils se mettent à jour chaque mois, quand {account.organizationName} valide la paie.</p>
        </div>
      )}

      {upcomingRows.length > 0 ? (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">Congés à venir</h2>
          <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
            {upcomingRows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">{formatDateRange(row.startDate, row.endDate)}</p>
                  <p className={`text-[13px] ${row.status === "VALIDATED" ? "text-accent-teal" : "text-ink-faint"}`}>{ABSENCE_STATUS_LABELS[row.status] ?? row.status}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{days(row.counted)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Link href="/espace/absences" className="flex min-h-[48px] items-center justify-center rounded-xl bg-brand-primary px-4 text-[15px] font-semibold text-white hover:opacity-90">Poser des congés</Link>
      <p className="px-1 text-xs leading-5 text-ink-faint">Le décompte des congés à venir est indicatif : votre employeur l&apos;arrête sur le bulletin du mois concerné.</p>
    </div>
  );
}
