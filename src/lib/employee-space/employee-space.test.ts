import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computePayslip } from "@/lib/payroll/bulletin/compute";
import { FULL_TIME_SCHEDULE } from "@/lib/payroll/bulletin/calendar";
import { buildFinalSettlementItems, ofJob, renderFinalSettlementPdf, renderWorkCertificatePdf, type ExitEmployee, type ExitEmployer } from "./exit-documents";
import { calendarDays, canEmployeeCancelAbsence, formatDateRange, ofMonthLabel, payslipFileName, payslipTitle, safeFileName } from "./labels";
import { addOneMonth, electronicPayslipReadiness, renderElectronicPayslipNoticePdf } from "./notice";
import { hashInviteToken, isPlausibleInviteToken, newInviteToken, normalizeEmail, safeEspaceRedirect } from "./tokens";

const employer: ExitEmployer = { name: "Atelier Martin", siret: "12345678900012", address: "12 rue des Lilas", postalCode: "69003", city: "Lyon" };
const employee: ExitEmployee = { civility: "MME", firstName: "Léa", lastName: "Martin", address: "4 place Bellecour\n69002 Lyon", position: "Assistante de gestion", category: "Employé", hireDate: "2021-01-04", exitDate: "2026-10-31" };

describe("espace salarié", () => {
  it("nomme les documents et les mois à la française", () => {
    expect(ofMonthLabel(2026, 10)).toBe("d'octobre 2026");
    expect(ofMonthLabel(2026, 8)).toBe("d'août 2026");
    expect(ofMonthLabel(2026, 3)).toBe("de mars 2026");
    expect(payslipTitle(2026, 4)).toBe("Bulletin de salaire d'avril 2026");
    expect(payslipFileName(2026, 1)).toBe("bulletin-2026-01.pdf");
    expect(safeFileName("Attestation France Travail (Léa).PDF")).toBe("Attestation-France-Travail-Lea.PDF");
    expect(safeFileName("../../etc/passwd")).toBe("etc-passwd.pdf");
    expect(safeFileName("")).toBe("document.pdf");
    const start = new Date("2026-10-12T00:00:00Z");
    expect(formatDateRange(start, new Date("2026-10-16T00:00:00Z"))).toBe("du 12 oct. au 16 octobre 2026");
    expect(formatDateRange(start, start)).toBe("le 12 octobre 2026");
    expect(calendarDays(start, new Date("2026-10-16T00:00:00Z"))).toBe(5);
    expect(canEmployeeCancelAbsence({ status: "TO_VALIDATE", payrollImpactStatus: "PENDING" })).toBe(true);
    expect(canEmployeeCancelAbsence({ status: "VALIDATED", payrollImpactStatus: "READY" })).toBe(false);
    expect(canEmployeeCancelAbsence({ status: "TO_VALIDATE", payrollImpactStatus: "INTEGRATED" })).toBe(false);
  });

  it("produit des jetons d'invitation dont seule l'empreinte est stockée, et filtre les redirections", () => {
    const { token, hash } = newInviteToken();
    expect(isPlausibleInviteToken(token)).toBe(true);
    expect(hash).toBe(hashInviteToken(token));
    expect(hash).not.toContain(token);
    expect(isPlausibleInviteToken("abc")).toBe(false);
    expect(normalizeEmail("  Lea.Martin@Exemple.FR ")).toBe("lea.martin@exemple.fr");
    expect(normalizeEmail("pas-une-adresse")).toBeNull();
    expect(safeEspaceRedirect("/espace/rejoindre/abc_DEF-123")).toBe("/espace/rejoindre/abc_DEF-123");
    expect(safeEspaceRedirect("https://pirate.example/espace")).toBe("/espace");
    expect(safeEspaceRedirect("//pirate.example")).toBe("/espace");
    expect(safeEspaceRedirect("/dashboard")).toBe("/espace");
    expect(safeEspaceRedirect("/espace/connexion")).toBe("/espace");
  });

  it("dresse l'inventaire du solde de tout compte à partir du dernier bulletin", async () => {
    const bulletin = computePayslip({
      period: { year: 2026, month: 10 },
      organization: { headcount: 12, atmpRatePercent: 1.2, mobilityRatePercent: 0, territory: "METROPOLE", healthPlan: null, ijssSubrogation: true, paidLeaveMethod: "OUVRABLES" },
      employee: { id: "lea", displayName: "Léa Martin", contract: "CDI", executive: false, hireDate: "2021-01-04", contractEndDate: "2026-10-31" },
      pay: { monthlyBaseSalary: 2400, contractMonthlyHours: 151.67, schedule: FULL_TIME_SCHEDULE },
      paidLeave: { previousAcquired: 30, previousTaken: 20, currentAcquired: 12.5, currentTaken: 0 },
      withholding: { mode: "PERSONALIZED", rate: 0.02 },
      termination: { reason: "LICENCIEMENT", severance: { amount: 3500, legalOrConventionalMinimum: 3500, previousYearGross: 28000 } },
    } as Parameters<typeof computePayslip>[0]);
    const settlement = buildFinalSettlementItems(bulletin);
    expect(settlement.items[0]).toEqual({ label: "Salaire et accessoires d'octobre 2026", amount: 2400 });
    expect(settlement.items.map((item) => item.label)).toContain("Indemnité compensatrice de congés payés");
    expect(settlement.items.find((item) => item.label.startsWith("Indemnité de licenciement"))?.amount).toBe(3500);
    expect(Math.round(settlement.items.reduce((total, item) => total + item.amount, 0) * 100) / 100).toBe(settlement.grossTotal);
    expect(settlement.netPaid).toBe(bulletin.totals.netPaid);

    const pdf = await renderFinalSettlementPdf({ employer, employee, issuedAt: "2026-10-31", ...settlement, paymentDate: "2026-10-31" }, { compress: false });
    // Même document, même jour : même fichier, pour ne pas le republier comme « corrigé ».
    const again = await renderFinalSettlementPdf({ employer, employee, issuedAt: "2026-10-31", ...settlement, paymentDate: "2026-10-31" }, { compress: false });
    expect(createHash("sha256").update(again).digest("hex")).toBe(createHash("sha256").update(pdf).digest("hex"));
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text.match(/\/Type \/Page\b/g)?.length).toBe(1);
  });

  it("rend un certificat de travail d'une page, avec la portabilité si l'entreprise a une couverture santé", async () => {
    expect(ofJob("Assistante de gestion")).toBe("d'assistante de gestion");
    expect(ofJob("DRH")).toBe("de DRH");
    expect(ofJob("Chef de projet")).toBe("de chef de projet");
    const pdf = await renderWorkCertificatePdf({ employer, employee, issuedAt: "2026-10-31", healthCoverage: true }, { compress: false });
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text.match(/\/Type \/Page\b/g)?.length).toBe(1);
    await expect(Promise.resolve().then(() => renderWorkCertificatePdf({ employer, employee: { ...employee, exitDate: "" }, issuedAt: "2026-10-31", healthCoverage: false }))).rejects.toThrow(/date de fin/);
  });

  it("n'autorise le premier bulletin électronique qu'un mois après la note d'information, ou à l'embauche", async () => {
    expect(addOneMonth("2026-09-12")).toBe("2026-10-12");
    expect(addOneMonth("2026-01-31")).toBe("2026-02-28");
    expect(addOneMonth("2026-12-15")).toBe("2027-01-15");
    const base = { alreadyReceivedElectronic: false, today: "2026-10-01" };
    expect(electronicPayslipReadiness({ ...base, noticeAt: null, method: null })).toEqual({ ready: false, reason: "NOT_INFORMED" });
    expect(electronicPayslipReadiness({ ...base, noticeAt: "2026-09-12", method: "HAND_DELIVERY" })).toEqual({ ready: false, reason: "WAITING", availableFrom: "2026-10-12" });
    expect(electronicPayslipReadiness({ ...base, noticeAt: "2026-09-01", method: "REGISTERED_MAIL" })).toEqual({ ready: true });
    expect(electronicPayslipReadiness({ ...base, noticeAt: "2026-09-28", method: "AT_HIRING" })).toEqual({ ready: true });
    expect(electronicPayslipReadiness({ ...base, noticeAt: null, method: null, alreadyReceivedElectronic: true })).toEqual({ ready: true });

    const pdf = await renderElectronicPayslipNoticePdf({ employer, employee: { civility: "MME", firstName: "Léa", lastName: "Martin" }, issuedAt: "2026-09-27" }, { compress: false });
    expect(pdf.toString("latin1").startsWith("%PDF-")).toBe(true);
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length).toBe(1);
  });
});
