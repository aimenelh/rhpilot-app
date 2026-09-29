import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { authState } from "@/test/mockAuth";
import { manageMember } from "@/app/dashboard/team/memberActions";
import { uploadEmployeeDocument } from "@/app/dashboard/employees/employeeSpaceActions";
vi.mock("@/lib/employee-space/notify", () => ({ notifyEmployeeOfDocuments: vi.fn(async () => "WITHOUT_SPACE") }));
const run = `audit-${randomUUID()}`;
let a: string, b: string, ownerId: string, targetId: string, employeeId: string, foreignId: string;
let pdf: Uint8Array;
function data(entries: Record<string,string>) { const form = new FormData(); for(const [k,v] of Object.entries(entries)) form.set(k,v);return form; }
function upload(period="2026-09", replacement=false) { const form = data({ employeeId, kind:"PAYSLIP", period });form.set("file",new File([pdf],"bulletin.pdf",{type:"application/pdf"}));if(replacement)form.set("confirmReplacement","on");return form; }
describe("audit additions on an isolated database", () => {
 beforeAll(async () => {
  const testDatabase = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
  if (!["127.0.0.1", "localhost"].includes(testDatabase.hostname) || !/(?:test|ci)/.test(testDatabase.pathname)) throw new Error("These integration fixtures require an isolated local test database.");
  a=(await prisma.organization.create({data:{name:run+"a"}})).id;b=(await prisma.organization.create({data:{name:run+"b"}})).id;
  const owner=await prisma.user.create({data:{email:run+"owner@example.test",authProviderId:run+"owner"}});
  const target=await prisma.user.create({data:{email:run+"target@example.test",authProviderId:run+"target"}});
  ownerId=(await prisma.membership.create({data:{organizationId:a,userId:owner.id,accessRole:"OWNER"}})).id;
  targetId=(await prisma.membership.create({data:{organizationId:a,userId:target.id,accessRole:"MEMBER"}})).id;
  foreignId=(await prisma.membership.create({data:{organizationId:b,userId:target.id,accessRole:"MEMBER"}})).id;
  employeeId=(await prisma.employee.create({data:{organizationId:a,firstName:"Test",lastName:"Bulletin",hireDate:new Date("2020-01-01"),managerMembershipId:targetId}})).id;
  const document=await PDFDocument.create();document.addPage();pdf=await document.save();
  authState.userId=run+"owner";
 });
 afterAll(async () => {
  authState.userId=null;
  if(!a || !b) return;
  // The journal is append-only in the application. Fixture cleanup alone uses
  // the isolated test database superuser and a transaction-local setting.
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    await tx.$executeRaw`DELETE FROM "employee_document_events" WHERE "organizationId" = ${a}`;
    await tx.$executeRaw`DELETE FROM "employee_documents" WHERE "organizationId" = ${a}`;
  });
  await prisma.auditLog.deleteMany({where:{organizationId:{in:[a,b]}}});
  await prisma.employee.deleteMany({where:{organizationId:a}});
  await prisma.membership.deleteMany({where:{organizationId:{in:[a,b]}}});
  await prisma.user.deleteMany({where:{email:{startsWith:run}}});
  await prisma.organization.deleteMany({where:{id:{in:[a,b]}}});
 });
 it("rejects cross-tenant member changes and owner removal",async () => {
  expect((await manageMember(undefined,data({memberId:foreignId,operation:"remove"})))?.error).toBeTruthy();
  expect((await manageMember(undefined,data({memberId:ownerId,operation:"remove"})))?.error).toBeTruthy();
  expect((await prisma.membership.findUnique({where:{id:foreignId}}))?.deletedAt).toBeNull();
 });
 it("changes a member role with an audit trace",async () => {
  expect((await manageMember(undefined,data({memberId:targetId,operation:"update",accessRole:"ADMIN",functionalRole:"RH"})))?.success).toBeTruthy();
  expect((await prisma.membership.findUnique({where:{id:targetId}}))?.accessRole).toBe("ADMIN");
  expect(await prisma.auditLog.count({where:{organizationId:a,action:"membership.role.updated"}})).toBe(1);
 });
 it("blocks publication until the employee is informed",async () => {
  expect((await uploadEmployeeDocument(undefined,upload()))?.error).toMatch(/note d’information/);
  expect(await prisma.employee_documents.count({where:{employeeId}})).toBe(0);
 });
 it("publishes an external bulletin with its period, without using payroll tables",async () => {
  await prisma.employee.update({where:{id:employeeId},data:{electronicPayslipNoticeAt:new Date("2020-01-01"),electronicPayslipNoticeMethod:"AT_HIRING"}});
  expect((await uploadEmployeeDocument(undefined,upload()))?.success).toBeTruthy();
  const docs=await prisma.employee_documents.findMany({where:{employeeId}});
  expect(docs).toHaveLength(1);expect(docs[0].periodYear).toBe(2026);expect(docs[0].periodMonth).toBe(9);expect(docs[0].sourcePayslipId).toBeNull();
  expect(await prisma.payslip.count({where:{employeeId}})).toBe(0);
 });
 it("requires confirmation to replace and keeps both versions",async () => {
  expect((await uploadEmployeeDocument(undefined,upload()))?.error).toMatch(/Confirmez/);
  const changed=await PDFDocument.create();changed.addPage([300,400]);pdf=await changed.save();
  expect((await uploadEmployeeDocument(undefined,upload("2026-09",true)))?.success).toBeTruthy();
  const docs=await prisma.employee_documents.findMany({where:{employeeId}});expect(docs).toHaveLength(2);expect(docs.filter(d=>d.replacedAt===null)).toHaveLength(1);
 });
 it("respects paper preference and rejects cross-tenant upload",async () => {
  await prisma.employee.update({where:{id:employeeId},data:{paperPayslipSince:new Date()}});
  expect((await uploadEmployeeDocument(undefined,upload("2026-10")))?.error).toMatch(/papier/);
  authState.userId=run+"target";
  await prisma.membership.update({where:{id:targetId},data:{deletedAt:new Date()}});
  await prisma.membership.update({where:{id:foreignId},data:{accessRole:"ADMIN"}});
  expect((await uploadEmployeeDocument(undefined,upload()))?.error).toMatch(/introuvable/);
  await prisma.membership.update({where:{id:targetId},data:{deletedAt:null}});
  authState.userId=run+"owner";
 });
 it("revokes access and releases active management assignments",async () => {
  expect((await manageMember(undefined,data({memberId:targetId,operation:"remove"})))?.success).toBeTruthy();
  expect((await prisma.membership.findUnique({where:{id:targetId}}))?.deletedAt).not.toBeNull();
  expect((await prisma.employee.findUnique({where:{id:employeeId}}))?.managerMembershipId).toBeNull();
 });
});
