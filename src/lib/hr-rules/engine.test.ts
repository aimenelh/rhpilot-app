import { describe, expect, it } from "vitest";
import { evaluateRequest, formatKeyRange, rankCandidates, type EngineAbsence, type EngineEmployee, type EngineRule } from "./engine";
import { simulateRule } from "./simulate";
import { describeRule, emptyLeaveRuleSpec, parseLeaveRuleSpec, type LeaveRuleSpec } from "./spec";
import { longestSummerOpening, reviewLeaveRule, type LegalContext } from "./legal";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const at = (value: string) => new Date(`${value}T09:00:00.000Z`);

function employee(id: string, overrides: Partial<EngineEmployee> = {}): EngineEmployee {
  return {
    id,
    firstName: id.charAt(0).toUpperCase() + id.slice(1),
    lastName: "Durand",
    hireDate: day("2020-01-01"),
    managerMembershipId: "manager-1",
    position: "Vendeur",
    professionalCategory: "EMPLOYE",
    contractType: "CDI",
    dependentChildren: 0,
    ...overrides,
  };
}

function absence(id: string, employeeId: string, start: string, end: string, status = "VALIDATED", createdAt = "2026-03-01"): EngineAbsence {
  return { id, employeeId, type: "PAID_LEAVE", startDate: day(start), endDate: day(end), status, createdAt: at(createdAt) };
}

const summer: LeaveRuleSpec = {
  version: 1,
  absenceTypes: ["PAID_LEAVE"],
  period: { kind: "YEARLY", from: "06-01", to: "08-31" },
  employees: { contractTypes: [], categories: [] },
  constraints: [{ kind: "MAX_CONCURRENT", max: 2, group: "TEAM" }],
  priority: ["FAMILY_SITUATION", "SENIORITY"],
  onViolation: "REFUSE",
};
const summerRule: EngineRule = { id: "rule-1", title: "Congés d'été", version: 1, spec: summer };

const team = [
  employee("karim"),
  employee("lea"),
  employee("tom", { hireDate: day("2018-05-01") }),
  employee("sarah", { dependentChildren: 2, hireDate: day("2023-02-01") }),
  employee("nina", { managerMembershipId: "manager-2" }),
];

const request = (id: string, employeeId: string, start: string, end: string, createdAt = "2026-04-01") => ({
  absenceId: id,
  employeeId,
  type: "PAID_LEAVE",
  startDate: day(start),
  endDate: day(end),
  createdAt: at(createdAt),
});

describe("règles maison : évaluation d'une demande", () => {
  it("accorde une demande quand l'équipe reste sous la limite", () => {
    const verdict = evaluateRequest({ request: request("r1", "karim", "2026-08-03", "2026-08-07"), rules: [summerRule], employees: team, absences: [absence("a1", "lea", "2026-08-03", "2026-08-14")] }, { today: at("2026-04-01") });
    expect(verdict.outcome).toBe("APPROVE");
    expect(verdict.employeeExplanation).toBe("Accordée selon la règle «\u00a0Congés d'été\u00a0» de l'entreprise.");
    expect(verdict.hrExplanation).toContain("la règle en permet 2");
  });

  it("propose un refus quand la limite est atteinte, avec des dates possibles", () => {
    const absences = [absence("a1", "lea", "2026-08-03", "2026-08-07"), absence("a2", "tom", "2026-08-03", "2026-08-07")];
    const verdict = evaluateRequest({ request: request("r1", "karim", "2026-08-03", "2026-08-07"), rules: [summerRule], employees: team, absences }, { today: at("2026-04-01") });
    expect(verdict.outcome).toBe("REFUSE");
    expect(verdict.hrExplanation).toContain("Lea Durand, Tom Durand");
    expect(verdict.suggestion).toEqual({ startDate: "2026-08-08", endDate: "2026-08-12" });
    expect(verdict.employeeExplanation).toContain("Dates possibles : du 8 au 12 août.");
  });

  it("ne nomme jamais un collègue dans l'explication donnée au salarié", () => {
    const absences = [absence("a1", "lea", "2026-08-03", "2026-08-07"), absence("a2", "tom", "2026-08-03", "2026-08-07")];
    const verdict = evaluateRequest({ request: request("r1", "karim", "2026-08-03", "2026-08-07"), rules: [summerRule], employees: team, absences }, { today: at("2026-04-01") });
    expect(verdict.employeeExplanation).not.toMatch(/Lea|Tom/);
  });

  it("ne compte pas un salarié d'une autre équipe", () => {
    const absences = [absence("a1", "lea", "2026-08-03", "2026-08-07"), absence("a2", "nina", "2026-08-03", "2026-08-07")];
    const verdict = evaluateRequest({ request: request("r1", "karim", "2026-08-03", "2026-08-07"), rules: [summerRule], employees: team, absences });
    expect(verdict.outcome).toBe("APPROVE");
  });

  it("départage deux demandes en attente : les enfants à charge d'abord", () => {
    const absences = [absence("a1", "lea", "2026-08-03", "2026-08-07"), absence("r-sarah", "sarah", "2026-08-03", "2026-08-07", "TO_VALIDATE", "2026-04-05")];
    const tom = evaluateRequest({ request: request("r-tom", "tom", "2026-08-03", "2026-08-07", "2026-04-01"), rules: [summerRule], employees: team, absences }, { today: at("2026-04-06") });
    expect(tom.outcome).toBe("REFUSE");
    expect(tom.hrExplanation).toContain("passe en priorité Sarah Durand (enfants à charge)");

    const sarah = evaluateRequest({
      request: request("r-sarah", "sarah", "2026-08-03", "2026-08-07", "2026-04-05"),
      rules: [summerRule],
      employees: team,
      absences: [absence("a1", "lea", "2026-08-03", "2026-08-07"), absence("r-tom", "tom", "2026-08-03", "2026-08-07", "TO_VALIDATE", "2026-04-01")],
    });
    expect(sarah.outcome).toBe("APPROVE");
    expect(sarah.hrExplanation).toContain("Prioritaire sur Tom Durand");
  });

  it("laisse le RH trancher quand la situation de famille manque pour départager", () => {
    const employees = team.map((entry) => (entry.id === "tom" ? { ...entry, dependentChildren: null } : entry));
    const absences = [absence("a1", "lea", "2026-08-03", "2026-08-07"), absence("r-tom", "tom", "2026-08-03", "2026-08-07", "TO_VALIDATE", "2026-04-01")];
    const verdict = evaluateRequest({ request: request("r-sarah", "sarah", "2026-08-03", "2026-08-07", "2026-04-05"), rules: [summerRule], employees, absences });
    expect(verdict.outcome).toBe("REVIEW");
  });

  it("ne s'applique ni hors période, ni aux arrêts maladie", () => {
    const outside = evaluateRequest({ request: request("r1", "karim", "2026-10-05", "2026-10-09"), rules: [summerRule], employees: team, absences: [] });
    expect(outside.outcome).toBe("NO_RULE");
    const sick = evaluateRequest({ request: { ...request("r2", "karim", "2026-08-03", "2026-08-07"), type: "SICK_LEAVE" }, rules: [summerRule], employees: team, absences: [] });
    expect(sick.outcome).toBe("NO_RULE");
  });

  it("vérifie le délai de prévenance, la durée et les périodes fermées qui chevauchent le 1er janvier", () => {
    const rule: EngineRule = {
      id: "rule-2",
      title: "Fin d'année",
      version: 3,
      spec: {
        ...summer,
        period: { kind: "ALWAYS" },
        constraints: [
          { kind: "MIN_NOTICE_DAYS", days: 15 },
          { kind: "MAX_CONSECUTIVE_DAYS", days: 21 },
          { kind: "BLACKOUT", from: "12-20", to: "01-05", label: "inventaire" },
        ],
        priority: [],
        onViolation: "REVIEW",
      },
    };
    const verdict = evaluateRequest({ request: request("r1", "karim", "2026-12-28", "2027-01-20", "2026-12-20"), rules: [rule], employees: team, absences: [] }, { today: at("2026-12-20") });
    expect(verdict.outcome).toBe("REVIEW");
    const failed = verdict.evaluations[0].checks.filter((check) => !check.passed).map((check) => check.kind);
    expect(failed).toEqual(["MIN_NOTICE_DAYS", "MAX_CONSECUTIVE_DAYS", "BLACKOUT"]);
    expect(verdict.hrExplanation).toContain("Du 28 décembre au 5 janvier : période fermée (inventaire).");
  });

  it("applique la limite d'équipe à toute l'entreprise quand le responsable manque, et le signale", () => {
    const employees = [employee("karim", { managerMembershipId: null }), employee("nina", { managerMembershipId: "manager-2" }), employee("lea", { managerMembershipId: "manager-2" })];
    const absences = [absence("a1", "nina", "2026-08-03", "2026-08-07"), absence("a2", "lea", "2026-08-03", "2026-08-07")];
    const verdict = evaluateRequest({ request: request("r1", "karim", "2026-08-03", "2026-08-07"), rules: [summerRule], employees, absences }, { suggest: false });
    expect(verdict.outcome).toBe("REFUSE");
    expect(verdict.hrExplanation).toContain("Aucun responsable n'est renseigné pour Karim Durand");
  });

  it("classe par ancienneté puis par date de demande", () => {
    const ranked = rankCandidates(
      [
        { absenceId: "b", employee: employee("b", { hireDate: day("2021-01-01") }), createdAt: at("2026-01-01") },
        { absenceId: "a", employee: employee("a", { hireDate: day("2019-01-01") }), createdAt: at("2026-02-01") },
        { absenceId: "c", employee: employee("c", { hireDate: day("2019-01-01") }), createdAt: at("2026-01-15") },
      ],
      ["SENIORITY"],
    );
    expect(ranked.map((candidate) => candidate.absenceId)).toEqual(["c", "a", "b"]);
  });

  it("écrit les plages de dates en français", () => {
    expect(formatKeyRange("2026-08-01", "2026-08-01")).toBe("le 1er août");
    expect(formatKeyRange("2026-07-30", "2026-08-02")).toBe("du 30 juillet au 2 août");
  });
});

describe("règles maison : lecture et description", () => {
  it("décrit la règle comme un salarié la lira", () => {
    expect(describeRule(summer)).toEqual([
      "Congés payés, du 1er juin au 31 août, chaque année, pour tous les salariés.",
      "Pas plus de 2 personnes absentes en même temps dans la même équipe (même responsable).",
      "Quand plusieurs demandes se disputent les mêmes dates : priorité aux salariés ayant des enfants à charge, puis à l'ancienneté.",
    ]);
  });

  it("refuse une règle incomplète ou qui vise un arrêt maladie", () => {
    const parsed = parseLeaveRuleSpec({ absenceTypes: ["SICK_LEAVE"], constraints: [], onViolation: "MAYBE" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("accepte une règle valide et l'éditeur part d'une règle valide", () => {
    expect(parseLeaveRuleSpec(summer)).toEqual({ ok: true, spec: summer });
    expect(parseLeaveRuleSpec(emptyLeaveRuleSpec()).ok).toBe(true);
    expect(parseLeaveRuleSpec({ ...summer, period: { kind: "YEARLY", from: "02-30", to: "08-31" } }).ok).toBe(false);
  });
});

describe("règles maison : contrôle juridique", () => {
  const context: LegalContext = { cseStatus: "NOT_IN_PLACE", employeeCount: 5, familyKnownCount: 5, collectiveAgreementName: null };

  it("bloque une ancienneté minimale sur les congés payés", () => {
    const findings = reviewLeaveRule({ ...summer, constraints: [{ kind: "MIN_SENIORITY_DAYS", days: 90 }] }, context);
    expect(findings.find((finding) => finding.code === "PAID_LEAVE_FROM_HIRING")?.level).toBe("BLOCKING");
  });

  it("bloque un été entièrement fermé, accepte une fermeture de trois semaines", () => {
    const closedSummer = { ...summer, period: { kind: "ALWAYS" as const }, constraints: [{ kind: "BLACKOUT" as const, from: "05-01", to: "10-31" }] };
    expect(longestSummerOpening(closedSummer)).toBe(0);
    expect(reviewLeaveRule(closedSummer, context).some((finding) => finding.code === "SUMMER_MAIN_LEAVE")).toBe(true);
    const shortClosure = { ...closedSummer, constraints: [{ kind: "BLACKOUT" as const, from: "07-01", to: "07-21" }] };
    expect(reviewLeaveRule(shortClosure, context).some((finding) => finding.code === "SUMMER_MAIN_LEAVE")).toBe(false);
  });

  it("rappelle les critères légaux de l'ordre des départs et l'avis du CSE", () => {
    const findings = reviewLeaveRule({ ...summer, priority: ["REQUEST_DATE"] }, { ...context, cseStatus: "IN_PLACE" });
    expect(findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["DEPARTURE_ORDER_CRITERIA", "CSE_OPINION", "COLLECTIVE_AGREEMENT_FIRST", "INFORM_EMPLOYEES"]));
  });

  it("signale les enfants à charge non renseignés", () => {
    const findings = reviewLeaveRule(summer, { ...context, familyKnownCount: 0 });
    expect(findings.find((finding) => finding.code === "FAMILY_DATA_MISSING")?.title).toBe("Les enfants à charge ne sont renseignés pour aucun salarié");
  });
});

describe("règles maison : test sur le passé", () => {
  it("retrouve les congés accordés que la règle aurait refusés", () => {
    const absences = [
      absence("a1", "lea", "2026-07-06", "2026-07-10", "VALIDATED", "2026-02-01"),
      absence("a2", "tom", "2026-07-06", "2026-07-10", "VALIDATED", "2026-02-02"),
      absence("a3", "karim", "2026-07-06", "2026-07-10", "VALIDATED", "2026-02-03"),
      absence("a4", "nina", "2026-07-06", "2026-07-10", "REJECTED", "2026-02-04"),
    ];
    const result = simulateRule(summerRule, { employees: team, absences, now: at("2026-09-01") });
    expect(result.considered).toBe(4);
    expect(result.wouldBlock.map((item) => item.employeeName)).toEqual(["Karim Durand"]);
    expect(result.wouldAllow.map((item) => item.employeeName)).toEqual(["Nina Durand"]);
    expect(result.same).toBe(2);
  });
});
