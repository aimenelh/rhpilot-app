import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAnomalies } from "@/lib/anomalies";

const RUN_ID = `anotest-${Date.now()}`;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

async function createFixtures() {
  const org = await prisma.organization.create({ data: { name: `${RUN_ID}-org` } });

  const eventTemplateProbation = await prisma.eventTemplate.create({
    data: { key: "fin_periode_essai", label: "Fin de période d'essai" },
  });

  const probationOverdue = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "A",
      lastName: "ProbationOverdue",
      hireDate: daysAgo(50),
      probationDuration: 5,
      probationDurationUnit: "DAYS",
      contractType: "CDI",
    },
  });

  const probationApproaching = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "B",
      lastName: "ProbationApproaching",
      hireDate: daysAgo(10),
      probationDuration: 40,
      probationDurationUnit: "DAYS",
      contractType: "CDI",
    },
  });

  const probationTooOld = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "C",
      lastName: "ProbationTooOld",
      hireDate: daysAgo(400),
      probationDuration: 5,
      probationDurationUnit: "DAYS",
      contractType: "CDI",
    },
  });

  const probationAlreadyTriggered = await prisma.employee.create({
    data: {
      organizationId: org.id,
      firstName: "D",
      lastName: "ProbationDone",
      hireDate: daysAgo(50),
      probationDuration: 5,
      probationDurationUnit: "DAYS",
      contractType: "CDI",
    },
  });
  await prisma.employeeEvent.create({
    data: {
      organizationId: org.id,
      employeeId: probationAlreadyTriggered.id,
      eventTemplateId: eventTemplateProbation.id,
      triggerDate: daysAgo(5),
    },
  });

  const onboardingMissing = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "E", lastName: "OnboardingMissing", hireDate: daysAgo(10), contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS" },
  });
  const onboardingTooRecent = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "F", lastName: "OnboardingTooRecent", hireDate: daysAgo(3), contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS" },
  });
  const onboardingTooOld = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "G", lastName: "OnboardingTooOld", hireDate: daysAgo(90), contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS" },
  });

  const withoutManager = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "H", lastName: "NoManager", hireDate: daysAgo(200), contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS" },
  });

  const medicalNeverScheduled = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "I", lastName: "MedicalNever", hireDate: daysAgo(400), contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS", nextMedicalVisitDate: null },
  });
  const medicalOverdue = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "J", lastName: "MedicalOverdue", hireDate: daysAgo(400), contractType: "CDI", probationDuration: 3, probationDurationUnit: "MONTHS", nextMedicalVisitDate: daysAgo(5) },
  });

  const contractEndingApproaching = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "K", lastName: "ContractSoon", hireDate: daysAgo(300), contractType: "CDD", contractEndDate: daysFromNow(15), probationDuration: 3, probationDurationUnit: "MONTHS" },
  });
  const contractOverdue = await prisma.employee.create({
    data: { organizationId: org.id, firstName: "L", lastName: "ContractOverdue", hireDate: daysAgo(300), contractType: "CDD", contractEndDate: daysAgo(2), probationDuration: 3, probationDurationUnit: "MONTHS" },
  });

  return {
    org,
    probationOverdue,
    probationApproaching,
    probationTooOld,
    probationAlreadyTriggered,
    onboardingMissing,
    onboardingTooRecent,
    onboardingTooOld,
    withoutManager,
    medicalNeverScheduled,
    medicalOverdue,
    contractEndingApproaching,
    contractOverdue,
  };
}

async function cleanupFixtures(f: Fixtures) {
  await prisma.anomalyDismissal.deleteMany({ where: { organizationId: f.org.id } });
  await prisma.employeeEvent.deleteMany({ where: { organizationId: f.org.id } });
  await prisma.employee.deleteMany({ where: { organizationId: f.org.id } });
  await prisma.eventTemplate.deleteMany({ where: { key: "fin_periode_essai" } });
  await prisma.organization.delete({ where: { id: f.org.id } });
}

describe("getAnomalies", () => {
  let f: Fixtures;
  let anomalies: Awaited<ReturnType<typeof getAnomalies>>;

  beforeAll(async () => {
    f = await createFixtures();
    anomalies = await getAnomalies(f.org.id);
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  it("période d'essai dépassée (juste dans la limite des 45 jours) : critique", () => {
    const a = anomalies.find((x) => x.key === `probation-${f.probationOverdue.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("critical");
  });

  it("période d'essai qui approche (juste dans la limite des 30 jours) : moyen", () => {
    const a = anomalies.find((x) => x.key === `probation-${f.probationApproaching.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("medium");
  });

  it("période d'essai : n'apparaît pas si le salarié a été embauché il y a plus de 365 jours", () => {
    const a = anomalies.find((x) => x.key === `probation-${f.probationTooOld.id}`);
    expect(a).toBeUndefined();
  });

  it("période d'essai : n'apparaît pas si un parcours a déjà été déclenché", () => {
    const a = anomalies.find((x) => x.key === `probation-${f.probationAlreadyTriggered.id}`);
    expect(a).toBeUndefined();
  });

  it("embauche sans parcours après 7 jours : critique", () => {
    const a = anomalies.find((x) => x.key === `onboarding-${f.onboardingMissing.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("critical");
  });

  it("embauche sans parcours : n'apparaît pas avant 7 jours", () => {
    const a = anomalies.find((x) => x.key === `onboarding-${f.onboardingTooRecent.id}`);
    expect(a).toBeUndefined();
  });

  it("embauche sans parcours : n'apparaît plus après 60 jours (donnée historique probable)", () => {
    const a = anomalies.find((x) => x.key === `onboarding-${f.onboardingTooOld.id}`);
    expect(a).toBeUndefined();
  });

  it("salarié sans manager direct : signal faible", () => {
    const a = anomalies.find((x) => x.key === `no-manager-${f.withoutManager.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("low");
  });

  it("visite médicale jamais programmée (embauché·e depuis plus d'un an) : moyen", () => {
    const a = anomalies.find((x) => x.key === `medical-visit-never-${f.medicalNeverScheduled.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("medium");
  });

  it("visite médicale avec une date dépassée : critique, distinct de 'jamais programmée'", () => {
    const overdue = anomalies.find((x) => x.key === `medical-visit-overdue-${f.medicalOverdue.id}`);
    const neverScheduled = anomalies.find((x) => x.key === `medical-visit-never-${f.medicalOverdue.id}`);
    expect(overdue).toBeDefined();
    expect(overdue?.severity).toBe("critical");
    expect(neverScheduled).toBeUndefined();
  });

  it("fin de contrat qui approche : moyen", () => {
    const a = anomalies.find((x) => x.key === `contract-ending-${f.contractEndingApproaching.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("medium");
    expect(a?.action).toBeNull();
  });

  it("fin de contrat dépassée : critique", () => {
    const a = anomalies.find((x) => x.key === `contract-ending-${f.contractOverdue.id}`);
    expect(a).toBeDefined();
    expect(a?.severity).toBe("critical");
  });

  it("trie toujours les anomalies critiques avant les moyennes, elles-mêmes avant les faibles", () => {
    const order: Record<string, number> = { critical: 0, medium: 1, low: 2 };
    const severityIndexes = anomalies.map((a) => order[a.severity]);
    const sorted = [...severityIndexes].sort((a, b) => a - b);
    expect(severityIndexes).toEqual(sorted);
  });
});

describe("getAnomalies — mise en sourdine (AnomalyDismissal)", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  it("une mise en sourdine définitive (sans snoozedUntil) masque l'anomalie", async () => {
    const key = `no-manager-${f.withoutManager.id}`;
    await prisma.anomalyDismissal.create({ data: { organizationId: f.org.id, anomalyKey: key } });

    const anomalies = await getAnomalies(f.org.id);
    expect(anomalies.find((a) => a.key === key)).toBeUndefined();
  });

  it("une mise en sourdine avec une date future masque encore l'anomalie", async () => {
    const key = `no-manager-${f.onboardingMissing.id}`;
    await prisma.anomalyDismissal.create({
      data: { organizationId: f.org.id, anomalyKey: key, snoozedUntil: daysFromNow(10) },
    });

    const anomalies = await getAnomalies(f.org.id);
    expect(anomalies.find((a) => a.key === key)).toBeUndefined();
  });

  it("une mise en sourdine dont la date est déjà passée laisse réapparaître l'anomalie", async () => {
    const key = `no-manager-${f.onboardingTooRecent.id}`;
    await prisma.anomalyDismissal.create({
      data: { organizationId: f.org.id, anomalyKey: key, snoozedUntil: daysAgo(1) },
    });

    const anomalies = await getAnomalies(f.org.id);
    expect(anomalies.find((a) => a.key === key)).toBeDefined();
  });
});
