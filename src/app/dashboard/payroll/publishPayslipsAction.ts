"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPayslipDocument } from "@/lib/payroll/payslip-storage";
import { publishVaultDocument } from "@/lib/employee-space/vault";
import { notifyEmployeesInBatch, type DocumentNotice } from "@/lib/employee-space/notify";
import { payslipFileName, payslipTitle } from "@/lib/employee-space/labels";
import { electronicPayslipReadiness } from "@/lib/employee-space/notice-rules";
import { getPayrollMembership } from "@/lib/payrollAccess";

export type PublishPayslipsResult =
  | { error: string }
  | { ok: true; published: number; replaced: number; unchanged: number; notified: number; withoutSpace: number; failedEmails: number; paper: number; failed: number; notInformed: number };

/**
 * Met les bulletins d'un mois clôturé à disposition des salariés : copie dans
 * leur espace (jamais modifiée ensuite), journal, e-mail sans pièce jointe.
 * Sont laissés de côté : les salariés qui ont choisi le papier, ceux qui n'ont
 * pas encore été informés du bulletin électronique (ou depuis moins d'un mois)
 * et les fiches de démonstration.
 */
export async function publishPayslipsAction(periodId: string): Promise<PublishPayslipsResult> {
  const membership = await getPayrollMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs publient les bulletins." };
  const organizationId = membership.organizationId;

  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId }, select: { id: true, year: true, month: true, status: true } });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") return { error: "Clôturez le mois avant de publier les bulletins." };

  const payslips = await prisma.payslip.findMany({
    where: { organizationId, payrollPeriodId: period.id, documentStatus: { in: ["GENERATED", "PUBLISHED"] }, storageKey: { not: null } },
    select: { id: true, employeeId: true, storageKey: true, documentStatus: true },
  });
  if (payslips.length === 0) return { error: "Générez d'abord les bulletins PDF." };

  const employees = await prisma.$queryRaw<Array<{ id: string; isDemoData: boolean; paperPayslipSince: Date | null; noticeAt: string | null; noticeMethod: string | null; hasElectronicPayslip: boolean }>>`
    SELECT e."id", e."isDemoData", e."paperPayslipSince",
           to_char(e."electronicPayslipNoticeAt", 'YYYY-MM-DD') AS "noticeAt", e."electronicPayslipNoticeMethod" AS "noticeMethod",
           EXISTS (SELECT 1 FROM "employee_documents" d WHERE d."organizationId" = e."organizationId" AND d."employeeId" = e."id" AND d."kind" = 'PAYSLIP') AS "hasElectronicPayslip"
    FROM "employees" e WHERE e."organizationId" = ${organizationId} AND e."id" = ANY(${payslips.map((payslip) => payslip.employeeId)}::text[])`;
  const today = new Date().toISOString().slice(0, 10);
  const byId = new Map(employees.map((employee) => [employee.id, employee]));

  const title = payslipTitle(period.year, period.month);
  const fileName = payslipFileName(period.year, period.month);
  const notices = new Map<string, DocumentNotice[]>();
  let published = 0;
  let replaced = 0;
  let unchanged = 0;
  let paper = 0;
  let notInformed = 0;

  const failures: string[] = [];
  for (const payslip of payslips) {
    const employee = byId.get(payslip.employeeId);
    if (!employee || employee.isDemoData) continue;
    if (employee.paperPayslipSince) { paper += 1; continue; }
    // Premier bulletin électronique : le salarié doit avoir été informé (D3243-7).
    if (!electronicPayslipReadiness({ noticeAt: employee.noticeAt, method: employee.noticeMethod, alreadyReceivedElectronic: employee.hasElectronicPayslip, today }).ready) { notInformed += 1; continue; }
    try {
      const pdf = readPayslipDocument(payslip.storageKey!);
      const outcome = await prisma.$transaction(async (tx) => {
        const result = await publishVaultDocument(tx, {
          organizationId, employeeId: employee.id, kind: "PAYSLIP", title, fileName, pdf,
          periodYear: period.year, periodMonth: period.month, sourcePayslipId: payslip.id,
          actorUserId: user.id, actorKind: "EMPLOYER",
        });
        if (payslip.documentStatus !== "PUBLISHED") {
          await tx.payslip.update({ where: { id: payslip.id }, data: { documentStatus: "PUBLISHED", publishedAt: new Date() } });
        }
        return result;
      });
      if (outcome.status === "UNCHANGED") {
        unchanged += 1;
        // Déjà publié : on ne prévient que si personne ne l'a encore été (publication interrompue, espace activé depuis).
        const notified = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "employee_document_events" WHERE "documentId" = ${outcome.documentId} AND "action" = 'NOTIFIED' LIMIT 1`;
        if (notified.length === 0) notices.set(employee.id, [{ documentId: outcome.documentId, label: title, corrected: false }]);
        continue;
      }
      if (outcome.status === "REPLACED") replaced += 1;
      else published += 1;
      notices.set(employee.id, [{ documentId: outcome.documentId, label: title, corrected: outcome.status === "REPLACED" }]);
    } catch (error) {
      console.error("Publication d'un bulletin impossible", { payslipId: payslip.id, error });
      failures.push(employee.id);
    }
  }

  const outcomes = await notifyEmployeesInBatch({ organizationId, organizationName: membership.organization.name, notices, actorUserId: user.id });
  const counts = { notified: 0, withoutSpace: 0, failedEmails: 0 };
  for (const result of outcomes.values()) {
    if (result === "NOTIFIED") counts.notified += 1;
    else if (result === "FAILED") counts.failedEmails += 1;
    else counts.withoutSpace += 1;
  }

  await prisma.auditLog.create({
    data: { id: randomUUID(), organizationId, actorUserId: user.id, action: "payroll.payslips.published", entityType: "PayrollPeriod", entityId: period.id, metadata: { published, replaced, unchanged, paper, notInformed, failed: failures.length, ...counts } },
  });
  revalidatePath(`/dashboard/payroll/${period.id}`);
  revalidatePath("/dashboard/payroll");
  return { ok: true, published, replaced, unchanged, paper, notInformed, failed: failures.length, ...counts };
}
