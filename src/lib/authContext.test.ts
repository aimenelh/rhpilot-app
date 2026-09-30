import { describe, expect, it } from "vitest";
import {
  employeeContextBlocks,
  isEmployeePortalPath,
  isRhAuthEntryPath,
} from "./authContext";

describe("auth context boundaries", () => {
  it("distinguishes the employee portal from the public employee-space page", () => {
    expect(isEmployeePortalPath("/espace")).toBe(true);
    expect(isEmployeePortalPath("/espace/preferences")).toBe(true);
    expect(isEmployeePortalPath("/espace-salarie")).toBe(false);
  });

  it("recognizes explicit RH authentication entry points", () => {
    expect(isRhAuthEntryPath("/sign-in")).toBe(true);
    expect(isRhAuthEntryPath("/sign-up/verify")).toBe(true);
    expect(isRhAuthEntryPath("/dashboard")).toBe(false);
  });

  it("blocks RH pages and private APIs while keeping employee APIs available", () => {
    expect(employeeContextBlocks("/dashboard")).toBe(true);
    expect(employeeContextBlocks("/dashboard/payroll")).toBe(true);
    expect(employeeContextBlocks("/entering")).toBe(true);
    expect(employeeContextBlocks("/api/payroll/periods/123/status")).toBe(true);
    expect(employeeContextBlocks("/api/export/organization")).toBe(true);

    expect(employeeContextBlocks("/api/espace/archive")).toBe(false);
    expect(employeeContextBlocks("/api/espace/documents/123")).toBe(false);
    expect(employeeContextBlocks("/espace/preferences")).toBe(false);
    expect(employeeContextBlocks("/espace-salarie")).toBe(false);
  });
});
