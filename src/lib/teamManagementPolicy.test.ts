import { describe, expect, it } from "vitest";
import { teamManagementError } from "./teamManagementPolicy";
const owner = { id: "owner", organizationId: "a", accessRole: "OWNER" as const, deletedAt: null };
const admin = { ...owner, id: "admin", accessRole: "ADMIN" as const };
const member = { ...owner, id: "member", accessRole: "MEMBER" as const };
describe("team permissions", () => {
 it("allows owners to manage administrators and members", () => { expect(teamManagementError(owner, admin, "MEMBER")).toBeNull(); expect(teamManagementError(owner, member, "ADMIN")).toBeNull(); });
 it("rejects cross-organization targets", () => { expect(teamManagementError(owner, { ...member, organizationId: "b" })).not.toBeNull(); });
 it("rejects members, revoked actors, self changes and owners", () => { expect(teamManagementError(member, admin)).not.toBeNull(); expect(teamManagementError({ ...owner, deletedAt: new Date() }, member)).not.toBeNull(); expect(teamManagementError(owner, owner)).not.toBeNull(); expect(teamManagementError(admin, owner)).not.toBeNull(); });
 it("does not let an admin modify or create another admin", () => { expect(teamManagementError(admin, member, "ADMIN")).not.toBeNull(); expect(teamManagementError(admin, { ...admin, id: "other" }, "MEMBER")).not.toBeNull(); expect(teamManagementError(admin, member, "MEMBER")).toBeNull(); });
 it("rejects invalid roles and inactive targets", () => { expect(teamManagementError(owner, member, "OWNER")).not.toBeNull(); expect(teamManagementError(owner, { ...member, deletedAt: new Date() })).not.toBeNull(); });
});
